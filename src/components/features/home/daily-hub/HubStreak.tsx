"use client";

import { useState } from "react";
import { useStreak } from "@/lib/useStreak";

/**
 * Pill streak compacte glass v7. Donnees persistees en Neon (useStreak).
 * - Halo + couleur evoluent avec le palier (gris→ambre→orange→rouge)
 * - Flamme vivante (pulse continu leger)
 * - Record perso + progression vers le prochain palier reveles au survol
 * Masquee si deconnecte (useStreak renvoie null).
 */

const TIERS = [
  { min: 30, color: "#E03020", glow: "rgba(224,48,32,0.35)",  label: "Feu sacré" },
  { min: 7,  color: "#F08328", glow: "rgba(240,131,40,0.32)", label: "Assidu" },
  { min: 3,  color: "#EF9F27", glow: "rgba(239,159,39,0.30)", label: "Régulier" },
  { min: 0,  color: "#86868B", glow: "rgba(0,0,0,0)",         label: "Débutant" },
];

function tierFor(streak: number) {
  return TIERS.find((t) => streak >= t.min) ?? TIERS[TIERS.length - 1];
}

function nextMilestone(streak: number): number | null {
  if (streak < 3) return 3;
  if (streak < 7) return 7;
  if (streak < 30) return 30;
  if (streak < 100) return 100;
  return null;
}

export function HubStreak() {
  const { data, loading } = useStreak();
  const [hover, setHover] = useState(false);

  // Masque si deconnecte ou pas encore charge
  if (loading || !data || data.current < 1) return null;

  const tier = tierFor(data.current);
  const next = nextMilestone(data.current);
  const remaining = next ? next - data.current : 0;
  const hasRecord = data.longest > data.current;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", display: "inline-block" }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 13px",
          background: "rgba(255,255,255,0.62)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "none",
          borderRadius: 999,
          fontFamily: "var(--font-sora, Sora, sans-serif)",
          boxShadow: `0 4px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)${tier.min >= 3 ? `, 0 0 0 1px ${tier.glow}` : ""}`,
          transition: "box-shadow .3s ease, transform .2s ease",
          transform: hover ? "translateY(-1px)" : "none",
          cursor: "default",
        }}
      >
        {/* Flamme + halo */}
        <span style={{ position: "relative", display: "inline-flex", width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
          {tier.min >= 3 && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                width: 22, height: 22,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${tier.glow} 0%, transparent 70%)`,
                animation: "kc-streak-halo 2.6s ease-in-out infinite",
              }}
            />
          )}
          <span
            style={{
              fontSize: 14,
              position: "relative",
              filter: tier.min === 0 ? "grayscale(1) opacity(0.55)" : "none",
              animation: tier.min >= 3 ? "kc-streak-pulse 2.6s ease-in-out infinite" : "none",
              display: "inline-block",
            }}
          >
            🔥
          </span>
        </span>

        {/* Compteur */}
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: tier.color,
            fontFamily: 'var(--font-data, "Space Mono", monospace)',
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.01em",
          }}
        >
          {data.current} jour{data.current > 1 ? "s" : ""}
        </span>

        {/* Label palier (des 3j) */}
        {tier.min >= 3 && (
          <span
            style={{
              fontSize: 8.5,
              color: "#86868B",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              fontWeight: 600,
            }}
          >
            {tier.label}
          </span>
        )}
      </div>

      {/* Tooltip glass au survol : record + progression */}
      {hover && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 20,
            minWidth: 180,
            padding: "12px 14px",
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(40px) saturate(190%)",
            WebkitBackdropFilter: "blur(40px) saturate(190%)",
            border: "0.5px solid rgba(255,255,255,0.6)",
            borderRadius: 12,
            boxShadow: "0 18px 50px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)",
            fontFamily: "var(--font-sora, Sora, sans-serif)",
            animation: "kc-streak-tip .22s cubic-bezier(.2,.85,.3,1)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {next ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 11, color: "#86868B" }}>Prochain palier</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1D1D1F", fontFamily: 'var(--font-data, "Space Mono", monospace)' }}>{next} j</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, (data.current / next) * 100)}%`,
                      height: "100%",
                      borderRadius: 3,
                      background: tier.color,
                      transition: "width .4s ease",
                    }}
                  />
                </div>
                <div style={{ fontSize: 10.5, color: "#86868B" }}>
                  Plus que <strong style={{ color: tier.color }}>{remaining} jour{remaining > 1 ? "s" : ""}</strong> pour atteindre {next} j
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: "#1D1D1F", fontWeight: 600 }}>
                🏆 Palier maximal atteint — légende vivante
              </div>
            )}

            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: 2, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#86868B" }}>{hasRecord ? "Record perso" : "C'est ton record !"}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: hasRecord ? "#1D1D1F" : tier.color, fontFamily: 'var(--font-data, "Space Mono", monospace)' }}>
                {data.longest} j
              </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes kc-streak-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes kc-streak-halo {
          0%, 100% { opacity: 0.7; transform: scale(0.92); }
          50%      { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes kc-streak-tip {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kc-streak-pulse, .kc-streak-halo { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
