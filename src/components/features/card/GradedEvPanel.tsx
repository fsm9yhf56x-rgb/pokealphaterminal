"use client"
// ─────────────────────────────────────────────────────────────────────────────
// GradedEvPanel — "Faut-il la grader ?"
// Affiche le moteur Graded.ev sur la page carte.
//   - Premium  : analyse complète (reco, gain espéré net, distribution PSA réelle)
//   - Free/Pro : teaser locké (accroche + nombre d'exemplaires, sans le calcul)
//
// L'honnêteté est mise en avant : le gem rate (% de PSA 10) est proéminent,
// car c'est ce qui distingue une espérance réelle d'une fausse promesse.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react"
import { SNOW, FONT } from "@/lib/design/snow"

interface GradeRow {
  grade: number
  count: number
  proba: number
  price: number
  contribution: number
}

interface GradedEvData {
  available: boolean
  locked: boolean
  variety?: string | null
  // premium (locked:false)
  gradingFee?: number
  rawPrice?: number
  gemRate?: number
  coverage?: number
  gradesCovered?: number
  gradesWithPop?: number
  evBrute?: number
  evNette?: number
  reco?: "GRADER" | "MARGINAL" | "NE_PAS" | "INSUFFISANT"
  recoReason?: string
  rows?: GradeRow[]
  popTotal?: number
  // teaser (locked:true)
  gradesWithData?: number
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
const fmtEur2 = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n)
const fmtInt = (n: number) => new Intl.NumberFormat("fr-FR").format(n)

const RECO_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  GRADER: { bg: "rgba(0,163,104,0.10)", fg: "#00A368", label: "À grader" },
  MARGINAL: { bg: "rgba(214,138,0,0.10)", fg: "#C77700", label: "Marginal" },
  NE_PAS: { bg: "rgba(224,48,32,0.08)", fg: "#E03020", label: "À garder en l'état" },
  INSUFFISANT: { bg: SNOW.surfaceSoft, fg: SNOW.muted, label: "Données partielles" },
}

