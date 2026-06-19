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
    .select("id, site_id, role")
    .eq("id", user.id)
    .single();
  return { supabase, user, profile };
}

function canManage(role?: string | null) {
  return role === "admin" || role === "manager";
}

export async function createInvite(formData: FormData) {
  const { supabase, user, profile } = await getCtx();
  if (!profile?.site_id || !canManage(profile.role)) return;

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "care_staff");
  if (!email) return;

  await supabase.from("invites").insert({
    site_id: profile.site_id,
    email,
    role,
    invited_by: user.id,
  });
  revalidatePath("/team");
}

export async function revokeInvite(formData: FormData) {
  const { supabase, profile } = await getCtx();
  if (!canManage(profile?.role)) return;
  const id = String(formData.get("id"));
  await supabase.from("invites").delete().eq("id", id);
  revalidatePath("/team");
}
