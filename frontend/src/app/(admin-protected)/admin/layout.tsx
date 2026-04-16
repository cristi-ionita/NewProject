import type { ReactNode } from "react";

type AdminSectionLayoutProps = {
  children: ReactNode;
};

export default function AdminSectionLayout({
  children,
}: AdminSectionLayoutProps) {
  return <div className="flex flex-col gap-6">{children}</div>;
}