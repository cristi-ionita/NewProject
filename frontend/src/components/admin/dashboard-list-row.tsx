type DashboardListRowProps = {
  title: string;
  subtitle: string;
};

export default function DashboardListRow({
  title,
  subtitle,
}: DashboardListRowProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}