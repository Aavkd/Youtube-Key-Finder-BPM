"use client";

import * as React from "react";

import { NavRail } from "@/components/nav-rail";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="kf-app-shell flex w-full">
      <NavRail />
      <main className="kf-app-main relative min-w-0 flex-1">{children}</main>
    </div>
  );
}
