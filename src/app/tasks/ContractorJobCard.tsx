import { setMyJobStatus } from "@/app/callouts/actions";
import { formatDue, isOverdue } from "@/lib/dates";

type Job = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
};

export default function ContractorJobCard({ job }: { job: Job }) {
  const done = job.status === "completed";
  const overdue = !done && isOverdue(job.due_date);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-card">
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: done ? "#15803D" : overdue ? "#DC2626" : "#0E5C55" }}
      />
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className={`font-medium leading-snug ${done ? "text-neutral line-through" : ""}`}>
            {job.title}
          </p>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular ${
              overdue
                ? "bg-overdue/10 text-overdue"
                : done
                ? "bg-done/10 text-done"
                : "bg-paper text-neutral"
            }`}
          >
            {done ? "Done" : formatDue(job.due_date)}
          </span>
        </div>

        {job.description && (
          <p className="mt-1 text-sm text-neutral">{job.description}</p>
        )}

        {!done && (
          <div className="mt-2.5 flex justify-end gap-1.5">
            {job.status === "open" && (
              <form action={setMyJobStatus}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="status" value="in_progress" />
                <button className="rounded-lg border border-line px-3 py-1.5 text-sm">
                  On my way
                </button>
              </form>
            )}
            <form action={setMyJobStatus}>
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="completed" />
              <button className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
                Mark done
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
