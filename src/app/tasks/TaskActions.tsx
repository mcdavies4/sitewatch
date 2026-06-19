"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  startTask,
  completeTask,
  completeWithProof,
  reopenTask,
  deleteTask,
} from "./actions";

function isAuthError(msg: string) {
  return /jwt|token|auth|session|expired|sign in|not authenticated/i.test(msg);
}

export default function TaskActions({
  taskId,
  status,
  requiresPhoto,
}: {
  taskId: string;
  status: string;
  requiresPhoto: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const done = status === "completed";
  const busy = pending || uploading;

  function handle(err: unknown, fallback: string) {
    const msg = err instanceof Error ? err.message : fallback;
    if (isAuthError(msg)) setExpired(true);
    else setError(msg);
  }

  function run(fn: (fd: FormData) => Promise<void>, extra?: Record<string, string>) {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", taskId);
        if (extra) for (const [k, v] of Object.entries(extra)) fd.set(k, v);
        await fn(fd);
      } catch (e) {
        handle(e, "Something went wrong");
      }
    });
  }

  function onConfirmComplete() {
    if (requiresPhoto) {
      inputRef.current?.click();
      return;
    }
    run(completeTask, { note });
    setOpen(false);
    setNote("");
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
      fd.set("note", note);
      await completeWithProof(fd);
      setOpen(false);
      setNote("");
    } catch (err) {
      handle(err, "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDelete() {
    if (!window.confirm("Delete this task? This can't be undone.")) return;
    run(deleteTask);
  }

  if (expired) {
    return (
      <Link href="/login" className="text-sm font-medium text-overdue underline">
        Session expired — sign in
      </Link>
    );
  }

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      <div className="flex items-center justify-end gap-1.5">
        {error && <span className="mr-auto text-xs text-overdue">{error}</span>}

        {done ? (
          <>
            <button
              onClick={() => run(reopenTask)}
              disabled={busy}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-neutral disabled:opacity-50"
            >
              Reopen
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-overdue disabled:opacity-50"
            >
              Delete
            </button>
          </>
        ) : (
          <>
            {status === "open" && (
              <button
                onClick={() => run(startTask)}
                disabled={busy}
                className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Start
              </button>
            )}
            <button
              onClick={onDelete}
              disabled={busy}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-neutral disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={() => setOpen((o) => !o)}
              disabled={busy}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {uploading ? "Saving…" : requiresPhoto ? "Done + photo" : "Done"}
            </button>
          </>
        )}
      </div>

      {open && !done && (
        <div className="mt-2 rounded-lg border border-line bg-paper p-2.5">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional) — e.g. a reading"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={onConfirmComplete}
              disabled={busy}
              className="flex-1 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {requiresPhoto ? "Take photo & finish" : "Complete"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setNote("");
              }}
              className="rounded-md border border-line px-3 py-2 text-sm text-neutral"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
