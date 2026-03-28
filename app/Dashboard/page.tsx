"use client";

import axios from "axios";
import { log } from "node:console";
import React, { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Track = {
  id: number;
  ytId: string;
  title: string;
  artist: string;
  genre: string;
  votes: number;
  addedBy?: string;
  playing?: boolean;
};

type ChatMessage = {
  id: number;
  user: string;
  msg: string;
  creator: boolean;
};

type Fan = {
  name: string;
  votes: number;
  avatar: string;
};

type UserVoteMap = Record<number, 1 | -1>;

type CardProps = {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  style?: React.CSSProperties;
};

type SectionLabelProps = {
  children: React.ReactNode;
};

type DisplayHProps = {
  children: React.ReactNode;
  size?: string;
  className?: string;
};

type FilterPillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

type PrimaryBtnProps = {
  children: React.ReactNode;
  onClick?: () => void;
  success?: boolean;
  className?: string;
};

type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
};

type VisualizerProps = {
  playing: boolean;
};

type AddSongModalProps = {
  onClose: () => void;
  onAdd: (track: Omit<Track, "id">) => void;
};

type QueueRowProps = {
  track: Track;
  rank: number;
  onUpvote: (id: number) => void;
  onDownvote: (id: number) => void;
  onRemove: (id: number) => void;
  userVote: 1 | -1 | 0;
  onPlayRequest: (track: Track) => void;
};

type TopBarProps = {
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  viewers: number;
};

type LivePageProps = {
  queue: Track[];
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  chat: ChatMessage[];
  setChat: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  showModel: boolean;
  setShowModel: React.Dispatch<React.SetStateAction<boolean>>;
  onPlayRequest: (track: Track) => void;
};

type YouTubePlayerProps = {
  videoId: string;
  playing: boolean;
  volume: number;
  onEnded?: () => void;
  onProgress?: (progress: number) => void;
  onVideoMeta?: (meta: { title?: string; author?: string; videoId?: string }) => void;
};

type SidebarVolumeProps = {
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayerInstance = {
  destroy: () => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  setVolume?: (volume: number) => void;
  getVideoData?: () => {
    title?: string;
    video_id?: string;
    author?: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }

  return null;
}

function ytThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

function resortQueue(q: Track[]): Track[] {
  if (q.length === 0) return q;

  const currentIndex = q.findIndex((t) => t.playing);

  if (currentIndex === -1) {
    return [...q].sort((a, b) => b.votes - a.votes);
  }

  const current = q[currentIndex];
  const rest = q
    .filter((_, index) => index !== currentIndex)
    .sort((a, b) => b.votes - a.votes);

  return [current, ...rest];
}

function normalizeQueuePlaying(q: Track[]): Track[] {
  if (q.length === 0) return q;
  return q.map((t, i) => ({ ...t, playing: i === 0 }));
}

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    ) as HTMLScriptElement | null;

    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
      document.head.appendChild(tag);
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(timer);
        resolve();
      }
      if (Date.now() - started > 10000) {
        window.clearInterval(timer);
        reject(new Error("YouTube API load timeout"));
      }
    }, 100);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────
const QUEUE_INIT: Track[] = [
  { id: 1, ytId: "4NRXx6U8ABQ", title: "Neon Drift", artist: "Solaris", genre: "Synthwave", votes: 47, addedBy: "fan_808", playing: true },
  { id: 2, ytId: "dQw4w9WgXcQ", title: "Crimson Undertow", artist: "The Veldt", genre: "Shoegaze", votes: 31, addedBy: "wavydave", playing: false },
  { id: 3, ytId: "kXYiU_JCYtU", title: "Glass Ceiling", artist: "Mara Chen", genre: "Indie Pop", votes: 28, addedBy: "starfall_99", playing: false },
  { id: 4, ytId: "09R8_2nJtjg", title: "Orbit Decay", artist: "HVMAN", genre: "Electronic", votes: 22, addedBy: "basshead_xx", playing: false },
  { id: 5, ytId: "JGwWNGJdvx8", title: "Slow Burn", artist: "Pilar & the Echo", genre: "R&B", votes: 19, addedBy: "vibes_only", playing: false },
];

const CHAT_INIT: ChatMessage[] = [
  { id: 1, user: "fan_808", msg: "NEON DRIFT 🔥🔥🔥", creator: false },
  { id: 2, user: "wavydave", msg: "vote Crimson Undertow pleaseee", creator: false },
  { id: 3, user: "night_owl_7", msg: "best stream tonight", creator: false },
  { id: 4, user: "synthkid_22", msg: "more synthwave 🎛️", creator: false },
];

const CHAT_POOL: string[] = [
  "this beat is EVERYTHING",
  "who added that?? legend",
  "vote the next one up!!",
  "🔥🔥🔥",
  "ambient next pls",
  "stream quality is pristine",
  "let's gooo",
  "never misses",
  "first time here this is sick",
  "♫♫♫",
];

const TOP_FANS: Fan[] = [
  { name: "fan_808", votes: 18, avatar: "https://picsum.photos/seed/f1/32/32" },
  { name: "starfall_99", votes: 14, avatar: "https://picsum.photos/seed/f2/32/32" },
  { name: "basshead_xx", votes: 11, avatar: "https://picsum.photos/seed/f3/32/32" },
  { name: "vibes_only", votes: 9, avatar: "https://picsum.photos/seed/f4/32/32" },
  { name: "wavydave", votes: 7, avatar: "https://picsum.photos/seed/f5/32/32" },
];

const GENRES = ["All", "Synthwave", "Shoegaze", "Indie Pop", "Electronic", "R&B", "Ambient"] as const;
const NAV = [
  { icon: "▶", label: "Now Live", id: "live" },
  { icon: "≡", label: "Queue", id: "queue" },
  { icon: "◎", label: "Analytics", id: "analytics" },
  { icon: "⚙", label: "Settings", id: "settings" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Card({ children, className = "", glow = false, style }: CardProps) {
  return (
    <div
      className={`relative bg-[#0d0f14] border border-[#1a1f2e] rounded-2xl overflow-hidden group transition-all duration-300 hover:border-[#d9ff4728] ${className}`}
      style={style}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d9ff47] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
      {glow && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#d9ff4708,transparent_55%)] pointer-events-none" />
      )}
      {children}
    </div>
  );
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="w-7 h-px bg-[#d9ff47] flex-shrink-0" />
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#d9ff47]">
        {children}
      </span>
    </div>
  );
}

