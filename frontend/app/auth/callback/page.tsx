"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard");
        return;
      }

      const hash = window.location.hash.replace(/^#/, "");
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        setMessage("Invalid or expired link. Redirecting to sign in…");
        setTimeout(() => router.replace("/login"), 2000);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        setMessage(error.message);
        setTimeout(() => router.replace("/login"), 3000);
        return;
      }

      router.replace("/profile");
    };

    void run();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base px-4 gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <p className="text-sm text-foreground-secondary text-center">{message}</p>
    </div>
  );
}
