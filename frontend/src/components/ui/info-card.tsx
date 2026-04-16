import type { ReactNode } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type InfoCardProps = {
  icon: ReactNode;
  title: string;
  value: string;
  badgeClass?: string;
  dark?: boolean;
};

export default function InfoCard({
  icon,
  title,
  value,
  badgeClass,
  dark,
}: InfoCardProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)]",
        dark
          ? "border border-white/10 bg-white/10 text-white backdrop-blur-xl"
          : "border border-white/10 bg-gradient-to-b from-white to-slate-50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-[16px]",
            dark ? "bg-black text-white" : "bg-slate-950 text-white"
          )}
        >
          {icon}
        </div>
      </div>

      <p
        className={cn(
          "mt-4 text-sm font-medium",
          dark ? "text-slate-300" : "text-slate-500"
        )}
      >
        {title}
      </p>

      {badgeClass ? (
        <span
          className={cn(
            "mt-3 inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold",
            badgeClass
          )}
        >
          {value}
        </span>
      ) : (
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tracking-tight",
            dark ? "text-white" : "text-slate-950"
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}