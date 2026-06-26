"use client";

import { ExternalLink, ImageIcon, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui";

export type ExerciseMediaType = "IMAGE" | "GIF" | "VIDEO" | "EXTERNAL_URL";

type ExerciseMediaProps = {
  mediaType?: ExerciseMediaType | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  title: string;
  compact?: boolean;
  onOpen?: () => void;
};

export function ExerciseMedia({ mediaType, mediaUrl, thumbnailUrl, title, compact = false, onOpen }: ExerciseMediaProps) {
  const heightClass = compact ? "h-44 sm:h-48" : "h-64 sm:h-80";

  if (!mediaUrl) {
    return (
      <div className={`flex ${heightClass} w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-muted`}>
        <ImageIcon className="mb-2 h-6 w-6 text-gray-400" />
        Sem mídia demonstrativa cadastrada
      </div>
    );
  }

  if (mediaType === "IMAGE" || mediaType === "GIF") {
    return (
      <button type="button" onClick={onOpen} className="block w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-left">
        <img src={mediaUrl} alt={title} className={`${heightClass} w-full object-cover`} />
      </button>
    );
  }

  if (mediaType === "VIDEO") {
    return (
      <div className="overflow-hidden rounded-md border border-gray-200 bg-black">
        <video src={mediaUrl} poster={thumbnailUrl ?? undefined} controls className={`${heightClass} w-full object-contain`} />
      </div>
    );
  }

  return (
    <div className={`relative flex ${heightClass} w-full flex-col items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 px-4 text-center`}>
      {thumbnailUrl ? <img src={thumbnailUrl} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-70" /> : null}
      <div className="relative rounded-md bg-white/95 p-3 shadow-sm">
        <PlayCircle className="mx-auto h-7 w-7 text-brand" />
        <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
        <a href={mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white hover:bg-gray-800">
          Abrir video
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {onOpen ? (
        <Button type="button" variant="secondary" className="relative mt-3 h-8 px-3" onClick={onOpen}>
          Ver detalhes
        </Button>
      ) : null}
    </div>
  );
}
