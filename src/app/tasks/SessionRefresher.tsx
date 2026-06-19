"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the Supabase session from going stale when the app is left open.
 * On every return to the tab/app (focus or visibility change) it asks
 * Supabase for the current user, which refreshes the token if needed, then
 * refreshes server components so their cookies are current. Also reacts to
 * Supabase's own auth events.
 */
export default function SessionRefresher() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      await supabase.auth.getUser();
      router.refresh();
    }

    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT"
      ) {
        router.refresh();
      }
    });

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
