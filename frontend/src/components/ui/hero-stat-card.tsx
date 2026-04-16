import type { ReactNode } from "react";

type HeroStatCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
};

export default function HeroStatCard({
  icon,
  label,
  value,
}: HeroStatCardProps) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/10 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        {icon}
        <span>{label}</span>
      </div>

      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  );
}