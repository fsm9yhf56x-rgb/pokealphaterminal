"use client"
// AddSealedModal — ajout d'un produit scelle au portfolio.
// Un scelle n'a pas d'etat de conservation (Near Mint...) ni de gradation carte :
// on ne demande que quantite + prix d'achat optionnel. condition figee a "Sealed".
// "Ajouter et continuer" : garde le modal ouvert pour enchainer plusieurs boites.
import { useState } from "react"
import { createPortal } from "react-dom"
import { SNOW, FONT, RADIUS, GLASS, SHADOW } from "@/lib/design/snow"

export interface SealedSeed {
  name: string
  set_name: string | null
  set_id: string | null
  card_type: string | null   // SKU, pas le libelle
  lang: string               // langue DU PRODUIT (cle de valorisation)
  current_price?: number | null  // cote connue a l'instant du choix
  year: number
  image_url: string | null
}

export function AddSealedModal({
  open, onClose, product, onAdd,
}: {
  open: boolean
  onClose: () => void
  product: SealedSeed | null
  onAdd: (c: Record<string, unknown>) => Promise<unknown>
}) {
  const [qty, setQty] = useState(1)
  const [buyPrice, setBuyPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [justAdded, setJustAdded] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!open || !product) return null

  const resetFields = () => { setQty(1); setBuyPrice("") }
  const resetAll = () => { resetFields(); setSubmitting(false); setAddedCount(0); setJustAdded(false); setErr(null) }
  const close = () => { resetAll(); onClose() }

  const submit = async (keepOpen: boolean) => {
    if (submitting) return
    setSubmitting(true); setErr(null)
    const payload: Record<string, unknown> = {
      name: product.name,
      set_name: product.set_name,
      set_id: product.set_id,
      card_type: product.card_type,
      lang: product.lang,
      current_price: product.current_price ?? null,
      year: product.year,
      image_url: product.image_url,
      qty,
      condition: "Sealed",
      buy_price: buyPrice ? parseFloat(buyPrice.replace(",", ".")) : null,
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

  const labelStyle = { fontSize: 11, color: SNOW.muted, fontWeight: 600 as const, letterSpacing: ".05em", textTransform: "uppercase" as const, fontFamily: FONT.display, marginBottom: 9 }
  const inputStyle = { width: "100%", padding: "10px 11px", borderRadius: RADIUS.md, ...GLASS.button, color: SNOW.ink, fontSize: 13, fontFamily: FONT.body, boxSizing: "border-box" as const, outline: "none" }

  const overlay = (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,20,22,0.42)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "kcFadeIn .25s ease both" }}>
      <div className="kc-modal-rise" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, ...GLASS.cardElevated, borderRadius: RADIUS.xl, padding: "clamp(20px,4vw,28px)", maxHeight: "90vh", overflowY: "auto" }}>
        {/* En-tete : produit identifie */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22 }}>
          {product.image_url ? <img src={product.image_url} alt={product.name} style={{ width: 46, height: 64, objectFit: "contain", borderRadius: 7, boxShadow: SHADOW.card }} /> : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{product.name}</div>
            <div style={{ fontSize: 12, color: SNOW.muted, fontFamily: FONT.body, marginTop: 2 }}>{product.set_name || ""}{product.year ? ` · ${product.year}` : ""} · Scellé</div>
          </div>
        </div>

        {/* Quantite */}
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Quantité</div>
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

        {/* Prix d'achat optionnel */}
        <div style={{ marginBottom: 22 }}>
          <div style={labelStyle}>Prix d'achat (optionnel)</div>
          <input value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} inputMode="decimal" placeholder="0,00 €" style={inputStyle} />
        </div>

        {err ? <div style={{ fontSize: 12, color: SNOW.red, marginBottom: 12, fontFamily: FONT.body }}>{err}</div> : null}
        {justAdded ? <div style={{ fontSize: 12.5, color: "#1D9E75", marginBottom: 12, fontWeight: 600, fontFamily: FONT.display }}>✓ Ajouté au portfolio</div> : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => submit(true)} disabled={submitting} style={{ flex: 1, padding: "12px", borderRadius: RADIUS.md, ...GLASS.button, color: SNOW.ink, fontSize: 13.5, fontWeight: 600, fontFamily: FONT.display, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.5 : 1 }}>
            {submitting ? "Ajout…" : "Ajouter et continuer"}
          </button>
          <button onClick={() => submit(false)} disabled={submitting} style={{ flex: 1, padding: "12px", borderRadius: RADIUS.md, background: SNOW.ink, color: "#fff", border: "none", fontSize: 13.5, fontWeight: 600, fontFamily: FONT.display, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.5 : 1 }}>
            {submitting ? "…" : addedCount > 0 ? "Ajouter & fermer" : `Ajouter${qty > 1 ? ` ×${qty}` : ""}`}
          </button>
        </div>

        {addedCount > 0 ? <div style={{ fontSize: 11.5, color: SNOW.muted, textAlign: "center", marginTop: 12, fontFamily: FONT.body }}>{addedCount} ajouté{addedCount > 1 ? "s" : ""} dans cette session</div> : null}
      </div>
    </div>
  )
  return createPortal(overlay, document.body)
}
