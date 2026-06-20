"use client"
/**
 * CardDetailPage — fiche de reference complete.
 * P3a : fil d'Ariane + fetchCardDetail (illustrateur + details carte pour P4) + Hero v2.
 */
import { useState, useEffect } from "react"
import Link from "next/link"
import { useSpotlightData } from "@/components/features/spotlight/useSpotlightData"
import { SpotlightEngine } from "@/components/features/spotlight/sections/SpotlightEngine"
import { SpotlightChart } from "@/components/features/spotlight/sections/SpotlightChart"
import { SpotlightStates } from "@/components/features/spotlight/sections/SpotlightStates"
import { SpotlightPopExpandable } from "@/components/features/spotlight/sections/SpotlightPopExpandable"
import { fetchCardDetail, type TCGCardFull } from "@/lib/tcgApi"
import { resolveCardImage } from "@/lib/images"
import { SNOW, FONT } from "@/lib/design/snow"

function langFromId(id: string): "EN" | "FR" | "JP" {
  const p = id.split("-")[0]?.toLowerCase()
  if (p === "fr") return "FR"
  if (p === "jp") return "JP"
  return "EN"
}
// id court pour tcgApi (en-base1-1 -> base1-1)
function shortId(id: string): string {
  return id.replace(/^(en|fr|jp|aopkm)-/i, "")
}

const FLAG: Record<string, string> = { EN: "🇺🇸", FR: "🇫🇷", JP: "🇯🇵" }
const LANG_LABEL: Record<string, string> = { EN: "Anglais", FR: "Français", JP: "Japonais" }

const ERA_BY_PREFIX: { test: RegExp; era: string; color: string }[] = [
  { test: /^(base|jungle|fossil|neo|gym|wizards|bp|si|tk)/i, era: "Vintage WOTC", color: "#D4AF37" },
  { test: /^(ecard|ex|np|pop)/i, era: "E-Card / EX", color: "#2A82DD" },
  { test: /^(dp|pl|hgss|col|hs|ru)/i, era: "DPP / HGSS", color: "#0E9E8E" },
  { test: /^(bw|dv|mc)/i, era: "Black & White", color: "#5C6270" },
  { test: /^(xy|g1|dc)/i, era: "XY", color: "#C44E8E" },
  { test: /^(sm|smp)/i, era: "Sun & Moon", color: "#E07B39" },
  { test: /^(swsh|cel|me)/i, era: "Sword & Shield", color: "#4F5FC4" },
  { test: /^(sv|sve|svp|tcgp)/i, era: "Scarlet & Violet", color: "#D93A3A" },
]
function eraOf(id: string): { era: string; color: string } | null {
  const parts = id.split("-")
  const prefix = parts.length > 1 ? parts[1] : parts[0]
  for (const e of ERA_BY_PREFIX) if (e.test.test(prefix)) return { era: e.era, color: e.color }
  return null
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 13, fontWeight: 700, color: SNOW.muted, fontFamily: FONT.display, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 16px" }}>{children}</h2>
)
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: SNOW.bg, borderRadius: 18, border: `1px solid ${SNOW.border}`, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", ...style }}>{children}</div>
)

