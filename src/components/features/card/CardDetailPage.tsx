"use client"
/**
 * CardDetailPage — fiche de reference (structure + couche vivante + gating Pro).
 * Carte sticky a gauche (tilt 3D) + panneau a onglets a droite.
 * Gating : detail par source = Pro, historique long (90j/1a) = Pro.
 * Un seul CTA Premium fort (Graded.ev), le reste en lignes discretes.
 */
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSpotlightData } from "@/components/features/spotlight/useSpotlightData"
import { SpotlightEngine } from "@/components/features/spotlight/sections/SpotlightEngine"
import { SpotlightChart } from "@/components/features/spotlight/sections/SpotlightChart"
import { SpotlightStates } from "@/components/features/spotlight/sections/SpotlightStates"
import { PriceByConditionFR } from "@/components/features/spotlight/sections/PriceByConditionFR"
import { resolveDisplayPrice } from '@/lib/pricing/resolveDisplayPrice'
import { GradedEvPanel } from "@/components/features/card/GradedEvPanel"
import { fetchCardDetail, type TCGCardFull } from "@/lib/tcgApi"
import { usePortfolio } from "@/lib/usePortfolio"
import { usePersona } from "@/lib/usePersona"
import { usePlan } from "@/lib/usePlan"
import { useGoals } from "@/lib/useGoals"
import { useAuth } from "@/lib/useAuth"
import { normalizeCondition } from "@/lib/conditions"
import { resolveCardImage } from "@/lib/images"
import { CardImg } from "@/components/ui/CardImg"
import { seriesToBloc } from "@/lib/blocs"
import { SNOW, FONT, GLASS, RADIUS, EASE, HOVER_LIFT_STYLE, HOVER_TRANSITION } from "@/lib/design/snow"
import { AddToCollectionModal, type AddCardSeed } from "./AddToCollectionModal"
import AuthModal from "@/components/layout/AuthModal"
import { GuestGate } from "@/components/upgrade/GuestGate"

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

