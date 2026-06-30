"use client"
// AddToCollectionModal — ajout d'une carte DEJA identifiee au portfolio.
// La carte est connue (on vient de sa fiche) : on ne demande que ce qui depend
// de l'exemplaire (qty, etat, gradation, prix). S'appuie sur addCard de usePortfolio
// (voie d'ecriture unique -> db/query -> pricing immediat).
// "Ajouter et continuer" : garde le modal ouvert pour enchainer plusieurs variantes
// (NM + Damaged + PSA 10 + CCC 9 = 4 lignes distinctes, prix differents).
import { useState } from "react"
import { createPortal } from "react-dom"
import { SNOW, FONT, RADIUS, GLASS, SHADOW, HOVER_LIFT_STYLE, HOVER_TRANSITION } from "@/lib/design/snow"

export interface AddCardSeed {
  name: string
  set_name: string | null
  set_id: string | null
  card_number: string | null
  lang: string
  rarity: string | null
  card_type: string | null
  image_url: string | null
  k_card_id?: string | null
}

// "Raw" retire : ce n'est pas un etat de conservation mais l'antonyme de "gradee"
// (deja porte par le toggle). Les etats vont de Near Mint a Damaged.
const CONDITIONS = ["Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"]
const GRADERS = ["PSA", "CCC", "PCA", "CGC", "BGS", "SGC"]

