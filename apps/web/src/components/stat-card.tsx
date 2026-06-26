import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, tone = "brand" }: { label: string; value: string | number; icon: LucideIcon; tone?: "brand" | "amber" | "red" | "blue" | "gray" }) {
  const tones = {
    brand: "bg-orange-50 text-brand ring-orange-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    blue: "bg-stone-100 text-stone-800 ring-stone-200",
    gray: "bg-neutral-100 text-neutral-700 ring-neutral-200"
  };

  return (
    <div className="rounded-lg border border-[#ded7cf] bg-[#fffdfa] p-5 shadow-sm shadow-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-ink">{value}</p>
        </div>
        <div className={`rounded-md p-2 ring-1 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
