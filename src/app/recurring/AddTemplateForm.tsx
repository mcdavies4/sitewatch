"use client";

import { useRef, useState } from "react";
import { createTemplate, quickAddPreset } from "./actions";

const CATEGORIES = [
  ["legionella", "Legionella / water"],
  ["fire", "Fire safety"],
  ["electrical", "Electrical"],
  ["general", "General"],
  ["other", "Other"],
];

const PRESETS = [
  ["flush", "Weekly flush"],
  ["watertemp", "Water temps"],
  ["firealarm", "Fire alarm test"],
  ["emergency", "Emergency lighting"],
  ["firedoor", "Fire doors"],
  ["walkaround", "Walk-around"],
];

export default function AddTemplateForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    await createTemplate(formData);
    formRef.current?.reset();
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral">
          Quick add
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([key, label]) => (
            <form key={key} action={quickAddPreset}>
              <input type="hidden" name="key" value={key} />
              <button
                type="submit"
                className="rounded-full border border-line bg-card px-3 py-1.5 text-sm"
              >
                + {label}
              </button>
            </form>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral">
          Presets start weekly/monthly with photo required — adjust each one&apos;s
          frequency to match your site&apos;s policy.
        </p>
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-left font-medium text-brand"
        >
          + Custom recurring task
        </button>
      ) : (
        <form
          ref={formRef}
          action={action}
          className="rounded-xl border border-line bg-card p-4 space-y-3"
        >
          <input
            name="title"
            required
            autoFocus
            placeholder="e.g. Hoist (LOLER) check"
            className="w-full rounded-lg border border-line px-3 py-2.5 text-base outline-none focus:border-brand"
          />
          <input
            name="description"
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral">Every</span>
              <input
                name="interval_n"
                type="number"
                min={1}
                defaultValue={1}
                className="w-14 rounded-lg border border-line px-2 py-2.5 text-sm tabular"
              />
              <select
                name="frequency"
                defaultValue="weekly"
                className="flex-1 rounded-lg border border-line px-2 py-2.5 text-sm bg-white"
              >
                <option value="daily">day(s)</option>
                <option value="weekly">week(s)</option>
                <option value="monthly">month(s)</option>
                <option value="quarterly">quarter(s)</option>
                <option value="yearly">year(s)</option>
              </select>
            </div>
          </div>
          <label className="block text-sm text-neutral">
            First due
            <input
              name="next_due_date"
              type="date"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm bg-white tabular"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral">
            <input
              type="checkbox"
              name="requires_photo"
              defaultChecked
              className="h-4 w-4 accent-brand"
            />
            Require a photo to mark done
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-medium text-white"
            >
              Create recurring task
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
      )}
    </div>
  );
}
