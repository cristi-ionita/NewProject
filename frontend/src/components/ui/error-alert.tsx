type ErrorAlertProps = {
  message: string;
};

export default function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="rounded-[28px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      {message}
    </div>
  );
}