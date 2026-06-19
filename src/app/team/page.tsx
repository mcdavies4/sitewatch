import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createInvite, revokeInvite } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  maintenance: "Maintenance",
  care_staff: "Care staff",
  contractor: "Contractor",
};

export default async function TeamPage() {
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

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("site_id", profile.site_id)
    .order("full_name", { ascending: true });

  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, role, status")
    .eq("site_id", profile.site_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Team</h1>
          <p className="text-xs text-neutral">Who can access this site</p>
        </div>
        <Link href="/tasks" className="text-sm text-brand">
          ← Tasks
        </Link>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Invite someone</h2>
        <form
          action={createInvite}
          className="rounded-xl border border-line bg-card p-4 space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="their work email"
            className="w-full rounded-lg border border-line px-3 py-2.5 text-base outline-none focus:border-brand"
          />
          <select
            name="role"
            defaultValue="care_staff"
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
          >
            <option value="manager">Manager — oversight &amp; sign-off</option>
            <option value="maintenance">Maintenance — does the checks</option>
            <option value="care_staff">Care staff — reports issues</option>
            <option value="contractor">Contractor</option>
          </select>
          <button className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white">
            Send invite
          </button>
          <p className="text-xs text-neutral">
            They join by signing in with this exact email and accepting. Share
            the app link with them.
          </p>
        </form>
      </section>

      {invites && invites.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">
            Pending invites ({invites.length})
          </h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-neutral">
                    {ROLE_LABEL[inv.role] ?? inv.role}
                  </p>
                </div>
                <form action={revokeInvite}>
                  <input type="hidden" name="id" value={inv.id} />
                  <button className="rounded-lg border border-line px-3 py-1.5 text-sm text-overdue">
                    Revoke
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">
          Members ({members?.length ?? 0})
        </h2>
        <div className="rounded-xl border border-line bg-card divide-y divide-line">
          {(members ?? []).map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm font-medium">
                {m.full_name}
                {m.id === user.id && (
                  <span className="ml-1 text-xs text-neutral">(you)</span>
                )}
              </span>
              <span className="rounded bg-paper px-2 py-0.5 text-xs text-neutral">
                {ROLE_LABEL[m.role] ?? m.role}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
