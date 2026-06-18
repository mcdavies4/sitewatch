"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, site_id")
    .eq("id", user.id)
    .single();
  return { supabase, user, profile };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function createTemplate(formData: FormData) {
  const { supabase, profile } = await getContext();
  if (!profile?.site_id) return;

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  await supabase.from("task_templates").insert({
    site_id: profile.site_id,
    title,
    description: String(formData.get("description") || "").trim() || null,
    category: String(formData.get("category") || "") || null,
    frequency: String(formData.get("frequency") || "weekly"),
    interval_n: Math.max(1, parseInt(String(formData.get("interval_n") || "1"), 10) || 1),
    next_due_date: String(formData.get("next_due_date") || "") || todayISO(),
    requires_photo: formData.get("requires_photo") === "on",
    active: true,
  });
  revalidatePath("/recurring");
}

const PRESETS: Record<
  string,
  { title: string; category: string; frequency: string; interval_n: number }
> = {
  flush: { title: "Low-use outlet flush", category: "legionella", frequency: "weekly", interval_n: 1 },
  watertemp: { title: "Water temperature monitoring", category: "legionella", frequency: "monthly", interval_n: 1 },
  firealarm: { title: "Fire alarm weekly test", category: "fire", frequency: "weekly", interval_n: 1 },
  emergency: { title: "Emergency lighting test", category: "fire", frequency: "monthly", interval_n: 1 },
  firedoor: { title: "Fire door inspection", category: "fire", frequency: "monthly", interval_n: 1 },
  walkaround: { title: "Site walk-around", category: "general", frequency: "weekly", interval_n: 1 },
};

export async function quickAddPreset(formData: FormData) {
  const key = String(formData.get("key") || "");
  const preset = PRESETS[key];
  if (!preset) return;
  const { supabase, profile } = await getContext();
  if (!profile?.site_id) return;

  await supabase.from("task_templates").insert({
    site_id: profile.site_id,
    title: preset.title,
    category: preset.category,
    frequency: preset.frequency,
    interval_n: preset.interval_n,
    next_due_date: todayISO(),
    requires_photo: true,
    active: true,
  });
  revalidatePath("/recurring");
}

export async function setTemplateActive(formData: FormData) {
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const { supabase } = await getContext();
  await supabase.from("task_templates").update({ active }).eq("id", id);
  revalidatePath("/recurring");
}

export async function deleteTemplate(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await getContext();
  await supabase.from("task_templates").delete().eq("id", id);
  revalidatePath("/recurring");
}

export async function generateNow() {
  const { supabase } = await getContext();
  const { error } = await supabase.rpc("generate_due_tasks");
  if (error) throw new Error(error.message);
  revalidatePath("/recurring");
  revalidatePath("/tasks");
  redirect("/tasks?view=today");
}
