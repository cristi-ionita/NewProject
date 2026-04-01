"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMechanicSession } from "@/lib/auth";

export default function MechanicGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const session = getMechanicSession();

    if (!session || session.role !== "mechanic") {
      router.replace("/login");
      return;
    }

    setAllowed(true);
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Checking access...</p>
      </div>
    );
  }

  return <>{children}</>;
}