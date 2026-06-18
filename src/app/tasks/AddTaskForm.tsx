"use client";

import { useRef, useState } from "react";
import { addTask } from "./actions";

const CATEGORIES = [
  ["legionella", "Legionella / water"],
  ["fire", "Fire safety"],
  ["electrical", "Electrical"],
  ["general", "General repair"],
  ["other", "Other"],
];

const SOURCES = [
  ["self_created", "My own task"],
  ["manager_assigned", "Assigned by manager"],
  ["staff_reported", "Reported by staff"],
];

export default function AddTaskForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    await addTask(formData);
    formRef.current?.reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-left font-medium text-brand"
      >
        + Add a task
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl border border-line bg-card p-4 space-y-3"
    >
      <input
        name="title"
        required
        autoFocus
        placeholder="What needs doing?"
        className="w-full rounded-lg border border-line px-3 py-2.5 text-base outline-none focus:border-brand"
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Notes (optional)"
        className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          name="category"
          defaultValue="general"
          className="rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
        >
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          name="priority"
          defaultValue="medium"
          className="rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
        >
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <select
          name="source"
          defaultValue="self_created"
          className="rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
        >
          {SOURCES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          name="due_date"
          type="date"
          className="rounded-lg border border-line px-3 py-2.5 text-sm bg-white tabular"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral">
        <input
          type="checkbox"
          name="requires_photo"
          className="h-4 w-4 accent-brand"
        />
        Require a photo to mark this done
      </label>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-medium text-white"
        >
          Add task
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line px-4 py-2.5 text-neutral"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
