export default function LoadingCard() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
        <p className="text-sm font-medium text-slate-200">
          Loading...
        </p>
      </div>
    </div>
  );
}