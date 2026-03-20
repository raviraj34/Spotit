"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";

// ── Data ────────────────────────────────────────────────────────────────────
const DEMO_TRACKS = [
    { id: 1, title: "Neon Drift", artist: "Solaris", genre: "Synthwave", votes: 47, cover: "https://picsum.photos/seed/neon/40/40", top: true },
    { id: 2, title: "Crimson Undertow", artist: "The Veldt", genre: "Shoegaze", votes: 31, cover: "https://picsum.photos/seed/crimson/40/40" },
    { id: 3, title: "Glass Ceiling", artist: "Mara Chen", genre: "Indie Pop", votes: 28, cover: "https://picsum.photos/seed/glass/40/40" },
    { id: 4, title: "Orbit Decay", artist: "HVMAN", genre: "Electronic", votes: 22, cover: "https://picsum.photos/seed/orbit/40/40" },
];

const STEPS = [
    { num: "01", icon: "🎙️", title: "Go Live", tag: "60 seconds", tagColor: "text-[#d9ff47] border-[#d9ff4730]", desc: "Connect your stream in seconds. StreamQ overlays on your existing OBS, Twitch, or YouTube setup instantly." },
    { num: "02", icon: "🗳️", title: "Fans Vote", tag: "Real-time", tagColor: "text-[#ff3d7f] border-[#ff3d7f30]", desc: "Your audience submits tracks and upvotes their favorites. The queue re-orders live — highest votes plays next." },
    { num: "03", icon: "🔊", title: "Music Plays", tag: "Auto-queue", tagColor: "text-[#00f0d4] border-[#00f0d430]", desc: "StreamQ auto-queues the top-voted track the moment the current song ends. Fans go wild every single time." },
];

const FEATURES = [
    { icon: "⚡", title: "99ms Latency", desc: "WebSocket-powered sync keeps every vote instant. No refresh, no lag." },
    { icon: "🎚️", title: "Creator Controls", desc: "Pin tracks, block requests, set genre filters. Fans vote — you curate." },
    { icon: "💬", title: "Live Chat Built-In", desc: "Fans hype their picks in a unified chat — no third-party widget needed." },
    { icon: "📊", title: "Stream Analytics", desc: "See top tracks, vote velocity, peak viewers and engagement after every session." },
];

const TESTIMONIALS = [
    { quote: "My stream engagement tripled the first night. Fans losing their minds every time their song hit the top.", name: "DJ Kira", handle: "@kirasounds", viewers: "12K", seed: "user1" },
    { quote: "I used to dread picking setlists. Now I just go live and let the chaos unfold. Every night feels like a party.", name: "Marek P.", handle: "@marekplays", viewers: "4.8K", seed: "user2" },
    { quote: "The real-time voting is addictive. My fans treat each stream like a competition. Watch time up 40%.", name: "Yuki Lune", handle: "@yukilune", viewers: "28K", seed: "user3" },
];

const MARQUEE_ITEMS = [
    { label: "Fan Queue", color: "text-[#454d66]" },
    { label: "Live Voting", color: "text-[#ff3d7f]" },
    { label: "Real-Time Sync", color: "text-[#00f0d4]" },
    { label: "Streamer Controls", color: "text-[#454d66]" },
    { label: "Fan Requests", color: "text-[#ff3d7f]" },
    { label: "Live Chat", color: "text-[#00f0d4]" },
    { label: "Any Genre", color: "text-[#454d66]" },
    { label: "Instant Playback", color: "text-[#ff3d7f]" },
    { label: "Zero Ads", color: "text-[#00f0d4]" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Navbar({ scrolled }) {
    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${scrolled ? "backdrop-blur-xl bg-[#07080bdd] border-b border-[#1a1f2e]" : "bg-transparent"}`}>
            <a href="#" className="font-['Bebas_Neue'] text-3xl tracking-widest text-[#d9ff47] drop-shadow-[0_0_30px_#d9ff4740]">
                STREAM<span className="text-[#ff3d7f]">Q</span>
            </a>
            <div className="hidden md:flex items-center gap-6">
                {["How it Works", "Features", "Creators"].map((l) => (
                    <a key={l} href={`#${l.toLowerCase().replace(/ /g, "")}`} className="font-mono text-xs tracking-widest uppercase text-[#454d66] hover:text-[#e6e9f4] transition-colors">{l}</a>
                ))}
                <button className="bg-[#d9ff47] text-[#07080b] px-5 py-2 rounded-full font-bold text-sm hover:bg-[#c4e83a] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_30px_#d9ff4748]" onClick={()=>signIn()}>SignIn</button>
                <a href="#cta" className="bg-[#d9ff47] text-[#07080b] px-5 py-2 rounded-full font-bold text-sm hover:bg-[#c4e83a] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_30px_#d9ff4748]">
                    Start Streaming
                </a>
            </div>
        </nav>
    );
}

