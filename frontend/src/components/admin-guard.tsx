"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getAdminToken } from "@/lib/auth";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const token = getAdminToken();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [token, router]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Se verifică sesiunea...</p>
      </div>
    );
  }

  return <>{children}</>;
}