import { AlertCircle, CheckCircle2, Loader2, SearchX } from "lucide-react";

export const fieldClass =
  "mt-1.5 h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-gray-50";

export const textareaClass =
  "mt-1.5 min-h-20 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-teal-100";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variants = {
    primary: "bg-brand text-white hover:bg-teal-800 disabled:bg-teal-300",
    secondary: "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:text-gray-400",
    danger: "border border-red-200 bg-white text-danger hover:bg-red-50 disabled:text-red-300"
  };

  return (
    <button
      {...props}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Alert({ type, message }: { type: "success" | "error"; message: string }) {
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;
  const styles = type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-danger";

  return (
    <div className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-sm text-muted">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white px-4 text-center">
      <SearchX className="h-7 w-7 text-gray-400" />
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}

export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "PAGO" || status === "ATIVO"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "ATRASADO" || status === "INATIVO"
        ? "bg-red-50 text-red-700 ring-red-200"
        : "bg-amber-50 text-amber-700 ring-amber-200";

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${tone}`}>{status}</span>;
}