function Ring({ size, duration, reverse = false }) {
    return (
        <div
            className="absolute rounded-full border border-white/5 top-1/2 left-1/2 pointer-events-none"
            style={{
                width: size, height: size,
                transform: "translate(-50%,-50%)",
                animation: `spin ${duration}s linear infinite ${reverse ? "reverse" : ""}`,
            }}
        />
    );
}

function HeroSection() {
    return (
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 overflow-hidden">
            {/* Glow blobs */}
            <div className="absolute w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,#d9ff4710_0%,transparent_70%)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] pointer-events-none" />
            <div className="absolute w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,#ff3d7f0a_0%,transparent_70%)] bottom-[10%] right-[10%] pointer-events-none animate-[float_8s_ease-in-out_infinite]" />

            {/* Rings */}
            <Ring size="600px" duration={40} />
            <Ring size="900px" duration={60} reverse />
            <Ring size="1200px" duration={80} />

            {/* Content */}
            <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#d9ff47] mb-5 animate-[fadeUp_0.8s_ease_forwards_0.2s] opacity-0">
                🎛 Fan-Powered Music Streaming
            </p>

            <h1 className="font-['Bebas_Neue'] leading-[0.92] tracking-wide relative z-10 animate-[fadeUp_0.9s_ease_forwards_0.4s] opacity-0"
                style={{ fontSize: "clamp(4.5rem,12vw,10rem)" }}>
                <span className="block text-[#e6e9f4]">LET FANS</span>
                <span className="block text-[#d9ff47] drop-shadow-[0_0_40px_#d9ff4740]">CONTROL</span>
                <span className="block" style={{ WebkitTextStroke: "1.5px #ff3d7f", color: "transparent" }}>THE VIBE</span>
            </h1>

            <p className="text-[#454d66] max-w-md mx-auto mt-7 leading-relaxed text-base animate-[fadeUp_0.9s_ease_forwards_0.6s] opacity-0">
                StreamQ gives your fans the mic — they request, they vote, you play. The most democratic DJ set on the internet.
            </p>

            <div className="flex flex-wrap gap-4 mt-10 justify-center animate-[fadeUp_0.9s_ease_forwards_0.8s] opacity-0">
                <a href="#cta" className="relative overflow-hidden bg-[#d9ff47] text-[#07080b] px-9 py-4 rounded-full font-extrabold text-sm tracking-wide hover:shadow-[0_8px_40px_#d9ff4750] hover:-translate-y-0.5 transition-all group">
                    <span className="relative z-10">Start Your Stream Free</span>
                    <span className="absolute top-[-50%] left-[-60%] w-1/2 h-[200%] bg-white/25 -skew-x-[20deg] group-hover:left-[130%] transition-all duration-500" />
                </a>
                <a href="#howitworks" className="border border-[#1a1f2e] text-[#e6e9f4] px-9 py-4 rounded-full text-sm hover:border-[#e6e9f4] transition-all">
                    See How It Works →
                </a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-12 mt-16 justify-center animate-[fadeUp_0.9s_ease_forwards_1s] opacity-0">
                {[["48K+", "Active Streamers"], ["2.1M", "Fan Votes Cast"], ["99ms", "Real-time Sync"], ["∞", "Songs Requested"]].map(([n, l]) => (
                    <div key={l} className="text-center">
                        <div className="font-['Bebas_Neue'] text-[2.4rem] leading-none tracking-wide text-[#d9ff47]">{n}</div>
                        <div className="font-mono text-[10px] tracking-widest uppercase text-[#454d66] mt-1">{l}</div>
                    </div>
                ))}
            </div>

            {/* Scroll hint */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-[fadeUp_0.9s_ease_forwards_1.2s] opacity-0">
                <span className="font-mono text-[10px] tracking-widest uppercase text-[#454d66]">Scroll</span>
                <div className="w-px h-10 bg-gradient-to-b from-[#454d66] to-transparent animate-[scrollPulse_2s_ease-in-out_infinite]" />
            </div>
        </section>
    );
}

function MarqueeBand() {
    const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
    return (
        <div className="overflow-hidden border-t border-b border-[#1a1f2e] py-3 bg-[#0d0f14]">
            <div className="flex whitespace-nowrap animate-[marquee_22s_linear_infinite] hover:[animation-play-state:paused]">
                {items.map((item, i) => (
                    <span key={i} className={`inline-flex items-center gap-2.5 px-8 font-mono text-[11px] tracking-widest uppercase ${item.color}`}>
                        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${item.color.includes("ff3d7f") ? "bg-[#ff3d7f]" : item.color.includes("00f0d4") ? "bg-[#00f0d4]" : "bg-[#d9ff47]"}`} />
                        {item.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function HowItWorksSection() {
    return (
        <section id="howitworks" className="py-28">
            <div className="max-w-6xl mx-auto px-8">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-px bg-[#d9ff47]" />
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#d9ff47]">How It Works</span>
                </div>
                <h2 className="font-['Bebas_Neue'] leading-[0.93] tracking-wide mb-16" style={{ fontSize: "clamp(2.8rem,6vw,5rem)" }}>
                    THREE STEPS TO<br /><span className="text-[#ff3d7f]">CHAOS</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 border border-[#1a1f2e] rounded-2xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#1a1f2e]">
                    {STEPS.map((s) => (
                        <div key={s.num} className="bg-[#0d0f14] hover:bg-[#13161e] transition-colors p-10 relative group">
                            <span className="absolute top-5 right-6 font-['Bebas_Neue'] text-[5rem] leading-none text-[#1a1f2e] group-hover:text-[#1e2435] transition-colors select-none">
                                {s.num}
                            </span>
                            <span className="text-4xl mb-5 block">{s.icon}</span>
                            <div className="font-['Bebas_Neue'] text-3xl tracking-wide mb-3 leading-none">{s.title}</div>
                            <p className="text-sm text-[#454d66] leading-relaxed mb-6">{s.desc}</p>
                            <span className={`inline-block font-mono text-[10px] tracking-widest uppercase border px-3 py-1 rounded-full ${s.tagColor} bg-transparent`}>
                                {s.tag}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function DemoQueue({ tracks, setTracks }:any) {
    const [voted, setVoted] = useState(new Set());

    const handleVote = (id:any) => {
        if (voted.has(id)) return;
        setVoted(new Set([...voted, id]));
        setTracks(prev =>
            [...prev].map(t => t.id === id ? { ...t, votes: t.votes + 1 } : t)
                .sort((a, b) => b.votes - a.votes)
        );
    };

    return (
        <div className="flex-[1.4] min-w-[280px] bg-[#07080b] border border-[#1a1f2e] rounded-xl overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 border-b border-[#1a1f2e]">
                <span className="font-mono text-[10px] tracking-widest uppercase text-[#454d66]">Fan Queue · Live</span>
                <span className="font-mono text-[10px] text-[#ff3d7f]">▶ {tracks.length} tracks</span>
            </div>
            {tracks.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3 border-b border-[#1a1f2e] last:border-0 hover:bg-[#0d0f14] transition-colors ${i === 0 ? "bg-[#d9ff4710] border-l-2 border-l-[#d9ff47]" : ""}`}>
                    <span className="font-mono text-[10px] text-[#454d66] w-4 text-center flex-shrink-0">{i === 0 ? "▶" : i}</span>
                    <img src={t.cover} alt={t.title} className="w-9 h-9 rounded-md object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{t.title}</div>
                        <div className="text-[11px] text-[#454d66] mt-0.5">{t.artist} · {t.genre}</div>
                    </div>
                    <button
                        onClick={() => handleVote(t.id)}
                        className={`flex items-center gap-1.5 font-mono text-[11px] border px-2.5 py-1 rounded-full transition-all ${voted.has(t.id) || i === 0 ? "text-[#d9ff47] border-[#d9ff4730] bg-[#d9ff4710] cursor-default" : "text-[#454d66] border-[#1a1f2e] hover:text-[#d9ff47] hover:border-[#d9ff4730] cursor-pointer"}`}
                    >
                        <span className="text-[9px]">▲</span>
                        {t.votes + (voted.has(t.id) ? 0 : 0)}
                    </button>
                </div>
            ))}
        </div>
    );
}