export function AddToCollectionModal({
  open, onClose, card, onAdd,
}: {
  open: boolean
  onClose: () => void
  card: AddCardSeed | null
  onAdd: (c: Record<string, unknown>) => Promise<unknown>
}) {
  const [qty, setQty] = useState(1)
  const [condition, setCondition] = useState("Near Mint")
  const [graded, setGraded] = useState(false)
  const [gradeCompany, setGradeCompany] = useState("PSA")
  const [gradeValue, setGradeValue] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [buyDate, setBuyDate] = useState("")
  const [showOptional, setShowOptional] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addedCount, setAddedCount] = useState(0)   // compteur "N ajoutee(s)"
  const [justAdded, setJustAdded] = useState(false) // flash de confirmation
  const [err, setErr] = useState<string | null>(null)

  if (!open || !card) return null

  const resetFields = () => {
    setQty(1); setCondition("Near Mint"); setGraded(false); setGradeCompany("PSA")
    setGradeValue(""); setBuyPrice(""); setBuyDate(""); setShowOptional(false)
  }
  const resetAll = () => { resetFields(); setSubmitting(false); setAddedCount(0); setJustAdded(false); setErr(null) }
  const close = () => { resetAll(); onClose() }

  // keepOpen=true -> "Ajouter et continuer" (modal reste, champs reset, compteur++)
  const submit = async (keepOpen: boolean) => {
    if (submitting) return
    setSubmitting(true); setErr(null)
    const payload: Record<string, unknown> = {
      name: card.name,
      set_name: card.set_name,
      set_id: card.set_id,
      card_number: card.card_number,
      lang: card.lang,
      rarity: card.rarity,
      card_type: card.card_type,
      image_url: card.image_url,
      k_card_id: card.k_card_id ?? null,
      qty,
      condition: graded ? "Graded" : condition,
      graded,
      grade_company: graded ? gradeCompany : null,
      grade_value: graded && gradeValue ? gradeValue : null,
      buy_price: buyPrice ? parseFloat(buyPrice) : null,
      buy_date: buyDate || null,
    }
    try {
      const res = await onAdd(payload)
      if (res == null) {
        setErr("L'ajout a echoue. Verifie que tu es connecte et sous le plafond de cartes.")
        setSubmitting(false)
        return
      }
      setAddedCount((n) => n + 1)
      setSubmitting(false)
      if (keepOpen) {
        resetFields()
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 1400)
      } else {
        close()
      }
    } catch {
      setErr("Une erreur est survenue pendant l'ajout.")
      setSubmitting(false)
    }
  }

  // ── Pill d'etat (glass, hover lift) ──
  const Pill = ({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 13px", borderRadius: RADIUS.md,
        ...(active ? { background: SNOW.ink, color: "#fff", border: "0.5px solid rgba(0,0,0,0.2)" } : { ...GLASS.button, color: SNOW.muted }),
        fontSize: 12.5, fontWeight: 600, fontFamily: FONT.display,
        cursor: disabled ? "default" : "pointer",
        transition: HOVER_TRANSITION,
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled && !active) { e.currentTarget.style.transform = HOVER_LIFT_STYLE.transform; e.currentTarget.style.boxShadow = HOVER_LIFT_STYLE.boxShadow } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = active ? "none" : (GLASS.button.boxShadow as string) }}
    >{children}</button>
  )

  const labelStyle = { fontSize: 11, color: SNOW.muted, fontWeight: 600 as const, letterSpacing: ".05em", textTransform: "uppercase" as const, fontFamily: FONT.display, marginBottom: 9 }
  const inputStyle = { width: "100%", padding: "10px 11px", borderRadius: RADIUS.md, ...GLASS.button, color: SNOW.ink, fontSize: 13, fontFamily: FONT.body, boxSizing: "border-box" as const, outline: "none" }

  const overlay = (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,20,22,0.42)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "kcFadeIn .25s ease both" }}>
      <div className="kc-modal-rise" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 446, ...GLASS.cardElevated, borderRadius: RADIUS.xl, padding: "clamp(20px,4vw,28px)", maxHeight: "90vh", overflowY: "auto" }}>
        {/* En-tete : carte identifiee */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22 }}>
          {card.image_url ? <img src={card.image_url} alt={card.name} style={{ width: 46, height: 64, objectFit: "contain", borderRadius: 7, boxShadow: SHADOW.card }} /> : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{card.name}</div>
            <div style={{ fontSize: 12, color: SNOW.muted, fontFamily: FONT.body, marginTop: 2 }}>{card.set_name}{card.card_number ? ` · #${card.card_number}` : ""}</div>
          </div>
        </div>

        {/* Quantite */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Quantite</div>
          <div style={{ display: "flex", alignItems: "center", ...GLASS.button, borderRadius: RADIUS.md, overflow: "hidden", width: 142 }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 44, height: 40, border: "none", borderRight: "0.5px solid rgba(0,0,0,0.08)", background: "transparent", color: qty > 1 ? SNOW.ink : SNOW.mutedExtraLight, fontSize: 18, cursor: qty > 1 ? "pointer" : "default", transition: "background .15s" }}
              onMouseEnter={(e) => { if (qty > 1) e.currentTarget.style.background = "rgba(0,0,0,0.04)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}>−</button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.data }}>{qty}</div>
            <button onClick={() => setQty((q) => Math.min(99, q + 1))} style={{ width: 44, height: 40, border: "none", borderLeft: "0.5px solid rgba(0,0,0,0.08)", background: "transparent", color: SNOW.ink, fontSize: 18, cursor: "pointer", transition: "background .15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.04)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}>+</button>
          </div>
        </div>

        {/* Etat (desactive si gradee) */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Etat</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {CONDITIONS.map((c) => (
              <Pill key={c} active={!graded && condition === c} disabled={graded} onClick={() => setCondition(c)}>{c}</Pill>
            ))}
          </div>
        </div>

        {/* Gradee ? */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
            <input type="checkbox" checked={graded} onChange={(e) => setGraded(e.target.checked)} style={{ width: 16, height: 16, accentColor: SNOW.red }} />
            <span style={{ fontSize: 13.5, color: SNOW.ink, fontFamily: FONT.body, fontWeight: 600 }}>Carte gradee</span>
          </label>
          {graded ? (
            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              <select value={gradeCompany} onChange={(e) => setGradeCompany(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: "pointer" }}>
                {GRADERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} placeholder="Note (ex 10)" style={{ ...inputStyle, width: 120 }} />
            </div>
          ) : null}
        </div>

        {/* Optionnel : prix d'achat */}
        <button onClick={() => setShowOptional((v) => !v)} style={{ background: "none", border: "none", color: SNOW.muted, fontSize: 12.5, fontFamily: FONT.body, cursor: "pointer", padding: 0, marginBottom: showOptional ? 12 : 4 }}>
          {showOptional ? "− " : "+ "}Prix d'achat (pour le ROI)
        </button>
        {showOptional ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.display, marginBottom: 5 }}>Prix paye (€)</div>
              <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" style={{ ...inputStyle, fontFamily: FONT.data }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.display, marginBottom: 5 }}>Date</div>
              <input type="date" value={buyDate} onChange={(e) => setBuyDate(e.target.value)} style={{ ...inputStyle, fontFamily: FONT.data }} />
            </div>
          </div>
        ) : null}

        {/* Compteur "N ajoutee(s)" + flash */}
        {addedCount > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, fontSize: 12.5, fontFamily: FONT.display, fontWeight: 600, color: "#1D9E75", opacity: justAdded ? 1 : 0.75, transition: "opacity .3s" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            {addedCount} exemplaire{addedCount > 1 ? "s" : ""} ajoute{addedCount > 1 ? "s" : ""} a ta collection
          </div>
        ) : null}

        {err ? <div style={{ fontSize: 12.5, color: SNOW.red, fontFamily: FONT.body, marginBottom: 12, padding: "9px 12px", background: SNOW.redLight, borderRadius: RADIUS.md }}>{err}</div> : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={close} style={{ flex: "0 0 auto", padding: "13px 18px", borderRadius: RADIUS.md, ...GLASS.button, color: SNOW.muted, fontSize: 14, fontWeight: 600, fontFamily: FONT.display, cursor: "pointer", transition: HOVER_TRANSITION }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = HOVER_LIFT_STYLE.transform; e.currentTarget.style.boxShadow = HOVER_LIFT_STYLE.boxShadow }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = GLASS.button.boxShadow as string }}>
            {addedCount > 0 ? "Terminer" : "Annuler"}
          </button>
          <button onClick={() => submit(true)} disabled={submitting} style={{ flex: "0 0 auto", padding: "13px 16px", borderRadius: RADIUS.md, ...GLASS.button, color: SNOW.ink, fontSize: 13.5, fontWeight: 700, fontFamily: FONT.display, cursor: submitting ? "default" : "pointer", transition: HOVER_TRANSITION, opacity: submitting ? 0.5 : 1 }}
            onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.transform = HOVER_LIFT_STYLE.transform; e.currentTarget.style.boxShadow = HOVER_LIFT_STYLE.boxShadow } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = GLASS.button.boxShadow as string }}>
            + Encore une
          </button>
          <button onClick={() => submit(false)} disabled={submitting} style={{ flex: 1, padding: "13px 18px", borderRadius: RADIUS.md, border: "none", background: submitting ? "rgba(0,0,0,0.4)" : SNOW.ink, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: FONT.display, cursor: submitting ? "default" : "pointer", boxShadow: SHADOW.lift, transition: HOVER_TRANSITION }}
            onMouseEnter={(e) => { if (!submitting) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "#000" } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.background = submitting ? "rgba(0,0,0,0.4)" : SNOW.ink }}>
            {submitting ? "Ajout…" : addedCount > 0 ? "Ajouter & fermer" : `Ajouter${qty > 1 ? ` ×${qty}` : ""}`}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes kcFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes kcModalRise { from { opacity: 0; transform: translateY(16px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .kc-modal-rise { animation: kcModalRise .42s cubic-bezier(.16,1,.3,1) both; }
      `}</style>
    </div>
  )

  return createPortal(overlay, document.body)
}
