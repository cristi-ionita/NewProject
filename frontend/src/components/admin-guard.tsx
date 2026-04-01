"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/auth";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      const token = getAdminToken();

      if (!token) {
        router.replace("/admin/login");
        return;
      }

      setStatus("allowed");
    });

    return () => window.cancelAnimationFrame(id);
  }, [router]);

  if (status === "checking") {
    return <div className="p-6">Se verifică sesiunea...</div>;
  }

  return <>{children}</>;
}