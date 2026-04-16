"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import LoadingCard from "@/components/ui/loading-card";
import { getUserSession } from "@/lib/auth";

export default function UserGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const session = getUserSession();

    if (!session?.unique_code) {
      setAllowed(false);
      setChecked(true);
      router.replace("/login");
      return;
    }

    setAllowed(true);
    setChecked(true);
  }, [router]);

  if (!checked) {
    return <LoadingCard />;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}