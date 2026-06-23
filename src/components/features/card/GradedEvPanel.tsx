"use client"
// ─────────────────────────────────────────────────────────────────────────────
// GradedEvPanel — "Faut-il la grader ?"
// Affiche le moteur Graded.ev sur la page carte.
//   - Premium  : analyse complète (reco, gain espéré net, distribution PSA réelle,
//                scénarios par note, proba de rentabilité, frais ajustables)
//   - Free/Pro : teaser locké (accroche + nombre d'exemplaires, sans le calcul)
//
// Honnêteté : on ne promet pas le meilleur cas. Le gem rate (% de PSA 10) est mis
// en avant, on décompose le gain PAR NOTE (PSA 9, 8, 7...), on affiche la proba
// que grader soit rentable, et les frais PSA sont AJUSTABLES (jamais assénés comme
// une vérité — Kodo n'est pas responsable des tarifs PSA / envoi / douane).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react"
import { SNOW, FONT } from "@/lib/design/snow"

interface GradeRow {
  grade: number
  count: number
  proba: number
  price: number
  contribution: number
  net?: number
}

interface GradedEvData {
  available: boolean
  locked: boolean
  variety?: string | null
  // premium (locked:false)
  gradingFee?: number
  rawPrice?: number
  gemRate?: number
  probaGain?: number
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
const round2 = (n: number) => Math.round(n * 100) / 100

// Seuils miroir du moteur (lib/graded-ev.ts) : recalcul client quand les frais bougent.
const STRONG_MARGIN_RATIO = 0.25
const MIN_COVERAGE = 0.5
const MIN_GRADES_COVERED = 3

const RECO_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  GRADER: { bg: "rgba(0,163,104,0.10)", fg: "#00A368", label: "À grader" },
  MARGINAL: { bg: "rgba(214,138,0,0.10)", fg: "#C77700", label: "Marginal" },
  NE_PAS: { bg: "rgba(224,48,32,0.08)", fg: "#E03020", label: "À garder en l'état" },
  INSUFFISANT: { bg: SNOW.surfaceSoft, fg: SNOW.muted, label: "Données partielles" },
}

