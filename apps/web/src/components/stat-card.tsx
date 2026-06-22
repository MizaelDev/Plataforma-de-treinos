import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, tone = "teal" }: { label: string; value: string | number; icon: LucideIcon; tone?: "teal" | "amber" | "red" | "blue" | "gray" }) {
  const tones = {
    teal: "bg-teal-50 text-brand ring-teal-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    gray: "bg-gray-100 text-gray-700 ring-gray-200"
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
