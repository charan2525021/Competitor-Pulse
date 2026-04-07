import { useState, useEffect, useCallback } from "react";

/* ── SVG Fish shape ── */
function FishSVG({ size = 40, color = "#6366f1", flip = false }: { size?: number; color?: string; flip?: boolean }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 60 36" fill="none"
      style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      {/* Body */}
      <ellipse cx="28" cy="18" rx="18" ry="12" fill={color} opacity={0.85} />
      {/* Tail */}
      <polygon points="46,18 58,6 58,30" fill={color} opacity={0.7} />
      {/* Eye */}
      <circle cx="18" cy="14" r="3" fill="#fff" />
      <circle cx="17" cy="13.5" r="1.5" fill="#1e1b4b" />
      {/* Fin */}
      <ellipse cx="30" cy="8" rx="6" ry="4" fill={color} opacity={0.5} transform="rotate(-15 30 8)" />
      {/* Smile */}
      <path d="M14,21 Q18,24 22,21" stroke="#fff" strokeWidth="1" fill="none" opacity={0.6} />
      {/* Bubbles */}
      <circle cx="8" cy="12" r="2" fill={color} opacity={0.3} />
      <circle cx="5" cy="8" r="1.5" fill={color} opacity={0.2} />
    </svg>
  );
}

/* ── Water drop SVG ── */
function WaterDropSVG({ size = 10, color = "rgba(99,102,241,0.6)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 10 14" fill="none">
      <path d="M5 0 C5 0 0 7 0 9.5 C0 12 2.24 14 5 14 C7.76 14 10 12 10 9.5 C10 7 5 0 5 0Z" fill={color} />
      <ellipse cx="3.5" cy="8" rx="1.2" ry="1.8" fill="rgba(255,255,255,0.35)" transform="rotate(-15 3.5 8)" />
    </svg>
  );
}

/* ── Splash drop with optional content label ── */
function SplashDrop({ className, delay = 0, label, size = 10 }: { className: string; delay?: number; label?: string; size?: number }) {
  return (
    <div className={`absolute ${className}`} style={{ animationDelay: `${delay}s` }}>
      <div className="flex flex-col items-center">
        {label && (
          <div className="content-drop-float" style={{
            animationDelay: `${delay + 0.05}s`,
            background: "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.15))",
            border: "1px solid rgba(99,102,241,0.35)",
            borderRadius: 8,
            padding: "3px 10px",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--accent, #6366f1)",
            whiteSpace: "nowrap",
            backdropFilter: "blur(8px)",
            marginBottom: 2,
            boxShadow: "0 2px 8px rgba(99,102,241,0.15)",
          }}>
            {label}
          </div>
        )}
        <WaterDropSVG size={size} />
      </div>
    </div>
  );
}

/* ── Micro water dot (tiny scatter drops) ── */
function MicroDrop({ className, delay = 0, size = 4 }: { className: string; delay?: number; size?: number }) {
  return (
    <div className={`absolute rounded-full ${className}`} style={{
      width: size, height: size,
      background: "radial-gradient(circle, rgba(99,102,241,0.7), rgba(99,102,241,0.2))",
      animationDelay: `${delay}s`,
    }} />
  );
}

/* ── Water column that shoots up on impact ── */
function WaterColumn({ delay = 0 }: { delay?: number }) {
  return (
    <div className="absolute left-1/2 water-column-up" style={{
      transform: "translateX(-50%)",
      width: 16,
      height: 50,
      bottom: 0,
      background: "linear-gradient(to top, rgba(99,102,241,0.25), rgba(99,102,241,0.02))",
      borderRadius: "40% 40% 0 0",
      animationDelay: `${delay}s`,
      transformOrigin: "bottom center",
    }} />
  );
}

/* ── Splash ring at water surface ── */
function SplashRing({ delay = 0 }: { delay?: number }) {
  return (
    <div className="absolute left-1/2 splash-ring" style={{
      width: 70,
      height: 18,
      borderRadius: "50%",
      border: "2px solid rgba(99,102,241,0.4)",
      background: "radial-gradient(ellipse, rgba(99,102,241,0.1), transparent)",
      animationDelay: `${delay}s`,
    }} />
  );
}

/* ── Water surface disturbance ring ── */
function WaterDisturbance({ delay = 0 }: { delay?: number }) {
  return (
    <div className="absolute left-1/2 water-disturbance" style={{
      width: 40,
      height: 8,
      borderRadius: "50%",
      background: "rgba(99,102,241,0.12)",
      animationDelay: `${delay}s`,
    }} />
  );
}

