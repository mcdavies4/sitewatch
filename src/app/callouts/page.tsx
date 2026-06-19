import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDue, isOverdue } from "@/lib/dates";
import NewCallout from "./NewCallout";
import { setCalloutStatus, deleteCallout } from "./actions";

export const dynamic = "force-dynamic";

type Callout = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  contractor_name: string | null;
  contractor_contact: string | null;
};

function contactHref(contact: string): string {
  return contact.includes("@")
    ? `mailto:${contact}`
    : `tel:${contact.replace(/\s+/g, "")}`;
}

function CalloutCard({ c }: { c: Callout }) {
  const done = c.status === "completed";
  const chase = !done && isOverdue(c.due_date);
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-card">
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: done ? "#15803D" : chase ? "#DC2626" : "#0E5C55" }}
      />
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className={`font-medium leading-snug ${done ? "text-neutral line-through" : ""}`}>
            {c.title}
          </p>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular ${
              chase
                ? "bg-overdue/10 text-overdue"
                : done
                ? "bg-done/10 text-done"
                : "bg-paper text-neutral"
            }`}
          >
            {done ? "Done" : chase ? "Chase" : formatDue(c.due_date)}
          </span>
        </div>

        {(c.contractor_name || c.contractor_contact) && (
          <div className="mt-1.5 text-sm text-neutral">
            {c.contractor_name && <span>{c.contractor_name}</span>}
            {c.contractor_contact && (
              <>
                {c.contractor_name && " · "}
                <a
                  href={contactHref(c.contractor_contact)}
                  className="font-medium text-brand"
                >
                  {c.contractor_contact}
                </a>
              </>
            )}
          </div>
        )}

        {c.description && (
          <p className="mt-1 text-sm text-neutral">{c.description}</p>
        )}

        <div className="mt-2.5 flex justify-end gap-1.5">
          {done ? (
            <form action={setCalloutStatus}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value="open" />
              <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-neutral">
                Reopen
              </button>
            </form>
          ) : (
            <>
              {c.status === "open" && (
                <form action={setCalloutStatus}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="status" value="in_progress" />
                  <button className="rounded-lg border border-line px-3 py-1.5 text-sm">
                    Attending
                  </button>
                </form>
              )}
              <form action={setCalloutStatus}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="status" value="completed" />
                <button className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
                  Done
                </button>
              </form>
            </>
          )}
          <form action={deleteCallout}>
            <input type="hidden" name="id" value={c.id} />
            <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-overdue">
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default async function CalloutsPage() {
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

  const { data: open } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, due_date, contractor_name, contractor_contact"
    )
    .eq("site_id", profile.site_id)
    .eq("source", "contractor_callout")
    .in("status", ["open", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false });

  const { data: done } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, due_date, contractor_name, contractor_contact"
    )
    .eq("site_id", profile.site_id)
    .eq("source", "contractor_callout")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(15);

  const active = open ?? [];
  const chasing = active.filter((c) => isOverdue(c.due_date));
  const waiting = active.filter((c) => !isOverdue(c.due_date));
  const completed = done ?? [];

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Call-outs</h1>
          <p className="text-xs text-neutral">Contractor jobs &amp; chasing</p>
        </div>
        <Link href="/tasks" className="text-sm text-brand">
          ← Tasks
        </Link>
      </header>

      <div className="mb-4">
        <NewCallout />
      </div>

      {chasing.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-overdue">
            Needs chasing ({chasing.length})
          </h2>
          <div className="space-y-2">
            {chasing.map((c) => (
              <CalloutCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold">Open ({waiting.length})</h2>
        {waiting.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card px-4 py-8 text-center text-sm text-neutral">
            No open call-outs.
          </div>
        ) : (
          <div className="space-y-2">
            {waiting.map((c) => (
              <CalloutCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Recently completed</h2>
          <div className="space-y-2">
            {completed.map((c) => (
              <CalloutCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
