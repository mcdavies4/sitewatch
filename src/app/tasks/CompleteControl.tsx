"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { completeTask, completeWithProof } from "./actions";

export default function CompleteControl({
  taskId,
  requiresPhoto,
}: {
  taskId: string;
  requiresPhoto: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onDone() {
    setError(null);
    if (requiresPhoto) {
      inputRef.current?.click();
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", taskId);
        await completeTask(fd);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not complete");
      }
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${taskId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("task-proofs")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const fd = new FormData();
      fd.set("id", taskId);
      fd.set("path", path);
      await completeWithProof(fd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      {error && <span className="text-xs text-overdue">{error}</span>}
      <button
        onClick={onDone}
        disabled={pending || uploading}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {uploading ? "Saving…" : requiresPhoto ? "Done + photo" : "Done"}
      </button>
    </div>
  );
}
