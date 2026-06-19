import TaskActions from "./TaskActions";
import { formatDue, isOverdue } from "@/lib/dates";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  source: string;
  priority: string;
  status: string;
  due_date: string | null;
  reported_by_name: string | null;
  requires_photo: boolean;
  completion_note?: string | null;
  verified_at?: string | null;
  report_photo_path?: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  legionella: "Water",
  fire: "Fire",
  electrical: "Electrical",
  general: "General",
  other: "Other",
};

const SOURCE_LABEL: Record<string, string> = {
  recurring_statutory: "Statutory",
  staff_reported: "Reported",
  manager_assigned: "Manager",
  self_created: "Self",
  contractor_callout: "Contractor",
};

function railColor(task: Task): string {
  if (task.status === "completed") return "#15803D";
  if (isOverdue(task.due_date)) return "#DC2626";
  if (task.priority === "high") return "#D97706";
  return "#0E5C55";
}

export default function TaskCard({
  task,
  proofUrl,
  reportPhotoUrl,
}: {
  task: Task;
  proofUrl?: string;
  reportPhotoUrl?: string;
}) {
  const done = task.status === "completed";
  const overdue = !done && isOverdue(task.due_date);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-card">
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: railColor(task) }}
      />
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`font-medium leading-snug ${
                done ? "text-neutral line-through" : ""
              }`}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="mt-0.5 text-sm text-neutral line-clamp-2">
                {task.description}
              </p>
            )}
            {task.source === "staff_reported" && task.reported_by_name && (
              <p className="mt-0.5 text-xs text-neutral">
                from {task.reported_by_name}
              </p>
            )}
            {!done && reportPhotoUrl && (
              <a
                href={reportPhotoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reportPhotoUrl}
                  alt="Reported issue"
                  className="h-16 w-16 rounded-lg border border-line object-cover"
                />
              </a>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium tabular ${
                overdue
                  ? "bg-overdue/10 text-overdue"
                  : done
                  ? "bg-done/10 text-done"
                  : "bg-paper text-neutral"
              }`}
            >
              {done ? "Done" : formatDue(task.due_date)}
            </span>
            {done && task.verified_at && (
              <span className="rounded-md bg-done/10 px-2 py-0.5 text-xs font-medium text-done">
                ✓ Verified
              </span>
            )}
            {!done && task.requires_photo && (
              <span className="text-xs text-neutral">photo needed</span>
            )}
          </div>
        </div>

        {done && (proofUrl || task.completion_note) && (
          <div className="mt-2 flex items-start gap-3">
            {proofUrl && (
              <a href={proofUrl} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofUrl}
                  alt="Completion proof"
                  className="h-20 w-20 rounded-lg border border-line object-cover"
                />
              </a>
            )}
            {task.completion_note && (
              <p className="text-sm text-neutral">
                <span className="font-medium text-ink">Note: </span>
                {task.completion_note}
              </p>
            )}
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-neutral">
            {task.category && CATEGORY_LABEL[task.category] && (
              <span className="rounded bg-paper px-1.5 py-0.5">
                {CATEGORY_LABEL[task.category]}
              </span>
            )}
            <span className="rounded bg-paper px-1.5 py-0.5">
              {SOURCE_LABEL[task.source] ?? task.source}
            </span>
          </div>
        </div>

        <div className="mt-2">
          <TaskActions
            taskId={task.id}
            status={task.status}
            requiresPhoto={task.requires_photo}
          />
        </div>
      </div>
    </div>
  );
}
