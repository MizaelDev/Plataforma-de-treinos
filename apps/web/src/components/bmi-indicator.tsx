import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatDecimal } from "@/lib/format";

type BmiLevel = "low" | "ok" | "warning" | "danger" | "neutral";

function parseBmi(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getBmiStatus(value?: string | number | null): { label: string; level: BmiLevel; alert: boolean } {
  const bmi = parseBmi(value);

  if (bmi === null) {
    return { label: "Sem IMC", level: "neutral", alert: false };
  }

  if (bmi < 18.5) {
    return { label: "Abaixo do peso", level: "warning", alert: true };
  }

  if (bmi < 25) {
    return { label: "Adequado", level: "ok", alert: false };
  }

  if (bmi < 30) {
    return { label: "Acima do peso", level: "danger", alert: true };
  }

  return { label: "Obesidade", level: "danger", alert: true };
}

const levelClasses: Record<BmiLevel, string> = {
  low: "border-sky-200 bg-sky-50 text-sky-800",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  neutral: "border-gray-200 bg-gray-50 text-gray-700"
};

export function BmiIndicator({ value, compact = false }: { value?: string | number | null; compact?: boolean }) {
  const status = getBmiStatus(value);
  const Icon = status.alert ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-md border font-semibold",
        levelClasses[status.level],
        compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
      ].join(" ")}
    >
      <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span>IMC {formatDecimal(value)}</span>
      <span className="font-medium opacity-80">({status.label})</span>
    </div>
  );
}
