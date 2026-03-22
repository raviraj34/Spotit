"use client";

import axios from "axios";
import { log } from "console";
import { useState, useEffect, useRef } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────
const QUEUE_INIT = [
  { id:1, title:"Neon Drift",        artist:"Solaris",          genre:"Synthwave",  votes:47, duration:"3:42", cover:"https://picsum.photos/seed/neon/48/48",    addedBy:"fan_808",    playing:true },
  { id:2, title:"Crimson Undertow",  artist:"The Veldt",        genre:"Shoegaze",   votes:31, duration:"4:15", cover:"https://picsum.photos/seed/crimson/48/48", addedBy:"wavydave"               },
  { id:3, title:"Glass Ceiling",     artist:"Mara Chen",        genre:"Indie Pop",  votes:28, duration:"3:58", cover:"https://picsum.photos/seed/glass/48/48",   addedBy:"starfall_99"            },
  { id:4, title:"Orbit Decay",       artist:"HVMAN",            genre:"Electronic", votes:22, duration:"5:01", cover:"https://picsum.photos/seed/orbit/48/48",   addedBy:"basshead_xx"            },
  { id:5, title:"Slow Burn",         artist:"Pilar & the Echo", genre:"R&B",        votes:19, duration:"3:27", cover:"https://picsum.photos/seed/slow/48/48",    addedBy:"vibes_only"             },
  { id:6, title:"Phosphene",         artist:"Lumen",            genre:"Ambient",    votes:14, duration:"4:44", cover:"https://picsum.photos/seed/phos/48/48",    addedBy:"night_owl_7"            },
];
const CHAT_INIT = [
  { id:1, user:"fan_808",     msg:"NEON DRIFT 🔥🔥🔥",              creator:false },
  { id:2, user:"wavydave",    msg:"vote Crimson Undertow pleaseee", creator:false },
  { id:3, user:"night_owl_7", msg:"best stream tonight",            creator:false },
  { id:4, user:"synthkid_22", msg:"more synthwave 🎛️",             creator:false },
];
const CHAT_POOL = [
  "this beat is EVERYTHING","who added Orbit Decay?? legend","vote Glass Ceiling!!",
  "🔥🔥🔥","ambient next pls","stream quality is pristine","let's gooo",
  "HVMAN never misses","first time here, this is sick","♫♫♫",
];
const TOP_FANS = [
  { name:"fan_808",     votes:18, avatar:"https://picsum.photos/seed/f1/32/32" },
  { name:"starfall_99", votes:14, avatar:"https://picsum.photos/seed/f2/32/32" },
  { name:"basshead_xx", votes:11, avatar:"https://picsum.photos/seed/f3/32/32" },
  { name:"vibes_only",  votes:9,  avatar:"https://picsum.photos/seed/f4/32/32" },
  { name:"wavydave",    votes:7,  avatar:"https://picsum.photos/seed/f5/32/32" },
];
const HISTORY = [
  { title:"Midnight Signal", artist:"Arko",     duration:"3:12" },
  { title:"Deep Blue",       artist:"Cove",      duration:"4:02" },
  { title:"Paper Walls",     artist:"Luna Grey", duration:"3:55" },
];
const GENRES = ["All","Synthwave","Shoegaze","Indie Pop","Electronic","R&B","Ambient"];
const NAV = [
  { icon:"▶", label:"Now Live",  id:"live"      },
  { icon:"≡", label:"Queue",     id:"queue"     },
  { icon:"◎", label:"Analytics", id:"analytics" },
  { icon:"⚙", label:"Settings",  id:"settings"  },
];
const VIEWER_SPARK = [320,460,580,720,890,1020,1150,1060,1190,1284];
const VOTE_SPARK   = [12,28,41,55,72,89,112,130,158,181];

