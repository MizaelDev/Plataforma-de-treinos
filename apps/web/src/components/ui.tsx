import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, SearchX, X } from "lucide-react";

export const fieldClass =
  "mt-1.5 h-10 w-full rounded-md border border-[#ded7cf] bg-[#fffdfa] px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50";

export const textareaClass =
  "mt-1.5 min-h-20 w-full rounded-md border border-[#ded7cf] bg-[#fffdfa] px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-orange-100";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variants = {
    primary: "bg-brand text-white shadow-sm shadow-orange-900/10 hover:bg-brandDark disabled:bg-orange-300",
    secondary: "border border-[#ded7cf] bg-[#fffdfa] text-gray-800 hover:border-orange-200 hover:bg-orange-50 disabled:text-gray-400",
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
  const styles = type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-danger";

  return (
    <div className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-[#ded7cf] bg-[#fffdfa] text-sm text-muted">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-[#ded7cf] bg-[#fffdfa] px-4 py-6 text-center">
      <SearchX className="h-7 w-7 text-gray-400" />
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-[#ded7cf] bg-[#fffdfa] shadow-sm shadow-stone-900/5 ${className}`}>{children}</section>;
}

export function FieldGroup({ title, description, children, className = "" }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[#ded7cf] bg-[#fffdfa] p-4 ${className}`}>
      <div className="mb-4">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  );
}

export function MobileRecordCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-[#ded7cf] bg-[#fffdfa] p-4 shadow-sm shadow-stone-900/5 ${className}`}>{children}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "PAGO" || status === "ATIVO" || status === "EM DIA"
      ? "bg-emerald-950/45 text-emerald-300 ring-emerald-500/40"
      : status === "ATRASADO" || status === "INATIVO" || status === "INADIMPLENTE" || status === "CANCELADO"
        ? "bg-red-50 text-red-700 ring-red-200"
        : "bg-orange-50 text-orange-800 ring-orange-200";

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${tone}`}>{status}</span>;
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  children
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#ded7cf] bg-[#fffdfa] p-4 md:flex-row md:items-end md:justify-between">
      <label className="w-full text-sm font-medium text-gray-700 md:max-w-sm">
        Busca
        <input className={fieldClass} value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} />
      </label>
      {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#ded7cf] px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
      <span>{totalItems} registro{totalItems === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" className="h-8 px-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-20 text-center font-medium text-gray-700">
          {page} / {totalPages}
        </span>
        <Button type="button" variant="secondary" className="h-8 px-2" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
          <button type="button" aria-label="Fechar" className="rounded-md p-1 text-gray-500 hover:bg-gray-50" onClick={onCancel}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
