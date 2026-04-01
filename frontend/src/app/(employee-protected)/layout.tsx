"use client";

import UserGuard from "@/components/user-guard";

export default function EmployeeProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserGuard>{children}</UserGuard>;
}