"use client";

import { useState } from "react";
import { assignCallout } from "./actions";

export default function AssignControl({
  calloutId,
  assignedTo,
  assignedName,
  contractors,
}: {
  calloutId: string;
  assignedTo: string | null;
  assignedName: string | null;
  contractors: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (contractors.length === 0) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-brand"
      >
        {assignedTo ? `Assigned: ${assignedName ?? "contractor"} · change` : "Assign to contractor"}
      </button>
    );
  }

  return (
    <form action={assignCallout} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={calloutId} />
      <select
        name="assigned_to"
        defaultValue={assignedTo ?? ""}
        className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs"
      >
        <option value="">Unassign</option>
        {contractors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name}
          </option>
        ))}
      </select>
      <button className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white">
        Save
      </button>
    </form>
  );
}
