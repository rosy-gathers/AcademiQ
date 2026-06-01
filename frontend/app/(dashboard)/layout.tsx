"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import DashboardSidebar, {
  DashboardMobileHeader,
} from "@/components/dashboard/DashboardSidebar";
import OfflineBanner from "@/components/OfflineBanner";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { syncUser } from "@/lib/api";
import { DashboardProvider } from "@/lib/dashboard-context";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        router.replace("/login");
        return;
      }
      const sessionUser = data.session.user;
      try {
        await syncUser(sessionUser.id, sessionUser.email ?? "");
      } catch {
        // Non-fatal; upload also provisions the user row.
      }
      setUser(sessionUser);
      setLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
      } else {
        const sessionUser = session.user;
        syncUser(sessionUser.id, sessionUser.email ?? "").catch(() => undefined);
        setUser(sessionUser);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider user={user}>
      <div className="min-h-screen flex bg-base">
        <DashboardSidebar
          user={user}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSignOut={handleSignOut}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardMobileHeader onMenuOpen={() => setSidebarOpen(true)} />

          <main className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
              <ServiceWorkerRegister />
              <OfflineBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
}
