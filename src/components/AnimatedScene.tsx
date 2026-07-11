import { useEffect, useState } from "react";

/**
 * Ambient river scene:
 * - Two otter sprites (parent + baby) always drifting slowly.
 * - When `trigger` changes, a random extra animal appears for ~5 seconds.
 */
export function AnimatedScene({ trigger = 0 }: { trigger?: number }) {
  const [visitor, setVisitor] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [seed, setSeed] = useState(0.5);

  useEffect(() => {
    setMounted(true);
    setSeed(Math.random());
  }, []);

  useEffect(() => {
    if (!trigger) return;
    const animals = ["🦦", "🐕", "🐈", "🐇", "🦊", "🐦", "🐟", "🦆", "🐢", "🐿️"];
    const pick = animals[Math.floor(Math.random() * animals.length)];
    setVisitor(pick);
    const id = setTimeout(() => setVisitor(null), 5000);
    return () => clearTimeout(id);
  }, [trigger]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-sky-200"
      style={{
        height: 120,
        background:
          "linear-gradient(180deg, #E0F2FE 0%, #BAE6FD 55%, #A7D8F0 100%)",
      }}
      aria-hidden
    >
      {/* soft ripples */}
      <div className="absolute inset-x-0 bottom-3 h-px bg-white/60" />
      <div className="absolute inset-x-6 bottom-8 h-px bg-white/40" />
      <div className="absolute inset-x-12 bottom-14 h-px bg-white/30" />

      {/* Parent otter (bigger, slower) */}
      <span
        className="absolute select-none pointer-events-none"
        style={{
          fontSize: 30,
          left: `${20 + seed * 10}%`,
          top: "40%",
          animation: "otter-drift 11s ease-in-out infinite",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.15))",
        }}
      >
        🦦
      </span>

      {/* Baby otter (smaller, offset animation) */}
      <span
        className="absolute select-none pointer-events-none"
        style={{
          fontSize: 20,
          left: `${45 + seed * 8}%`,
          top: "58%",
          animation: "otter-drift-b 8s ease-in-out infinite",
          animationDelay: "-2s",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.15))",
        }}
      >
        🦦
      </span>

      {/* Extra visitor after mood submit */}
      {visitor && (
        <span
          key={trigger}
          className="absolute select-none pointer-events-none"
          style={{
            fontSize: 30,
            right: "12%",
            top: "45%",
            animation:
              "visitor-in 0.5s ease-out both, otter-drift 6s ease-in-out infinite 0.5s",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.2))",
          }}
        >
          {visitor}
        </span>
      )}

      <style>{`
        @keyframes otter-drift {
          0%   { transform: translate(0, 0) rotate(-3deg); }
          25%  { transform: translate(12px, -6px) rotate(2deg); }
          50%  { transform: translate(28px, 2px) rotate(-2deg); }
          75%  { transform: translate(10px, 6px) rotate(3deg); }
          100% { transform: translate(0, 0) rotate(-3deg); }
        }
        @keyframes otter-drift-b {
          0%   { transform: translate(0, 0) rotate(2deg); }
          25%  { transform: translate(-10px, 4px) rotate(-3deg); }
          50%  { transform: translate(-18px, -3px) rotate(3deg); }
          75%  { transform: translate(-6px, 5px) rotate(-2deg); }
          100% { transform: translate(0, 0) rotate(2deg); }
        }
        @keyframes visitor-in {
          from { transform: translateY(20px) scale(0.6); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
