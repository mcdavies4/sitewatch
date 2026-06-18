export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDue(due: string | null): string {
  if (!due) return "No date";
  const today = todayISO();
  if (due === today) return "Today";
  const d = new Date(due + "T00:00:00");
  const t = new Date(today + "T00:00:00");
  const diffDays = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return due < todayISO();
}
