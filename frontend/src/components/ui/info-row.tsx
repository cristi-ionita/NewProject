import type { ReactNode } from "react";

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
};

export default function InfoRow({
  icon,
  label,
  value,
}: InfoRowProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}