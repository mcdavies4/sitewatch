"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createReport(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, site_id")
    .eq("id", user.id)
    .single();
  if (!profile?.site_id) redirect("/tasks");

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  const area = String(formData.get("area") || "").trim();
  const details = String(formData.get("details") || "").trim();
  const photoPath = String(formData.get("photo_path") || "").trim() || null;

  const description = [area ? `Area: ${area}` : "", details]
    .filter(Boolean)
    .join("\n");

  await supabase.from("tasks").insert({
    site_id: profile.site_id,
    title,
    description: description || null,
    source: "staff_reported",
    priority: "medium",
    status: "open",
    reported_by_name: profile.full_name,
    created_by: user.id,
    report_photo_path: photoPath,
  });

  revalidatePath("/tasks");
  redirect("/report?sent=1");
}
