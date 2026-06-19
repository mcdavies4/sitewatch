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
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, user, profile };
}

function canManage(role?: string | null) {
  return role === "admin" || role === "manager";
}

export async function verifyTask(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, user, profile } = await getCtx();
  if (!canManage(profile?.role)) return;
  await supabase
    .from("tasks")
    .update({ verified_at: new Date().toISOString(), verified_by: user.id })
    .eq("id", id);
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}

export async function unverifyTask(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase, profile } = await getCtx();
  if (!canManage(profile?.role)) return;
  await supabase
    .from("tasks")
    .update({ verified_at: null, verified_by: null })
    .eq("id", id);
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}
