"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 max-w-md mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M7 12l3 3 7-8"
                stroke="#12B0A0"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-xl font-bold tracking-tight">
            Sitewatch
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight">
          Sign in
        </h1>
        <p className="mt-2 text-neutral">
          Enter your work email and we&apos;ll send a one-tap sign-in link.
        </p>
      </div>

      {sent ? (
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-sm text-neutral">
            We sent a sign-in link to {email}. Open it on this device to
            continue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@work.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-brand"
          />
          {error && <p className="text-sm text-overdue">{error}</p>}
          <button
            onClick={sendLink}
            disabled={loading || !email}
            className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send sign-in link"}
          </button>
        </div>
      )}
    </main>
  );
}
