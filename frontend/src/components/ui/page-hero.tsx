import type { ReactNode } from "react";

type PageHeroProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  stats?: ReactNode;
  className?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PageHero({
  icon,
  title,
  description,
  actions,
  stats,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        className
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-white shadow-[0_14px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
            {icon}
          </div>

          <h1 className="mt-4 text-[32px] font-semibold tracking-tight text-white">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>

      {stats ? <div className="mt-6">{stats}</div> : null}
    </section>
  );
}