import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDue } from "@/lib/dates";
import AddTemplateForm from "./AddTemplateForm";
import {
  setTemplateActive,
  deleteTemplate,
  generateNow,
} from "./actions";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  legionella: "Water",
  fire: "Fire",
  electrical: "Electrical",
  general: "General",
  other: "Other",
};

function freqLabel(frequency: string, n: number): string {
  const unit: Record<string, string> = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    quarterly: "quarter",
    yearly: "year",
  };
  const u = unit[frequency] ?? frequency;
  return n === 1 ? `Every ${u}` : `Every ${n} ${u}s`;
}

export default async function TemplatesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("site_id")
    .eq("id", user.id)
    .single();
  if (!profile?.site_id) redirect("/tasks");

  const { data: templates } = await supabase
    .from("task_templates")
    .select(
      "id, title, description, category, frequency, interval_n, next_due_date, requires_photo, active"
    )
    .eq("site_id", profile.site_id)
    .order("active", { ascending: false })
    .order("next_due_date", { ascending: true });

  const list = templates ?? [];

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Recurring tasks</h1>
          <p className="text-xs text-neutral">
            Statutory checks that generate themselves
          </p>
        </div>
        <Link href="/tasks" className="text-sm text-brand">
          ← Tasks
        </Link>
      </header>

      <div className="mb-4">
        <AddTemplateForm />
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">Generate due tasks</p>
          <p className="text-xs text-neutral">
            Creates today&apos;s due checks now. Runs daily once pg_cron is set.
          </p>
        </div>
        <form action={generateNow}>
          <button className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white">
            Run now
          </button>
        </form>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card px-4 py-10 text-center">
          <p className="font-medium">No recurring tasks yet</p>
          <p className="mt-1 text-sm text-neutral">
            Use a quick-add above for the common checks, or build a custom one.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((t) => (
            <div
              key={t.id}
              className={`relative overflow-hidden rounded-xl border border-line bg-card ${
                t.active ? "" : "opacity-60"
              }`}
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-1"
                style={{ background: t.active ? "#0E5C55" : "#94A3B8" }}
              />
              <div className="pl-4 pr-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{t.title}</p>
                    <p className="mt-0.5 text-sm text-neutral">
                      {freqLabel(t.frequency, t.interval_n)} ·{" "}
                      {t.active
                        ? `next ${formatDue(t.next_due_date).toLowerCase()}`
                        : "paused"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral">
                    {t.category && CATEGORY_LABEL[t.category] && (
                      <span className="rounded bg-paper px-1.5 py-0.5">
                        {CATEGORY_LABEL[t.category]}
                      </span>
                    )}
                    {t.requires_photo && (
                      <span className="rounded bg-paper px-1.5 py-0.5">
                        photo
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex justify-end gap-1.5">
                  <form action={setTemplateActive}>
                    <input type="hidden" name="id" value={t.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={(!t.active).toString()}
                    />
                    <button className="rounded-lg border border-line px-3 py-1.5 text-sm">
                      {t.active ? "Pause" : "Resume"}
                    </button>
                  </form>
                  <form action={deleteTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-overdue">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
