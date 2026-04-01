"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminGuard from "@/components/admin-guard";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { clearAdminToken } from "@/lib/auth";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

export default function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    clearAdminToken();
    router.replace("/login");
  }

  function openSidebar() {
    setSidebarOpen(true);
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-[#eef3f8]">
        <AdminSidebar
          pathname={pathname}
          open={sidebarOpen}
          onClose={closeSidebar}
          onLogout={handleLogout}
        />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 bg-transparent md:hidden">
            <div className="flex items-center px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={openSidebar}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Open sidebar"
              >
                ☰
              </button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}