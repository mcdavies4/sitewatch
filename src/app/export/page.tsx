import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  legionella: "Water",
  fire: "Fire",
  electrical: "Electrical",
  general: "General",
  other: "Other",
};

function isoDay(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}

function fmtDateTime(ts: string): string {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ExportPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
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
  if (!["admin", "manager", "maintenance"].includes(profile.role ?? ""))
    redirect("/tasks");

  const { data: site } = await supabase
    .from("sites")
    .select("name")
    .eq("id", profile.site_id)
    .single();

  const from = searchParams.from || isoDay(-30);
  const to = searchParams.to || isoDay(0);
  const fromTs = `${from}T00:00:00`;
  const toTs = `${to}T23:59:59`;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, category, completion_note, completed_at, completed_by, verified_at, verified_by")
    .eq("site_id", profile.site_id)
    .eq("status", "completed")
    .gte("completed_at", fromTs)
    .lte("completed_at", toTs)
    .order("completed_at", { ascending: true });

  const rows = tasks ?? [];

  // Names of who completed each task
  const { data: people } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("site_id", profile.site_id);
  const nameById: Record<string, string> = {};
  (people ?? []).forEach((p) => (nameById[p.id] = p.full_name));

  // First proof image per task (signed)
  const ids = rows.map((r) => r.id);
  const proofByTask: Record<string, string> = {};
  let withPhoto = 0;
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
        if (byPath[p.storage_path] && !proofByTask[p.task_id]) {
          proofByTask[p.task_id] = byPath[p.storage_path];
        }
      });
    }
    withPhoto = ids.filter((id) => proofByTask[id]).length;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print{display:none!important;}
              body{background:#fff!important;}
              .entry{break-inside:avoid;}
              .report{box-shadow:none!important;border:none!important;}
            }
          `,
        }}
      />

      {/* Controls — hidden when printing */}
      <div className="no-print mb-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">Inspection export</h1>
          <Link href="/tasks" className="text-sm text-brand">
            ← Tasks
          </Link>
        </div>
        <form className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-card p-4">
          <label className="text-sm text-neutral">
            From
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm tabular"
            />
          </label>
          <label className="text-sm text-neutral">
            To
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="mt-1 block rounded-lg border border-line px-3 py-2 text-sm tabular"
            />
          </label>
          <button className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
            Update
          </button>
          <div className="ml-auto">
            <PrintButton />
          </div>
        </form>
      </div>

      {/* The document */}
      <div className="report rounded-xl border border-line bg-white p-6">
        <header className="border-b border-line pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-lg font-bold">
                {site?.name ?? "Site"}
              </p>
              <p className="text-sm text-neutral">
                Maintenance &amp; compliance record
              </p>
            </div>
            <div className="text-right text-sm text-neutral">
              <p>
                {new Date(from + "T00:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                –{" "}
                {new Date(to + "T00:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p>Generated {new Date().toLocaleDateString("en-GB")}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-6 text-sm">
            <span>
              <strong>{rows.length}</strong> checks completed
            </span>
            <span>
              <strong>{withPhoto}</strong> with photo evidence
            </span>
          </div>
        </header>

        {rows.length === 0 ? (
          <p className="py-10 text-center text-neutral">
            No completed checks in this period.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <div key={r.id} className="entry flex gap-4 py-4">
                {proofByTask[r.id] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={proofByTask[r.id]}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-[10px] text-neutral">
                    no photo
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{r.title}</p>
                    <p className="shrink-0 text-sm text-neutral tabular">
                      {r.completed_at ? fmtDateTime(r.completed_at) : ""}
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm text-neutral">
                    {r.category && CATEGORY_LABEL[r.category]
                      ? CATEGORY_LABEL[r.category]
                      : "—"}
                    {" · "}
                    {r.completed_by && nameById[r.completed_by]
                      ? nameById[r.completed_by]
                      : "—"}
                  </p>
                  {r.completion_note && (
                    <p className="mt-1 text-sm">{r.completion_note}</p>
                  )}
                  {r.verified_at && (
                    <p className="mt-1 text-xs text-done">
                      ✓ Verified
                      {r.verified_by && nameById[r.verified_by]
                        ? ` by ${nameById[r.verified_by]}`
                        : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 border-t border-line pt-3 text-xs text-neutral">
          Each entry is recorded with a server timestamp at the moment of
          completion. Photographs are unedited captures stored against the task.
        </p>
      </div>
    </main>
  );
}