// ── Design tokens (exact match to landing page) ────────────────────────────
// bg: #07080b | surface: #0d0f14 | surface2: #13161e | border: #1a1f2e
// accent: #d9ff47 | pink: #ff3d7f | cyan: #00f0d4 | purple: #a78bfa
// text: #e6e9f4 | muted: #454d66
// fonts: Bebas Neue · Syne · DM Mono

// ── Atoms ─────────────────────────────────────────────────────────────────────

/** Surface card — matches landing "feature card" style */
function Card({ children, className = "", glow = false }) {
  return (
    <div className={`relative bg-[#0d0f14] border border-[#1a1f2e] rounded-2xl overflow-hidden group transition-all duration-300 hover:border-[#d9ff4728] ${className}`}>
      {/* top-border shimmer on hover — identical to landing feature cards */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d9ff47] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
      {glow && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#d9ff4708,transparent_55%)] pointer-events-none" />
      )}
      {children}
    </div>
  );
}

/** Section label — same as landing "How It Works" eyebrow */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="w-7 h-px bg-[#d9ff47] flex-shrink-0" />
      <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#d9ff47]">{children}</span>
    </div>
  );
}

/** Display heading — Bebas Neue */
function DisplayH({ children, size = "2.4rem", className = "" }) {
  return (
    <h2 className={`font-['Bebas_Neue'] leading-[0.93] tracking-wide ${className}`} style={{ fontSize: size }}>
      {children}
    </h2>
  );
}

