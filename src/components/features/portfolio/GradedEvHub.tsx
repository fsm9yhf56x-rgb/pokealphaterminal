"use client"
// ─────────────────────────────────────────────────────────────────────────────
// GradedEvHub — Tableau de bord "Faut-il grader tes cartes ?"
// Analyse toutes les cartes non gradées du portfolio (endpoint batch) et les
// classe par gain espéré net d'une gradation PSA. Premium uniquement.
// Honnêteté : gem rate + % rentable affichés, jamais de promesse du meilleur cas.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, type CSSProperties } from "react"
import { SNOW, FONT } from "@/lib/design/snow"

type Item = {
  id: string; cardId: string; name: string; setName: string; image: string | null
  lang: string; edition: string | null; reco: string; evNette: number
  probaGain: number; gemRate: number; rawPrice: number; popTotal: number
}
type Data = { locked: boolean; plan?: string; count?: number; skipped?: number; items?: Item[] }

const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)

const RECO: Record<string, { bg: string; fg: string; label: string }> = {
  GRADER: { bg: "rgba(0,163,104,0.10)", fg: "#00A368", label: "À grader" },
  MARGINAL: { bg: "rgba(214,138,0,0.10)", fg: "#C77700", label: "Marginal" },
  NE_PAS: { bg: "rgba(224,48,32,0.08)", fg: "#E03020", label: "Garder en l'état" },
}

const wrap: CSSProperties = { padding: "8px 0 48px" }
const card: CSSProperties = { background: SNOW.surface, border: `1px solid ${SNOW.border}`, borderRadius: 18, padding: "22px 26px" }
const rowGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 92px 132px 92px 116px", gap: 14 }

export function GradedEvHub() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch("/api/graded-ev/portfolio")
      .then((r) => r.json())
      .then((j) => { if (alive) { setData(j); setLoading(false) } })
      .catch(() => { if (alive) { setData(null); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const Header = (
    <>
      <h1 style={{ fontSize: 34, fontWeight: 800, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
        Faut-il grader tes cartes ?
      </h1>
      <p style={{ fontSize: 15, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.6, maxWidth: 700, margin: "0 0 28px" }}>
        Graded.ev passe tes cartes non gradées au crible : pour chacune, le gain espéré net d'une
        gradation PSA — distribution réelle des notes, prix par grade, frais déduits, sans promesse
        du meilleur cas. Classées par gain, pour repérer en un regard celles qui valent l'envoi.
      </p>
    </>
  )

  if (loading) {
    return <div style={wrap}>{Header}<div style={{ color: SNOW.mutedLight, fontFamily: FONT.body, fontSize: 14 }}>Analyse de ta collection…</div></div>
  }

  if (!data || data.locked) {
    return (
      <div style={wrap}>
        {Header}
        <div style={card}>
          <div style={{ display: "inline-block", padding: "5px 12px", borderRadius: 20, background: "rgba(0,163,104,0.10)", color: "#00A368", fontSize: 12, fontWeight: 700, fontFamily: FONT.display, marginBottom: 16 }}>
            Réservé au plan Premium
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 8 }}>Le tableau de bord Graded.ev</div>
          <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.55, marginBottom: 18, maxWidth: 560 }}>
            Analyse toutes tes cartes non gradées d'un coup et classe-les par gain espéré net — pour
            repérer en un regard celles qui méritent l'envoi en gradation.
          </div>
          <a href="/abonnement" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 20px", borderRadius: 12, background: "#1D1D1F", color: "#fff", fontSize: 13.5, fontWeight: 700, fontFamily: FONT.display, textDecoration: "none" }}>
            Débloquer Graded.ev avec Premium →
          </a>
        </div>
      </div>
    )
  }

  const items = data.items || []
  const worth = items.filter((i) => i.reco === "GRADER").length

  if (items.length === 0) {
    return (
      <div style={wrap}>
        {Header}
        <div style={card}>
          <div style={{ fontSize: 16, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 6 }}>
            Aucune carte à analyser pour l'instant
          </div>
          <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5 }}>
            Ajoute des cartes non gradées à ton portfolio — Graded.ev calculera le gain espéré d'une
            gradation pour chacune.
            {data.skipped ? ` (${data.skipped} carte${data.skipped > 1 ? "s" : ""} sans données PSA suffisantes pour l'instant.)` : ""}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      {Header}

      <div style={{ display: "flex", gap: 28, marginBottom: 20, flexWrap: "wrap" }}>
        <Stat n={String(items.length)} l="cartes analysées" />
        <Stat n={String(worth)} l="valent l'envoi" accent="#00A368" />
        {data.skipped ? <Stat n={String(data.skipped)} l="sans données" muted /> : null}
      </div>

      <div style={card}>
        <div style={{ ...rowGrid, color: SNOW.mutedLight, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, fontFamily: FONT.data, borderBottom: `1px solid ${SNOW.border}`, paddingBottom: 10 }}>
          <div>Carte</div>
          <div style={{ textAlign: "right" }}>Gem PSA 10</div>
          <div style={{ textAlign: "center" }}>Verdict</div>
          <div style={{ textAlign: "right" }}>% rentable</div>
          <div style={{ textAlign: "right" }}>Gain espéré</div>
        </div>

        {items.map((it) => {
          const rs = RECO[it.reco] || RECO.NE_PAS
          const showEd = it.edition && !/^unlimited$/i.test(String(it.edition))
          return (
            <a key={it.id} href={`/cartes/${it.cardId}`} style={{ ...rowGrid, textDecoration: "none", borderBottom: `1px solid ${SNOW.borderSoft}`, padding: "12px 0", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                {it.image
                  ? <img src={it.image} alt="" style={{ width: 38, height: 53, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                  : <div style={{ width: 38, height: 53, background: SNOW.surfaceSoft, borderRadius: 5, flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                  <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.data, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {it.setName}{showEd ? ` · ${it.edition}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>{(it.gemRate * 100).toFixed(1)}%</div>
              <div style={{ textAlign: "center" }}>
                <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 8, background: rs.bg, color: rs.fg, fontSize: 11.5, fontWeight: 700, fontFamily: FONT.display }}>{rs.label}</span>
              </div>
              <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>{(it.probaGain * 100).toFixed(0)}%</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: it.evNette >= 0 ? "#00A368" : SNOW.red, fontFamily: FONT.data, textAlign: "right" }}>
                {it.evNette >= 0 ? "+" : "−"}{fmtEur(Math.abs(it.evNette))}
              </div>
            </a>
          )
        })}
      </div>

      <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 14, lineHeight: 1.5, maxWidth: 720 }}>
        Gain espéré net après ~{fmtEur(25)} de frais de gradation estimés et le prix actuel. Frais PSA
        variables (tier, valeur déclarée, pays, envoi, douane) — détail et frais ajustables sur chaque
        fiche carte. Kodo n'est pas responsable des tarifs PSA.
      </div>
    </div>
  )
}

function Stat({ n, l, accent, muted }: { n: string; l: string; accent?: string; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent || (muted ? SNOW.mutedLight : SNOW.ink), fontFamily: FONT.display, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 3 }}>{l}</div>
    </div>
  )
}
