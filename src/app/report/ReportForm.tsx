"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createReport } from "./actions";

export default function ReportForm() {
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `reports/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("task-proofs")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      setPhotoPath(path);
      setPhotoName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function action(formData: FormData) {
    setSubmitting(true);
    setError(null);
    formData.set("photo_path", photoPath);
    try {
      await createReport(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
      setSubmitting(false);
    }
  }

  return (
    <form action={action} className="space-y-3">
      <input
        name="title"
        required
        placeholder="What's the problem?"
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-brand"
      />
      <input
        name="area"
        placeholder="Where is it? (e.g. Room 4 bathroom)"
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-brand"
      />
      <textarea
        name="details"
        rows={3}
        placeholder="Any details (optional)"
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-brand"
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPhoto}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-xl border border-dashed border-line bg-card px-4 py-3 text-left text-sm text-neutral disabled:opacity-50"
      >
        {uploading
          ? "Uploading photo…"
          : photoName
          ? `Photo added: ${photoName} — tap to replace`
          : "Add a photo (optional)"}
      </button>

      {error && <p className="text-sm text-overdue">{error}</p>}

      <button
        type="submit"
        disabled={submitting || uploading}
        className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}