export function CardDetailPage({ cardId }: { cardId: string }) {
  const lang = langFromId(cardId)
  const { data, loading, error } = useSpotlightData(cardId, lang)
  const [detail, setDetail] = useState<TCGCardFull | null>(null)

  useEffect(() => {
    let off = false
    const sid = shortId(cardId)
    fetchCardDetail(lang, sid).then(d => {
      if (off) return
      if (d) { setDetail(d); return }
      // fallback id sans suffixe variante
      const clean = sid.replace(/-shadowless-ns-|-shadowless-|-1st-/, "-")
      if (clean !== sid) fetchCardDetail(lang, clean).then(d2 => { if (!off && d2) setDetail(d2) })
    }).catch(() => {})
    return () => { off = true }
  }, [cardId, lang])

  if (loading) {
    return (
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          <div style={{ width: 300, height: 418, borderRadius: 16, background: SNOW.surface, animation: "kcPulse 1.4s ease-in-out infinite" }} />
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ width: 140, height: 16, borderRadius: 6, background: SNOW.surface, marginBottom: 16 }} />
            <div style={{ width: 280, height: 40, borderRadius: 8, background: SNOW.surface, marginBottom: 24 }} />
            <div style={{ width: 180, height: 36, borderRadius: 8, background: SNOW.surface }} />
          </div>
        </div>
        <style>{`@keyframes kcPulse{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 8 }}>Carte introuvable</div>
        <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body }}>{error || "Cette carte n’existe pas ou n’est pas encore référencée."}</div>
      </div>
    )
  }

  const { card, kodo, prices } = data
  const img = resolveCardImage({ lang: card.lang, setId: card.set_id, localId: card.local_id, fallbackUrl: card.image_url ?? undefined })
  const era = card.era ? { era: card.era, color: "#8A8A8E" } : eraOf(card.id)
  const flag = FLAG[card.lang] || ""
  const fmtEur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"

  const fairValue = kodo?.fairValueEur ?? null
  const liquidity = kodo?.liquidityScore ?? null
  const market = prices.marketEst
  const history = prices.history || []
  const hasEngine = kodo != null && (kodo.liquidityScore != null || kodo.gradeEvPsa10Eur != null || kodo.coteFrEur != null)
  const illustrator = detail?.illustrator || null

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 80px" }}>
      {/* ═══ FIL D'ARIANE ═══ */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: 12.5, fontFamily: FONT.display, color: SNOW.mutedLight, flexWrap: "wrap" }}>
        <Link href="/cartes" style={{ color: SNOW.muted, textDecoration: "none" }}>Pokédesk</Link>
        <span>›</span>
        <span style={{ color: SNOW.muted }}>{card.set_name}</span>
        <span>›</span>
        <span style={{ color: SNOW.ink, fontWeight: 600 }}>{card.name}</span>
      </nav>

      {/* ═══ HERO ═══ */}
      <div className="kcard-hero" style={{ display: "flex", gap: 44, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {img ? (
            <img src={img} alt={card.name} style={{ width: 300, borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.20), 0 6px 18px rgba(0,0,0,0.10)", display: "block" }} />
          ) : (
            <div style={{ width: 300, height: 418, borderRadius: 16, background: SNOW.surface, display: "flex", alignItems: "center", justifyContent: "center", color: SNOW.mutedLight, fontSize: 13, fontFamily: FONT.body }}>Image indisponible</div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 300, paddingTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            {era ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 8, background: era.color + "14", border: `1px solid ${era.color}33` }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: era.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".04em", color: era.color, fontFamily: FONT.display, textTransform: "uppercase" }}>{era.era}</span>
              </span>
            ) : null}
            <span style={{ fontSize: 12, color: SNOW.muted, fontFamily: FONT.display }}>{flag} {LANG_LABEL[card.lang] || card.lang}</span>
          </div>

          <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.display, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
            {card.set_name}{card.local_id ? ` · #${card.local_id}` : ""}
          </div>

          <h1 style={{ fontSize: 40, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: "-0.025em", lineHeight: 1.05, margin: "0 0 8px" }}>{card.name}</h1>

          <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body, marginBottom: 28 }}>
            <span style={{ textTransform: "capitalize" }}>{card.rarity_normalized}</span>
            {illustrator ? <span> · Illustré par {illustrator}</span> : null}
          </div>

          {market != null ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 3 }}>Prix de marché</div>
              <div style={{ fontSize: 38, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: "-0.02em", lineHeight: 1 }}>{fmtEur(market)}</div>
            </div>
          ) : (
            <div style={{ marginBottom: 24, fontSize: 14, color: SNOW.muted, fontStyle: "italic", fontFamily: FONT.body }}>Données de prix insuffisantes pour le moment.</div>
          )}

          {(fairValue != null || liquidity != null) ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {fairValue != null ? (
                <div style={{ padding: "12px 16px", borderRadius: 13, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}`, minWidth: 130 }}>
                  <div style={{ fontSize: 10.5, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 4 }}>Valeur estimée</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtEur(fairValue)}</div>
                </div>
              ) : null}
              {liquidity != null ? (
                <div style={{ padding: "12px 16px", borderRadius: 13, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}`, minWidth: 130 }}>
                  <div style={{ fontSize: 10.5, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 4 }}>Liquidité</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{Math.round(liquidity)}<span style={{ fontSize: 12, color: SNOW.mutedLight, fontWeight: 500 }}>/100</span></div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* ═══ SEPARATEUR ═══ */}
      <div style={{ margin: "44px 0 36px", height: 1, background: `linear-gradient(90deg, transparent, ${SNOW.border} 18%, ${SNOW.border} 82%, transparent)` }} />

      {/* ═══ SECTION CARTE ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        {hasEngine ? (
          <section>
            <SectionTitle>Signaux de marché</SectionTitle>
            <Card><SpotlightEngine kodo={kodo} /></Card>
          </section>
        ) : null}

        {history.length > 0 ? (
          <section>
            <SectionTitle>Historique des prix</SectionTitle>
            <Card><SpotlightChart history={history} /></Card>
          </section>
        ) : null}

        <div className="kcard-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          <section>
            <SectionTitle>Prix par état</SectionTitle>
            <Card><SpotlightStates prices={prices} kodo={kodo} /></Card>
          </section>
          <section>
            <SectionTitle>Population gradée</SectionTitle>
            <Card><SpotlightPopExpandable cardId={card.id} lang={card.lang} /></Card>
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .kcard-hero img { width: 100% !important; max-width: 340px; margin: 0 auto; }
          .kcard-hero { gap: 28px !important; }
        }
        @media (max-width: 900px) {
          .kcard-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
