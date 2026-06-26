import { appConfig } from "@/lib/app-config";

export function BrandLogo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-md border border-orange-400/25 bg-black p-1 shadow-sm shadow-orange-950/20 ${compact ? "h-11 w-11" : "h-12 w-16"} ${className}`}>
      <img src={appConfig.logoUrl} alt={appConfig.name} className="h-full w-full object-contain" />
    </div>
  );
}
