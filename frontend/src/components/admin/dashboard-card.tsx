import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type DashboardCardProps = {
  title: string;
  value: number;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
};

export default function DashboardCard({
  title,
  value,
  icon,
  isActive,
  onClick,
}: DashboardCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-[164px] flex-col justify-between rounded-[28px] border border-white/10 bg-white/10 p-5 text-left shadow-[0_8px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white/14 hover:shadow-[0_20px_50px_rgba(0,0,0,0.26)]",
        isActive && "ring-2 ring-white/20"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-black text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-1">
          {icon}
        </div>

        <span className="text-3xl font-semibold tracking-tight text-white">
          {value}
        </span>
      </div>

      <p className="text-[15px] font-semibold tracking-tight text-white">
        {title}
      </p>
    </button>
  );
}