/* ── Water ripple circles ── */
function Ripple({ x, delay }: { x: number; delay: number }) {
  return (
    <div className="absolute water-ripple" style={{
      left: x, bottom: 28,
      width: 30, height: 10,
      borderRadius: "50%",
      border: "2px solid rgba(99,102,241,0.3)",
      animationDelay: `${delay}s`,
    }} />
  );
}

/* ── Bubble ── */
function Bubble({ x, delay, size }: { x: number; delay: number; size: number }) {
  return (
    <div className="absolute bubble-float" style={{
      left: x, bottom: 20,
      width: size, height: size,
      borderRadius: "50%",
      background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(99,102,241,0.2))",
      border: "1px solid rgba(99,102,241,0.15)",
      animationDelay: `${delay}s`,
      animationDuration: `${2 + Math.random() * 2}s`,
    }} />
  );
}

/* ═══════════════════════════════════════════
   FishJumpScene — Fish jumps in a realistic
   parabolic arc with water splash physics
   ═══════════════════════════════════════════ */
interface FishJumpSceneProps {
  messages?: string[];
  interval?: number;
  height?: number;
  className?: string;
}

const SPLASH_CONTENT_WORDS = [
  "pricing", "reviews", "features", "market", "trends",
  "competitors", "leads", "signals", "insights", "data",
];

