import { Play, ExternalLink } from "lucide-react";

interface TrailerButtonProps {
  trailer: { id: string; site: string; thumbnail?: string } | null;
  title: string;
  englishTitle?: string | null;
  onPlayTrailer?: (url: string) => void;
  compact?: boolean;
}

export default function TrailerButton({ trailer, title, englishTitle, onPlayTrailer, compact = false }: TrailerButtonProps) {
  const actionClass = compact ? "py-1.5 px-2 text-[11px]" : "py-2 px-3 text-xs";
  if (trailer?.site === "youtube" && trailer.id) {
    const url = `https://www.youtube.com/watch?v=${trailer.id}`;
    if (onPlayTrailer) return <button type="button" onClick={() => onPlayTrailer(url)} className={`btn-primary ${actionClass} font-semibold inline-flex items-center gap-1.5 cursor-pointer`}><Play className="h-3.5 w-3.5 fill-current" /> Preview</button>;
    return <a href={url} target="_blank" rel="noopener noreferrer" className={`btn-primary ${actionClass} font-semibold inline-flex items-center gap-1.5 cursor-pointer`}><Play className="h-3.5 w-3.5 fill-current" /> Preview</a>;
  }
  if (trailer?.site === "dailymotion" && trailer.id) return <a href={`https://www.dailymotion.com/video/${trailer.id}`} target="_blank" rel="noopener noreferrer" className={`btn-primary ${actionClass} font-semibold inline-flex items-center gap-1.5 cursor-pointer`}><Play className="h-3.5 w-3.5 fill-current" /> Preview</a>;
  const searchQuery = englishTitle || title;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${searchQuery} official trailer`)}`;
  return <a href={youtubeSearchUrl} target="_blank" rel="noopener noreferrer" className={`btn-secondary ${actionClass} font-semibold inline-flex items-center gap-1.5 cursor-pointer`}><ExternalLink className="h-3.5 w-3.5" /> Search trailer</a>;
}
