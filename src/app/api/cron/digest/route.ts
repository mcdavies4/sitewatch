import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, digestEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Hit daily by Vercel Cron (see vercel.json). Protected by CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.APP_URL || "";
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } }
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: sites } = await supabase.from("sites").select("id, name");
  const { data: overdueTasks } = await supabase
    .from("tasks")
    .select("site_id, title, source")
    .in("status", ["open", "in_progress"])
    .lt("due_date", today);
  const { data: recipients } = await supabase
    .from("profiles")
    .select("site_id, email, role")
    .in("role", ["admin", "manager", "maintenance"])
    .not("email", "is", null);

  const siteName: Record<string, string> = {};
  (sites ?? []).forEach((s) => (siteName[s.id] = s.name));

  const emailsBySite: Record<string, string[]> = {};
  (recipients ?? []).forEach((r) => {
    if (!r.site_id || !r.email) return;
    (emailsBySite[r.site_id] ??= []).push(r.email);
  });

  const overdueBySite: Record<string, { title: string }[]> = {};
  const chaseBySite: Record<string, { title: string }[]> = {};
  (overdueTasks ?? []).forEach((t) => {
    if (t.source === "contractor_callout") {
      (chaseBySite[t.site_id] ??= []).push({ title: t.title });
    } else {
      (overdueBySite[t.site_id] ??= []).push({ title: t.title });
    }
  });

  let sent = 0;
  for (const siteId of Object.keys(emailsBySite)) {
    const overdue = overdueBySite[siteId] ?? [];
    const chasing = chaseBySite[siteId] ?? [];
    if (overdue.length === 0 && chasing.length === 0) continue;
    const to = emailsBySite[siteId];
    if (!to.length) continue;

    await sendEmail({
      to,
      subject: `${siteName[siteId] ?? "Your site"} — ${overdue.length} overdue, ${chasing.length} to chase`,
      html: digestEmail(siteName[siteId] ?? "Your site", appUrl, overdue, chasing),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sites: sent, ranAt: new Date().toISOString() });
}
