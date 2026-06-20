"use client"
/**
 * CardDetailPage — fiche de reference complete.
 * P4 : + section "A propos de la carte" (caracteristiques, pouvoirs, attaques,
 * faiblesses, legalite, lore) via fetchCardDetail.
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

// Champs TCGdex non declares dans TCGCardFull
type CardDetailExtra = TCGCardFull & {
  description?: string
  retreat?: number
  abilities?: Array<{ type?: string; name: string; effect?: string }>
  legal?: { standard?: boolean; expanded?: boolean }
}

function langFromId(id: string): "EN" | "FR" | "JP" {
  const p = id.split("-")[0]?.toLowerCase()
  if (p === "fr") return "FR"
  if (p === "jp") return "JP"
  return "EN"
}
function shortId(id: string): string {
  return id.replace(/^(en|fr|jp|aopkm)-/i, "")
}

const FLAG: Record<string, string> = { EN: "🇺🇸", FR: "🇫🇷", JP: "🇯🇵" }
const LANG_LABEL: Record<string, string> = { EN: "Anglais", FR: "Français", JP: "Japonais" }

// Couleurs par type d'energie Pokemon
const ENERGY: Record<string, { c: string; bg: string }> = {
  Psychic: { c: "#A040A0", bg: "#F3E8F7" },
  Fire: { c: "#E0402A", bg: "#FCE9E5" },
  Water: { c: "#2A82DD", bg: "#E5F0FC" },
  Grass: { c: "#3AA655", bg: "#E7F5EC" },
  Lightning: { c: "#D4A017", bg: "#FBF3DC" },
  Fighting: { c: "#B8503A", bg: "#F6EAE6" },
  Darkness: { c: "#4A4A52", bg: "#ECECEE" },
  Metal: { c: "#7A8A99", bg: "#EEF1F4" },
  Fairy: { c: "#D94E8E", bg: "#FBE9F1" },
  Dragon: { c: "#B08D2A", bg: "#F7F0DC" },
  Colorless: { c: "#9A9AA0", bg: "#F0F0F2" },
}
const STAGE_LABEL: Record<string, string> = { Basic: "Base", Stage1: "Niveau 1", Stage2: "Niveau 2" }
function energyStyle(t: string) { return ENERGY[t] || { c: SNOW.muted, bg: SNOW.surface } }

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
const EnergyDots = ({ cost }: { cost: string[] }) => (
  <span style={{ display: "inline-flex", gap: 3, verticalAlign: "middle" }}>
    {cost.map((t, i) => { const s = energyStyle(t); return (
      <span key={i} title={t} style={{ width: 18, height: 18, borderRadius: "50%", background: s.bg, border: `1.5px solid ${s.c}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: s.c, fontFamily: FONT.display }}>{t[0]}</span>
    )})}
  </span>
)

export function CardDetailPage({ cardId }: { cardId: string }) {
  const lang = langFromId(cardId)
  const { data, loading, error } = useSpotlightData(cardId, lang)
  const [detail, setDetail] = useState<CardDetailExtra | null>(null)

  useEffect(() => {
    let off = false
    const sid = shortId(cardId)
    fetchCardDetail(lang, sid).then(d => {
      if (off) return
      if (d) { setDetail(d as CardDetailExtra); return }
      const clean = sid.replace(/-shadowless-ns-|-shadowless-|-1st-/, "-")
      if (clean !== sid) fetchCardDetail(lang, clean).then(d2 => { if (!off && d2) setDetail(d2 as CardDetailExtra) })
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

  // Donnees "A propos"
  const d = detail
  const hasAbout = d != null && (d.hp != null || (d.types && d.types.length) || d.stage || d.evolveFrom || (d.attacks && d.attacks.length) || (d.abilities && d.abilities.length) || (d.weaknesses && d.weaknesses.length) || d.description)
  const typeMain = d?.types && d.types.length ? d.types[0] : null
  const tStyle = typeMain ? energyStyle(typeMain) : null

  const Label = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 10, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 4 }}>{children}</div>
  )

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
                  <Label>Valeur estimée</Label>
                  <div style={{ fontSize: 18, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtEur(fairValue)}</div>
                </div>
              ) : null}
              {liquidity != null ? (
                <div style={{ padding: "12px 16px", borderRadius: 13, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}`, minWidth: 130 }}>
                  <Label>Liquidité</Label>
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

        {/* ═══ A PROPOS DE LA CARTE ═══ */}
        {hasAbout ? (
          <section>
            <SectionTitle>À propos de la carte</SectionTitle>
            <Card>
              {/* Caracteristiques */}
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start", paddingBottom: 18, borderBottom: `1px solid ${SNOW.borderSoft}` }}>
                {d?.hp != null ? (
                  <div>
                    <Label>Points de vie</Label>
                    <div style={{ fontSize: 24, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{d.hp}<span style={{ fontSize: 13, color: SNOW.mutedLight, fontWeight: 500 }}> PV</span></div>
                  </div>
                ) : null}
                {typeMain && tStyle ? (
                  <div>
                    <Label>Type</Label>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, background: tStyle.bg, border: `1px solid ${tStyle.c}40` }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: tStyle.c }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: tStyle.c, fontFamily: FONT.display }}>{typeMain}</span>
                    </span>
                  </div>
                ) : null}
                {d?.stage ? (
                  <div>
                    <Label>Stade</Label>
                    <div style={{ fontSize: 15, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display }}>
                      {STAGE_LABEL[d.stage] || d.stage}
                      {d.evolveFrom ? <span style={{ fontWeight: 400, color: SNOW.muted }}> · évolue de {d.evolveFrom}</span> : null}
                    </div>
                  </div>
                ) : null}
                {d?.retreat != null ? (
                  <div>
                    <Label>Coût de retraite</Label>
                    <span style={{ display: "inline-flex", gap: 3 }}>
                      {Array.from({ length: d.retreat }).map((_, i) => (
                        <span key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: SNOW.surface, border: `1.5px solid ${SNOW.mutedLight}` }} />
                      ))}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Pouvoirs */}
              {d?.abilities && d.abilities.length ? (
                <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: `1px solid ${SNOW.borderSoft}` }}>
                  {d.abilities.map((ab, i) => (
                    <div key={i} style={{ marginBottom: i < d.abilities!.length - 1 ? 14 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#E0402A", background: "#FCE9E5", padding: "3px 8px", borderRadius: 6, fontFamily: FONT.display }}>{ab.type || "Pouvoir"}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{ab.name}</span>
                      </div>
                      {ab.effect ? <div style={{ fontSize: 13.5, color: SNOW.inkSoft, fontFamily: FONT.body, lineHeight: 1.55 }}>{ab.effect}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Attaques */}
              {d?.attacks && d.attacks.length ? (
                <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: `1px solid ${SNOW.borderSoft}` }}>
                  {d.attacks.map((at, i) => (
                    <div key={i} style={{ marginBottom: i < d.attacks!.length - 1 ? 16 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {at.cost && at.cost.length ? <EnergyDots cost={at.cost} /> : null}
                          <span style={{ fontSize: 15, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{at.name}</span>
                        </div>
                        {at.damage != null ? <span style={{ fontSize: 18, fontWeight: 800, color: SNOW.ink, fontFamily: FONT.display }}>{at.damage}</span> : null}
                      </div>
                      {at.effect ? <div style={{ fontSize: 13.5, color: SNOW.inkSoft, fontFamily: FONT.body, lineHeight: 1.55 }}>{at.effect}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Faiblesses + legalite */}
              {(d?.weaknesses && d.weaknesses.length) || d?.legal ? (
                <div style={{ display: "flex", gap: 28, flexWrap: "wrap", paddingTop: 18, paddingBottom: d?.description ? 18 : 0, borderBottom: d?.description ? `1px solid ${SNOW.borderSoft}` : "none" }}>
                  {d?.weaknesses && d.weaknesses.length ? (
                    <div>
                      <Label>Faiblesse</Label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {d.weaknesses.map((w, i) => { const s = energyStyle(w.type); return (
                          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: s.c, fontFamily: FONT.display }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.c }} />{w.type} {w.value}
                          </span>
                        )})}
                      </div>
                    </div>
                  ) : null}
                  {d?.legal ? (
                    <div>
                      <Label>Légalité</Label>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(["standard", "expanded"] as const).map(fmt => (
                          <span key={fmt} style={{ fontSize: 11.5, fontWeight: 600, fontFamily: FONT.display, padding: "3px 9px", borderRadius: 7, textTransform: "capitalize", background: d.legal?.[fmt] ? "#E7F5EC" : SNOW.surface, color: d.legal?.[fmt] ? "#1D9E75" : SNOW.mutedLight, border: `1px solid ${d.legal?.[fmt] ? "#1D9E7540" : SNOW.border}` }}>
                            {fmt} {d.legal?.[fmt] ? "✓" : "✕"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Lore */}
              {d?.description ? (
                <div style={{ paddingTop: 18 }}>
                  <p style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body, fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>« {d.description} »</p>
                </div>
              ) : null}
            </Card>
          </section>
        ) : null}
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
