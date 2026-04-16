import type { ReactNode } from "react";

type SectionCardProps = {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SectionCard({
  children,
  title,
  icon,
  actions,
  className,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                {icon}
              </div>
            ) : null}

            {title ? (
              <h2 className="text-[16px] font-semibold text-slate-900">
                {title}
              </h2>
            ) : null}
          </div>

          {actions ? <div>{actions}</div> : null}
        </div>
      )}

      {children}
    </div>
  );
}