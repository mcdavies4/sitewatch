import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayISO, isOverdue, formatDue } from "@/lib/dates";
import { verifyTask } from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  legionella: "Water",
  fire: "Fire",
  electrical: "Electrical",
  general: "General",
  other: "Other",
};

function fmtDateTime(ts: string): string {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
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
  if (!profile?.site_id) redirect("/tasks");
  if (!["admin", "manager"].includes(profile.role ?? "")) redirect("/tasks");

  const { data: site } = await supabase
    .from("sites")
    .select("name")
    .eq("id", profile.site_id)
    .single();

  const today = todayISO();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Open / in-progress
  const { data: openTasks } = await supabase
    .from("tasks")
    .select("id, title, category, due_date, status, assigned_to")
    .eq("site_id", profile.site_id)
    .in("status", ["open", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false });
  const open = openTasks ?? [];
  const overdue = open.filter((t) => isOverdue(t.due_date));
  const dueToday = open.filter((t) => t.due_date === today);

  // Completed in last 30 days
  const { data: completed } = await supabase
    .from("tasks")
    .select(
      "id, title, category, completed_at, completed_by, verified_at, completion_note"
    )
    .eq("site_id", profile.site_id)
    .eq("status", "completed")
    .gte("completed_at", monthAgo)
    .order("completed_at", { ascending: false });
  const done30 = completed ?? [];
  const awaiting = done30.filter((t) => !t.verified_at);

  // Names
  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("site_id", profile.site_id);
  const nameById: Record<string, string> = {};
  (people ?? []).forEach((p) => (nameById[p.id] = p.full_name));

  // Proof thumbnails for the sign-off queue
  const awaitingIds = awaiting.slice(0, 20).map((t) => t.id);
  const proofByTask: Record<string, string> = {};
  if (awaitingIds.length) {
    const { data: proofs } = await supabase
      .from("task_proofs")
      .select("task_id, storage_path")
      .in("task_id", awaitingIds);
    const paths = (proofs ?? []).map((p) => p.storage_path);
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("task-proofs")
        .createSignedUrls(paths, 3600);
      const byPath: Record<string, string> = {};
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) byPath[s.path] = s.signedUrl;
      });
      (proofs ?? []).forEach((p) => {
        if (byPath[p.storage_path] && !proofByTask[p.task_id]) {
          proofByTask[p.task_id] = byPath[p.storage_path];
        }
      });
    }
  }

  // Open tasks by category
  const byCat: Record<string, number> = {};
  open.forEach((t) => {
    const k = t.category || "other";
    byCat[k] = (byCat[k] || 0) + 1;
  });

  const tiles = [
    { label: "Overdue", value: overdue.length, tone: overdue.length ? "over" : "" },
    { label: "Due today", value: dueToday.length, tone: "" },
    { label: "Done / 30d", value: done30.length, tone: "done" },
    { label: "Awaiting sign-off", value: awaiting.length, tone: awaiting.length ? "soon" : "" },
  ];

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">{site?.name}</h1>
          <p className="text-xs text-neutral">Manager view · compliance at a glance</p>
        </div>
        <Link href="/tasks" className="text-sm text-brand">
          ← Tasks
        </Link>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-line bg-card px-4 py-3"
          >
            <p
              className={`font-display text-2xl font-bold tabular ${
                t.tone === "over"
                  ? "text-overdue"
                  : t.tone === "done"
                  ? "text-done"
                  : t.tone === "soon"
                  ? "text-soon"
                  : ""
              }`}
            >
              {t.value}
            </p>
            <p className="text-xs text-neutral">{t.label}</p>
          </div>
        ))}
      </div>

      {Object.keys(byCat).length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold">Open work by area</h2>
          <div className="rounded-xl border border-line bg-card divide-y divide-line">
            {Object.entries(byCat)
              .sort((a, b) => b[1] - a[1])
              .map(([k, n]) => (
                <div
                  key={k}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span>{CATEGORY_LABEL[k] ?? k}</span>
                  <span className="tabular text-neutral">{n}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {overdue.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-overdue">
            Overdue ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-line bg-card px-4 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <span className="shrink-0 text-xs font-medium text-overdue tabular">
                    {formatDue(t.due_date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">
          Awaiting sign-off ({awaiting.length})
        </h2>
        {awaiting.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card px-4 py-8 text-center text-sm text-neutral">
            Nothing waiting. Every completed check is signed off.
          </div>
        ) : (
          <div className="space-y-2">
            {awaiting.slice(0, 20).map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-line bg-card p-3"
              >
                <div className="flex gap-3">
                  {proofByTask[t.id] ? (
                    <a href={proofByTask[t.id]} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofByTask[t.id]}
                        alt="proof"
                        className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-[10px] text-neutral">
                      no photo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="mt-0.5 text-xs text-neutral">
                      {t.completed_by && nameById[t.completed_by]
                        ? nameById[t.completed_by]
                        : "—"}
                      {t.completed_at ? ` · ${fmtDateTime(t.completed_at)}` : ""}
                    </p>
                    {t.completion_note && (
                      <p className="mt-1 text-sm">{t.completion_note}</p>
                    )}
                  </div>
                </div>
                <form action={verifyTask} className="mt-2.5 flex justify-end">
                  <input type="hidden" name="id" value={t.id} />
                  <button className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white">
                    Verify
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