function DisplayH({ children, size = "2.4rem", className = "" }: DisplayHProps) {
  return (
    <h2
      className={`font-['Bebas_Neue'] leading-[0.93] tracking-wide ${className}`}
      style={{ fontSize: size }}
    >
      {children}
    </h2>
  );
}

function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full border transition-all cursor-pointer ${active
        ? "bg-[#d9ff4715] border-[#d9ff4735] text-[#d9ff47]"
        : "border-[#1a1f2e] text-[#454d66] hover:text-[#e6e9f4] hover:border-[#454d66]"
        }`}
    >
      {label}
    </button>
  );
}

function PrimaryBtn({ children, onClick, success = false, className = "" }: PrimaryBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden px-7 py-3 rounded-full font-['Syne'] font-extrabold text-sm tracking-wide transition-all group ${className} ${success
        ? "bg-[#00f0d4] text-[#07080b] cursor-default"
        : "bg-[#d9ff47] text-[#07080b] hover:bg-[#c4e83a] hover:shadow-[0_8px_32px_#d9ff4748] hover:-translate-y-0.5"
        }`}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute top-[-50%] left-[-60%] w-1/2 h-[200%] bg-white/20 -skew-x-[20deg] group-hover:left-[130%] transition-all duration-500 pointer-events-none" />
    </button>
  );
}

