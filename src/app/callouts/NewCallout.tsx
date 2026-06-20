"use client";

import { useRef, useState } from "react";
import { createCallout } from "./actions";

export default function NewCallout({
  contractors,
}: {
  contractors: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    await createCallout(formData);
    formRef.current?.reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-left font-medium text-brand"
      >
        + Log a call-out
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
        placeholder="What needs doing? (e.g. Boiler leak — plumber)"
        className="w-full rounded-lg border border-line px-3 py-2.5 text-base outline-none focus:border-brand"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="contractor_name"
          placeholder="Contractor / company"
          className="rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        <input
          name="contractor_contact"
          placeholder="Phone or email"
          className="rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>
      <label className="block text-sm text-neutral">
        Expected by
        <input
          name="expected"
          type="date"
          className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm bg-white tabular"
        />
      </label>
      {contractors.length > 0 && (
        <label className="block text-sm text-neutral">
          Assign to a contractor account (optional — they get an email)
          <select
            name="assigned_to"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Not assigned</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </label>
      )}
      <textarea
        name="details"
        rows={2}
        placeholder="Details (optional)"
        className="w-full rounded-lg border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-medium text-white"
        >
          Log call-out
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
