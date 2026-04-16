type DashboardInfoStatProps = {
  label: string;
  value: number;
};

export default function DashboardInfoStat({
  label,
  value,
}: DashboardInfoStatProps) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}