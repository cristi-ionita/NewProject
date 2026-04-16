"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

import UserSidebar from "@/components/layout/user-sidebar";
import { clearUserSession } from "@/lib/auth";

export default function EmployeeAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    clearUserSession();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,#334155_0%,#1e293b_42%,#0f172a_100%)]">
      <UserSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="p-4 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition hover:bg-white/15"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}