"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, jobAssignedEmail } from "@/lib/email";

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

// Email a contractor that a job (call-out) has been assigned to them.
async function notifyAssignee(
  supabase: ReturnType<typeof createClient>,
  assigneeId: string,
  siteId: string,
  title: string,
  expected: string | null
) {
  const appUrl = process.env.APP_URL || "";
  if (!appUrl) return;
  const { data: who } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", assigneeId)
    .single();
  const { data: site } = await supabase
    .from("sites")
    .select("name")
    .eq("id", siteId)
    .single();
  if (!who?.email) return;
  await sendEmail({
    to: who.email,
    subject: `New job at ${site?.name ?? "site"}`,
    html: jobAssignedEmail(site?.name ?? "site", title, appUrl, expected),
  });
}

export async function createCallout(formData: FormData) {
  const { supabase, user, profile } = await getCtx();
  if (!profile?.site_id || !canOperate(profile.role)) return;

  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  const expected = String(formData.get("expected") || "") || null;
  const assignee = String(formData.get("assigned_to") || "") || null;

  const { data: created } = await supabase
    .from("tasks")
    .insert({
      site_id: profile.site_id,
      title,
      description: String(formData.get("details") || "").trim() || null,
      source: "contractor_callout",
      priority: "medium",
      status: "open",
      due_date: expected,
      contractor_name:
        String(formData.get("contractor_name") || "").trim() || null,
      contractor_contact:
        String(formData.get("contractor_contact") || "").trim() || null,
      assigned_to: assignee,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (assignee) {
    await notifyAssignee(supabase, assignee, profile.site_id, title, expected);
  }

  revalidatePath("/callouts");
  revalidatePath("/tasks");
}

export async function assignCallout(formData: FormData) {
  const { supabase, profile } = await getCtx();
  if (!profile?.site_id || !canOperate(profile.role)) return;
  const id = String(formData.get("id"));
  const assignee = String(formData.get("assigned_to") || "") || null;

  const { data: task } = await supabase
    .from("tasks")
    .update({ assigned_to: assignee })
    .eq("id", id)
    .select("title, due_date")
    .single();

  if (assignee && task) {
    await notifyAssignee(
      supabase,
      assignee,
      profile.site_id,
      task.title,
      task.due_date
    );
  }
  revalidatePath("/callouts");
  revalidatePath("/tasks");
}

// Used by an assigned contractor to update their own job's status.
export async function setMyJobStatus(formData: FormData) {
  const { supabase, user } = await getCtx();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const patch: Record<string, unknown> = { status };
  if (status === "completed") {
    patch.completed_at = new Date().toISOString();
    patch.completed_by = user.id;
  }
  await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("assigned_to", user.id);
  revalidatePath("/tasks");
  revalidatePath("/callouts");
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
