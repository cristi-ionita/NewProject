"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

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
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,#334155_0%,#1e293b_42%,#0f172a_100%)]">
        <MechanicSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-white/10 bg-slate-950/40 px-4 py-4 backdrop-blur-md md:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white shadow-sm transition hover:bg-white/15"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </MechanicGuard>
  );
}