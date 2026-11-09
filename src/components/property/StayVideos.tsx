import { useState } from "react";
import { Play } from "lucide-react";
import type { StayVideo } from "@/data/properties";

const youtubeId = (url: string) => url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
const mmss = (s?: number) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");

/** One video tile: shows the preview image; the video only loads when tapped. */
const VideoTile = ({ v, n }: { v: StayVideo; n: number }) => {
  const [on, setOn] = useState(false);
  const yt = v.youtube ? youtubeId(v.youtube) : undefined;
  if (on && yt) return <iframe className="w-full aspect-video rounded-xl" src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1`} title={`Video ${n}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  if (on && v.url) return <video className="w-full aspect-video rounded-xl bg-foreground" src={v.url} poster={v.poster} controls autoPlay playsInline preload="none" />;
  return (
    <button type="button" onClick={() => setOn(true)} aria-label={`Play video ${n}`}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface group">
      {v.poster && <img src={v.poster} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-14 h-14 rounded-full bg-background/90 flex items-center justify-center group-hover:scale-105 transition-transform">
          <Play className="w-6 h-6 fill-current ml-0.5" aria-hidden />
        </span>
      </span>
      {v.duration ? <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-background/85 text-[12px] font-semibold">{mmss(v.duration)}</span> : null}
    </button>
  );
};

export const StayVideos = ({ videos }: { videos: StayVideo[] }) => (
  <div className="grid gap-3 md:grid-cols-2">
    {videos.map((v, i) => <VideoTile key={(v.url || v.youtube || "") + i} v={v} n={i + 1} />)}
  </div>
);
