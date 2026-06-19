import { createSite, acceptInvite } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  maintenance: "Maintenance",
  care_staff: "Care staff",
  contractor: "Contractor",
};

type Invite = {
  id: string;
  role: string;
  sites: { name: string } | null;
};

export default function Onboarding({ invites }: { invites: Invite[] }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      {invites.length > 0 ? (
        <>
          <h1 className="font-display text-2xl font-bold">
            You&apos;ve been invited
          </h1>
          <p className="mt-2 text-neutral">
            Join the site you&apos;ve been added to.
          </p>
          <div className="mt-5 space-y-2">
            {invites.map((inv) => (
              <form
                key={inv.id}
                action={acceptInvite}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3"
              >
                <input type="hidden" name="id" value={inv.id} />
                <div>
                  <p className="font-medium">{inv.sites?.name ?? "A site"}</p>
                  <p className="text-xs text-neutral">
                    as {ROLE_LABEL[inv.role] ?? inv.role}
                  </p>
                </div>
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">
                  Accept
                </button>
              </form>
            ))}
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-neutral">
            <span className="h-px flex-1 bg-line" />
            or set up your own
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold">Name your site</h1>
          <p className="mt-2 text-neutral">
            This is the building or home you look after. You can rename it later.
          </p>
        </>
      )}

      <form action={createSite} className="space-y-3">
        <input
          name="name"
          required
          placeholder="e.g. Maple House Care Home"
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white"
        >
          Create site
        </button>
      </form>
    </main>
  );
}