const EnergyDots = ({ cost }: { cost: string[] }) => (
  <span style={{ display: "inline-flex", gap: 3, verticalAlign: "middle" }}>
    {cost.map((t, i) => { const s = energyStyle(t); return (
      <span key={i} title={t} style={{ width: 18, height: 18, borderRadius: "50%", background: s.bg, border: `1.5px solid ${s.c}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: s.c, fontFamily: FONT.display }}>{t[0]}</span>
    )})}
  </span>
)
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 4 }}>{children}</div>
)
const BlockTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ fontSize: 11, fontWeight: 700, color: SNOW.mutedLight, fontFamily: FONT.display, textTransform: "uppercase", letterSpacing: ".07em", margin: "0 0 12px" }}>{children}</h3>
)

// Badge de variant (1st Edition / Shadowless / Unlimited) — meme DA que la grille Encyclopedie
function variantOf(setId: string | null | undefined): "1st" | "shadowless" | "unlimited" | null {
  const id = String(setId ?? "")
  if (!/-shadowless|-1st/.test(id)) {
    if (/^(en|fr|jp)?-?(base1|base2|base3|base5|gym1|gym2|neo1|neo2|neo3|neo4|jungle|fossil|wizards)/i.test(id)) return "unlimited"
    return null
  }
  if (id.includes("-shadowless-ns") || id.includes("-1st")) return "1st"
  if (id.includes("-shadowless")) return "shadowless"
  return "unlimited"
}
const VARIANT_STYLE: Record<string, { label: string; bg: string; color: string; tip: string }> = {
  "1st": { label: "1ST EDITION", bg: "linear-gradient(135deg,#1a1a2e,#2d2b55)", color: "#d4c5ff", tip: "Tout premier tirage, avec le tampon « Édition 1 ». Le plus recherché et le plus rare." },
  shadowless: { label: "SHADOWLESS", bg: "linear-gradient(135deg,#e8eeff,#dde4ff)", color: "#4338ca", tip: "Premier tirage sans ombre portée sur le cadre de l'illustration, sans tampon Édition 1. Rare." },
  unlimited: { label: "UNLIMITED", bg: "linear-gradient(135deg,#f5f5f7,#ebebef)", color: "#6e6e73", tip: "Tirage standard, avec ombre portée. Le plus courant de la série." },
}
function VariantBadge({ setId }: { setId: string | null | undefined }) {
  const [open, setOpen] = useState(false)
  const v = variantOf(setId)
  if (!v) return null
  const st = VARIANT_STYLE[v]
  return (
    <span style={{ position: "relative", display: "inline-flex" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 11px", borderRadius: 20, background: st.bg, cursor: "help" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".04em", color: st.color, fontFamily: FONT.data }}>{st.label}</span>
      </span>
      {open ? (
        <span style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%) translateY(-8px)", width: 230, background: "rgba(29,29,31,0.96)", color: "#fff", fontSize: 11.5, lineHeight: 1.5, fontWeight: 400, fontFamily: FONT.body, padding: "9px 12px", borderRadius: 9, boxShadow: "0 6px 22px rgba(0,0,0,0.28)", zIndex: 30, textAlign: "left", pointerEvents: "none" }}>
          {st.tip}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(29,29,31,0.96)" }} />
        </span>
      ) : null}
    </span>
  )
}

function HeroTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: 5 }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 13, height: 13, borderRadius: "50%", border: `1px solid ${SNOW.mutedLight}`, color: SNOW.mutedLight, fontSize: 9, fontWeight: 700, fontFamily: FONT.display, cursor: "help", lineHeight: 1 }}>i</span>
      {open ? (
        <span style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%) translateY(-8px)", width: 230, background: "rgba(29,29,31,0.96)", color: "#fff", fontSize: 11.5, lineHeight: 1.5, fontWeight: 400, fontFamily: FONT.body, padding: "9px 12px", borderRadius: 9, boxShadow: "0 6px 22px rgba(0,0,0,0.28)", zIndex: 30, textAlign: "left", textTransform: "none", letterSpacing: 0, pointerEvents: "none" }}>
          {text}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(29,29,31,0.96)" }} />
        </span>
      ) : null}
    </span>
  )
}
const TIP_MARKET = "Dernier prix de référence observé sur le marché, en état Near Mint."
const TIP_FAIR = "Notre estimation de la valeur de la carte à partir des ventes récentes, toutes sources confondues. Peut différer du dernier prix affiché."


type TabKey = "prix" | "histo" | "grade" | "infos"

export function CardDetailPage({ cardId }: { cardId: string }) {
  const lang = langFromId(cardId)
  const { data, loading, error } = useSpotlightData(cardId, lang)
  const { cards, addCard } = usePortfolio()
  const { show, isInvestor } = usePersona()
  const { isFree } = usePlan()
  const { wishlist, addWishItem, deleteWishItem } = useGoals()
  const { user } = useAuth()
  const [followMsg, setFollowMsg] = useState<string | null>(null)
  const [detail, setDetail] = useState<CardDetailExtra | null>(null)
  const [siblings, setSiblings] = useState<Array<{ lang: "EN" | "FR" | "JP"; id: string; priceEur: number | null }>>([])
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [gradedCompany, setGradedCompany] = useState<string>("PSA")
  const [activeTab, setActiveTab] = useState<TabKey>("prix")
  const [authOpen, setAuthOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  // Tilt 3D + reflet (DOM direct = zero re-render)
  const tiltRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const onCardMove = (e: React.MouseEvent) => {
    const el = tiltRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const ry = (px - 0.5) * 9
    const rx = (0.5 - py) * 9
    el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.025)`
    const g = glareRef.current
    if (g) { g.style.opacity = "1"; g.style.background = `radial-gradient(circle at ${(px * 100).toFixed(0)}% ${(py * 100).toFixed(0)}%, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)` }
  }
  const onCardLeave = () => {
    const el = tiltRef.current; if (el) el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)"
    const g = glareRef.current; if (g) g.style.opacity = "0"
  }

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

  useEffect(() => {
    let off = false
    const base = cardId.replace(/^(en|fr|jp|aopkm)-/i, "")
    const others: Array<"EN" | "FR" | "JP"> = (["EN", "FR", "JP"] as const).filter(l => l !== lang)
    Promise.all(others.map(async (l) => {
      const id = `${l.toLowerCase()}-${base}`
      try {
        const r = await fetch(`/api/spotlight?card_id=${encodeURIComponent(id)}&lang=${l}`)
        const j = await r.json()
        if (j.error || !j.card) return null
        const price = j.prices?.marketEst ?? j.kodo?.coteFrEur ?? null
        return { lang: l, id, priceEur: price as number | null }
      } catch { return null }
    })).then(res => {
      if (off) return
      setSiblings(res.filter((x): x is { lang: "EN" | "FR" | "JP"; id: string; priceEur: number | null } => x != null))
    })
    return () => { off = true }
  }, [cardId, lang])

  if (loading) {
    return (
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px" }}>
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
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 8 }}>Carte introuvable</div>
        <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body }}>{error || "Cette carte n'existe pas ou n'est pas encore référencée."}</div>
      </div>
    )
  }

  const { card, kodo, prices } = data

  const cleanSetId = (x: string | null | undefined) => String(x ?? "").replace(/^(en|fr|jp|aopkm)-/i, "").replace(/-shadowless-ns|-shadowless|-1st/g, "")
  const pageSet = cleanSetId(card.set_id)
  const pageNum = String(card.local_id ?? "").replace(/^0+/, "") || "0"
  const owned = (cards || []).filter(c => {
    const cSet = cleanSetId(c.set_id)
    const cNum = String(c.card_number ?? "").replace(/^0+/, "") || "0"
    return cSet === pageSet && cNum === pageNum && String(c.lang || "").toUpperCase() === card.lang
  })

  const CONDITION_MAP: Record<string, string> = {
    "Near Mint": "NEAR_MINT", "NM": "NEAR_MINT", "Mint": "NEAR_MINT",
    "Lightly Played": "LIGHTLY_PLAYED", "LP": "LIGHTLY_PLAYED",
    "Moderately Played": "MODERATELY_PLAYED", "MP": "MODERATELY_PLAYED",
    "Heavily Played": "HEAVILY_PLAYED", "HP": "HEAVILY_PLAYED",
    "Damaged": "DAMAGED", "DMG": "DAMAGED",
  }
  type SrcRow = { variant?: string; condition?: string; price_avg?: number; nb_sales?: number | null }
  const allRows: SrcRow[] = []
  Object.entries((prices?.bySource || {}) as Record<string, unknown>).forEach(([k, v]) => {
    if (k.startsWith("__") || !Array.isArray(v)) return
    ;(v as SrcRow[]).forEach(r => allRows.push(r))
  })
  const priceForCondition = (condDb: string): number | null => {
    const matches = allRows.filter(r => r.variant === "raw" && r.condition === condDb && (r.price_avg ?? 0) > 0)
    if (matches.length === 0) return null
    const withVol = matches.filter(r => r.nb_sales != null).sort((a, b) => (b.nb_sales || 0) - (a.nb_sales || 0))
    const chosen = withVol[0] || matches[0]
    return chosen.price_avg ?? null
  }
  const nmPrice = priceForCondition("NEAR_MINT")

  const followed = (wishlist || []).find(w => {
    const wSet = cleanSetId(w.set_id)
    const wNum = String(w.card_number ?? "").replace(/^0+/, "") || "0"
    return wSet === pageSet && wNum === pageNum && String(w.lang || "").toUpperCase() === card.lang
  })
  const isFollowed = !!followed
  const toggleFollow = async () => {
    setFollowMsg(null)
    if (!user) { setAuthOpen(true); return }
    if (isFollowed && followed) { await deleteWishItem(followed.id); return }
    const res = await addWishItem({
      card_name: card.name,
      set_id: card.set_id,
      set_name: card.set_name,
      card_number: String(card.local_id ?? ""),
      lang: card.lang,
      rarity: (card as any).rarity ?? (card as any).rarity_normalized ?? null,
      priority: 2,
    })
    if (res && typeof res === "object" && "error" in res && res.error === "wishlist_limit") {
      setFollowMsg("Plan Gratuit limité à 3 cartes suivies. Passe Pro pour l'illimité.")
    }
  }

  const COND_ORDER = ["NEAR_MINT", "LIGHTLY_PLAYED", "MODERATELY_PLAYED", "HEAVILY_PLAYED", "DAMAGED"]
  const COND_FR: Record<string, string> = {
    NEAR_MINT: "Near Mint", LIGHTLY_PLAYED: "Lightly Played", MODERATELY_PLAYED: "Moderately Played",
    HEAVILY_PLAYED: "Heavily Played", DAMAGED: "Damaged",
  }
  const SRC_FR: Record<string, string> = { tcgplayer: "TCGplayer", ebay: "eBay", cardmarket: "Cardmarket" }
  const VOL_MIN_SRC = 3
  type SrcLine = { src: string; price: number; vol: number | null }
  const sourcesByCond: Array<{ cond: string; label: string; lines: SrcLine[] }> = []
  for (const cond of COND_ORDER) {
    const lines: SrcLine[] = []
    Object.entries((prices?.bySource || {}) as Record<string, unknown>).forEach(([src, v]) => {
      if (src.startsWith("__") || !Array.isArray(v)) return
      ;(v as SrcRow[]).forEach(r => {
        if (r.variant === "raw" && r.condition === cond && (r.price_avg ?? 0) > 0) {
          const vol = r.nb_sales != null ? r.nb_sales : null
          if (vol == null || vol >= VOL_MIN_SRC) lines.push({ src, price: r.price_avg!, vol })
        }
      })
    })
    const bySrc = new Map<string, SrcLine>()
    for (const l of lines) {
      const cur = bySrc.get(l.src)
      if (!cur) { bySrc.set(l.src, l); continue }
      const lv = l.vol ?? -1, cv = cur.vol ?? -1
      if (lv > cv) bySrc.set(l.src, l)
    }
    const deduped = Array.from(bySrc.values()).sort((a, b) => (b.vol ?? 0) - (a.vol ?? 0))
    if (deduped.length > 0) sourcesByCond.push({ cond, label: COND_FR[cond], lines: deduped })
  }
  const hasSources = sourcesByCond.length > 0

  // ── Prix gradés actuels : groupés par société (pills) -> grille de notes ───
  const SLAB_FR: Record<string, string> = { psa: 'PSA', cgc: 'CGC', bgs: 'BGS', sgc: 'SGC', ace: 'ACE', tag: 'TAG', cca: 'CCA', pca: 'PCA', ccc: 'CCC' }
  const SLAB_COMPANY_COLOR: Record<string, string> = { PSA: '#E03020', CGC: '#2A6FDB', BGS: '#1D1D1F', SGC: '#0E8A5F', ACE: '#7A4FC4', TAG: '#C77700', CCA: '#6E6E73', PCA: '#6E6E73', CCC: '#6E6E73' }
  const COMPANY_RANK: Record<string, number> = { PSA: 0, CGC: 1, BGS: 2, SGC: 3, ACE: 4, TAG: 5 }
  type GradedNote = { slab: string; grade: number; gradeLabel: string; price: number }
  const gradedNotes: GradedNote[] = []
  Object.entries((prices?.bySource || {}) as Record<string, unknown>).forEach(([src, v]) => {
    if (src.startsWith("__") || !Array.isArray(v)) return
    ;(v as Array<any>).forEach(r => {
      // La note gradee ({COMPANY}_{GRADE}) est portee par le champ `tier`
      // (ex "PSA_8", "CCC_9_5"). Fallback sur `variant` pour les anciennes lignes.
      const label = String(r?.tier ?? "")
      const src2 = /^([a-z]+)_(\d+)(?:_(\d))?$/i.test(label) ? label : String(r?.variant ?? "")
      const m = src2.match(/^([a-z]+)_(\d+)(?:_(\d))?$/i)
      if (!m) return
      const slab = (SLAB_FR[m[1].toLowerCase()] || m[1].toUpperCase())
      const grade = Number(m[2]) + (m[3] ? Number(m[3]) / 10 : 0)
      const price = Number(r?.price_avg ?? 0)
      if (price > 0) gradedNotes.push({ slab, grade, gradeLabel: `${slab} ${m[2]}${m[3] ? '.' + m[3] : ''}`, price })
    })
  })
  // Dédup (garde le prix le + élevé par slab+grade, souvent le + fiable)
  const gradedMap = new Map<string, GradedNote>()
  for (const n of gradedNotes) {
    const k = `${n.slab}_${n.grade}`
    const cur = gradedMap.get(k)
    if (!cur || n.price > cur.price) gradedMap.set(k, n)
  }
  const gradedDedup = Array.from(gradedMap.values())
  const gradedCompanies = Array.from(new Set(gradedDedup.map(n => n.slab)))
    .sort((a, b) => (COMPANY_RANK[a] ?? 99) - (COMPANY_RANK[b] ?? 99))
  const hasGradedPrices = gradedDedup.length > 0


  const gradedLocked = (prices?.bySource as any)?.__gradedLocked === true
  const gradedHiddenCount = Number((prices?.bySource as any)?.__gradedHiddenCount || 0)
  const coteFor = (c: typeof owned[number]): { value: number | null; locked?: boolean; gradeLabel?: string } => {
    if (c.graded) {
      const company = (c.grade_company || "PSA").toUpperCase()
      const gval = c.grade_value != null ? Number(c.grade_value) : null
      const gl = `${company} ${c.grade_value ?? ""}`.trim()
      // Exemplaire possede -> prix DEJA calcule par le portfolio (source de verite,
      // coherent, JAMAIS tronque par le verrou Premium de la fiche).
      const own = (c as any).current_price ?? (c as any).curPrice ?? (c as any).priceEur ?? (c as any).price ?? null
      if (own != null && Number(own) > 0) return { value: Number(own), locked: false, gradeLabel: gl }
      // Fallback : note exacte dans gradedDedup (route spotlight, si non verrouille).
      if (gval != null) {
        const hit = gradedDedup.find(n => n.slab === company && Math.abs(n.grade - gval) < 0.001)
        if (hit && hit.price > 0) return { value: hit.price, locked: false, gradeLabel: hit.gradeLabel }
      }
      return { value: null, locked: false, gradeLabel: gl }
    }
    const raw = normalizeCondition(c.condition)
    if (raw === "Raw") return { value: nmPrice }
    const condDb = CONDITION_MAP[raw]
    if (condDb) {
      const p = priceForCondition(condDb)
      return { value: p != null ? p : nmPrice }
    }
    return { value: nmPrice }
  }
  const img = resolveCardImage({ lang: card.lang, setId: card.set_id, localId: card.local_id, fallbackUrl: card.image_url ?? undefined })
  const blocInfo = seriesToBloc(card.era, card.id)
  const era = blocInfo ? { era: blocInfo.label, color: blocInfo.color } : eraOf(card.id)
  const flag = FLAG[card.lang] || ""
  const fmtEur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"

  const fairValue = kodo?.fairValueEur ?? null
  // Carte FR : si pas de marketEst (sources EU absentes), on montre la cote FR
  // consolidee par l'Engine (cote_fr_eur). Jamais de prix US sur une carte FR.
  const market = resolveDisplayPrice(card.lang, prices, kodo).price
  const isFrCard = String(card.lang || '').toUpperCase() === 'FR'
  const showFair = !isFrCard && fairValue != null && market != null && market > 0 && Math.abs(fairValue - market) / market > 0.02
  const history = prices.history || []
  const hasEngine = kodo != null && (kodo.liquidityScore != null || kodo.gradeEvPsa10Eur != null || kodo.coteFrEur != null)
  const illustrator = detail?.illustrator || null

  const d = detail
  const hasAbout = d != null && (d.hp != null || (d.types && d.types.length) || d.stage || d.evolveFrom || (d.attacks && d.attacks.length) || (d.abilities && d.abilities.length) || (d.weaknesses && d.weaknesses.length) || d.description)
  const typeMain = d?.types && d.types.length ? d.types[0] : null
  const tStyle = typeMain ? energyStyle(typeMain) : null

  // Espace perso : agregats
  const ownedUnits = owned.reduce((s, c) => s + (c.qty || 1), 0)
  let ownedValue = 0, ownedHasValue = false, ownedCost = 0, ownedHasCost = false
  owned.forEach(c => {
    const cote = coteFor(c)
    if (cote.value != null) { ownedValue += cote.value * (c.qty || 1); ownedHasValue = true }
    if (c.buy_price != null && Number(c.buy_price) > 0) { ownedCost += Number(c.buy_price) * (c.qty || 1); ownedHasCost = true }
  })
  const ownedPnl = (ownedHasValue && ownedHasCost) ? ownedValue - ownedCost : null
  const ownedPnlPct = (ownedPnl != null && ownedCost > 0) ? Math.round((ownedPnl / ownedCost) * 100) : null

  // ─────────────────────────────────────────────────────────────────────────
  // Onglets
  // ─────────────────────────────────────────────────────────────────────────

  // Section Prix gradés (rendue dans l'onglet Prix)
  const GradedPricesSection = () => {
    if (isFree) {
      // Teaser Pro discret (cohérent avec le reste)
      const hidden = gradedHiddenCount > 0 ? gradedHiddenCount : (hasGradedPrices ? gradedDedup.length : 0)
      if (hidden <= 0 && !gradedLocked) return null
      return (
        <div>
          <BlockTitle>Prix gradés</BlockTitle>
          <p style={{ fontSize: 11.5, color: SNOW.mutedLight, margin: "0 0 10px", lineHeight: 1.45 }}>Le prix actuel des cartes notées (PSA, CGC, BGS…), par note.</p>
          <a href="/abonnement" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 500, color: SNOW.muted, fontFamily: FONT.display, textDecoration: "none" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            {hidden > 0 ? `${hidden} prix gradés (PSA, CGC, BGS…)` : "Prix gradés (PSA, CGC, BGS…)"}
            <span style={{ color: "#E03020", fontWeight: 700 }}>Pro</span>
          </a>
        </div>
      )
    }
    // Pro+ : pills société + grille 3 colonnes
    if (!hasGradedPrices) return null
    // Liste unifiee : toutes les notes de toutes les societes, visibles d'un coup.
    // Badge societe colore (PSA rouge, PCA gris, CGC bleu...). Tri: societe puis note desc.
    const sortedNotes = [...gradedDedup].sort((a, b) =>
      a.slab === b.slab ? b.grade - a.grade : a.slab.localeCompare(b.slab)
    )
    return (
      <div>
        <BlockTitle>Prix gradés</BlockTitle>
        <p style={{ fontSize: 11.5, color: SNOW.mutedLight, margin: "0 0 12px", lineHeight: 1.45 }}>Le prix actuel par note, toutes sociétés de gradation confondues.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sortedNotes.map(n => {
            const col = SLAB_COMPANY_COLOR[n.slab] || SNOW.muted
            const gradeOnly = n.gradeLabel.replace(n.slab + " ", "")
            return (
              <div key={n.gradeLabel} style={{ display: "flex", alignItems: "center", gap: 11, background: SNOW.surfaceSoft, borderRadius: 10, border: `1px solid ${SNOW.border}`, padding: "9px 13px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 40, padding: "3px 8px", borderRadius: 6, background: col, color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: FONT.data, letterSpacing: ".04em" }}>{n.slab}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.data, letterSpacing: ".02em" }}>{gradeOnly}</span>
                <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtEur(n.price)}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const TabPrix = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {hasEngine ? (
        <div><SpotlightEngine kodo={kodo} onEvDetail={() => setActiveTab("grade")} /></div>
      ) : null}
      <div>
        {isFrCard ? (
          <PriceByConditionFR lang={card.lang} frByCondition={prices.frByCondition} />
        ) : (<>
        <BlockTitle>Prix par état</BlockTitle>
        {hasSources ? (
          <>
            <p style={{ fontSize: 11.5, color: SNOW.mutedLight, margin: "0 0 14px", lineHeight: 1.4 }}>Moyenne des ventes confirmées, par état · 90 jours</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {sourcesByCond.map((grp, gi) => {
                const best = grp.lines[0]
                return (
                  <div key={grp.cond} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "center", padding: "11px 0", borderBottom: gi < sourcesByCond.length - 1 ? `1px solid ${SNOW.borderSoft}` : "none" }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display }}>{grp.label}</div>
                      <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.display, marginTop: 1 }}>{SRC_FR[best.src] || best.src}{best.vol != null ? ` · ${best.vol} vente${best.vol > 1 ? "s" : ""}` : ""}</div>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: gi === 0 ? SNOW.ink : "#48484A", fontFamily: FONT.display, textAlign: "right" }}>{fmtEur(best.price)}</span>
                  </div>
                )
              })}
            </div>

            {/* Detail par source : Pro (teaser pour Free) */}
            {isFree ? (
              <a href="/abonnement" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 14, background: SNOW.surface, border: `1px solid ${SNOW.border}`, borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: SNOW.muted, fontFamily: FONT.display, textDecoration: "none" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                Détail par source (TCGplayer · eBay · Cardmarket)
                <span style={{ color: "#E03020", fontWeight: 700 }}>Pro</span>
              </a>
            ) : (
              <>
                <button onClick={() => setSourcesOpen(v => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, background: SNOW.surface, border: `1px solid ${SNOW.border}`, borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 600, color: SNOW.muted, fontFamily: FONT.display, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {sourcesOpen ? "Masquer le détail par source" : "Voir le détail par source"}
                  <span style={{ display: "inline-block", transform: sourcesOpen ? "rotate(90deg)" : "rotate(0)", transition: "transform .2s", fontSize: 9 }}>▶</span>
                </button>
                {sourcesOpen ? (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${SNOW.borderSoft}`, display: "flex", flexDirection: "column", gap: 14 }}>
                    {sourcesByCond.map(grp => (
                      <div key={grp.cond}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: SNOW.mutedLight, textTransform: "uppercase", letterSpacing: ".05em", fontFamily: FONT.display, marginBottom: 6 }}>{grp.label}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          {grp.lines.map((l, i) => (
                            <div key={l.src} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center", padding: "8px 0", borderBottom: i < grp.lines.length - 1 ? `1px solid ${SNOW.borderSoft}` : "none" }}>
                              <span style={{ fontSize: 13, color: SNOW.ink, fontFamily: FONT.display }}>{SRC_FR[l.src] || l.src}</span>
                              <span style={{ fontSize: 12, color: SNOW.mutedLight, fontFamily: FONT.display, textAlign: "right" }}>{l.vol != null ? `${l.vol} vente${l.vol > 1 ? "s" : ""}` : "référence"}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, textAlign: "right", minWidth: 72 }}>{fmtEur(l.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : (
          <SpotlightStates prices={prices} kodo={kodo} lang={card.lang} />
        )}
        </>)}
      </div>
      <GradedPricesSection />
    </div>
  )

  const TabHisto = () => (
    <div>
      {history.length > 0 ? <SpotlightChart history={history} lockLongRange={isFree} cardId={card.id} lang={card.lang} /> : (
        <p style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body }}>Pas encore d'historique pour cette carte.</p>
      )}
    </div>
  )

  const TabGrade = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* CTA FORT unique : Graded.ev */}
      <GradedEvPanel printId={card.id} lang={card.lang} />

      {/* Prix gradés : ligne discrète (pas un gros bouton) */}
      {gradedLocked && gradedHiddenCount > 0 ? (
        <div>
          <BlockTitle>Prix gradés</BlockTitle>
          <p style={{ fontSize: 12, color: SNOW.mutedLight, margin: "0 0 10px", lineHeight: 1.45 }}>Les prix des cartes notées (PSA, CGC, BGS…) par note.</p>
          <a href="/abonnement" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 500, color: SNOW.muted, fontFamily: FONT.display, textDecoration: "none" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            {gradedHiddenCount} note{gradedHiddenCount > 1 ? "s" : ""} gradée{gradedHiddenCount > 1 ? "s" : ""} disponible{gradedHiddenCount > 1 ? "s" : ""}
            <span style={{ color: "#E03020", fontWeight: 700 }}>Premium</span>
          </a>
        </div>
      ) : null}

    </div>
  )

  // ── Onglet DETAILS enrichi : carte d'identite visuelle ─────────────────────
  const TabInfos = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {hasAbout ? (
        <div>
          <BlockTitle>Carte d&apos;identité</BlockTitle>

          {/* Bandeau stats colore par type */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 18 }}>
            {d?.hp != null ? (
              <div style={{ borderRadius: 13, padding: "13px 15px", background: tStyle ? tStyle.bg : SNOW.surface, border: `1px solid ${tStyle ? tStyle.c + "33" : SNOW.border}` }}>
                <Label>Points de vie</Label>
                <div style={{ fontSize: 26, fontWeight: 800, color: tStyle ? tStyle.c : SNOW.ink, fontFamily: FONT.display, lineHeight: 1 }}>{d.hp}<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}> PV</span></div>
              </div>
            ) : null}
            {typeMain && tStyle ? (
              <div style={{ borderRadius: 13, padding: "13px 15px", background: SNOW.surface, border: `1px solid ${SNOW.border}` }}>
                <Label>Type</Label>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 2 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: tStyle.bg, border: `2px solid ${tStyle.c}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: tStyle.c, fontFamily: FONT.display }}>{typeMain[0]}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{typeMain}</span>
                </div>
              </div>
            ) : null}
            {d?.stage ? (
              <div style={{ borderRadius: 13, padding: "13px 15px", background: SNOW.surface, border: `1px solid ${SNOW.border}` }}>
                <Label>Stade</Label>
                <div style={{ fontSize: 15, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, marginTop: 2 }}>{STAGE_LABEL[d.stage] || d.stage}</div>
                {d.evolveFrom ? <div style={{ fontSize: 11, color: SNOW.muted, fontFamily: FONT.body, marginTop: 2 }}>évolue de {d.evolveFrom}</div> : null}
              </div>
            ) : null}
            {d?.retreat != null ? (
              <div style={{ borderRadius: 13, padding: "13px 15px", background: SNOW.surface, border: `1px solid ${SNOW.border}` }}>
                <Label>Coût de retraite</Label>
                <div style={{ display: "inline-flex", gap: 3, marginTop: 5 }}>
                  {d.retreat > 0 ? Array.from({ length: d.retreat }).map((_, i) => (
                    <span key={i} style={{ width: 17, height: 17, borderRadius: "50%", background: "#F0F0F2", border: `1.5px solid ${SNOW.mutedLight}` }} />
                  )) : <span style={{ fontSize: 14, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>0</span>}
                </div>
              </div>
            ) : null}
            {d?.weaknesses && d.weaknesses.length ? (
              <div style={{ borderRadius: 13, padding: "13px 15px", background: SNOW.surface, border: `1px solid ${SNOW.border}` }}>
                <Label>Faiblesse</Label>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  {d.weaknesses.map((w, i) => { const s = energyStyle(w.type); return (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: s.c, fontFamily: FONT.display }}>
                      <span style={{ width: 14, height: 14, borderRadius: "50%", background: s.bg, border: `1.5px solid ${s.c}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800 }}>{w.type[0]}</span>{w.value}
                    </span>
                  )})}
                </div>
              </div>
            ) : null}
          </div>

          {/* Pouvoirs */}
          {d?.abilities && d.abilities.length ? (
            <div style={{ marginBottom: 16 }}>
              {d.abilities.map((ab, i) => (
                <div key={i} style={{ background: "#FCF6F5", border: "1px solid #F0D9D4", borderRadius: 13, padding: "14px 16px", marginBottom: i < d.abilities!.length - 1 ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#E0402A", background: "#FCE0DA", padding: "3px 8px", borderRadius: 6, fontFamily: FONT.display }}>{ab.type || "Pouvoir"}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{ab.name}</span>
                  </div>
                  {ab.effect ? <div style={{ fontSize: 13.5, color: SNOW.inkSoft, fontFamily: FONT.body, lineHeight: 1.55 }}>{ab.effect}</div> : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Attaques */}
          {d?.attacks && d.attacks.length ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: SNOW.mutedLight, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: FONT.display, marginBottom: 10 }}>Attaques</div>
              {d.attacks.map((at, i) => (
                <div key={i} style={{ borderRadius: 13, border: `1px solid ${SNOW.border}`, padding: "13px 16px", marginBottom: i < d.attacks!.length - 1 ? 8 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: at.effect ? 6 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {at.cost && at.cost.length ? <EnergyDots cost={at.cost} /> : null}
                      <span style={{ fontSize: 15, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{at.name}</span>
                    </div>
                    {at.damage != null ? <span style={{ fontSize: 20, fontWeight: 800, color: SNOW.ink, fontFamily: FONT.display }}>{at.damage}</span> : null}
                  </div>
                  {at.effect ? <div style={{ fontSize: 13, color: SNOW.inkSoft, fontFamily: FONT.body, lineHeight: 1.55 }}>{at.effect}</div> : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Legalite + lore */}
          {d?.legal || d?.description ? (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
              {d?.legal ? (
                <div>
                  <Label>Légalité en tournoi</Label>
                  <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                    {(["standard", "expanded"] as const).map(fmt => (
                      <span key={fmt} style={{ fontSize: 11.5, fontWeight: 600, fontFamily: FONT.display, padding: "4px 10px", borderRadius: 8, textTransform: "capitalize", background: d.legal?.[fmt] ? "#E7F5EC" : SNOW.surface, color: d.legal?.[fmt] ? "#1D9E75" : SNOW.mutedLight, border: `1px solid ${d.legal?.[fmt] ? "#1D9E7540" : SNOW.border}` }}>
                        {fmt} {d.legal?.[fmt] ? "✓" : "✕"}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {d?.description ? (
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <Label>Description</Label>
                  <p style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body, fontStyle: "italic", lineHeight: 1.6, margin: "2px 0 0" }}>« {d.description} »</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {siblings.length > 0 ? (
        <div>
          <BlockTitle>Cette carte existe aussi en</BlockTitle>
          <div style={{ borderRadius: 14, border: `1px solid ${SNOW.border}`, overflow: "hidden" }}>
            {siblings.map((sib, i) => {
              const sFlag = FLAG[sib.lang] || ""
              const sLabel = LANG_LABEL[sib.lang] || sib.lang
              return (
                <Link key={sib.id} href={`/cartes/${encodeURIComponent(sib.id)}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 18px", textDecoration: "none", borderTop: i > 0 ? `1px solid ${SNOW.borderSoft}` : "none", transition: "background .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = SNOW.surfaceSoft }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{sFlag}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display }}>{sLabel}</div>
                      <div style={{ fontSize: 12, color: SNOW.mutedLight, fontFamily: FONT.display }}>{card.set_name} · #{card.local_id}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {sib.priceEur != null ? (
                      <span style={{ fontSize: 16, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtEur(sib.priceEur)}</span>
                    ) : (
                      <span style={{ fontSize: 13, color: SNOW.mutedLight, fontStyle: "italic", fontFamily: FONT.body }}>voir le prix</span>
                    )}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      {!hasAbout && siblings.length === 0 ? (
        <p style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body }}>Pas de détails supplémentaires pour cette carte.</p>
      ) : null}
    </div>
  )

  const TABS: { key: TabKey; label: string }[] = [
    { key: "prix", label: "Prix" },
    { key: "histo", label: "Historique" },
    { key: "grade", label: "Gradation" },
    { key: "infos", label: "Détails" },
  ]
  const GUEST_TAB: Partial<Record<TabKey, { title: string; desc: string; minHeight?: number }>> = {
    prix: { title: "Sa valeur dans chaque état", desc: "Near Mint, Lightly Played, gradée… découvre la cote complète de cette carte. C'est gratuit.", minHeight: 300 },
    histo: { title: "L'évolution de sa cote", desc: "Le graphe complet de son prix dans le temps, pour repérer le bon moment. Crée ton compte gratuit.", minHeight: 260 },
    grade: { title: "Faut-il la faire grader ?", desc: "Le calcul complet : valeur gradée, population PSA, espérance de gain. Gratuit dès l'inscription.", minHeight: 300 },
  }
  const renderTab = (k: TabKey) => {
    const content = k === "prix" ? <TabPrix /> : k === "histo" ? <TabHisto /> : k === "grade" ? <TabGrade /> : <TabInfos />
    const g = !user ? GUEST_TAB[k] : undefined
    if (g) return <GuestGate locked title={g.title} desc={g.desc} minHeight={g.minHeight}>{content}</GuestGate>
    return content
  }

  return (
    <div className="kc-card-page" style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 24px 72px" }}>
      <nav className="kc-rise" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22, fontSize: 12.5, fontFamily: FONT.display, color: SNOW.mutedLight, flexWrap: "wrap" }}>
        <Link href="/cartes" style={{ color: SNOW.muted, textDecoration: "none" }}>Pokédesk</Link>
        <span>›</span>
        <span style={{ color: SNOW.muted }}>{card.set_name}</span>
        <span>›</span>
        <span style={{ color: SNOW.ink, fontWeight: 600 }}>{card.name}</span>
      </nav>

      <div className="kc-grid">

        {/* Carte sticky + tilt */}
        <div className="kc-media">
          <div className="kc-rise">
            <div ref={tiltRef} onMouseMove={onCardMove} onMouseLeave={onCardLeave} style={{ position: "relative", transition: `transform .16s ${EASE.apple}`, transformStyle: "preserve-3d", willChange: "transform", cursor: "pointer" }}>
              <div style={{ width: "100%", aspectRatio: "63/88", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.20), 0 6px 18px rgba(0,0,0,0.10)" }}>
                <CardImg setId={card.set_id} localId={card.local_id ?? undefined} lang={card.lang} image={card.image_url} name={card.name} number={card.local_id ?? undefined} variant="full" rounded={16} imgStyle={{ objectFit: "contain" }} />
              </div>
              <div ref={glareRef} style={{ position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none", opacity: 0, transition: "opacity .25s ease", mixBlendMode: "overlay" }} />
            </div>
          </div>
        </div>

        {/* Donnees */}
        <div className="kc-head kc-rise" style={{ animationDelay: ".06s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: SNOW.muted, fontFamily: FONT.display, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>
                {card.set_name}{card.local_id ? ` · #${card.local_id}` : ""}
              </div>
              <h1 style={{ fontSize: "clamp(23px, 6.4vw, 30px)", fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: "-0.02em", lineHeight: 1.08, margin: "0 0 6px" }}>{card.name}</h1>
              <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body }}>
                <span>{(card as any).rarity || String(card.rarity_normalized || "").split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}</span>
                {illustrator ? <span> · Illustré par {illustrator}</span> : null}
              </div>
            </div>
            <button className="kc-head-follow" onClick={toggleFollow} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 20, background: isFollowed ? "rgba(224,48,32,0.08)" : "#1D1D1F", border: isFollowed ? "1px solid rgba(224,48,32,0.25)" : "1px solid #1D1D1F", color: isFollowed ? "#E03020" : "#fff", fontSize: 13.5, fontWeight: 700, fontFamily: FONT.display, cursor: "pointer", boxShadow: isFollowed ? "none" : "0 4px 14px rgba(0,0,0,0.16)", transition: `all .2s ${EASE.apple}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={isFollowed ? "#E03020" : "none"} stroke={isFollowed ? "#E03020" : "#fff"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {isFollowed ? "Suivie" : "Suivre"}
            </button>
          </div>
          {followMsg ? (
            <div style={{ marginTop: 10, fontSize: 12.5, color: SNOW.muted, fontFamily: FONT.body, display: "flex", alignItems: "center", gap: 6 }}>
              <span>{followMsg}</span>
              {followMsg.includes("Pro") ? <a href="/abonnement" style={{ color: "#E03020", fontWeight: 600, textDecoration: "none" }}>Voir Pro</a> : null}
            </div>
          ) : null}

          <div className="kc-chips" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
            {era ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 20, background: era.color + "14", border: `1px solid ${era.color}33` }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: era.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".03em", color: era.color, fontFamily: FONT.display, textTransform: "uppercase" }}>{era.era}</span>
              </span>
            ) : null}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, background: SNOW.surface, border: `1px solid ${SNOW.border}`, fontSize: 11.5, color: SNOW.muted, fontFamily: FONT.display }}>{flag} {LANG_LABEL[card.lang] || card.lang}</span>
            <VariantBadge setId={card.set_id} />
          </div>
        </div>

        <div className="kc-body">
          <div className="kc-price kc-rise" style={{ animationDelay: ".12s", display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap", marginTop: 20, paddingTop: 20, borderTop: `1px solid ${SNOW.borderSoft}` }}>
            {market != null ? (
              <div>
                <div style={{ fontSize: 11, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 3, display: "inline-flex", alignItems: "center" }}>Prix de marché<HeroTip text={TIP_MARKET} /></div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: "clamp(27px, 7.6vw, 34px)", fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: "-0.02em", lineHeight: 1 }}>{fmtEur(market)}</div>
                  {!isFrCard && (prices as any).fxUsdEur && (prices as any).fxUsdEur > 0 ? (
                    <span style={{ fontSize: 15, fontWeight: 600, color: SNOW.mutedLight, fontFamily: FONT.data, letterSpacing: "-0.01em" }}>~${(market / (prices as any).fxUsdEur).toFixed(2)}</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: SNOW.muted, fontStyle: "italic", fontFamily: FONT.body }}>Données de prix insuffisantes pour le moment.</div>
            )}
            {showFair ? (
              <div style={{ padding: "9px 15px", borderRadius: 12, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}` }}>
                <div style={{ fontSize: 10, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 4, display: "inline-flex", alignItems: "center" }}>Valeur estimée<HeroTip text={TIP_FAIR} /></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtEur(fairValue)}</div>
              </div>
            ) : null}
          </div>

          <div className="kc-rise" style={{ animationDelay: ".18s", display: "flex", gap: 4, marginTop: 24 }}>
            {TABS.map(t => {
              const on = activeTab === t.key
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: "1 1 auto", padding: "9px 6px", borderRadius: 11, fontSize: 12.5, fontWeight: 700, fontFamily: FONT.display, cursor: "pointer", whiteSpace: "nowrap", transition: `all .18s ${EASE.apple}`, background: on ? "rgba(224,48,32,0.08)" : "transparent", color: on ? "#E03020" : SNOW.muted, border: on ? "1px solid rgba(224,48,32,0.22)" : `1px solid ${SNOW.border}` }}>
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="kc-rise" style={{ ...GLASS.card, animationDelay: ".24s", marginTop: 14, padding: "24px 26px", borderRadius: RADIUS.lg, minHeight: 300 }}>
            <div key={activeTab} className="kc-tab-anim">{renderTab(activeTab)}</div>
          </div>
        </div>
      </div>

      {/* SEPARATEUR FRANC */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "60px 0 0" }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${SNOW.border})` }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: ".14em", color: SNOW.mutedLight, fontFamily: FONT.display, textTransform: "uppercase" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Ton espace
        </span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(270deg, transparent, ${SNOW.border})` }} />
      </div>

      {/* ZONE PERSO enrichie */}
      <div style={{ marginTop: 22, padding: "30px 30px", borderRadius: 22, background: "linear-gradient(180deg, #FBFAF7 0%, #F5F4FA 100%)", border: `1px solid ${SNOW.border}`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: SNOW.muted, fontFamily: FONT.display, textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>Dans ma collection</h2>
          {owned.length > 0 ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", fontFamily: FONT.display, marginRight: 7 }}>{ownedUnits > 1 ? `${ownedUnits} exemplaires` : "1 exemplaire"}{ownedHasValue ? " · valeur" : ""}</span>
                {ownedHasValue ? <span style={{ fontSize: 18, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtEur(ownedValue)}</span> : null}
              </div>
              {show.pnl && ownedPnl != null ? (
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT.display, color: ownedPnl >= 0 ? "#1D9E75" : "#E03020" }}>
                  {ownedPnl >= 0 ? "+" : ""}{fmtEur(ownedPnl)}{ownedPnlPct != null ? ` (${ownedPnl >= 0 ? "+" : ""}${ownedPnlPct}%)` : ""}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {owned.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {owned.map((c, i) => {
              const cote = coteFor(c)
              const cond = normalizeCondition(c.condition)
              const gradeLabel = c.graded ? (cote.gradeLabel || `${c.grade_company || "PSA"} ${c.grade_value || ""}`.trim()) : (cond === "Raw" ? "Near Mint" : cond)
              const cur = cote.value
              const buy = c.buy_price != null ? Number(c.buy_price) : null
              const pv = (cur != null && buy != null && buy > 0) ? cur - buy : null
              const pct = (pv != null && buy && buy > 0) ? Math.round((pv / buy) * 100) : null
              const up = pv != null && pv >= 0
              return (
                <div key={c.id || i} style={{ background: SNOW.bg, borderRadius: 14, border: `1px solid ${SNOW.border}`, padding: "16px 18px", transition: `box-shadow .2s ${EASE.apple}, transform .2s ${EASE.apple}` }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(-1px)" }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 11px", borderRadius: 8, background: c.graded ? "rgba(224,48,32,0.08)" : SNOW.surface, border: `1px solid ${c.graded ? "rgba(224,48,32,0.2)" : SNOW.border}`, fontSize: 11, fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase", color: c.graded ? "#E03020" : SNOW.muted, fontFamily: FONT.display }}>{gradeLabel}</span>
                      {c.qty > 1 ? <span style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.display, fontWeight: 600 }}>{"\u00D7"}{c.qty}</span> : null}
                    </div>
                    {cote.locked ? (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", fontFamily: FONT.display }}>Cote {gradeLabel}</div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2, fontSize: 12.5, fontWeight: 700, color: "#E03020", fontFamily: FONT.display }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                          Premium
                        </span>
                      </div>
                    ) : cur != null ? (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", fontFamily: FONT.display }}>{isInvestor ? "Valeur" : "Cote actuelle"}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtEur(cur)}</div>
                      </div>
                    ) : c.graded ? (
                      <div style={{ textAlign: "right", maxWidth: 300 }}>
                        <div style={{ fontSize: 10, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", fontFamily: FONT.display }}>Cote {gradeLabel}</div>
                        <div style={{ fontSize: 11.5, color: SNOW.muted, fontFamily: FONT.display, marginTop: 3, lineHeight: 1.45 }}>Pas encore de prix collecte pour cette note. La cote s'affichera automatiquement des qu'une vente sera detectee.</div>
                      </div>
                    ) : null}
                  </div>
                  {show.pnl && pv != null ? (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${SNOW.borderSoft}`, fontSize: 12.5, color: SNOW.muted, fontFamily: FONT.display }}>
                      Acheté {buy != null ? fmtEur(buy) : "—"} {"\u00B7"} <span style={{ fontWeight: 700, color: up ? "#1D9E75" : "#E03020" }}>{up ? "+" : ""}{fmtEur(pv)}{pct != null ? ` (${up ? "+" : ""}${pct}%)` : ""}</span>
                    </div>
                  ) : null}
                </div>
              )
            })}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
              <button onClick={() => setAddOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: RADIUS.md, ...GLASS.button, color: SNOW.ink, fontSize: 13, fontWeight: 700, fontFamily: FONT.display, cursor: "pointer", transition: HOVER_TRANSITION }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = HOVER_LIFT_STYLE.transform; e.currentTarget.style.boxShadow = HOVER_LIFT_STYLE.boxShadow }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = GLASS.button.boxShadow as string }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Ajouter un exemplaire
              </button>
              <Link href="/portfolio" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: SNOW.muted, fontFamily: FONT.display, textDecoration: "none" }}>
                Gérer dans mon portfolio
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </Link>
            </div>
          </div>
        ) : !user ? (
          <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
            <div style={{ fontSize: 14.5, color: SNOW.muted, fontFamily: FONT.body, marginBottom: 16 }}>Crée ton compte gratuit pour ajouter cette carte et suivre sa valeur.</div>
            <button onClick={() => setAuthOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 13, background: "#E03020", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: FONT.display, boxShadow: "0 6px 18px rgba(224,48,32,0.28)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Créer mon compte — gratuit
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
            <div style={{ fontSize: 14.5, color: SNOW.muted, fontFamily: FONT.body, marginBottom: 16 }}>Tu ne possèdes pas encore cette carte.</div>
            <button onClick={() => setAddOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 22px", borderRadius: 13, background: "#1D1D1F", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: FONT.display, boxShadow: "0 4px 14px rgba(0,0,0,0.16)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Ajouter à ma collection
            </button>
          </div>
        )}
      </div>

      {/* Barre d'action sticky (mobile) */}
      <div className="kc-sticky-cta">
        {!user ? (
          <button onClick={() => setAuthOpen(true)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 13, background: "#E03020", color: "#fff", border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, fontFamily: FONT.display, boxShadow: "0 4px 16px rgba(224,48,32,0.3)" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Créer mon compte — gratuit
          </button>
        ) : (
          <>
            <button onClick={toggleFollow} aria-label={isFollowed ? "Ne plus suivre" : "Suivre cette carte"} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, height: 48, padding: "0 17px", borderRadius: 13, background: isFollowed ? "rgba(224,48,32,0.08)" : SNOW.surface, border: isFollowed ? "1px solid rgba(224,48,32,0.28)" : `1px solid ${SNOW.border}`, color: isFollowed ? "#E03020" : SNOW.ink, fontSize: 14, fontWeight: 700, fontFamily: FONT.display, cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isFollowed ? "#E03020" : "none"} stroke={isFollowed ? "#E03020" : SNOW.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {isFollowed ? "Suivie" : "Suivre"}
            </button>
            {owned.length > 0 ? (
              <Link href="/portfolio" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 13, background: "#1D1D1F", color: "#fff", textDecoration: "none", fontSize: 14.5, fontWeight: 700, fontFamily: FONT.display, boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Gérer ma collection
              </Link>
            ) : (
              <button onClick={() => setAddOpen(true)} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 13, background: "#1D1D1F", color: "#fff", border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, fontFamily: FONT.display, boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Ajouter à ma collection
              </button>
            )}
          </>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signup" />
      <AddToCollectionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        card={{
          name: card.name,
          set_name: card.set_name ?? null,
          set_id: card.set_id ?? null,
          card_number: card.local_id ?? null,
          lang: card.lang,
          rarity: ((card as any).rarity ?? card.rarity_normalized) ?? null,
          card_type: (card as any).card_type ?? null,
          image_url: card.image_url ?? null,
          k_card_id: (card as any).k_card_id ?? null,
        } as AddCardSeed}
        onAdd={addCard}
      />

      <style>{`
        @keyframes kcRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .kc-rise { animation: kcRise .55s cubic-bezier(.16,1,.3,1) both; }
        @keyframes kcTabIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .kc-tab-anim { animation: kcTabIn .28s ${EASE.smoothOut}; }
        .kc-sticky-cta { display: none; }
        .kc-grid { display: grid; grid-template-columns: 300px minmax(0,1fr); grid-template-areas: "media head" "media body"; column-gap: 36px; row-gap: 0; align-items: start; }
        .kc-head { grid-area: head; }
        .kc-media { grid-area: media; position: sticky; top: 72px; align-self: start; }
        .kc-body { grid-area: body; min-width: 0; }
        @media (max-width: 920px) {
          .kc-grid { grid-template-columns: 1fr !important; grid-template-areas: "head" "media" "body" !important; column-gap: 0 !important; row-gap: 16px !important; }
          .kc-media { position: static !important; top: auto !important; max-width: 220px; margin: 4px auto 0; }
          .kc-head-follow { display: none !important; }
          .kc-price { margin-top: 14px !important; padding-top: 16px !important; }
          .kc-card-page { padding-bottom: 104px !important; }
          .nori-fab { bottom: calc(84px + env(safe-area-inset-bottom)) !important; }
          .kc-sticky-cta {
            display: flex;
            position: fixed; left: 0; right: 0; bottom: 0;
            gap: 10px;
            padding: 11px 16px calc(11px + env(safe-area-inset-bottom));
            background: rgba(255,255,255,0.9);
            backdrop-filter: saturate(180%) blur(18px);
            -webkit-backdrop-filter: saturate(180%) blur(18px);
            border-top: 1px solid ${SNOW.border};
            z-index: 900;
          }
        }
        @media (max-width: 480px) {
          .kc-media { max-width: 190px; }
        }
      `}</style>
    </div>
  )
}
