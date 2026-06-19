import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayISO, isOverdue } from "@/lib/dates";
import Onboarding from "./Onboarding";
import AddTaskForm from "./AddTaskForm";
import TaskCard from "./TaskCard";
import SessionRefresher from "./SessionRefresher";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

type View = "today" | "overdue" | "open" | "done";

const TABS: { key: View; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "open", label: "All open" },
  { key: "done", label: "Done" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, site_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.site_id) {
    const { data: invites } = await supabase
      .from("invites")
      .select("id, role, sites(name)")
      .eq("status", "pending")
      .ilike("email", user.email ?? "");
    return <Onboarding invites={(invites as never) ?? []} />;
  }

  const { data: site } = await supabase
    .from("sites")
    .select("name")
    .eq("id", profile.site_id)
    .single();

  const role = profile.role ?? "maintenance";
  const canOperate = ["admin", "manager", "maintenance"].includes(role);
  const canManage = ["admin", "manager"].includes(role);

  const view = (
    ["today", "overdue", "open", "done"].includes(searchParams.view ?? "")
      ? searchParams.view
      : "today"
  ) as View;

  // Open + in-progress tasks power Today / Overdue / All open.
  const { data: openTasks } = await supabase
    .from("tasks")
    .select(
      "id, title, description, category, source, priority, status, due_date, reported_by_name, requires_photo, completion_note, verified_at, report_photo_path"
    )
    .eq("site_id", profile.site_id)
    .in("status", ["open", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false });

  // Count completed in the last 7 days for the summary strip.
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: doneThisWeek } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("site_id", profile.site_id)
    .eq("status", "completed")
    .gte("completed_at", weekAgo);

  const all = openTasks ?? [];
  const today = todayISO();
  const overdue = all.filter((t) => isOverdue(t.due_date));
  const dueToday = all.filter((t) => t.due_date === today);

  let list = all;
  if (view === "today") list = [...overdue, ...dueToday];
  else if (view === "overdue") list = overdue;
  else if (view === "open") list = all;

  let proofMap: Record<string, string> = {};
  const reportPhotoMap: Record<string, string> = {};

  if (view !== "done") {
    const rp = list.filter(
      (t) => (t as { report_photo_path?: string }).report_photo_path
    );
    if (rp.length) {
      const paths = rp.map(
        (t) => (t as { report_photo_path: string }).report_photo_path
      );
      const { data: signed } = await supabase.storage
        .from("task-proofs")
        .createSignedUrls(paths, 3600);
      const byPath: Record<string, string> = {};
      (signed ?? []).forEach((s) => {
        if (s.path && s.signedUrl) byPath[s.path] = s.signedUrl;
      });
      rp.forEach((t) => {
        const p = (t as { report_photo_path: string }).report_photo_path;
        if (byPath[p]) reportPhotoMap[t.id] = byPath[p];
      });
    }
  }

  if (view === "done") {
    const { data: doneTasks } = await supabase
      .from("tasks")
      .select(
        "id, title, description, category, source, priority, status, due_date, reported_by_name, requires_photo, completion_note, verified_at, report_photo_path"
      )
      .eq("site_id", profile.site_id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50);
    list = doneTasks ?? [];

    const ids = list.map((t) => t.id);
    if (ids.length) {
      const { data: proofs } = await supabase
        .from("task_proofs")
        .select("task_id, storage_path")
        .in("task_id", ids);
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
          if (byPath[p.storage_path] && !proofMap[p.task_id]) {
            proofMap[p.task_id] = byPath[p.storage_path];
          }
        });
      }
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-5">
      <SessionRefresher />
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path
                d="M7 12l3 3 7-8"
                stroke="#12B0A0"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="font-display text-base font-bold">
              {site?.name ?? "Sitewatch"}
            </p>
            <p className="text-xs text-neutral">{profile.full_name}</p>
          </div>
        </div>
        <div className="flex max-w-[60%] flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <Link href="/report" className="text-sm text-brand">
            Report
          </Link>
          {canOperate && (
            <Link href="/recurring" className="text-sm text-brand">
              Recurring
            </Link>
          )}
          {canOperate && (
            <Link href="/export" className="text-sm text-brand">
              Export
            </Link>
          )}
          {canOperate && (
            <Link href="/callouts" className="text-sm text-brand">
              Call-outs
            </Link>
          )}
          {canManage && (
            <Link href="/dashboard" className="text-sm text-brand">
              Manage
            </Link>
          )}
          {canManage && (
            <Link href="/team" className="text-sm text-brand">
              Team
            </Link>
          )}
          <form action={signOut}>
            <button className="text-sm text-neutral">Sign out</button>
          </form>
        </div>
      </header>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-line bg-card px-3 py-2.5 text-center">
          <p className="font-display text-xl font-bold tabular">
            {dueToday.length}
          </p>
          <p className="text-xs text-neutral">Due today</p>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-2.5 text-center">
          <p
            className={`font-display text-xl font-bold tabular ${
              overdue.length > 0 ? "text-overdue" : ""
            }`}
          >
            {overdue.length}
          </p>
          <p className="text-xs text-neutral">Overdue</p>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-2.5 text-center">
          <p className="font-display text-xl font-bold tabular text-done">
            {doneThisWeek ?? 0}
          </p>
          <p className="text-xs text-neutral">Done / 7d</p>
        </div>
      </div>

      {overdue.length > 0 && view !== "overdue" && (
        <Link
          href="/tasks?view=overdue"
          className="mb-3 flex items-center justify-between rounded-xl bg-overdue/10 px-4 py-3"
        >
          <span className="text-sm font-medium text-overdue">
            {overdue.length} task{overdue.length > 1 ? "s" : ""} overdue
          </span>
          <span className="text-sm text-overdue">View →</span>
        </Link>
      )}

      <div className="mb-4">
        <AddTaskForm />
      </div>

      <nav className="mb-3 flex gap-1 overflow-x-auto rounded-xl bg-paper p-1">
        {TABS.map((t) => {
          const active = view === t.key;
          const count =
            t.key === "overdue"
              ? overdue.length
              : t.key === "today"
              ? overdue.length + dueToday.length
              : t.key === "open"
              ? all.length
              : null;
          return (
            <Link
              key={t.key}
              href={`/tasks?view=${t.key}`}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-sm font-medium ${
                active ? "bg-white text-ink shadow-sm" : "text-neutral"
              }`}
            >
              {t.label}
              {count !== null && count > 0 && (
                <span className="ml-1 tabular text-xs text-neutral">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card px-4 py-10 text-center">
          <p className="font-medium">
            {view === "done"
              ? "No completed tasks yet"
              : view === "overdue"
              ? "Nothing overdue"
              : "All clear"}
          </p>
          <p className="mt-1 text-sm text-neutral">
            {view === "done"
              ? "Finished tasks will collect here."
              : "Add a task above to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              proofUrl={proofMap[t.id]}
              reportPhotoUrl={reportPhotoMap[t.id]}
            />
          ))}
        </div>
      )}
    </main>
  );
}
