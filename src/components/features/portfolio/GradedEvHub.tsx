"use client"
// ─────────────────────────────────────────────────────────────────────────────
// GradedEvHub — Tableau de bord "Faut-il grader tes cartes ?"
// Analyse les cartes non gradées du portfolio (endpoint batch), classées par gain
// espéré net. Premium uniquement.
// Polish : gain mis en avant (hero cumulé + colonne proéminente), filtres
// (verdict / set) + tri, animations d'apparition, transparence (taille d'échantillon).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { SNOW, FONT } from "@/lib/design/snow"
import { UpgradeModal } from "@/components/upgrade/UpgradeModal"

type Item = {
  id: string; cardId: string; name: string; setName: string; image: string | null
  lang: string; edition: string | null; reco: string; evNette: number
  probaGain: number; gemRate: number; rawPrice: number; popTotal: number
}
type Data = { locked: boolean; plan?: string; count?: number; skipped?: number; items?: Item[] }

const fmtEur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
const fmtInt = (n: number) => new Intl.NumberFormat("fr-FR").format(n)

const GREEN = "#00A368"
const RECO: Record<string, { bg: string; fg: string; label: string; accent: string }> = {
  GRADER: { bg: "rgba(0,163,104,0.10)", fg: GREEN, label: "À grader", accent: GREEN },
  MARGINAL: { bg: "rgba(214,138,0,0.10)", fg: "#C77700", label: "Marginal", accent: "#E0A030" },
  NE_PAS: { bg: "rgba(224,48,32,0.07)", fg: "#E03020", label: "Garder en l'état", accent: "#E0683C" },
}

const wrap: CSSProperties = { padding: "8px 0 56px" }
const card: CSSProperties = { background: SNOW.surface, border: `1px solid ${SNOW.border}`, borderRadius: 18, padding: "10px 22px 14px" }
const COLS = "1fr 104px 132px 88px 126px"

type SortKey = "gain" | "proba" | "gem" | "value"

