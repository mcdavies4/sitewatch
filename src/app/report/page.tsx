import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReportForm from "./ReportForm";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { sent?: string };
}) {
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

  const sent = searchParams.sent === "1";

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Report an issue</h1>
          <p className="text-xs text-neutral">Sends it straight to maintenance</p>
        </div>
        <Link href="/tasks" className="text-sm text-brand">
          ← Tasks
        </Link>
      </header>

      {sent ? (
        <div className="rounded-xl border border-line bg-card p-5 text-center">
          <p className="font-medium text-done">Report sent</p>
          <p className="mt-1 text-sm text-neutral">
            Maintenance can see it now. Thanks for flagging it.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/report"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              Report another
            </Link>
            <Link
              href="/tasks"
              className="rounded-lg border border-line px-4 py-2 text-sm"
            >
              Done
            </Link>
          </div>
        </div>
      ) : (
        <ReportForm />
      )}
    </main>
  );
}
