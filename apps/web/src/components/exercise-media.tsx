"use client";

import { ExternalLink, ImageIcon, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui";

export type ExerciseMediaType = "IMAGE" | "GIF" | "VIDEO" | "EXTERNAL_URL" | "EMBED";
export type MediaProvider = "YOUTUBE" | "VIMEO" | "BUNNY" | "SUPABASE" | "R2" | "EXTERNAL" | "NONE";

type ExerciseMediaProps = {
  mediaType?: ExerciseMediaType | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  videoProvider?: MediaProvider | null;
  title: string;
  compact?: boolean;
  onOpen?: () => void;
};

function embedUrl(mediaUrl?: string | null, provider?: MediaProvider | null) {
  if (!mediaUrl) return "";
  try {
    const url = new URL(mediaUrl);
    if (provider === "YOUTUBE" || url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      const id = url.hostname.includes("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : mediaUrl;
    }
    if (provider === "VIMEO" || url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : mediaUrl;
    }
  } catch {
    return "";
  }
  return mediaUrl;
}

export function ExerciseMedia({ mediaType, mediaUrl, thumbnailUrl, videoProvider, title, compact = false, onOpen }: ExerciseMediaProps) {
  const heightClass = compact ? "h-44 sm:h-48" : "h-64 sm:h-80";
  const wrapperClass = "overflow-hidden rounded-lg border border-[#3a2a20] bg-[#100d0b]";

  if (!mediaUrl) {
    return (
      <div className={`flex ${heightClass} w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#6b4b35] bg-[#18110d] px-4 text-center text-sm text-stone-300`}>
        <ImageIcon className="mb-2 h-6 w-6 text-orange-300" />
        Sem mídia demonstrativa cadastrada
      </div>
    );
  }

  if (mediaType === "IMAGE" || mediaType === "GIF") {
    return (
      <button type="button" onClick={onOpen} className={`${wrapperClass} group block w-full text-left`}>
        <img src={mediaUrl} alt={title} loading="lazy" className={`${heightClass} w-full object-cover transition group-hover:scale-[1.02]`} />
      </button>
    );
  }

  if (mediaType === "VIDEO") {
    if (compact) {
      return (
        <button type="button" onClick={onOpen} className={`${wrapperClass} group relative flex ${heightClass} w-full items-center justify-center text-left`}>
          {thumbnailUrl ? <img src={thumbnailUrl} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-75 transition group-hover:scale-[1.02]" /> : null}
          <div className="relative flex flex-col items-center rounded-lg border border-white/10 bg-[#100d0b]/92 px-4 py-3 text-center shadow-sm">
            <PlayCircle className="h-9 w-9 text-brand" />
            <span className="mt-2 text-sm font-semibold text-white">Assistir</span>
          </div>
        </button>
      );
    }

    return (
      <div className={wrapperClass}>
        <video src={mediaUrl} poster={thumbnailUrl ?? undefined} controls className={`${heightClass} w-full object-contain`} />
      </div>
    );
  }

  if (mediaType === "EMBED") {
    const src = embedUrl(mediaUrl, videoProvider);
    if (compact || thumbnailUrl) {
      return (
        <button type="button" onClick={onOpen} className={`relative flex ${heightClass} w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-[#3a2a20] bg-[#18110d] px-4 text-center`}>
          {thumbnailUrl ? <img src={thumbnailUrl} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-60" /> : null}
          <div className="relative rounded-md border border-white/10 bg-[#100d0b]/95 p-3 shadow-sm">
            <PlayCircle className="mx-auto h-7 w-7 text-brand" />
            <p className="mt-2 text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs text-stone-300">Abrir vídeo</p>
          </div>
        </button>
      );
    }

    return src ? (
      <div className={wrapperClass}>
        <iframe src={src} title={title} loading="lazy" className={`${heightClass} w-full`} allow="fullscreen; picture-in-picture" />
      </div>
    ) : null;
  }

  return (
    <div className={`relative flex ${heightClass} w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-[#3a2a20] bg-[#18110d] px-4 text-center`}>
      {thumbnailUrl ? <img src={thumbnailUrl} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-60" /> : null}
      <div className="relative rounded-md border border-white/10 bg-[#100d0b]/95 p-3 shadow-sm">
        <PlayCircle className="mx-auto h-7 w-7 text-brand" />
        <p className="mt-2 text-sm font-semibold text-white">{title}</p>
        <a href={mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-white hover:bg-brandDark">
          Abrir vídeo
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
