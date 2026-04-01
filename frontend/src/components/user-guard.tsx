"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserSession } from "@/lib/auth";

export default function UserGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed">("checking");

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      try {
        const session = getUserSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        setStatus("allowed");
      } catch {
        router.replace("/login");
      }
    });

    return () => window.cancelAnimationFrame(id);
  }, [router]);

  if (status === "checking") {
    return <div className="p-6 text-gray-900">Se verifică sesiunea...</div>;
  }

  return <>{children}</>;
}