export function FishJumpScene({
  messages = ["Fetching intel...", "Scanning competitors...", "Extracting data...", "Analyzing pricing..."],
  interval = 5500,
  height = 250,
  className = "",
}: FishJumpSceneProps) {
  const [currentMsg, setCurrentMsg] = useState(0);
  const [phase, setPhase] = useState<"idle" | "exiting" | "airborne" | "entering" | "splash">("idle");
  const [splashKey, setSplashKey] = useState(0);

  const startJump = useCallback(() => {
    // Phase 1: Fish bursts out of water (exit splash)
    setPhase("exiting");
    setSplashKey(k => k + 1);

    // Phase 2: Fish is airborne at peak — show message
    setTimeout(() => {
      setPhase("airborne");
      setCurrentMsg(p => (p + 1) % messages.length);
    }, 800);

    // Phase 3: Fish approaching water
    setTimeout(() => setPhase("entering"), 1800);

    // Phase 4: Fish hits water — BIG splash with content drops
    setTimeout(() => {
      setPhase("splash");
      setSplashKey(k => k + 1);
    }, 2500);

    // Reset
    setTimeout(() => setPhase("idle"), 4800);
  }, [messages.length]);

  useEffect(() => {
    const initialDelay = setTimeout(() => startJump(), 600);
    const timer = setInterval(startJump, interval);
    return () => { clearInterval(timer); clearTimeout(initialDelay); };
  }, [interval, startJump]);

  const isActive = phase !== "idle";
  const showExitSplash = phase === "exiting";
  const showEntrySplash = phase === "splash";
  const showMsg = phase === "airborne";

  // Pick content words for this splash cycle
  const w = (i: number) => SPLASH_CONTENT_WORDS[(currentMsg * 5 + i) % SPLASH_CONTENT_WORDS.length];

  return (
    <div className={`fish-scene relative ${className}`} style={{ height, width: "100%", overflow: "hidden" }}>
      {/* ── Animated water surface ── */}
      <svg className="absolute bottom-0 left-0 w-full" height="70" preserveAspectRatio="none" viewBox="0 0 400 70">
        <defs>
          <linearGradient id="waterGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.04)" />
            <stop offset="40%" stopColor="rgba(99,102,241,0.12)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.22)" />
          </linearGradient>
        </defs>
        <path d="M0,25 Q50,10 100,25 T200,25 T300,25 T400,25 V70 H0 Z" fill="url(#waterGrad2)">
          <animate attributeName="d"
            values="M0,25 Q50,10 100,25 T200,25 T300,25 T400,25 V70 H0 Z;
                    M0,25 Q50,40 100,25 T200,25 T300,25 T400,25 V70 H0 Z;
                    M0,25 Q50,10 100,25 T200,25 T300,25 T400,25 V70 H0 Z"
            dur="3.5s" repeatCount="indefinite" />
        </path>
        <path d="M0,35 Q60,22 120,35 T240,35 T360,35 T400,35 V70 H0 Z" fill="rgba(99,102,241,0.05)">
          <animate attributeName="d"
            values="M0,35 Q60,22 120,35 T240,35 T360,35 T400,35 V70 H0 Z;
                    M0,35 Q60,48 120,35 T240,35 T360,35 T400,35 V70 H0 Z;
                    M0,35 Q60,22 120,35 T240,35 T360,35 T400,35 V70 H0 Z"
            dur="2.8s" repeatCount="indefinite" />
        </path>
      </svg>

      {/* ── Fish arc (parabolic path with body flex) ── */}
      <div className="absolute bottom-10" style={{
        left: "calc(50% - 24px)",
        zIndex: 3,
      }}>
        <div className={isActive ? "fish-jump-arc" : ""} style={{
          opacity: isActive ? 1 : 0,
          transition: isActive ? "none" : "opacity 0.2s",
        }}>
          {/* Content bubble visible at peak */}
          <div style={{
            position: "absolute",
            top: -38,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.14))",
            border: "1px solid rgba(99,102,241,0.35)",
            borderRadius: 12,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--accent, #6366f1)",
            whiteSpace: "nowrap",
            backdropFilter: "blur(10px)",
            opacity: showMsg ? 1 : 0,
            transition: "opacity 0.25s ease",
            boxShadow: "0 4px 12px rgba(99,102,241,0.12)",
            pointerEvents: "none",
          }}>
            {messages[currentMsg]}
          </div>
          {/* Fish with body flex during flight */}
          <div className={isActive ? "fish-body-flex" : ""}>
            <FishSVG size={48} color="#6366f1" />
          </div>
        </div>
      </div>

      {/* ── Exit splash (fish leaves water going up) ── */}
      {showExitSplash && (
        <div key={`exit-${splashKey}`} className="absolute left-1/2 bottom-10" style={{ transform: "translateX(-50%)", zIndex: 2 }}>
          <WaterColumn delay={0} />
          <SplashDrop className="splash-drop-l2" delay={0} size={7} />
          <SplashDrop className="splash-drop-r2" delay={0.03} size={7} />
          <SplashDrop className="splash-drop-c" delay={0} size={6} />
          <MicroDrop className="micro-drop-a" delay={0.02} size={3} />
          <MicroDrop className="micro-drop-b" delay={0.04} size={3} />
          <MicroDrop className="micro-drop-e" delay={0.06} size={2} />
          <SplashRing delay={0} />
          <WaterDisturbance delay={0.1} />
        </div>
      )}

      {/* ── Entry splash (fish hits water) — BIG splash with content drops ── */}
      {showEntrySplash && (
        <div key={`entry-${splashKey}`} className="absolute bottom-10" style={{ left: "calc(50% + 10px)", transform: "translateX(-50%)", zIndex: 4 }}>
          {/* Water column shoots up */}
          <WaterColumn delay={0} />

          {/* Large drops carrying content labels */}
          <SplashDrop className="splash-drop-l1" delay={0} size={14} label={w(0)} />
          <SplashDrop className="splash-drop-r1" delay={0.04} size={14} label={w(1)} />
          <SplashDrop className="splash-drop-c" delay={0.02} size={12} label={w(2)} />
          <SplashDrop className="splash-drop-l2" delay={0.07} size={11} label={w(3)} />
          <SplashDrop className="splash-drop-r2" delay={0.09} size={11} label={w(4)} />

          {/* Medium drops without labels */}
          <SplashDrop className="splash-drop-l3" delay={0.05} size={8} />
          <SplashDrop className="splash-drop-r3" delay={0.08} size={8} />

          {/* Micro scatter drops */}
          <MicroDrop className="micro-drop-a" delay={0.02} size={4} />
          <MicroDrop className="micro-drop-b" delay={0.04} size={4} />
          <MicroDrop className="micro-drop-c" delay={0.06} size={3} />
          <MicroDrop className="micro-drop-d" delay={0.03} size={3} />
          <MicroDrop className="micro-drop-e" delay={0.05} size={3} />
          <MicroDrop className="micro-drop-f" delay={0.07} size={2} />

          {/* Expanding splash rings */}
          <SplashRing delay={0} />
          <SplashRing delay={0.12} />
          <SplashRing delay={0.25} />
          <WaterDisturbance delay={0.05} />
          <WaterDisturbance delay={0.2} />
        </div>
      )}

      {/* Ripples + bubbles during splash phases */}
      {(showExitSplash || showEntrySplash) && (
        <>
          <Ripple x={window.innerWidth > 400 ? 175 : 115} delay={0.2} />
          <Ripple x={window.innerWidth > 400 ? 215 : 155} delay={0.4} />
          <Bubble x={window.innerWidth > 400 ? 190 : 130} delay={0.3} size={6} />
          <Bubble x={window.innerWidth > 400 ? 205 : 145} delay={0.6} size={5} />
          <Bubble x={window.innerWidth > 400 ? 180 : 120} delay={0.9} size={4} />
          <Bubble x={window.innerWidth > 400 ? 200 : 140} delay={1.2} size={3} />
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SwimmingFish — Fish that swims across screen
   ═══════════════════════════════════════════ */
interface SwimmingFishProps {
  count?: number;
  className?: string;
}

export function SwimmingFish({ count = 3, className = "" }: SwimmingFishProps) {
  const fishes = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: 24 + Math.random() * 20,
    top: 15 + Math.random() * 70,
    delay: i * 3 + Math.random() * 2,
    duration: 8 + Math.random() * 6,
    color: ["#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4"][i % 4],
    reverse: i % 2 === 1,
    opacity: 0.15 + Math.random() * 0.2,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {fishes.map(fish => (
        <div key={fish.id} className="absolute" style={{
          top: `${fish.top}%`,
          left: 0, right: 0,
          opacity: fish.opacity,
          animation: `${fish.reverse ? "fishSwimReverse" : "fishSwim"} ${fish.duration}s linear infinite`,
          animationDelay: `${fish.delay}s`,
        }}>
          <FishSVG size={fish.size} color={fish.color} flip={fish.reverse} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   AIParticles — Floating neural-net particles
   ═══════════════════════════════════════════ */
interface AIParticlesProps {
  count?: number;
  className?: string;
}

export function AIParticles({ count = 15, className = "" }: AIParticlesProps) {
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 6,
      color: ["#6366f1", "#8b5cf6", "#a78bfa", "#818cf8", "#3b82f6"][i % 5],
      opacity: 0.1 + Math.random() * 0.3,
    }))
  );

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map(p => (
        <div key={p.id} className="ai-particle particle-float" style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          backgroundColor: p.color,
          opacity: p.opacity,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
        }} />
      ))}
      {/* Connection lines between nearby particles */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
        {particles.slice(0, 8).map((p, i) => {
          const next = particles[(i + 1) % particles.length];
          return (
            <line key={i}
              x1={`${p.x}%`} y1={`${p.y}%`}
              x2={`${next.x}%`} y2={`${next.y}%`}
              stroke="#6366f1" strokeWidth="1"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════
   BrainAnimation — Pulsing brain with orbits
   ═══════════════════════════════════════════ */
export function BrainAnimation({ size = 80 }: { size?: number }) {
  return (
    <div className="relative brain-pulse" style={{ width: size, height: size }}>
      {/* Orbital rings */}
      {[0, 60, 120].map((rotation, i) => (
        <div key={i} className="absolute inset-0" style={{
          border: "1px solid rgba(99,102,241,0.15)",
          borderRadius: "50%",
          transform: `rotateX(60deg) rotateZ(${rotation}deg)`,
        }}>
          <div className="orbit-spin" style={{
            width: 6, height: 6, borderRadius: "50%",
            background: ["#6366f1", "#8b5cf6", "#3b82f6"][i],
            position: "absolute", top: "50%", left: "50%",
            marginTop: -3, marginLeft: -3,
            animationDuration: `${3 + i}s`,
            animationDelay: `${i * 0.5}s`,
            boxShadow: `0 0 8px ${["#6366f1", "#8b5cf6", "#3b82f6"][i]}`,
          }} />
        </div>
      ))}
      {/* Center brain icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="neural-glow" style={{
          width: size * 0.5, height: size * 0.5,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width={size * 0.25} height={size * 0.25} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5c0 1.5-.5 2.5-1.5 3.5L12 14l-3.5-3.5C7.5 9.5 7 8.5 7 7a5 5 0 0 1 5-5z" />
            <path d="M12 14v8" />
            <path d="M8 18h8" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DataFetchFish — Small fish that swims and
   brings a data label on hover/load
   ═══════════════════════════════════════════ */
export function DataFetchFish({ label, color = "#6366f1", delay = 0 }: { label: string; color?: string; delay?: number }) {
  return (
    <div className="relative inline-flex items-center gap-2 animate-slide-up-bounce" style={{ animationDelay: `${delay}s` }}>
      <div className="fish-tail-wag" style={{ animationDelay: `${delay}s` }}>
        <FishSVG size={28} color={color} />
      </div>
      <span style={{
        background: `${color}12`,
        border: `1px solid ${color}30`,
        borderRadius: 8,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 600,
        color: color,
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LoadingFish — Fish loading spinner
   ═══════════════════════════════════════════ */
export function LoadingFish({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative" style={{ width: 80, height: 80 }}>
        {/* Ripple rings */}
        <div className="absolute inset-0 rounded-full neural-pulse" style={{ border: "2px solid rgba(99,102,241,0.2)" }} />
        <div className="absolute inset-2 rounded-full neural-pulse" style={{ border: "2px solid rgba(99,102,241,0.15)", animationDelay: "0.5s" }} />
        {/* Fish in center */}
        <div className="absolute inset-0 flex items-center justify-center animate-float">
          <FishSVG size={36} color="#6366f1" />
        </div>
      </div>
      <span className="text-sm font-medium log-pulse-text" style={{ color: "var(--accent)" }}>{text}</span>
    </div>
  );
}