export function GradedEvHub() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [verdict, setVerdict] = useState<"all" | "GRADER" | "MARGINAL" | "NE_PAS">("all")
  const [setFilter, setSetFilter] = useState("all")
  const [sortBy, setSortBy] = useState<SortKey>("gain")
  const [showSkip, setShowSkip] = useState(false)
  const [gradedUpsellOpen, setGradedUpsellOpen] = useState(true)

  useEffect(() => {
    let alive = true
    fetch("/api/graded-ev/portfolio")
      .then((r) => r.json())
      .then((j) => { if (alive) { setData(j); setLoading(false) } })
      .catch(() => { if (alive) { setData(null); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const allItems = data?.items || []
  const sets = useMemo(
    () => Array.from(new Set(allItems.map((i) => i.setName).filter(Boolean))).sort(),
    [allItems],
  )

  const view = useMemo(() => {
    let list = allItems
    if (verdict !== "all") list = list.filter((i) => i.reco === verdict)
    if (setFilter !== "all") list = list.filter((i) => i.setName === setFilter)
    const key = (i: Item) =>
      sortBy === "gain" ? i.evNette : sortBy === "proba" ? i.probaGain : sortBy === "gem" ? i.gemRate : i.rawPrice
    return [...list].sort((a, b) => key(b) - key(a))
  }, [allItems, verdict, setFilter, sortBy])

  const Header = (
    <>
      <h1 style={{ fontSize: 34, fontWeight: 800, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
        Faut-il grader tes cartes ?
      </h1>
      <p style={{ fontSize: 15, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.6, maxWidth: 700, margin: "0 0 26px" }}>
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
        <div style={{ position: "relative", minHeight: 360, borderRadius: 16, overflow: "hidden" }}>
          {/* Fond fantôme flouté (placeholders, aucun chiffre) — pas de panneau ici */}
          <div aria-hidden style={{ maxHeight: 320, overflow: "hidden", filter: "blur(6px)", opacity: 0.5, pointerEvents: "none", userSelect: "none", WebkitMaskImage: "linear-gradient(180deg, #000 52%, transparent 100%)", maskImage: "linear-gradient(180deg, #000 52%, transparent 100%)" }}>
            <GhostHub />
          </div>
          {/* Quand la modale est fermée : une seule porte de ré-ouverture */}
          {!gradedUpsellOpen && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <button onClick={() => setGradedUpsellOpen(true)} style={{ border: "none", cursor: "pointer", padding: "13px 24px", borderRadius: 999, background: "#6E56CF", color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: FONT.display, boxShadow: "0 8px 22px rgba(110,86,207,0.45), inset 0 1px 0 rgba(255,255,255,0.22)" }}>
                Débloquer Graded.ev avec Premium →
              </button>
            </div>
          )}
        </div>
        <UpgradeModal
          open={gradedUpsellOpen}
          onClose={() => setGradedUpsellOpen(false)}
          tier="premium"
          feature={{
            title: "Faut-il grader tes cartes ?",
            subtitle: "L\u2019EV nette réelle, carte par carte, frais inclus — pour ne grader que ce qui rapporte.",
          }}
        />
      </div>
    )
  }

  const worthItems = allItems.filter((i) => i.reco === "GRADER")
  const totalUpside = worthItems.reduce((s, i) => s + Math.max(0, i.evNette), 0)

  if (allItems.length === 0) {
    return (
      <div style={wrap}>
        {Header}
        <div style={{ ...card, padding: "26px 28px" }}>
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
      <style>{`
        @keyframes gevUp { from { opacity: 0; transform: translateY(9px) } to { opacity: 1; transform: none } }
        @keyframes gevPop { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: none } }
        .gev-row { animation: gevUp .38s cubic-bezier(.22,.61,.36,1) both; transition: background .15s ease; border-radius: 10px; }
        .gev-row:hover { background: rgba(0,0,0,.025); }
        .gev-hero { animation: gevPop .45s cubic-bezier(.22,.61,.36,1) both; }
        .gev-seg { transition: all .15s ease; }
        .gev-chip { transition: transform .15s ease; }
        .gev-row:hover .gev-chip { transform: translateX(2px); }
      `}</style>

      {Header}

      {/* Hero : gain en avant */}
      <div className="gev-hero" style={{ display: "flex", alignItems: "stretch", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", background: "linear-gradient(135deg, rgba(0,163,104,0.08), rgba(0,163,104,0.02))", border: `1px solid rgba(0,163,104,0.18)`, borderRadius: 16, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", fontFamily: FONT.display, marginBottom: 6 }}>
            Gain espéré cumulé
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: GREEN, fontFamily: FONT.display, lineHeight: 1, letterSpacing: "-0.01em" }}>
            +{fmtEur(totalUpside)}
          </div>
          <div style={{ fontSize: 12, color: SNOW.muted, fontFamily: FONT.body, marginTop: 8 }}>
            en gradant les <strong style={{ color: SNOW.ink }}>{worthItems.length}</strong> cartes recommandées (espérance, frais déduits)
          </div>
        </div>
        <div style={{ display: "flex", gap: 26, alignItems: "center", padding: "0 8px" }}>
          <Stat n={String(allItems.length)} l="analysées" />
          <Stat n={String(worthItems.length)} l="valent l'envoi" accent={GREEN} />
          {data.skipped ? <Stat n={String(data.skipped)} l="sans données" muted onClick={() => setShowSkip(true)} /> : null}
        </div>
      </div>

      {/* Disclaimer hero : l'espérance n'est pas un gain garanti */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: SNOW.surfaceSoft, border: `1px solid ${SNOW.borderSoft}`, borderRadius: 12, padding: "11px 14px", marginBottom: 22 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div style={{ fontSize: 12, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5 }}>
          <strong style={{ color: SNOW.ink }}>Espérance statistique, pas un gain garanti.</strong>{" "}
          Ce cumul suppose de grader les {worthItems.length} cartes et que chacune atteigne son espérance — il faut compter autant de frais et d'envois, et chaque carte porte son propre risque (colonne <strong style={{ color: SNOW.ink }}>% rentable</strong>). Un gain par carte ne se réalise jamais en une fois.
        </div>
      </div>

      {/* Toolbar : filtres + tri */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", background: SNOW.surfaceSoft, borderRadius: 10, padding: 3, gap: 2 }}>
          {([["all", "Tout"], ["GRADER", "À grader"], ["MARGINAL", "Marginal"], ["NE_PAS", "Garder"]] as const).map(([v, lbl]) => (
            <button key={v} onClick={() => setVerdict(v)} className="gev-seg"
              style={{ border: "none", cursor: "pointer", padding: "6px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: FONT.display,
                background: verdict === v ? "#fff" : "transparent",
                color: verdict === v ? SNOW.ink : SNOW.mutedLight,
                boxShadow: verdict === v ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <select value={setFilter} onChange={(e) => setSetFilter(e.target.value)} style={selectStyle}>
          <option value="all">Tous les sets</option>
          {sets.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} style={selectStyle}>
          <option value="gain">Trier : gain espéré</option>
          <option value="proba">Trier : % rentable</option>
          <option value="gem">Trier : gem rate</option>
          <option value="value">Trier : valeur carte</option>
        </select>
      </div>

      {/* Tableau */}
      <div style={card}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 14, color: SNOW.mutedLight, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, fontFamily: FONT.data, padding: "8px 12px", borderBottom: `1px solid ${SNOW.border}` }}>
          <div>Carte</div>
          <div style={{ textAlign: "right" }}>Gem PSA 10</div>
          <div style={{ textAlign: "center" }}>Verdict</div>
          <div style={{ textAlign: "right" }}>% rentable</div>
          <div style={{ textAlign: "right" }}>Gain espéré</div>
        </div>

        {view.length === 0 ? (
          <div style={{ padding: "28px 12px", fontSize: 14, color: SNOW.muted, fontFamily: FONT.body }}>
            Aucune carte pour ce filtre.
          </div>
        ) : (
          <div key={`${verdict}-${setFilter}-${sortBy}`}>
            {view.map((it, idx) => {
              const rs = RECO[it.reco] || RECO.NE_PAS
              const showEd = it.edition && !/^unlimited$/i.test(String(it.edition))
              return (
                <a key={it.id} href={`/cartes/${it.cardId}`} className="gev-row"
                  style={{ display: "grid", gridTemplateColumns: COLS, gap: 14, textDecoration: "none", padding: "11px 12px", alignItems: "center", borderLeft: `3px solid ${rs.accent}`, animationDelay: `${Math.min(idx * 28, 520)}ms` }}>
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
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.data }}>{(it.gemRate * 100).toFixed(1)}%</div>
                    <div style={{ fontSize: 10.5, color: SNOW.mutedLight, fontFamily: FONT.data, marginTop: 1 }}>{fmtInt(it.popTotal)} gradées</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span className="gev-chip" style={{ display: "inline-block", padding: "4px 11px", borderRadius: 8, background: rs.bg, color: rs.fg, fontSize: 11.5, fontWeight: 700, fontFamily: FONT.display }}>{rs.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.data, textAlign: "right" }}>{(it.probaGain * 100).toFixed(0)}%</div>
                  <div style={{ fontSize: 16.5, fontWeight: 800, color: it.evNette >= 0 ? GREEN : SNOW.red, fontFamily: FONT.display, textAlign: "right", letterSpacing: "-0.01em" }}>
                    {it.evNette >= 0 ? "+" : "−"}{fmtEur(Math.abs(it.evNette))}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 14, lineHeight: 1.5, maxWidth: 760 }}>
        Gain espéré net après ~{fmtEur(25)} de frais de gradation estimés et le prix actuel de la carte.
        « N gradées » = nombre d'exemplaires PSA recensés (base de l'estimation). Frais PSA variables
        (tier, valeur déclarée, pays, envoi, douane) — détail et frais ajustables sur chaque fiche carte.
        Kodo n'est pas responsable des tarifs PSA.
      </div>

      {showSkip ? (
        <div onClick={() => setShowSkip(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: "28px 30px", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 12 }}>
              {fmtInt(data.skipped || 0)} cartes sans analyse
            </div>
            <div style={{ fontSize: 13.5, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.6, marginBottom: 16 }}>
              Graded.ev <strong style={{ color: SNOW.ink }}>préfère ne rien afficher plutôt qu'un chiffre faux</strong>. Une carte est écartée quand il manque une donnée fiable pour calculer son espérance :
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Cartes japonaises", "la population PSA occidentale n'existe pas pour la plupart des cartes JP."],
                ["Cartes françaises peu gradées", "trop peu d'exemplaires PSA recensés pour une distribution fiable."],
                ["Prix gradés manquants", "pas assez de ventes réelles par note (on exige ≥ 2 ventes)."],
                ["Pas de prix de référence", "la valeur de la carte non gradée n'est pas disponible."],
              ].map(([t, d]) => (
                <li key={t} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ width: 5, height: 5, borderRadius: 5, background: SNOW.mutedLight, marginTop: 7, flexShrink: 0 }} />
                  <div style={{ fontSize: 12.5, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5 }}>
                    <strong style={{ color: SNOW.ink }}>{t}</strong> — {d}
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: SNOW.mutedLight, fontFamily: FONT.body, lineHeight: 1.5, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${SNOW.borderSoft}` }}>
              Ces cartes réapparaîtront automatiquement dès que les données suffisantes seront disponibles.
            </div>
            <button onClick={() => setShowSkip(false)} style={{ marginTop: 18, padding: "9px 18px", borderRadius: 10, border: "none", background: "#1D1D1F", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT.display, cursor: "pointer" }}>
              Compris
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const selectStyle: CSSProperties = {
  appearance: "none", WebkitAppearance: "none", padding: "8px 30px 8px 12px", borderRadius: 9,
  border: `1px solid ${SNOW.border}`, background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2386868B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 11px center`,
  fontSize: 12.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, cursor: "pointer",
}

function Stat({ n, l, accent, muted, onClick }: { n: string; l: string; accent?: string; muted?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent || (muted ? SNOW.mutedLight : SNOW.ink), fontFamily: FONT.display, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11.5, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 3, textDecoration: onClick ? "underline dotted" : "none", textUnderlineOffset: 3 }}>{l}{onClick ? " ⓘ" : ""}</div>
    </div>
  )
}

/* Silhouette fantôme (placeholders gris, AUCUN chiffre) — sert de fond flouté
   sous le panneau Premium quand l'utilisateur n'a pas accès au tableau. */
function GhostHub() {
  const bar = (w: string, h = 12) => <div style={{ width: w, height: h, borderRadius: 6, background: SNOW.surfaceSoft }} />
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ height: 96, borderRadius: 16, background: "linear-gradient(135deg, rgba(0,163,104,0.08), rgba(0,163,104,0.02))", border: `1px solid rgba(0,163,104,0.18)` }} />
      <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 53, borderRadius: 5, background: SNOW.surfaceSoft, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
              {bar("58%")}
              {bar("36%", 10)}
            </div>
            <div style={{ width: 64, height: 22, borderRadius: 7, background: SNOW.surfaceSoft, flexShrink: 0 }} />
            <div style={{ width: 78, height: 22, borderRadius: 7, background: SNOW.surfaceSoft, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
