"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MechanicGuard from "@/components/mechanic-guard";
import MechanicSidebar from "@/components/layout/mechanic-sidebar";
import { clearMechanicSession } from "@/lib/auth";

export default function MechanicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  function handleLogout() {
    clearMechanicSession();
    router.replace("/login");
  }

  return (
    <MechanicGuard>
      <div className="flex min-h-screen bg-[#eef3f8]">
        <MechanicSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />

        <div className="flex flex-1 flex-col">
          <div className="p-4 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ☰
            </button>
          </div>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </MechanicGuard>
  );
}