/** Filter pill — same style as landing marquee / genre chips */
function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
        active
          ? "bg-[#d9ff4715] border-[#d9ff4735] text-[#d9ff47]"
          : "border-[#1a1f2e] text-[#454d66] hover:text-[#e6e9f4] hover:border-[#454d66]"
      }`}>{label}</button>
  );
}

/** Primary button — exact copy of landing "Start Your Stream Free" */
function PrimaryBtn({ children, onClick, success = false, className = "" }) {
  return (
    <button onClick={onClick}
      className={`relative overflow-hidden px-8 py-3 rounded-full font-['Syne'] font-extrabold text-sm tracking-wide transition-all group ${className} ${
        success
          ? "bg-[#00f0d4] text-[#07080b] cursor-default"
          : "bg-[#d9ff47] text-[#07080b] hover:bg-[#c4e83a] hover:shadow-[0_8px_32px_#d9ff4748] hover:-translate-y-0.5"
      }`}>
      <span className="relative z-10">{children}</span>
      <span className="absolute top-[-50%] left-[-60%] w-1/2 h-[200%] bg-white/20 -skew-x-[20deg] group-hover:left-[130%] transition-all duration-500 pointer-events-none" />
    </button>
  );
}

/** Toggle switch */
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full relative flex-shrink-0 border transition-all duration-200 ${
        value ? "bg-[#d9ff47] border-[#d9ff4760]" : "bg-[#13161e] border-[#1a1f2e]"
      }`}>
      <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full shadow transition-all duration-200 ${
        value ? "left-[22px] bg-[#07080b]" : "left-[3px] bg-[#454d66]"
      }`} />
    </button>
  );
}

/** Mini sparkline chart */
function SparkLine({ data, color }) {
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 200},${78 - (v / max) * 70}`).join(" ");
  return (
    <svg viewBox="0 0 200 80" preserveAspectRatio="none" className="w-full h-10">
      <defs>
        <linearGradient id={`grad${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polyline points={`0,80 ${pts} 200,80`}
        fill={`url(#grad${color.replace("#","")})`} stroke="none" />
      <polyline points={pts}
        fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Audio visualizer bars */
function Visualizer({ playing }) {
  return (
    <div className="flex items-end gap-[2px] h-7 flex-shrink-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="w-[3px] rounded-full bg-[#d9ff47] opacity-70"
          style={{
            height: "4px",
            animation: playing
              ? `sqBar 0.55s ease-in-out ${(i * 71) % 440}ms infinite alternate`
              : "none",
          }} />
      ))}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }) {
  return (
    <aside className="w-[58px] lg:w-56 bg-[#08090c] border-r border-[#1a1f2e] flex flex-col py-5 flex-shrink-0">
      {/* Logo — exact landing page style */}
      <div className="px-3 mb-8">
        <div className="hidden lg:block">
          <div className="font-['Bebas_Neue'] text-[1.7rem] tracking-widest leading-none text-[#d9ff47] drop-shadow-[0_0_24px_#d9ff4740]">
            STREAM<span className="text-[#ff3d7f]">Q</span>
          </div>
          <div className="font-mono text-[8px] tracking-[0.18em] uppercase text-[#454d66] mt-0.5">Creator Studio</div>
        </div>
        <div className="lg:hidden font-['Bebas_Neue'] text-[1.4rem] leading-none text-[#d9ff47]">SQ</div>
      </div>

      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV.map(item => (
          <button key={item.id} onClick={() => setActive(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
              active === item.id
                ? "bg-[#d9ff4712] text-[#d9ff47] border-[#d9ff4722] shadow-[0_0_14px_#d9ff4710]"
                : "text-[#454d66] hover:text-[#e6e9f4] hover:bg-[#13161e] border-transparent"
            }`}>
            <span className="w-4 text-center text-[13px] flex-shrink-0">{item.icon}</span>
            <span className="hidden lg:block font-['Syne'] font-semibold text-[13px]">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Creator avatar */}
      <div className="px-2 mt-4">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#1a1f2e] bg-[#0d0f14]">
          <div className="relative flex-shrink-0">
            <img src="https://picsum.photos/seed/creator/32/32"
              className="w-7 h-7 rounded-full object-cover" alt="avatar" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#d9ff47] border-[1.5px] border-[#08090c]" />
          </div>
          <div className="hidden lg:block min-w-0">
            <div className="font-['Syne'] font-bold text-[12px] truncate text-[#e6e9f4]">DJ Kira</div>
            <div className="font-mono text-[9px] text-[#454d66] truncate">@kirasounds</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────
function TopBar({ playing, setPlaying, viewers }) {
  return (
    <header className="min-h-[52px] border-b border-[#1a1f2e] bg-[#08090c]/90 backdrop-blur-md flex items-center justify-between px-5 flex-shrink-0 gap-3">
      <div className="flex items-center gap-3">
        {/* Live badge — mirrors landing page live badge exactly */}
        <div className="flex items-center gap-1.5 bg-[#ff3d7f12] border border-[#ff3d7f30] px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d7f] animate-pulse" />
          <span className="font-mono text-[9px] tracking-widest uppercase text-[#ff3d7f]">Live</span>
        </div>
        <span className="font-mono text-[10px] text-[#454d66]">
          <span className="text-[#e6e9f4] font-semibold">{viewers.toLocaleString()}</span> watching
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setPlaying(p => !p)}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-[9px] tracking-widest uppercase border transition-all ${
            playing
              ? "bg-[#ff3d7f12] border-[#ff3d7f30] text-[#ff3d7f] hover:bg-[#ff3d7f20]"
              : "bg-[#d9ff4712] border-[#d9ff4730] text-[#d9ff47] hover:bg-[#d9ff4720]"
          }`}>
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

// ── Stat Card ─────────────────────────────────────────────────────────────────
const badgeStyles = {
  accent: "text-[#d9ff47] border-[#d9ff4730] bg-[#d9ff4710]",
  pink:   "text-[#ff3d7f] border-[#ff3d7f30] bg-[#ff3d7f10]",
  cyan:   "text-[#00f0d4] border-[#00f0d430] bg-[#00f0d410]",
  purple: "text-[#a78bfa] border-[#a78bfa30] bg-[#a78bfa10]",
};

function StatCard({ icon, label, value, badge, color }) {
  return (
    <Card glow className="p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{icon}</span>
        <span className={`font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 rounded-full border ${badgeStyles[color]}`}>
          {badge}
        </span>
      </div>
      <div className="font-['Bebas_Neue'] text-[2.2rem] leading-none text-[#e6e9f4]">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-[#454d66] mt-1">{label}</div>
    </Card>
  );
}

// ── Now Playing ───────────────────────────────────────────────────────────────
function NowPlayingCard({ track, playing, progress }) {
  return (
    <Card glow className="p-5">
      <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#d9ff47] mb-4">▶ Now Playing</div>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-shrink-0">
          <img src={track.cover} alt={track.title}
            className="w-16 h-16 rounded-xl object-cover shadow-[0_0_28px_#d9ff4725]" />
          <div className="absolute inset-0 rounded-xl ring-1 ring-[#d9ff4730]" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <div className="font-['Bebas_Neue'] text-[1.9rem] leading-none tracking-wide truncate">{track.title}</div>
          <div className="text-xs text-[#454d66] mt-1">{track.artist}</div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="font-mono text-[9px] border border-[#1a1f2e] text-[#454d66] px-2 py-0.5 rounded-full">{track.genre}</span>
            <span className="font-mono text-[9px] text-[#d9ff47]">▲ {track.votes} votes</span>
            <span className="font-mono text-[9px] text-[#454d66]">by {track.addedBy}</span>
          </div>
        </div>
        <Visualizer playing={playing} />
      </div>
      <div className="mt-4">
        <div className="w-full h-[3px] bg-[#1a1f2e] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#d9ff47] to-[#ff3d7f] transition-all duration-100"
            style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 font-mono text-[9px] text-[#454d66]">
          <span>{Math.floor((progress / 100) * 222)}s</span>
          <span>{track.duration}</span>
        </div>
      </div>
    </Card>
  );
}

// ── Queue Row ─────────────────────────────────────────────────────────────────
function QueueRow({ track, rank, onPin, onRemove, pinned }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-[#1a1f2e] last:border-0 hover:bg-[#13161e] transition-colors group cursor-default ${
      track.playing ? "bg-[#d9ff4706] border-l-2 border-l-[#d9ff47]" : ""
    }`}>
      <span className="font-mono text-[9px] w-4 text-center flex-shrink-0">
        {track.playing ? <span className="text-[#d9ff47]">▶</span> : <span className="text-[#454d66]">{rank}</span>}
      </span>
      <img src={track.cover} alt={track.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-['Syne'] text-sm font-semibold truncate">{track.title}</div>
        <div className="font-mono text-[9px] text-[#454d66] mt-0.5">{track.artist} · {track.genre}</div>
      </div>
      <div className="font-mono text-[9px] text-[#454d66] hidden md:block flex-shrink-0">{track.duration}</div>
      <div className="flex items-center gap-1 font-mono text-[9px] text-[#d9ff47] bg-[#d9ff4710] border border-[#d9ff4725] px-2 py-0.5 rounded-full flex-shrink-0">
        <span className="text-[7px]">▲</span>{track.votes}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onPin(track.id)}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] border transition-all ${
            pinned
              ? "bg-[#d9ff4715] border-[#d9ff4730] text-[#d9ff47]"
              : "border-[#1a1f2e] text-[#454d66] hover:text-[#d9ff47] hover:border-[#d9ff4730]"
          }`}>📌</button>
        <button onClick={() => onRemove(track.id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] border border-[#1a1f2e] text-[#454d66] hover:text-[#ff3d7f] hover:border-[#ff3d7f30] transition-all">✕</button>
      </div>
    </div>
  );
}

// ── Live Page ─────────────────────────────────────────────────────────────────
function LivePage({ queue, setQueue, playing, progress, chat, setChat }) {
  const [chatInput, setChatInput] = useState("");
  const [pinned,    setPinned]    = useState(new Set());
  const [genre,     setGenre]     = useState("All");
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  const filtered = genre === "All" ? queue : queue.filter(t => t.genre === genre);

  const handleChat = e => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChat(prev => [...prev, { id: Date.now(), user: "you (creator)", msg: chatInput, creator: true }]);
    setChatInput("");
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full min-h-0">

      {/* ── Left ── */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        <NowPlayingCard track={queue[0]} playing={playing} progress={progress} />

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard icon="👥" label="Viewers"       value="1,284" badge="+12%"         color="cyan"   />
          <StatCard icon="🗳️" label="Votes Cast"   value="341"   badge="This session"  color="accent" />
          <StatCard icon="🎵" label="Tracks Played" value="7"     badge="Today"         color="pink"   />
          <StatCard icon="💬" label="Chat Msgs"     value="892"   badge="Active"        color="purple" />
        </div>

        {/* Queue */}
        <Card className="flex flex-col flex-1 min-h-[260px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f2e] flex-shrink-0 flex-wrap gap-2">
            <div>
              <DisplayH size="1.3rem">Fan Queue</DisplayH>
              <div className="font-mono text-[9px] text-[#454d66] mt-0.5 uppercase tracking-widest">Sorted by votes · live</div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {GENRES.slice(0, 5).map(g => (
                <FilterPill key={g} label={g} active={genre === g} onClick={() => setGenre(g)} />
              ))}
            </div>
          </div>
          <div className="overflow-y-auto flex-1 sq-scroll">
            {filtered.map((t, i) => (
              <QueueRow key={t.id} track={t} rank={i}
                onPin={id => setPinned(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                onRemove={id => setQueue(q => q.filter(x => x.id !== id))}
                pinned={pinned.has(t.id)} />
            ))}
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-20 font-mono text-[9px] text-[#454d66] uppercase tracking-widest">
                No tracks in this genre
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Right ── */}
      <div className="flex flex-col gap-4 w-full xl:w-[280px] flex-shrink-0">

        {/* Chat */}
        <Card className="flex flex-col" style={{ height: 320 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f2e] flex-shrink-0">
            <DisplayH size="1.2rem">Live Chat</DisplayH>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d7f] animate-pulse" />
              <span className="font-mono text-[9px] text-[#454d66]">892 msgs</span>
            </div>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 sq-scroll">
            {chat.map(m => (
              <div key={m.id}>
                <span className={`font-mono text-[9px] mr-1 ${m.creator ? "text-[#d9ff47]" : "text-[#ff3d7f]"}`}>{m.user}</span>
                <span className="text-xs text-[#e6e9f4]/80">{m.msg}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleChat} className="flex gap-2 px-3 py-2.5 border-t border-[#1a1f2e] flex-shrink-0">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder="Say something…"
              className="flex-1 bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] placeholder-[#454d66] rounded-full px-3 py-1.5 text-xs focus:outline-none focus:border-[#d9ff47] transition-colors" />
            <button type="submit"
              className="w-8 h-8 rounded-full bg-[#d9ff47] text-[#07080b] flex items-center justify-center font-bold text-sm hover:bg-[#c4e83a] transition-colors flex-shrink-0">↑</button>
          </form>
        </Card>

        {/* Top Fans */}
        <Card>
          <div className="px-4 py-3 border-b border-[#1a1f2e]">
            <DisplayH size="1.2rem">Top Fans</DisplayH>
            <div className="font-mono text-[9px] text-[#454d66] mt-0.5 uppercase tracking-widest">Most votes · session</div>
          </div>
          {TOP_FANS.map((fan, i) => (
            <div key={fan.name} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1f2e] last:border-0 hover:bg-[#13161e] transition-colors">
              <span className="font-['Bebas_Neue'] text-lg text-[#1a1f2e] w-4 leading-none">{i + 1}</span>
              <img src={fan.avatar} alt={fan.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
              <span className="flex-1 font-['Syne'] text-xs font-semibold truncate">{fan.name}</span>
              <span className="font-mono text-[9px] text-[#d9ff47]">▲ {fan.votes}</span>
            </div>
          ))}
        </Card>

        {/* History */}
        <Card>
          <div className="px-4 py-3 border-b border-[#1a1f2e]">
            <DisplayH size="1.2rem">History</DisplayH>
          </div>
          {HISTORY.map(h => (
            <div key={h.title} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1f2e] last:border-0 opacity-40 hover:opacity-70 transition-opacity">
              <div className="flex-1 min-w-0">
                <div className="font-['Syne'] text-xs font-semibold truncate">{h.title}</div>
                <div className="font-mono text-[9px] text-[#454d66]">{h.artist}</div>
              </div>
              <span className="font-mono text-[9px] text-[#454d66] flex-shrink-0">{h.duration}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── Analytics Page ────────────────────────────────────────────────────────────
function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Session Overview</SectionLabel>
        <DisplayH size="clamp(2rem,5vw,3rem)">Analytics</DisplayH>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label:"Viewers Over Time", value:"1,284", change:"+22% ↑", color:"#00f0d4", bc:"text-[#00f0d4] border-[#00f0d430] bg-[#00f0d410]", data:VIEWER_SPARK },
          { label:"Votes Cast",        value:"341",   change:"+41% ↑", color:"#d9ff47", bc:"text-[#d9ff47] border-[#d9ff4730] bg-[#d9ff4710]", data:VOTE_SPARK   },
        ].map(c => (
          <Card key={c.label} className="p-5" glow>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest">{c.label}</div>
                <div className="font-['Bebas_Neue'] text-[2.2rem] leading-none mt-1" style={{ color: c.color }}>{c.value}</div>
              </div>
              <span className={`font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full border ${c.bc}`}>{c.change}</span>
            </div>
            <SparkLine data={c.data} color={c.color} />
          </Card>
        ))}
      </div>

      {/* Top tracks */}
      <Card>
        <div className="px-5 py-4 border-b border-[#1a1f2e]">
          <DisplayH size="1.4rem">Top Requested Tracks</DisplayH>
        </div>
        {[...QUEUE_INIT].sort((a,b) => b.votes - a.votes).map((t, i) => (
          <div key={t.id} className="flex items-center gap-4 px-5 py-3 border-b border-[#1a1f2e] last:border-0 hover:bg-[#13161e] transition-colors">
            <span className="font-['Bebas_Neue'] text-[1.8rem] leading-none text-[#1a1f2e] w-6 flex-shrink-0">{i+1}</span>
            <img src={t.cover} alt={t.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-['Syne'] text-sm font-semibold truncate">{t.title}</div>
              <div className="font-mono text-[9px] text-[#454d66]">{t.artist}</div>
            </div>
            <span className="font-mono text-[9px] text-[#454d66] hidden md:block flex-shrink-0">{t.genre}</span>
            <div className="w-24 hidden sm:block flex-shrink-0">
              <div className="h-[3px] bg-[#1a1f2e] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#d9ff47] to-[#ff3d7f] rounded-full"
                  style={{ width:`${(t.votes/47)*100}%` }} />
              </div>
            </div>
            <div className="font-mono text-[9px] text-[#d9ff47] min-w-[36px] text-right flex-shrink-0">▲ {t.votes}</div>
          </div>
        ))}
      </Card>

      {/* Genre breakdown */}
      <Card className="p-5">
        <DisplayH size="1.4rem" className="mb-5">Genre Breakdown</DisplayH>
        <div className="flex flex-col gap-3.5">
          {[["Synthwave","#d9ff47",47],["Shoegaze","#ff3d7f",31],["Indie Pop","#00f0d4",28],["Electronic","#a78bfa",22],["R&B","#fb923c",19]].map(([g,c,v]) => (
            <div key={g} className="flex items-center gap-4">
              <span className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest w-20 text-right flex-shrink-0">{g}</span>
              <div className="flex-1 h-[3px] bg-[#1a1f2e] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width:`${(v/47)*100}%`, background: c }} />
              </div>
              <span className="font-mono text-[9px] min-w-[24px] text-right flex-shrink-0" style={{ color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Queue Page ────────────────────────────────────────────────────────────────
function QueuePage({ queue, setQueue }) {
  const [pinned, setPinned] = useState(new Set());
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Manage</SectionLabel>
        <DisplayH size="clamp(2rem,5vw,3rem)">Full Queue</DisplayH>
      </div>
      <Card>
        <div className="px-5 py-3.5 border-b border-[#1a1f2e] flex items-center justify-between flex-wrap gap-2">
          <div className="font-mono text-[9px] text-[#454d66] uppercase tracking-widest">{queue.length} tracks · sorted by votes</div>
          <FilterPill label="Clear Non-Playing" onClick={() => setQueue(q => q.filter(t => t.playing))} />
        </div>
        {queue.map((t, i) => (
          <QueueRow key={t.id} track={t} rank={i}
            onPin={id => setPinned(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
            onRemove={id => setQueue(q => q.filter(x => x.id !== id))}
            pinned={pinned.has(t.id)} />
        ))}
      </Card>
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
function SettingsPage() {
  const [explicit, setExplicit] = useState(false);
  const [autoSkip, setAutoSkip] = useState(true);
  const [chatMod,  setChatMod]  = useState(true);
  const [maxQueue, setMaxQueue] = useState(20);
  const [blocked,  setBlocked]  = useState([]);
  const [saved,    setSaved]    = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <SectionLabel>Preferences</SectionLabel>
        <DisplayH size="clamp(2rem,5vw,3rem)">Settings</DisplayH>
      </div>

      {/* Stream rules */}
      <Card>
        <div className="px-5 py-3.5 border-b border-[#1a1f2e]">
          <DisplayH size="1.3rem">Stream Rules</DisplayH>
        </div>
        {[
          { label:"Allow Explicit Tracks", desc:"Fans can request tracks with explicit content", val:explicit, set:setExplicit },
          { label:"Auto-Skip Flagged",      desc:"Automatically skip tracks flagged by chat",    val:autoSkip, set:setAutoSkip },
          { label:"Chat Moderation",        desc:"Filter slurs and hate speech in real time",    val:chatMod,  set:setChatMod  },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#1a1f2e] last:border-0 hover:bg-[#13161e] transition-colors">
            <div>
              <div className="font-['Syne'] font-semibold text-[13px]">{item.label}</div>
              <div className="font-mono text-[9px] text-[#454d66] mt-0.5">{item.desc}</div>
            </div>
            <Toggle value={item.val} onChange={item.set} />
          </div>
        ))}
      </Card>

      {/* Queue limits */}
      <Card>
        <div className="px-5 py-3.5 border-b border-[#1a1f2e]">
          <DisplayH size="1.3rem">Queue Limits</DisplayH>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#13161e] transition-colors">
          <div>
            <div className="font-['Syne'] font-semibold text-[13px]">Max Queue Length</div>
            <div className="font-mono text-[9px] text-[#454d66] mt-0.5">Maximum tracks fans can queue at once</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setMaxQueue(q => Math.max(5,  q-5))}
              className="w-8 h-8 rounded-xl bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] hover:border-[#d9ff4740] hover:text-[#d9ff47] transition-all font-bold text-lg leading-none">−</button>
            <span className="font-['Bebas_Neue'] text-[1.8rem] leading-none w-10 text-center text-[#d9ff47]">{maxQueue}</span>
            <button onClick={() => setMaxQueue(q => Math.min(50, q+5))}
              className="w-8 h-8 rounded-xl bg-[#13161e] border border-[#1a1f2e] text-[#e6e9f4] hover:border-[#d9ff4740] hover:text-[#d9ff47] transition-all font-bold text-lg leading-none">+</button>
          </div>
        </div>
      </Card>

      {/* Blocked genres */}
      <Card>
        <div className="px-5 py-3.5 border-b border-[#1a1f2e]">
          <DisplayH size="1.3rem">Blocked Genres</DisplayH>
          <div className="font-mono text-[9px] text-[#454d66] mt-0.5 uppercase tracking-widest">Fans cannot request these genres</div>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-2">
          {GENRES.slice(1).map(g => {
            const on = blocked.includes(g);
            return (
              <button key={g} onClick={() => setBlocked(b => on ? b.filter(x=>x!==g) : [...b,g])}
                className={`font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 rounded-full border transition-all ${
                  on
                    ? "bg-[#ff3d7f12] border-[#ff3d7f35] text-[#ff3d7f]"
                    : "border-[#1a1f2e] text-[#454d66] hover:text-[#e6e9f4] hover:border-[#454d66]"
                }`}>{on ? "✕ " : ""}{g}</button>
            );
          })}
        </div>
      </Card>

      {/* Save — exact landing CTA button */}
      <PrimaryBtn onClick={save} success={saved}>{saved ? "✓ Saved!" : "Save Changes"}</PrimaryBtn>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function StreamQDashboard() {
  const [page,     setPage]     = useState("live");
  const [playing,  setPlaying]  = useState(true);
  const [progress, setProgress] = useState(32);
  const [viewers,  setViewers]  = useState(1284);
  const [queue,    setQueue]    = useState(QUEUE_INIT);
  const [chat,     setChat]     = useState(CHAT_INIT);
  const REFRESH_INTERVAL_MS =10*1000;

async function refreshStreams(){
  const res = await axios.get("/api/streams/my")
   console.log(res);
   
}

useEffect(()=>{
  refreshStreams();
  const interval = setInterval(() => {
    
  }, REFRESH_INTERVAL_MS);
},[])

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.25), 100);
    return () => clearInterval(iv);
  }, [playing]);

  useEffect(() => {
    const iv = setInterval(() =>
      setViewers(v => Math.max(100, v + Math.floor(Math.random()*7)-2)), 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const users = ["fan_808","wavydave","night_owl_7","synthkid_22","lofi_ghost","neon_tides"];
    const iv = setInterval(() => {
      setChat(prev => [...prev.slice(-40), {
        id: Date.now(),
        user: users[Math.floor(Math.random()*users.length)],
        msg:  CHAT_POOL[Math.floor(Math.random()*CHAT_POOL.length)],
        creator: false,
      }]);
    }, 3200);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        /* Visualizer keyframe — same as StreamQ landing */
        @keyframes sqBar {
          from { height: 4px;  opacity: 0.45; }
          to   { height: 26px; opacity: 0.85; }
        }

        /* Grain overlay — identical to landing page */
        .sq-grain::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.022;
          pointer-events: none;
          z-index: 9999;
        }

        /* Thin scrollbar */
        .sq-scroll::-webkit-scrollbar       { width: 3px; }
        .sq-scroll::-webkit-scrollbar-track { background: transparent; }
        .sq-scroll::-webkit-scrollbar-thumb { background: #1a1f2e; border-radius: 4px; }
        .sq-scroll::-webkit-scrollbar-thumb:hover { background: #d9ff4750; }
      `}</style>

      <div className="sq-grain flex h-screen bg-[#07080b] text-[#e6e9f4] overflow-hidden"
        style={{ fontFamily: "'Syne', sans-serif" }}>

        {/* Ambient glows — exact same radials as landing page hero */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,#d9ff470a,transparent_70%)] top-[-10%] left-[10%]" />
          <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,#ff3d7f07,transparent_70%)] bottom-[5%] right-[5%]" />
        </div>

        <Sidebar active={page} setActive={setPage} />

        <div className="flex flex-col flex-1 min-w-0">
          <TopBar playing={playing} setPlaying={setPlaying} viewers={viewers} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-5 sq-scroll">
            {page === "live"      && <LivePage queue={queue} setQueue={setQueue} playing={playing} progress={progress} chat={chat} setChat={setChat} />}
            {page === "queue"     && <QueuePage queue={queue} setQueue={setQueue} />}
            {page === "analytics" && <AnalyticsPage />}
            {page === "settings"  && <SettingsPage />}
          </main>
        </div>
      </div>
    </>
  );
}