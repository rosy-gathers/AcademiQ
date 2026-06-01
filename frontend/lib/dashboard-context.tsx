"use client";

import { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

type DashboardContextValue = {
  user: User;
  userId: string;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <DashboardContext.Provider value={{ user, userId: user.id }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardUser(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardUser must be used within DashboardProvider");
  }
  return ctx;
}