function Toggle({ value, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full relative flex-shrink-0 border transition-all duration-200 ${value ? "bg-[#d9ff47] border-[#d9ff4760]" : "bg-[#13161e] border-[#1a1f2e]"
        }`}
    >
      <span
        className={`absolute top-[3px] w-[18px] h-[18px] rounded-full shadow transition-all duration-200 ${value ? "left-[22px] bg-[#07080b]" : "left-[3px] bg-[#454d66]"
          }`}
      />
    </button>
  );
}

function Visualizer({ playing }: VisualizerProps) {
  return (
    <div className="flex items-end gap-[2px] h-7 flex-shrink-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-[#d9ff47] opacity-70"
          style={{
            height: "4px",
            animation: playing
              ? `sqBar 0.55s ease-in-out ${(i * 71) % 440}ms infinite alternate`
              : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE PLAYER
// ─────────────────────────────────────────────────────────────────────────────
function YouTubePlayer({
  videoId,
  playing,
  volume,
  onEnded,
  onProgress,
  onVideoMeta,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.setVolume) return;

    try {
      player.setVolume(volume);
    } catch (error) {
      console.error("Volume sync failed:", error);
    }
  }, [volume]);


  useEffect(() => {
    let mounted = true;

    async function initPlayer() {
      if (!videoId || !containerRef.current) return;

      try {
        await loadYouTubeAPI();
        if (!mounted || !containerRef.current || !window.YT?.Player) return;

        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }

        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              e.target.setVolume?.(volume);

              const data = e.target.getVideoData?.();
              onVideoMeta?.({
                title: data?.title,
                author: data?.author,
                videoId: data?.video_id,
              });

              if (playing) e.target.playVideo?.();
              else e.target.pauseVideo?.();
            },
            onStateChange: (e) => {
              if (e.data === window.YT?.PlayerState.ENDED) {
                onEnded?.();
              }
            },
            onError: (e) => {
              console.error("YouTube player error:", e.data);
              if ([2, 5, 100, 101, 150].includes(e.data)) {
                onEnded?.();
              }
            },
          },
        });
      } catch (error) {
        console.error("Failed to initialize YouTube player:", error);
      }
    }

    initPlayer();

    return () => {
      mounted = false;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, onEnded, playing]);

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime || !player?.getDuration) return;

      const cur = player.getCurrentTime() || 0;
      const dur = player.getDuration() || 1;
      onProgress?.((cur / dur) * 100);
    }, 500);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [onProgress]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.playVideo || !player?.pauseVideo) return;

    try {
      if (playing) player.playVideo();
      else player.pauseVideo();
    } catch (error) {
      console.error("Play/pause sync failed:", error);
    }
  }, [playing]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player?.setVolume) return;

    try {
      player.setVolume(volume);
    } catch (error) {
      console.error("Volume sync failed:", error);
    }
  }, [volume]);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden bg-[#07080b]"
      style={{ aspectRatio: "16/9" }}
    >
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d9ff47] to-[#ff3d7f] opacity-60 pointer-events-none" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD SONG MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AddSongModal({ onClose, onAdd }: AddSongModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState<string>("Electronic");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleUrlChange = (v: string) => {
    setUrl(v);
    setError("");
    const id = extractYouTubeId(v.trim());
    setPreview(id || null);
    if (!id && v.trim()) {
      setError("Couldn't find a YouTube video ID — paste a full YouTube URL");
    }
  };

  const handleAdd = () => {
    if (!preview) {
      setError("Please enter a valid YouTube URL first");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    onAdd({
      ytId: preview,
      title: title.trim(),
      artist: artist.trim() || "Unknown Artist",
      genre,
      votes: 0,
      addedBy: "you",
      playing: false,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07080b]/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0d0f14] border border-[#1a1f2e] rounded-2xl overflow-hidden shadow-[0_0_60px_#d9ff4715]">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d9ff47] to-transparent" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <DisplayH size="1.8rem">Add to Queue</DisplayH>
              <p className="font-mono text-[9px] text-[#454d66] mt-1 uppercase tracking-widest">
                Paste a YouTube link
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-[#1a1f2e] text-[#454d66] hover:text-[#ff3d7f] hover:border-[#ff3d7f30] flex items-center justify-center transition-all text-sm"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <label className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest block mb-2">
              YouTube URL
            </label>
            <input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] placeholder-[#454d66] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d9ff47] transition-colors font-mono"
            />
            {error && <p className="font-mono text-[9px] text-[#ff3d7f] mt-1.5">{error}</p>}
          </div>

          {preview && (
            <div className="mb-4 rounded-xl overflow-hidden border border-[#1a1f2e] flex items-center gap-3 p-3 bg-[#13161e]">
              <img
                src={ytThumb(preview)}
                alt="thumb"
                className="w-20 h-12 rounded-lg object-cover flex-shrink-0 border border-[#1a1f2e]"
              />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[9px] text-[#d9ff47] uppercase tracking-widest mb-0.5">
                  Video found ✓
                </div>
                <div className="font-mono text-[10px] text-[#454d66] truncate">ID: {preview}</div>
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest block mb-2">
              Track Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Neon Drift"
              className="w-full bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] placeholder-[#454d66] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d9ff47] transition-colors font-['Syne']"
            />
          </div>

          <div className="mb-3">
            <label className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest block mb-2">
              Artist
            </label>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. Solaris"
              className="w-full bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] placeholder-[#454d66] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d9ff47] transition-colors font-['Syne']"
            />
          </div>

          <div className="mb-6">
            <label className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest block mb-2">
              Genre
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.slice(1).map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full border transition-all ${genre === g
                    ? "bg-[#d9ff4715] border-[#d9ff4735] text-[#d9ff47]"
                    : "border-[#1a1f2e] text-[#454d66] hover:text-[#e6e9f4]"
                    }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-[#1a1f2e] text-[#454d66] hover:text-[#e6e9f4] hover:border-[#454d66] py-3 rounded-full font-['Syne'] font-semibold text-sm transition-all"
            >
              Cancel
            </button>
            <PrimaryBtn onClick={handleAdd} className="flex-1 justify-center text-center">
              Add to Queue
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE ROW
// ─────────────────────────────────────────────────────────────────────────────
function QueueRow({
  track,
  rank,
  onUpvote,
  onDownvote,
  onRemove,
  userVote,
  onPlayRequest

}: QueueRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-[#1a1f2e] last:border-0 hover:bg-[#13161e] transition-colors group ${track.playing ? "bg-[#d9ff4706] border-l-[3px] border-l-[#d9ff47]" : ""
        }`}
    >
      <button onClick={() => {
  console.log("clicked row", track);
  onPlayRequest(track);
}}>
  ▶ Play
</button>
      <span className="font-mono text-[9px] w-5 text-center flex-shrink-0">
        {track.playing ? (
          <span className="text-[#d9ff47] text-xs">▶</span>
        ) : (
          <span className="text-[#454d66]">{rank}</span>
        )}
      </span>

      <div className="relative flex-shrink-0 w-12 h-9 rounded-lg overflow-hidden border border-[#1a1f2e]">
        <img src={ytThumb(track.ytId)} alt={track.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-[#07080b]/50">
          <span className="text-[#e6e9f4] text-[8px]">▶</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-['Syne'] text-sm font-semibold truncate">{track.title}</div>
        <div className="font-mono text-[9px] text-[#454d66] mt-0.5 flex items-center gap-1.5">
          <span>{track.artist}</span>
          <span className="w-1 h-1 rounded-full bg-[#1a1f2e] flex-shrink-0" />
          <span>{track.genre}</span>
          {track.addedBy && (
            <>
              <span className="w-1 h-1 rounded-full bg-[#1a1f2e] flex-shrink-0" />
              <span>by {track.addedBy}</span>
            </>
          )}
        </div>
      </div>

      <div
        className={`font-['Bebas_Neue'] text-xl leading-none min-w-[32px] text-center flex-shrink-0 transition-colors ${track.votes > 0 ? "text-[#d9ff47]" : track.votes < 0 ? "text-[#ff3d7f]" : "text-[#454d66]"
          }`}
      >
        {track.votes > 0 ? `+${track.votes}` : track.votes}
      </div>

      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={() => onUpvote(track.id)}
          className={`w-6 h-5 rounded-md flex items-center justify-center text-[9px] border transition-all ${userVote === 1
            ? "bg-[#d9ff4720] border-[#d9ff4740] text-[#d9ff47]"
            : "border-[#1a1f2e] text-[#454d66] hover:text-[#d9ff47] hover:border-[#d9ff4730] hover:bg-[#d9ff4710]"
            }`}
        >
          ▲
        </button>
        <button
          onClick={() => onDownvote(track.id)}
          className={`w-6 h-5 rounded-md flex items-center justify-center text-[9px] border transition-all ${userVote === -1
            ? "bg-[#ff3d7f20] border-[#ff3d7f40] text-[#ff3d7f]"
            : "border-[#1a1f2e] text-[#454d66] hover:text-[#ff3d7f] hover:border-[#ff3d7f30] hover:bg-[#ff3d7f10]"
            }`}
        >
          ▼
        </button>
      </div>

      <button
        onClick={() => onRemove(track.id)}
        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] border border-[#1a1f2e] text-[#454d66] hover:text-[#ff3d7f] hover:border-[#ff3d7f30] transition-all flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────────────────────────────────────
function TopBar({ playing, setPlaying, viewers }: TopBarProps) {
  return (
    <header className="min-h-[52px] border-b border-[#1a1f2e] bg-[#08090c]/90 backdrop-blur-md flex items-center justify-between px-5 flex-shrink-0 gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#ff3d7f12] border border-[#ff3d7f30] px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d7f] animate-pulse" />
          <span className="font-mono text-[9px] tracking-widest uppercase text-[#ff3d7f]">Live</span>
        </div>
        <span className="font-mono text-[10px] text-[#454d66]">
          <span className="text-[#e6e9f4] font-semibold">{viewers.toLocaleString()}</span> watching
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPlaying((p) => !p)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-[9px] tracking-widest uppercase border transition-all ${playing
            ? "bg-[#ff3d7f12] border-[#ff3d7f30] text-[#ff3d7f] hover:bg-[#ff3d7f20]"
            : "bg-[#d9ff4712] border-[#d9ff4730] text-[#d9ff47] hover:bg-[#d9ff4720]"
            }`}
        >
          <span>{playing ? "⏸" : "▶"}</span>
          <span className="hidden sm:inline">{playing ? "Pause" : "Resume"}</span>
        </button>
        <button className="px-4 py-1.5 rounded-full font-mono text-[9px] tracking-widest uppercase border border-[#ff3d7f30] text-[#ff3d7f] hover:bg-[#ff3d7f12] transition-all">
          End Stream
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PAGE
// ─────────────────────────────────────────────────────────────────────────────
function LivePage({
  queue,
  setQueue,
  playing,
  setPlaying,
  progress,
  setProgress,
  chat,
  setChat,
  volume,
  setVolume,
  showModel,
  setShowModel,
  onPlayRequest
}: LivePageProps) {
  const [chatInput, setChatInput] = useState("");
  const [genre, setGenre] = useState<string>("All");
  const [userVotes, setUserVotes] = useState<UserVoteMap>({});
  const chatRef = useRef<HTMLDivElement | null>(null);

  const nowPlaying = queue?.[0];




  const filtered = React.useMemo(() => {
    if (!queue || queue.length === 0) return [];

    const current = queue.find((t) => t.playing) ?? queue[0];
    if (!current) return [];

    if (genre === "All") {
      const rest = queue.filter((t) => t.id !== current.id);
      return [current, ...rest];
    }

    const matching = queue.filter((t) => t.genre === genre);
    const hasCurrent = matching.some((t) => t.id === current.id);

    if (hasCurrent) {
      const rest = matching.filter((t) => t.id !== current.id);
      return [current, ...rest];
    }

    return [current, ...matching];
  }, [queue, genre]);
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chat]);

  const handleVideoMeta = useCallback(
    (meta: { title?: string; author?: string; videoId?: string }) => {
      if (!meta.title || !nowPlaying) return;

      setQueue((q) =>
        q.map((track, index) =>
          index === 0 || track.id === nowPlaying.id
            ? {
              ...track,
              title: meta.title || track.title,
              artist: meta.author || track.artist,
            }
            : track
        )
      );
    },
    [nowPlaying, setQueue]
  );

  const handleUpvote = (id: number) => {
    const prev = userVotes[id] || 0;
    if (prev === 1) return;

    const delta = prev === -1 ? 2 : 1;
    setUserVotes((v) => ({ ...v, [id]: 1 }));
    setQueue((q) =>
      resortQueue(q.map((t) => (t.id === id ? { ...t, votes: t.votes + delta } : t)))
    );
  };

  const handleDownvote = (id: number) => {
    const prev = userVotes[id] || 0;
    if (prev === -1) return;

    const delta = prev === 1 ? 2 : 1;
    setUserVotes((v) => ({ ...v, [id]: -1 }));
    setQueue((q) =>
      resortQueue(q.map((t) => (t.id === id ? { ...t, votes: t.votes - delta } : t)))
    );
  };

  const handleRemove = (id: number) => {
    setQueue((q) => {
      const removedTrack = q.find((t) => t.id === id);
      const updated = q.filter((t) => t.id !== id);

      if (!removedTrack?.playing) return resortQueue(updated);
      if (updated.length === 0) return [];

      const sorted = [...updated].sort((a, b) => b.votes - a.votes);
      return normalizeQueuePlaying(sorted);
    });
  };



  const handleVideoEnd = useCallback(() => {
    setQueue((q) => {
      if (q.length <= 1) return normalizeQueuePlaying(q);

      const [, ...rest] = q.map((t) => ({ ...t, playing: false }));
      const sorted = [...rest].sort((a, b) => b.votes - a.votes);

      if (sorted.length === 0) return [];
      return normalizeQueuePlaying(sorted);
    });

    setProgress(0);
    setPlaying(true);
  }, [setPlaying, setProgress, setQueue]);

  const handleChat = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChat((prev) => [
      ...prev,
      { id: Date.now(), user: "you (creator)", msg: chatInput, creator: true },
    ]);
    setChatInput("");
  };

  return (
    <>


      <div className="flex flex-col xl:flex-row gap-4 h-full min-h-0">
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          {nowPlaying && (
            <Card glow className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Visualizer playing={playing} />
                <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#d9ff47] ml-1">
                  Now Playing
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="font-mono text-[9px] text-[#454d66]">{nowPlaying.artist}</span>
                  <span className="font-mono text-[9px] border border-[#1a1f2e] text-[#454d66] px-2 py-0.5 rounded-full">
                    {nowPlaying.genre}
                  </span>
                </div>
              </div>

              <YouTubePlayer
                videoId={nowPlaying.ytId}
                playing={playing}
                volume={volume}
                onEnded={handleVideoEnd}
                onProgress={setProgress}
                onVideoMeta={handleVideoMeta}
              />


              <div className="mt-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <DisplayH size="1.6rem" className="truncate flex-1">
                    {nowPlaying.title}
                  </DisplayH>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                    <button
                      onClick={() => setPlaying((p) => !p)}
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm transition-all ${playing
                        ? "border-[#ff3d7f30] text-[#ff3d7f] bg-[#ff3d7f12] hover:bg-[#ff3d7f20]"
                        : "border-[#d9ff4730] text-[#d9ff47] bg-[#d9ff4712] hover:bg-[#d9ff4720]"
                        }`}
                    >
                      {playing ? "⏸" : "▶"}
                    </button>
                    <button
                      onClick={handleVideoEnd}
                      className="w-9 h-9 rounded-xl border border-[#1a1f2e] text-[#454d66] hover:text-[#e6e9f4] flex items-center justify-center text-sm transition-all"
                    >
                      ⏭
                    </button>
                  </div>
                </div>

                <div className="w-full h-[3px] bg-[#1a1f2e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#d9ff47] to-[#ff3d7f] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { icon: "👥", label: "Viewers", value: "1,284", badge: "+12%", bg: "bg-[#00f0d410]", border: "border-[#00f0d430]", text: "text-[#00f0d4]" },
              { icon: "🗳️", label: "Votes Cast", value: "341", badge: "Session", bg: "bg-[#d9ff4710]", border: "border-[#d9ff4730]", text: "text-[#d9ff47]" },
              { icon: "🎵", label: "Tracks", value: `${queue.length}`, badge: "In Queue", bg: "bg-[#ff3d7f10]", border: "border-[#ff3d7f30]", text: "text-[#ff3d7f]" },
              { icon: "💬", label: "Chat Msgs", value: "892", badge: "Active", bg: "bg-[#a78bfa10]", border: "border-[#a78bfa30]", text: "text-[#a78bfa]" },
            ].map((s) => (
              <Card glow className="p-4" key={s.label}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg">{s.icon}</span>
                  <span
                    className={`font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded-full border ${s.bg} ${s.border} ${s.text}`}
                  >
                    {s.badge}
                  </span>
                </div>
                <div className="font-['Bebas_Neue'] text-[2rem] leading-none text-[#e6e9f4]">
                  {s.value}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-[#454d66] mt-1">
                  {s.label}
                </div>
              </Card>
            ))}
          </div>

          <Card className="flex flex-col flex-1 min-h-[220px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f2e] flex-shrink-0 flex-wrap gap-2">
              <div>
                <DisplayH size="1.3rem">Fan Queue</DisplayH>
                <div className="font-mono text-[9px] text-[#454d66] mt-0.5 uppercase tracking-widest">
                  Higher votes → plays first
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1.5 flex-wrap">
                  {GENRES.slice(0, 5).map((g) => (
                    <FilterPill key={g} label={g} active={genre === g} onClick={() => setGenre(g)} />
                  ))}
                </div>
                <button
                  onClick={() => setShowModel(true)}
                  className="flex items-center gap-1.5 bg-[#d9ff47] text-[#07080b] px-3 py-1.5 rounded-full font-['Syne'] font-extrabold text-[11px] hover:bg-[#c4e83a] hover:shadow-[0_4px_20px_#d9ff4740] transition-all"
                >
                  <span className="text-base leading-none">+</span> Add Song
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 px-4 py-2 border-b border-[#1a1f2e] bg-[#0a0c10]">
              <span className="font-mono text-[8px] text-[#454d66] uppercase tracking-widest">#</span>
              <span className="font-mono text-[8px] text-[#454d66] uppercase tracking-widest flex-1">
                Track
              </span>
              <span className="font-mono text-[8px] text-[#454d66] uppercase tracking-widest">
                Score
              </span>
              <span className="font-mono text-[8px] text-[#454d66] uppercase tracking-widest">
                Vote
              </span>
              <span className="w-7" />
            </div>

            <div className="overflow-y-auto flex-1 sq-scroll">
              {filtered?.length > 0 ? (
                filtered.map((t, i) => {
                  if (!t || !t.id) return null; // safety

                  return (
                    <QueueRow
                      key={t.id}
                      track={t}
                      rank={i + 1}
                      onUpvote={handleUpvote}
                      onDownvote={handleDownvote}
                      onRemove={handleRemove}
                      userVote={userVotes[t.id] || 0}
                      onPlayRequest={onPlayRequest}
                    />
                  );
                })
              ) : (
                <div className="text-gray-500 text-xs p-4">Queue is empty</div>
              )}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-24 gap-2">
                  <div className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest">
                    Queue is empty
                  </div>
                  <button
                    onClick={() => setShowModel(true)}
                    className="font-mono text-[9px] text-[#d9ff47] uppercase tracking-widest hover:underline"
                  >
                    + Add the first song
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 w-full xl:w-[276px] flex-shrink-0">


          <Card className="flex flex-col" style={{ height: 300 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f2e] flex-shrink-0">
              <DisplayH size="1.1rem">Live Chat</DisplayH>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d7f] animate-pulse" />
                <span className="font-mono text-[9px] text-[#454d66]">live</span>
              </div>
            </div>
            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 sq-scroll"
            >
              {chat.map((m) => (
                <div key={m.id}>
                  <span
                    className={`font-mono text-[9px] mr-1.5 ${m.creator ? "text-[#d9ff47]" : "text-[#ff3d7f]"
                      }`}
                  >
                    {m.user}
                  </span>
                  <span className="text-xs text-[#e6e9f4]/80">{m.msg}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleChat} className="flex gap-2 px-3 py-2.5 border-t border-[#1a1f2e] flex-shrink-0">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something…"
                className="flex-1 bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] placeholder-[#454d66] rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-[#d9ff47] transition-colors font-['Syne']"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-full bg-[#d9ff47] text-[#07080b] flex items-center justify-center font-bold text-sm hover:bg-[#c4e83a] transition-colors flex-shrink-0"
              >
                ↑
              </button>
            </form>
          </Card>

          <Card>
            <div className="px-4 py-3 border-b border-[#1a1f2e]">
              <DisplayH size="1.1rem">Top Fans</DisplayH>
              <div className="font-mono text-[9px] text-[#454d66] mt-0.5 uppercase tracking-widest">
                Most votes this session
              </div>
            </div>
            {TOP_FANS.map((fan, i) => (
              <div
                key={fan.name}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1f2e] last:border-0 hover:bg-[#13161e] transition-colors"
              >
                <span className="font-['Bebas_Neue'] text-lg text-[#1a1f2e] w-4 leading-none">
                  {i + 1}
                </span>
                <img src={fan.avatar} alt={fan.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                <span className="flex-1 font-['Syne'] text-xs font-semibold truncate">{fan.name}</span>
                <span className="font-mono text-[9px] text-[#d9ff47]">▲ {fan.votes}</span>
              </div>
            ))}
          </Card>

          <button
            onClick={() => setShowModel(true)}
            className="relative overflow-hidden w-full border border-dashed border-[#d9ff4730] bg-[#d9ff4706] hover:bg-[#d9ff4710] hover:border-[#d9ff4750] text-[#d9ff47] rounded-2xl py-5 flex flex-col items-center gap-1.5 transition-all group"
          >
            <span className="text-2xl">＋</span>
            <span className="font-mono text-[9px] uppercase tracking-widest">Add Song to Queue</span>
            <span className="font-mono text-[8px] text-[#454d66]">Paste a YouTube link</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function SettingsPage() {
  const [explicit, setExplicit] = useState(false);
  const [autoSkip, setAutoSkip] = useState(true);
  const [chatMod, setChatMod] = useState(true);
  const [maxQueue, setMaxQueue] = useState(20);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <SectionLabel>Preferences</SectionLabel>
        <DisplayH size="clamp(2rem,5vw,3rem)">Settings</DisplayH>
      </div>

      <Card>
        <div className="px-5 py-3.5 border-b border-[#1a1f2e]">
          <DisplayH size="1.3rem">Stream Rules</DisplayH>
        </div>
        {[
          {
            label: "Allow Explicit Tracks",
            desc: "Fans can request tracks with explicit content",
            val: explicit,
            set: setExplicit,
          },
          {
            label: "Auto-Skip Flagged",
            desc: "Automatically skip tracks flagged by chat",
            val: autoSkip,
            set: setAutoSkip,
          },
          {
            label: "Chat Moderation",
            desc: "Filter slurs and hate speech in real time",
            val: chatMod,
            set: setChatMod,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#1a1f2e] last:border-0 hover:bg-[#13161e] transition-colors"
          >
            <div>
              <div className="font-['Syne'] font-semibold text-[13px]">{item.label}</div>
              <div className="font-mono text-[9px] text-[#454d66] mt-0.5">{item.desc}</div>
            </div>
            <Toggle value={item.val} onChange={item.set} />
          </div>
        ))}
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b border-[#1a1f2e]">
          <DisplayH size="1.3rem">Queue Limits</DisplayH>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#13161e] transition-colors">
          <div>
            <div className="font-['Syne'] font-semibold text-[13px]">Max Queue Length</div>
            <div className="font-mono text-[9px] text-[#454d66] mt-0.5">
              Maximum tracks fans can add at once
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMaxQueue((q) => Math.max(5, q - 5))}
              className="w-8 h-8 rounded-xl bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] hover:border-[#d9ff4740] hover:text-[#d9ff47] transition-all font-bold text-lg leading-none"
            >
              −
            </button>
            <span className="font-['Bebas_Neue'] text-[1.8rem] leading-none w-10 text-center text-[#d9ff47]">
              {maxQueue}
            </span>
            <button
              onClick={() => setMaxQueue((q) => Math.min(50, q + 5))}
              className="w-8 h-8 rounded-xl bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] hover:border-[#d9ff4740] hover:text-[#d9ff47] transition-all font-bold text-lg leading-none"
            >
              +
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-3.5 border-b border-[#1a1f2e]">
          <DisplayH size="1.3rem">Blocked Genres</DisplayH>
          <div className="font-mono text-[9px] text-[#454d66] mt-0.5 uppercase tracking-widest">
            Fans cannot request these genres
          </div>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-2">
          {GENRES.slice(1).map((g) => {
            const on = blocked.includes(g);
            return (
              <button
                key={g}
                onClick={() => setBlocked((b) => (on ? b.filter((x) => x !== g) : [...b, g]))}
                className={`font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 rounded-full border transition-all ${on
                  ? "bg-[#ff3d7f12] border-[#ff3d7f35] text-[#ff3d7f]"
                  : "border-[#1a1f2e] text-[#454d66] hover:text-[#e6e9f4] hover:border-[#454d66]"
                  }`}
              >
                {on ? "✕ " : ""}
                {g}
              </button>
            );
          })}
        </div>
      </Card>

      <PrimaryBtn onClick={save} success={saved}>
        {saved ? "✓ Saved!" : "Save Changes"}
      </PrimaryBtn>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GUIDE PAGE
// ─────────────────────────────────────────────────────────────────────────────
function GuidePage() {
  const [copied, setCopied] = useState("");

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 2000);
  };

  const steps = [
    {
      num: "01",
      title: "Install react-youtube",
      tag: "Terminal",
      code: `npm install react-youtube\n# or\nyarn add react-youtube`,
      desc: "The easiest wrapper around YouTube's IFrame API. Zero config, full event support.",
    },
    {
      num: "02",
      title: "Replace the YouTubePlayer component",
      tag: "StreamQDashboard.jsx",
      code: `import YouTube from 'react-youtube';\n\nfunction YouTubePlayer({ videoId, playing, onEnded }) {\n  const opts = {\n    height: '100%', width: '100%',\n    playerVars: { autoplay: 1, controls: 0, rel: 0 },\n  };\n  return (\n    <YouTube videoId={videoId} opts={opts}\n      onEnd={onEnded}\n      className="w-full aspect-video rounded-xl overflow-hidden"\n    />\n  );\n}`,
      desc: "Drop this in to replace the raw IFrame implementation included in this file. It handles all player state automatically.",
    },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <SectionLabel>Integration Guide</SectionLabel>
        <DisplayH size="clamp(2rem,5vw,3rem)">
          YouTube <span className="text-[#ff3d7f]">Setup</span>
        </DisplayH>
        <p className="font-mono text-[10px] text-[#454d66] mt-2 leading-relaxed max-w-lg">
          Everything you need to go from this mock dashboard to a fully live, real-time
          fan-controlled stream with actual YouTube playback.
        </p>
      </div>

      {steps.map((s) => (
        <Card key={s.num} className="overflow-hidden">
          <div className="flex items-start gap-4 p-5 border-b border-[#1a1f2e]">
            <span className="font-['Bebas_Neue'] text-[2.5rem] leading-none text-[#1a1f2e] flex-shrink-0 select-none">
              {s.num}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <DisplayH size="1.3rem">{s.title}</DisplayH>
                <span className="font-mono text-[8px] tracking-widest uppercase text-[#d9ff47] bg-[#d9ff4710] border border-[#d9ff4730] px-2 py-0.5 rounded-full flex-shrink-0">
                  {s.tag}
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#454d66] leading-relaxed">{s.desc}</p>
            </div>
          </div>
          <div className="relative bg-[#07080b] group/code">
            <button
              onClick={() => copy(s.code, s.num)}
              className="absolute top-3 right-3 font-mono text-[8px] uppercase tracking-widest px-2.5 py-1 rounded-lg border border-[#1a1f2e] text-[#454d66] hover:text-[#d9ff47] hover:border-[#d9ff4730] transition-all z-10"
            >
              {copied === s.num ? "✓ Copied" : "Copy"}
            </button>
            <pre className="p-4 text-[11px] text-[#e6e9f4]/80 font-mono leading-relaxed overflow-x-auto sq-scroll whitespace-pre">
              {s.code}
            </pre>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SidebarVolume({ volume, setVolume }: SidebarVolumeProps) {
  return (
    <div className="px-2 mt-3">
      <div className="rounded-2xl border border-[#1a1f2e] bg-[#0d0f14] p-3">
        <div className="hidden lg:flex items-center justify-between mb-3">
          <span className="font-mono text-[8px] tracking-[0.18em] uppercase text-[#454d66]">
            Volume
          </span>
          <span className="font-mono text-[9px] text-[#d9ff47]">{volume}%</span>
        </div>

        <div className="flex lg:flex-col items-center justify-center gap-3">
          <button
            onClick={() => setVolume(0)}
            className="w-8 h-8 rounded-xl border border-[#1a1f2e] text-[#454d66] hover:text-[#ff3d7f] hover:border-[#ff3d7f30] transition-all flex items-center justify-center text-sm"
            title="Mute"
          >
            🔇
          </button>

          <div className="flex items-center justify-center lg:min-h-[150px]">
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="volume-slider"
              aria-label="Volume"
            />
          </div>

          <button
            onClick={() => setVolume(100)}
            className="w-8 h-8 rounded-xl border border-[#1a1f2e] text-[#454d66] hover:text-[#d9ff47] hover:border-[#d9ff4730] transition-all flex items-center justify-center text-sm"
            title="Max volume"
          >
            🔊
          </button>
        </div>

        <div className="lg:hidden mt-2 text-center font-mono text-[9px] text-[#d9ff47]">
          {volume}%
        </div>
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function StreamQDashboard() {
  const [page, setPage] = useState("live");
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState(1284);
  const [queue, setQueue] = useState<Track[]>(QUEUE_INIT);
  const [chat, setChat] = useState<ChatMessage[]>(CHAT_INIT);
  const [volume, setVolume] = useState(70);
  const [showModel, setShowModel] = useState(false);
  const [selectTrack, setselectTrack] = useState<Track | null>(null);
  const [showPlayModel, setShowPlayModel] = useState(false);
  const REFRESH_INTERVAL_MS = 10 * 1000;

  const refreshStreams = useCallback(async () => {
    try {
      const res = await axios.get("/api/streams/my");
      console.log("streams:", res.data);
    } catch (error) {
      console.error("Failed to refresh streams:", error);
    }
  }, []);


  console.log("RENDER PARENT", showModel);

  const handlePlayRequest = (track: Track) => {
    setselectTrack(track);
    setShowPlayModel(true);

  }
  const handleAdd = (track: Omit<Track, "id">) => {
    const newTrack: Track = {
      ...track,
      id: Date.now(),
      playing: false,
    };

    setQueue((q) => resortQueue([...q, newTrack]));
  };

  const handlePlayNow = () => {
    if (!selectTrack) return;

    setQueue((q) =>
      q.map((t) => ({
        ...t,
        playing: t.id === selectTrack.id,
      }))
    );

    setShowPlayModel(false);
  };
  useEffect(() => {
    refreshStreams();

    const interval = window.setInterval(() => {
      refreshStreams();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [refreshStreams]);


  const navWithGuide = [...NAV, { icon: "?", label: "YT Guide", id: "guide" }];

  useEffect(() => {
    const iv = window.setInterval(() => {
      setViewers((v) => Math.max(100, v + Math.floor(Math.random() * 7) - 2));
    }, 3000);

    return () => window.clearInterval(iv);
  }, []);

  useEffect(() => {
    const users = ["fan_808", "wavydave", "night_owl_7", "synthkid_22", "lofi_ghost", "neon_tides"];

    const iv = window.setInterval(() => {
      setChat((prev) => [
        ...prev.slice(-40),
        {
          id: Date.now(),
          user: users[Math.floor(Math.random() * users.length)],
          msg: CHAT_POOL[Math.floor(Math.random() * CHAT_POOL.length)],
          creator: false,
        },
      ]);
    }, 3500);

    return () => window.clearInterval(iv);
  }, []);
  console.log("MOUNT");

  useEffect(() => {
    console.log("Mounted once");
  }, []);
  return (
    <>

      {showPlayModel && selectTrack && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
          <div className="bg-[#111] p-6 rounded-xl text-white w-[320px]">

            <h2 className="text-lg mb-2">Play this song?</h2>

            <p className="text-sm text-gray-400">
              {selectTrack.title}
            </p>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  handlePlayNow();
                }}
                className="text-green-400"
              >
                Play
              </button>

              <button
                onClick={() => setShowPlayModel(false)}
                className="text-red-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {showModel && (
        <AddSongModal
          onClose={() => setShowModel(false)}
          onAdd={(track) => {
            handleAdd(track);
            setShowModel(false);
            console.log("btn clicked")
          }}
        />
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes sqBar {
          from { height: 4px; opacity: 0.45; }
          to { height: 26px; opacity: 0.85; }
        }
        .sq-grain::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.022;
          pointer-events: none;
          z-index: 9999;
        }
        

        .sq-scroll::-webkit-scrollbar { width: 3px; }
        .sq-scroll::-webkit-scrollbar-track { background: transparent; }
        .sq-scroll::-webkit-scrollbar-thumb { background: #1a1f2e; border-radius: 4px; }
        .sq-scroll::-webkit-scrollbar-thumb:hover { background: #d9ff4750; }

        .volume-slider {
          accent-color: #d9ff47;
          cursor: pointer;
          
        }

        .volume-slider {
  -webkit-appearance: slider-vertical;
  appearance: slider-vertical;
  width: 10px;
  height: 130px;
  cursor: pointer;
  accent-color: #d9ff47;
  transform: rotate(180deg);
}

.volume-slider::-webkit-slider-runnable-track {
  width: 10px;
  border-radius: 9999px;
  background: #1a1f2e;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #d9ff47;
  border: none;
  box-shadow: 0 0 12px #d9ff4760;
}

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #d9ff47;
          border: none;
          box-shadow: 0 0 12px #d9ff4760;
        }

        .volume-slider::-webkit-slider-runnable-track {
          width: 16px;
          border-radius: 9999px;
          background: #1a1f2e;
        }
      `}</style>

      <div
        className="sq-grain flex h-screen bg-[#07080b] text-[#e6e9f4] overflow-hidden"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,#d9ff470a,transparent_70%)] top-[-10%] left-[10%]" />
          <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,#ff3d7f07,transparent_70%)] bottom-[5%] right-[5%]" />
        </div>

        <aside className="w-[58px] lg:w-56 bg-[#08090c] border-r border-[#1a1f2e] flex flex-col py-5 flex-shrink-0">
          <div className="px-3 mb-8">
            <div className="hidden lg:block">
              <div className="font-['Bebas_Neue'] text-[1.7rem] tracking-widest leading-none text-[#d9ff47] drop-shadow-[0_0_24px_#d9ff4740]">
                STREAM<span className="text-[#ff3d7f]">Q</span>
              </div>
              <div className="font-mono text-[8px] tracking-[0.18em] uppercase text-[#454d66] mt-0.5">
                Creator Studio
              </div>
            </div>
            <div className="lg:hidden font-['Bebas_Neue'] text-[1.4rem] leading-none text-[#d9ff47]">
              SQ
            </div>
          </div>

          <nav className="flex flex-col gap-0.5 px-2 flex-1">
            {navWithGuide.map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${page === item.id
                  ? item.id === "guide"
                    ? "bg-[#ff3d7f12] text-[#ff3d7f] border-[#ff3d7f22]"
                    : "bg-[#d9ff4712] text-[#d9ff47] border-[#d9ff4722] shadow-[0_0_14px_#d9ff4710]"
                  : "text-[#454d66] hover:text-[#e6e9f4] hover:bg-[#13161e] border-transparent"
                  }`}
              >
                <span className="w-4 text-center text-[13px] flex-shrink-0">{item.icon}</span>
                <span className="hidden lg:block font-['Syne'] font-semibold text-[13px]">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
          <SidebarVolume volume={volume} setVolume={setVolume} />

          <div className="px-2 mt-4">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#1a1f2e] bg-[#0d0f14]">
              <div className="relative flex-shrink-0">
                <img
                  src="https://picsum.photos/seed/creator/32/32"
                  className="w-7 h-7 rounded-full object-cover"
                  alt=""
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#d9ff47] border-[1.5px] border-[#08090c]" />
              </div>
              <div className="hidden lg:block min-w-0">
                <div className="font-['Syne'] font-bold text-[12px] truncate text-[#e6e9f4]">
                  DJ Kira
                </div>
                <div className="font-mono text-[9px] text-[#454d66] truncate">@kirasounds</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-col flex-1 min-w-0">
          <TopBar playing={playing} setPlaying={setPlaying} viewers={viewers} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-5 sq-scroll">
            {page === "live" && (
              <LivePage
                queue={queue}
                setQueue={setQueue}
                playing={playing}
                setPlaying={setPlaying}
                progress={progress}
                setProgress={setProgress}
                chat={chat}
                setChat={setChat}
                volume={volume}
                setVolume={setVolume}
                showModel={showModel}
                setShowModel={setShowModel}
                onPlayRequest={handlePlayRequest}
              />
            )}

            {page === "queue" && (
              <div className="flex flex-col gap-4">

                {/* ✅ Modal independent */}


                {/* ✅ Queue UI ALWAYS visible */}
                <div>
                  <SectionLabel>Manage</SectionLabel>
                  <DisplayH size="clamp(2rem,5vw,3rem)">Full Queue</DisplayH>
                </div>

                <Card>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f2e]">
                    <div className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest">
                      {queue.length} tracks
                    </div>
                  </div>

                  {queue.length > 0 ? (

                    queue.map((t, i) => (
                      <QueueRow
                        key={t.id}
                        track={t}
                        rank={i + 1}
                        onUpvote={(id) =>
                          setQueue((q) =>
                            resortQueue(
                              q.map((x) =>
                                x.id === id ? { ...x, votes: x.votes + 1 } : x
                              )
                            )
                          )
                        }
                        
                        onPlayRequest={handlePlayRequest}

                        onDownvote={(id) =>
                          setQueue((q) =>
                            resortQueue(
                              q.map((x) =>
                                x.id === id ? { ...x, votes: x.votes - 1 } : x
                              )
                            )
                          )
                        }
                        onRemove={(id) =>
                          setQueue((q) => q.filter((x) => x.id !== id))
                        }
                        userVote={0}

                      />
                    ))
                  ) : (
                    <div className="text-gray-500 p-4 text-center">
                      Queue is empty
                    </div>
                  )}

                  {/* ✅ Button */}
                  <button
                    onClick={() => {
                      setShowModel(true)
                      console.log("btn working")
                    }}
                    className="relative overflow-hidden w-full border border-dashed border-[#d9ff4730] bg-[#d9ff4706] hover:bg-[#d9ff4710] hover:border-[#d9ff4750] text-[#d9ff47] rounded-2xl py-5 flex flex-col items-center gap-1.5 transition-all group"
                  >
                    <span className="text-2xl">＋</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest">
                      Add Song to Queue
                    </span>
                  </button>
                </Card>
              </div>
            )}



            {page === "settings" && <SettingsPage />}
            {page === "guide" && <GuidePage />}

            {page === "analytics" && (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionLabel>Session</SectionLabel>
                  <DisplayH size="clamp(2rem,5vw,3rem)">Analytics</DisplayH>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ["Viewers", "1,284", "#00f0d4", [320, 460, 580, 720, 890, 1020, 1150, 1060, 1190, 1284]],
                    ["Votes", "341", "#d9ff47", [12, 28, 41, 55, 72, 89, 112, 130, 158, 181]],
                  ].map(([l, v, c, data]) => {
                    const numData = data as number[];
                    const max = Math.max(...numData);
                    const pts = numData
                      .map((x, i) => `${(i / (numData.length - 1)) * 200},${78 - (x / max) * 70}`)
                      .join(" ");

                    return (
                      <Card key={String(l)} className="p-5" glow>
                        <div className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest mb-1">
                          {l}
                        </div>
                        <div className="font-['Bebas_Neue'] text-[2rem] leading-none" style={{ color: String(c) }}>
                          {v}
                        </div>
                        <svg viewBox="0 0 200 80" preserveAspectRatio="none" className="w-full h-10 mt-3">
                          <polyline
                            points={pts}
                            fill="none"
                            stroke={String(c)}
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </Card>
                    );
                  })}
                </div>

                <Card>
                  <div className="px-5 py-4 border-b border-[#1a1f2e]">
                    <DisplayH size="1.3rem">Top Tracks</DisplayH>
                  </div>
                  {[...queue]
                    .sort((a, b) => b.votes - a.votes)
                    .map((t, i) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-4 px-5 py-3 border-b border-[#1a1f2e] last:border-0 hover:bg-[#13161e] transition-colors"
                      >
                        <span className="font-['Bebas_Neue'] text-[1.6rem] text-[#1a1f2e] w-6 flex-shrink-0">
                          {i + 1}
                        </span>
                        <img src={ytThumb(t.ytId)} alt={t.title} className="w-12 h-9 rounded-lg object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-['Syne'] text-sm font-semibold truncate">{t.title}</div>
                          <div className="font-mono text-[9px] text-[#454d66]">{t.artist}</div>
                        </div>
                        <div className="w-24 hidden sm:block">
                          <div className="h-[3px] bg-[#1a1f2e] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#d9ff47] to-[#ff3d7f] rounded-full"
                              style={{ width: `${Math.max(0, (t.votes / 47) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div
                          className={`font-mono text-[9px] min-w-[36px] text-right flex-shrink-0 ${t.votes >= 0 ? "text-[#d9ff47]" : "text-[#ff3d7f]"
                            }`}
                        >
                          {t.votes >= 0 ? `▲ ${t.votes}` : `▼ ${Math.abs(t.votes)}`}
                        </div>
                      </div>
                    ))}
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}