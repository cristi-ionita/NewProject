import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
};

export default function EmptyState({
  title,
  description,
  icon,
}: EmptyStateProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      {icon ? <div className="mb-3 flex justify-center text-white">{icon}</div> : null}
      <p className="text-sm font-semibold text-white">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
    </div>
  );
}