export function GradedEvPanel({ printId, lang }: { printId: string; lang: string }) {
  const [data, setData] = useState<GradedEvData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/graded-ev?print_id=${encodeURIComponent(printId)}&lang=${encodeURIComponent(lang)}`)
      .then((r) => r.json())
      .then((j) => { if (alive) { setData(j); setLoading(false) } })
      .catch(() => { if (alive) { setData(null); setLoading(false) } })
    return () => { alive = false }
  }, [printId, lang])

  // Rien à afficher si pas de données gradées du tout.
  if (loading) return null
  if (!data || !data.available) return null

  const titleBlock = (
    <div style={{ fontSize: 11, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 18 }}>
      Faut-il la grader ?
    </div>
  )

  // ── TEASER (free / pro) ──────────────────────────────────────────────────────
  if (data.locked) {
    const pop = data.popTotal ?? 0
    return (
      <div style={{ borderRadius: 18, background: SNOW.surface, border: `1px solid ${SNOW.border}`, padding: "26px 28px" }}>
        {titleBlock}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 8 }}>
              Analyse Graded.ev
            </div>
            <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.55, marginBottom: 14 }}>
              Découvre si grader cette carte est rentable : gain réellement espéré après frais,
              distribution des notes PSA, et recommandation grader / garder — calculés sur les
              probabilités réelles, sans promesse du meilleur cas.
            </div>
            {pop > 0 ? (
              <div style={{ fontSize: 12.5, color: SNOW.mutedLight, fontFamily: FONT.data }}>
                Basé sur {fmtInt(pop)} exemplaires PSA recensés
              </div>
            ) : null}
          </div>
          <a href="/abonnement" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 20px", borderRadius: 12, background: "#1D1D1F", color: "#fff", fontSize: 13.5, fontWeight: 700, fontFamily: FONT.display, textDecoration: "none", whiteSpace: "nowrap" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Débloquer avec Premium
          </a>
        </div>
      </div>
    )
  }

  // ── COMPLET (premium) ────────────────────────────────────────────────────────
  const reco = data.reco ?? "INSUFFISANT"
  const rs = RECO_STYLE[reco]
  const evNette = data.evNette ?? 0
  const gem = (data.gemRate ?? 0) * 100
  const rows = data.rows ?? []

  // Regrouper les notes <= 5 en une seule ligne lisible (peu de valeur unitaire).
  const high = rows.filter((r) => r.grade >= 6).sort((a, b) => b.grade - a.grade)
  const low = rows.filter((r) => r.grade <= 5)
  const lowProba = low.reduce((s, r) => s + r.proba, 0)
  const lowAvgPrice = low.length ? low.reduce((s, r) => s + r.proba * r.price, 0) / (lowProba || 1) : 0
  const maxProba = Math.max(...high.map((r) => r.proba), lowProba, 0.001)

  const Bar = ({ proba, label, price }: { proba: number; label: string; price: number }) => (
    <div style={{ display: "grid", gridTemplateColumns: "58px 1fr 78px", gap: 12, alignItems: "center", padding: "7px 0" }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.data }}>{label}</div>
      <div style={{ position: "relative", height: 22, background: SNOW.surfaceSoft, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, width: `${Math.max((proba / maxProba) * 100, 3)}%`, background: "linear-gradient(90deg, #1D1D1F, #3a3a3c)", borderRadius: 6 }} />
        <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: proba / maxProba > 0.25 ? "#fff" : SNOW.muted, fontFamily: FONT.data }}>
          {(proba * 100).toFixed(1)}%
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>{price > 0 ? fmtEur(price) : "—"}</div>
    </div>
  )

  return (
    <div style={{ borderRadius: 18, background: SNOW.surface, border: `1px solid ${SNOW.border}`, padding: "26px 28px" }}>
      {titleBlock}

      {/* Reco + gain espéré */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: 11, background: rs.bg, color: rs.fg, fontSize: 14, fontWeight: 800, fontFamily: FONT.display, letterSpacing: ".01em" }}>
          {rs.label}
        </div>
        {reco !== "INSUFFISANT" ? (
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, lineHeight: 1.1 }}>
              {evNette >= 0 ? "+" : ""}{fmtEur2(evNette)}
            </div>
            <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.body }}>
              gain espéré net{data.gradingFee != null ? ` · après ${fmtEur(data.gradingFee)} de frais PSA et le prix actuel` : ""}
            </div>
          </div>
        ) : null}
      </div>

      {/* Honnêteté : gem rate en avant */}
      {data.gemRate != null && reco !== "INSUFFISANT" ? (
        <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, marginBottom: 20, paddingBottom: 18, borderBottom: `1px solid ${SNOW.borderSoft}` }}>
          {gem < 10 ? "Seulement " : ""}<strong style={{ color: SNOW.ink }}>{gem.toFixed(1)}%</strong> des exemplaires obtiennent un <strong style={{ color: SNOW.ink }}>PSA 10</strong>.
          {" "}{data.recoReason}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, marginBottom: 16 }}>
          {data.recoReason}
        </div>
      )}

      {/* Le calcul transparent (distribution detaillee dans POPULATION GRADEE) */}
      {reco !== "INSUFFISANT" && data.evBrute != null ? (
        <>
          <div style={{ fontSize: 10.5, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 10 }}>
            Le calcul
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "9px 14px", alignItems: "baseline" }}>
            <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body }}>Valeur espérée <span style={{ color: SNOW.mutedLight, fontSize: 12 }}>(toutes notes pondérées par leur probabilité)</span></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.data, textAlign: "right" }}>{fmtEur2(data.evBrute)}</div>
            <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body }}>Frais de gradation PSA</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>− {fmtEur2(data.gradingFee ?? 0)}</div>
            <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body }}>Valeur actuelle <span style={{ color: SNOW.mutedLight, fontSize: 12 }}>(carte non gradée)</span></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>− {fmtEur2(data.rawPrice ?? 0)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "baseline", marginTop: 10, paddingTop: 12, borderTop: `1.5px solid ${SNOW.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>Gain espéré net</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: (data.evNette ?? 0) >= 0 ? "#00A368" : SNOW.red, fontFamily: FONT.data, textAlign: "right" }}>{(data.evNette ?? 0) >= 0 ? "+ " : "− "}{fmtEur2(Math.abs(data.evNette ?? 0))}</div>
          </div>
          <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${SNOW.borderSoft}` }}>
            Sur {fmtInt(data.popTotal ?? 0)} exemplaires gradés
            {data.coverage != null ? ` · ${Math.round(data.coverage * 100)}% des notes valorisées` : ""}
            {data.variety ? ` · ${data.variety}` : ""}
            {" · distribution détaillée ci-dessus dans Population gradée"}
          </div>
        </>
      ) : null}
    </div>
  )
}
