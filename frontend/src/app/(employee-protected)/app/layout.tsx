"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex min-h-screen bg-[#eef3f8]">
      <UserSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 flex-col">
        <div className="p-4 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Open sidebar"
          >
            ☰
          </button>
        </div>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}