function FeaturesSection() {
    const [tracks, setTracks] = useState(DEMO_TRACKS);

    return (
        <section id="features" className="py-24">
            <div className="max-w-6xl mx-auto px-8">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-px bg-[#d9ff47]" />
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#d9ff47]">Features</span>
                </div>
                <h2 className="font-['Bebas_Neue'] leading-[0.93] tracking-wide mb-16" style={{ fontSize: "clamp(2.8rem,6vw,5rem)" }}>
                    BUILT FOR THE<br />NEXT <span className="text-[#ff3d7f]">GENERATION</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Wide card */}
                    <div className="md:col-span-2 bg-[#0d0f14] border border-[#1a1f2e] rounded-2xl p-8 hover:border-[#d9ff4730] transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d9ff47] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col md:flex-row gap-10 items-start md:items-center">
                            <div className="flex-1 min-w-[240px]">
                                <div className="w-12 h-12 rounded-xl bg-[#13161e] border border-[#1a1f2e] flex items-center justify-center text-2xl mb-5">🎛️</div>
                                <div className="font-['Bebas_Neue'] text-3xl tracking-wide mb-3 leading-none">Live Fan Queue</div>
                                <p className="text-sm text-[#454d66] leading-relaxed max-w-xs">
                                    The queue is a living, breathing thing. Fans vote in real time and watch their pick climb the ranks. Every vote matters.
                                </p>
                            </div>
                            <DemoQueue tracks={tracks} setTracks={setTracks} />
                        </div>
                    </div>

                    {/* Small cards */}
                    {FEATURES.map((f) => (
                        <div key={f.title} className="bg-[#0d0f14] border border-[#1a1f2e] rounded-2xl p-8 hover:border-[#d9ff4730] hover:-translate-y-1 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d9ff47] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-xl bg-[#13161e] border border-[#1a1f2e] flex items-center justify-center text-2xl mb-5">{f.icon}</div>
                            <div className="font-['Bebas_Neue'] text-3xl tracking-wide mb-3 leading-none">{f.title}</div>
                            <p className="text-sm text-[#454d66] leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function TestimonialsSection() {
  return (
    <section id="creators" className="py-24">
      <div className="max-w-6xl mx-auto px-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-px bg-[#d9ff47]" />
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#d9ff47]">
            Creator Love
          </span>
        </div>

        <h2
          className="font-['Bebas_Neue'] leading-[0.93] tracking-wide mb-16"
          style={{ fontSize: "clamp(2.8rem,6vw,5rem)" }}
        >
          STREAMERS
          <br />
          <span className="text-[#ff3d7f]">OBSESSED</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-[#0d0f14] border border-[#1a1f2e] rounded-2xl p-7 hover:border-[#d9ff4730] transition-all"
            >
              <p className="text-sm leading-relaxed text-[#e6e9f4]/90 italic mb-6">
                <span className="text-[#d9ff47] text-xl not-italic mr-1">"</span>
                <span>{t.quote}</span>
              </p>

              <div className="flex items-center gap-3">
                <img
                  src={`https://picsum.photos/seed/${t.seed}/36/36`}
                  alt={t.name}
                  className="w-9 h-9 rounded-full border-2 border-[#1a1f2e] object-cover"
                />
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="font-mono text-[10px] text-[#454d66]">
                    {t.handle}
                  </div>
                </div>
                <div className="ml-auto font-mono text-[10px] text-[#ff3d7f] bg-[#ff3d7f12] border border-[#ff3d7f25] px-2.5 py-1 rounded-full">
                  {t.viewers} viewers
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    return (
        <section id="cta" className="py-36">
            <div className="max-w-3xl mx-auto px-8 text-center relative">
                <div className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[radial-gradient(ellipse,#d9ff4712,transparent_70%)] pointer-events-none" />
                <h2 className="font-['Bebas_Neue'] leading-[0.92] tracking-wide relative" style={{ fontSize: "clamp(3rem,8vw,7rem)" }}>
                    <span className="block text-[#e6e9f4]">YOUR FANS</span>
                    <span className="block" style={{ WebkitTextStroke: "1.5px #d9ff47", color: "transparent" }}>ARE WAITING</span>
                </h2>
                <p className="text-[#454d66] mt-6 leading-relaxed">
                    Join 48,000+ creators who've handed the aux cord to their audience. Free forever for small streams.
                </p>

                {submitted ? (
                    <div className="mt-10 inline-flex items-center gap-3 bg-[#d9ff4715] border border-[#d9ff4730] px-8 py-4 rounded-full text-[#d9ff47] font-mono text-sm tracking-widest">
                        ✓ You're on the list — we'll be in touch!
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3 max-w-md mx-auto mt-10 justify-center">
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-1 min-w-[220px] bg-[#0d0f14] border border-[#1a1f2e] text-[#e6e9f4] placeholder-[#454d66] px-5 py-3.5 rounded-full text-sm focus:outline-none focus:border-[#d9ff47] transition-colors"
                        />
                        <button
                            onClick={() => email && setSubmitted(true)}
                            className="bg-[#d9ff47] text-[#07080b] px-7 py-3.5 rounded-full font-extrabold text-sm hover:bg-[#c4e83a] hover:shadow-[0_6px_30px_#d9ff4748] hover:-translate-y-0.5 transition-all"
                        >
                            Get Early Access
                        </button>
                    </div>
                )}
                <p className="font-mono text-[10px] tracking-widest text-[#454d66] mt-4">No credit card · No BS · Cancel anytime</p>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="border-t border-[#1a1f2e] max-w-6xl mx-auto px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="font-['Bebas_Neue'] text-2xl tracking-widest text-[#d9ff47]">
                STREAM<span className="text-[#ff3d7f]">Q</span>
            </div>
            <ul className="flex flex-wrap gap-7 justify-center">
                {["Docs", "Pricing", "Blog", "Twitter", "Discord"].map((l) => (
                    <li key={l}>
                        <a href="#" className="font-mono text-[10px] tracking-widest uppercase text-[#454d66] hover:text-[#e6e9f4] transition-colors">{l}</a>
                    </li>
                ))}
            </ul>
            <div className="font-mono text-[10px] tracking-wide text-[#454d66]">© 2026 StreamQ. All rights reserved.</div>
        </footer>
    );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function StreamQLanding() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <>
            {/* Google Fonts */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-28px); }
        }
        @keyframes spin {
          to { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes marquee {
          to { transform: translateX(-50%); }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.3; transform: scaleY(1); }
          50%       { opacity: 1;   transform: scaleY(1.2); }
        }
      `}</style>

            <div className="bg-[#07080b] text-[#e6e9f4] font-['Syne',sans-serif] overflow-x-hidden">
                <Navbar scrolled={scrolled} />
                <HeroSection />
                <MarqueeBand />
                <HowItWorksSection />
                <div className="h-px bg-gradient-to-r from-transparent via-[#1a1f2e] to-transparent max-w-6xl mx-auto" />
                <FeaturesSection />
                <div className="h-px bg-gradient-to-r from-transparent via-[#1a1f2e] to-transparent max-w-6xl mx-auto" />
                <TestimonialsSection />
                <CTASection />
                <Footer />
            </div>
        </>
    );
}