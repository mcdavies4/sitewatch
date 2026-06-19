"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getCtx() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("site_id, role")
    .eq("id", user.id)
    .single();
  return { supabase, user, profile };
}

function canOperate(role?: string | null) {
  return role === "admin" || role === "manager" || role === "maintenance";
}

export async function createCallout(formData: FormData) {
  const { supabase, user, profile } = await getCtx();
  if (!profile?.site_id || !canOperate(profile.role)) return;

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  await supabase.from("tasks").insert({
    site_id: profile.site_id,
    title,
    description: String(formData.get("details") || "").trim() || null,
    source: "contractor_callout",
    priority: "medium",
    status: "open",
    due_date: String(formData.get("expected") || "") || null,
    contractor_name: String(formData.get("contractor_name") || "").trim() || null,
    contractor_contact:
      String(formData.get("contractor_contact") || "").trim() || null,
    created_by: user.id,
  });
  revalidatePath("/callouts");
  revalidatePath("/tasks");
}

export async function setCalloutStatus(formData: FormData) {
  const { supabase, user, profile } = await getCtx();
  if (!canOperate(profile?.role)) return;
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  const patch: Record<string, unknown> = { status };
  if (status === "completed") {
    patch.completed_at = new Date().toISOString();
    patch.completed_by = user.id;
  } else {
    patch.completed_at = null;
    patch.completed_by = null;
  }
  await supabase.from("tasks").update(patch).eq("id", id);
  revalidatePath("/callouts");
  revalidatePath("/tasks");
}

export async function deleteCallout(formData: FormData) {
  const { supabase, profile } = await getCtx();
  if (!canOperate(profile?.role)) return;
  const id = String(formData.get("id"));
  await supabase.from("tasks").delete().eq("id", id);
  revalidatePath("/callouts");
  revalidatePath("/tasks");
}
