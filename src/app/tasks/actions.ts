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
    .select("id, full_name, site_id")
    .eq("id", user.id)
    .single();
  return { supabase, user, profile };
}

export async function createSite(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const { supabase, user } = await getContext();

  const { data: site, error } = await supabase
    .from("sites")
    .insert({ name })
    .select("id")
    .single();
  if (error || !site) return;

  await supabase.from("profiles").update({ site_id: site.id }).eq("id", user.id);
  revalidatePath("/tasks");
}

export async function addTask(formData: FormData) {
  const { supabase, user, profile } = await getContext();
  if (!profile?.site_id) return;

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  await supabase.from("tasks").insert({
    site_id: profile.site_id,
    title,
    description: String(formData.get("description") || "").trim() || null,
    category: String(formData.get("category") || "") || null,
    source: String(formData.get("source") || "self_created"),
    priority: String(formData.get("priority") || "medium"),
    due_date: String(formData.get("due_date") || "") || null,
    requires_photo: formData.get("requires_photo") === "on",
    reported_by_name: String(formData.get("reported_by_name") || "").trim() || null,
    created_by: user.id,
    assigned_to: user.id,
  });
  revalidatePath("/tasks");
}

export async function startTask(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await getContext();
  await supabase.from("tasks").update({ status: "in_progress" }).eq("id", id);
  revalidatePath("/tasks");
}

export async function completeTask(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await getContext();
  // Goes through the DB guard: a task flagged requires_photo will be rejected
  // here unless a proof row already exists for it.
  const { error } = await supabase.rpc("complete_task", { p_task_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/tasks");
}

export async function completeWithProof(formData: FormData) {
  const id = String(formData.get("id"));
  const path = String(formData.get("path"));
  const sha = String(formData.get("sha") || "") || null;
  const { supabase, user } = await getContext();

  const { error: proofErr } = await supabase.from("task_proofs").insert({
    task_id: id,
    storage_path: path,
    uploaded_by: user.id,
    image_sha256: sha,
  });
  if (proofErr) throw new Error(proofErr.message);

  const { error } = await supabase.rpc("complete_task", { p_task_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/tasks");
}

export async function reopenTask(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await getContext();
  await supabase
    .from("tasks")
    .update({ status: "open", completed_at: null, completed_by: null })
    .eq("id", id);
  revalidatePath("/tasks");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