export function GradedEvPanel({ printId, lang }: { printId: string; lang: string }) {
  const [data, setData] = useState<GradedEvData | null>(null)
  const [loading, setLoading] = useState(true)
  // Frais de gradation ajustables par l'utilisateur (defaut = valeur moteur).
  const [fee, setFee] = useState<number>(25)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/graded-ev?print_id=${encodeURIComponent(printId)}&lang=${encodeURIComponent(lang)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        setData(j)
        if (j && typeof j.gradingFee === "number") setFee(j.gradingFee)
        setLoading(false)
      })
      .catch(() => { if (alive) { setData(null); setLoading(false) } })
    return () => { alive = false }
  }, [printId, lang])

  const raw = data?.rawPrice ?? 0
  const evBrute = data?.evBrute ?? 0
  const rows = useMemo(() => (data?.rows ?? []).slice().sort((a, b) => b.grade - a.grade), [data])

  // Recalculs client en fonction des frais (le moteur reste la source du brut/proba/prix).
  const evNette = round2(evBrute - fee - raw)
  const breakeven = round2(evBrute - raw)            // plafond de frais pour rester rentable
  const probaGain = rows.reduce((acc, r) => acc + (r.price - fee - raw > 0 ? r.proba : 0), 0)
  const reco: keyof typeof RECO_STYLE =
    (data?.coverage != null && data.coverage < MIN_COVERAGE) ||
    (data?.gradesCovered ?? 0) < MIN_GRADES_COVERED
      ? "INSUFFISANT"
      : evNette > raw * STRONG_MARGIN_RATIO ? "GRADER" : evNette > 0 ? "MARGINAL" : "NE_PAS"

  if (loading) return null
  if (!data) return null
  if (!data.available) {
    return (
      <div style={{ borderRadius: 18, background: SNOW.surface, border: `1px solid ${SNOW.border}`, padding: "26px 28px" }}>
        {titleBlock}
        <div style={{ fontSize: 15, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 6 }}>
          Faut-il la grader ?
        </div>
        <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.55 }}>
          Données de gradation indisponibles pour cette carte pour l'instant — population PSA ou prix
          gradés insuffisants. Graded.ev préfère ne rien afficher plutôt qu'une estimation peu fiable.
        </div>
      </div>
    )
  }

  const titleBlock = (
    <div style={{ fontSize: 11, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 18 }}>
      Analyse de gradation
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
              Faut-il la grader ?
            </div>
            <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.55, marginBottom: 14 }}>
              Découvre si grader cette carte est rentable : gain espéré net selon la note,
              distribution réelle des notes PSA, probabilité d'être rentable, et recommandation
              grader / garder — calculés sur les probabilités réelles, sans promesse du meilleur cas.
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
  const rs = RECO_STYLE[reco]
  const gem = (data.gemRate ?? 0) * 100
  const isInsuff = reco === "INSUFFISANT"

  const maxProba = Math.max(...rows.map((r) => r.proba), 0.001)

  return (
    <div style={{ borderRadius: 18, background: SNOW.surface, border: `1px solid ${SNOW.border}`, padding: "26px 28px" }}>
      {titleBlock}

      {/* Reco + chiffres cles */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: 11, background: rs.bg, color: rs.fg, fontSize: 14, fontWeight: 800, fontFamily: FONT.display, letterSpacing: ".01em" }}>
          {rs.label}
        </div>
        {!isInsuff ? (
          <>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, lineHeight: 1.1 }}>
                {evNette >= 0 ? "+" : ""}{fmtEur2(evNette)}
              </div>
              <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.body }}>
                gain espéré net · frais {fmtEur(fee)} et prix actuel déduits
              </div>
            </div>
            <div style={{ paddingLeft: 16, borderLeft: `1px solid ${SNOW.borderSoft}` }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, lineHeight: 1.1 }}>
                {(probaGain * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.body }}>
                de chances d'être rentable
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Honnetete : gem rate */}
      {!isInsuff ? (
        <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${SNOW.borderSoft}` }}>
          {gem < 10 ? "Seulement " : ""}<strong style={{ color: SNOW.ink }}>{gem.toFixed(1)}%</strong> des exemplaires obtiennent un <strong style={{ color: SNOW.ink }}>PSA 10</strong>.
          {" "}{data.recoReason}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, marginBottom: 16 }}>
          {data.recoReason}
        </div>
      )}

      {!isInsuff ? (
        <>
          {/* Scenarios par note exacte */}
          <div style={{ fontSize: 10.5, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 12 }}>
            Selon la note obtenue
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "62px 1fr 84px 92px", gap: "4px 12px", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.data, textTransform: "uppercase", letterSpacing: ".04em" }}>Note</div>
            <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.data, textTransform: "uppercase", letterSpacing: ".04em" }}>Probabilité</div>
            <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.data, textTransform: "uppercase", letterSpacing: ".04em", textAlign: "right" }}>Valeur</div>
            <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.data, textTransform: "uppercase", letterSpacing: ".04em", textAlign: "right" }}>Gain net</div>
          </div>
          {rows.map((r) => {
            const net = round2(r.price - fee - raw)
            const pos = net > 0
            return (
              <div key={r.grade} style={{ display: "grid", gridTemplateColumns: "62px 1fr 84px 92px", gap: "0 12px", alignItems: "center", padding: "6px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.data }}>PSA {r.grade}</div>
                <div style={{ position: "relative", height: 20, background: SNOW.surfaceSoft, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, width: `${Math.max((r.proba / maxProba) * 100, 3)}%`, background: pos ? "linear-gradient(90deg,#00A368,#1aa877)" : "linear-gradient(90deg,#c7c7cc,#d8d8dc)", borderRadius: 5 }} />
                  <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, display: "flex", alignItems: "center", fontSize: 11, fontWeight: 700, color: (r.proba / maxProba) > 0.28 ? "#fff" : SNOW.muted, fontFamily: FONT.data }}>
                    {(r.proba * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>{fmtEur(r.price)}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: pos ? "#00A368" : SNOW.red, fontFamily: FONT.data, textAlign: "right" }}>
                  {pos ? "+" : "−"}{fmtEur(Math.abs(net))}
                </div>
              </div>
            )
          })}

          {/* Frais ajustables + breakeven */}
          <div style={{ marginTop: 18, padding: "14px 16px", background: SNOW.surfaceSoft, borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <label style={{ fontSize: 13, color: SNOW.ink, fontFamily: FONT.body, fontWeight: 600 }}>
                Tes frais de gradation
              </label>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number" min={0} step={5} value={fee}
                  onChange={(e) => setFee(Math.max(0, Number(e.target.value) || 0))}
                  style={{ width: 78, padding: "6px 9px", borderRadius: 8, border: `1px solid ${SNOW.border}`, background: "#fff", fontSize: 13.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.data, textAlign: "right" }}
                />
                <span style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.data }}>€</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: SNOW.muted, fontFamily: FONT.body, marginTop: 10, lineHeight: 1.5 }}>
              Grader reste rentable tant que ton coût total reste sous{" "}
              <strong style={{ color: breakeven > 0 ? "#00A368" : SNOW.red }}>{fmtEur2(breakeven)}</strong>
              {" "}(valeur espérée − prix actuel, hors frais).
            </div>
            <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 8, lineHeight: 1.5 }}>
              Frais PSA indicatifs : variables selon le tier, la valeur déclarée et le pays, hors
              envoi et douane. Ajuste selon ta soumission réelle. Kodo n'est pas responsable des
              tarifs PSA.
            </div>
          </div>

          {/* Le calcul */}
          <div style={{ fontSize: 10.5, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", fontFamily: FONT.display, margin: "20px 0 10px" }}>
            Le calcul
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "9px 14px", alignItems: "baseline" }}>
            <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body }}>Valeur espérée <span style={{ color: SNOW.mutedLight, fontSize: 12 }}>(toutes notes pondérées par leur probabilité)</span></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.data, textAlign: "right" }}>{fmtEur2(evBrute)}</div>
            <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body }}>Frais de gradation</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>− {fmtEur2(fee)}</div>
            <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body }}>Valeur actuelle <span style={{ color: SNOW.mutedLight, fontSize: 12 }}>(carte non gradée)</span></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>− {fmtEur2(raw)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "baseline", marginTop: 10, paddingTop: 12, borderTop: `1.5px solid ${SNOW.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>Gain espéré net</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: evNette >= 0 ? "#00A368" : SNOW.red, fontFamily: FONT.data, textAlign: "right" }}>{evNette >= 0 ? "+ " : "− "}{fmtEur2(Math.abs(evNette))}</div>
          </div>
          <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${SNOW.borderSoft}` }}>
            Sur {fmtInt(data.popTotal ?? 0)} exemplaires gradés
            {data.coverage != null ? ` · ${Math.round(data.coverage * 100)}% des notes valorisées` : ""}
            {data.variety ? ` · ${data.variety}` : ""}
          </div>
        </>
      ) : null}
    </div>
  )
}
