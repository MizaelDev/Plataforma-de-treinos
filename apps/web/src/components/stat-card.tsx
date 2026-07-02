import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "brand"
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: "brand" | "amber" | "red" | "blue" | "gray";
}) {
  const tones = {
    brand: "bg-orange-500/14 text-orange-300 ring-orange-500/30",
    amber: "bg-amber-500/12 text-amber-300 ring-amber-500/30",
    red: "bg-red-500/12 text-red-300 ring-red-500/30",
    blue: "bg-sky-500/12 text-sky-300 ring-sky-500/30",
    gray: "bg-stone-500/12 text-stone-200 ring-stone-500/30"
  };

  return (
    <div className="rounded-lg border border-[#ded7cf] bg-[#fffdfa] p-5 shadow-sm shadow-stone-950/10 transition hover:-translate-y-0.5 hover:border-orange-400/35 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-ink">{value}</p>
          {description ? <p className="mt-2 text-xs font-medium text-muted">{description}</p> : null}
        </div>
        <div className={`rounded-lg p-2.5 ring-1 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
