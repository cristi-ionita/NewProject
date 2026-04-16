"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import AdminGuard from "@/components/admin-guard";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { clearAllSessions } from "@/lib/auth";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function openSidebar(): void {
    setSidebarOpen(true);
  }

  function closeSidebar(): void {
    setSidebarOpen(false);
  }

  function handleLogout(): void {
    closeSidebar();
    clearAllSessions();
    router.replace("/admin/login");
  }

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,#334155_0%,#1e293b_42%,#0f172a_100%)]">
        <AdminSidebar
          pathname={pathname}
          open={sidebarOpen}
          onClose={closeSidebar}
          onLogout={handleLogout}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 bg-transparent md:hidden">
            <div className="px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={openSidebar}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/10 text-white shadow-[0_14px_30px_rgba(0,0,0,0.22)] backdrop-blur-md transition-all duration-200 hover:bg-white/14"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </header>

          <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}