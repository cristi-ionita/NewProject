function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type FilterButtonProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  variant: "blue" | "slate" | "amber";
};

export default function FilterButton({
  active,
  onClick,
  label,
  variant,
}: FilterButtonProps) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200";

  const dotClass =
    variant === "blue"
      ? "bg-blue-500"
      : variant === "amber"
      ? "bg-amber-500"
      : "bg-slate-500";

  const activeClass =
    variant === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
      : variant === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700 shadow-sm"
      : "border-slate-200 bg-slate-100 text-slate-900 shadow-sm";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        base,
        active
          ? activeClass
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      {label}
    </button>
  );
}