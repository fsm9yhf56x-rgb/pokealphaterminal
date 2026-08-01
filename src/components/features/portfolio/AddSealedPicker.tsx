"use client"
// Choix d'un produit scelle avant AddSealedModal. Jumeau du formulaire carte :
// meme entete, meme segmente, pour que basculer d'un type a l'autre ne donne
// jamais l'impression de changer d'ecran.
//
// La langue n'est PAS saisissable ici : c'est une propriete du produit trouve.
// La rendre modifiable laisserait fabriquer une cle absente de sealed_prices,
// donc une ligne jamais revalorisee.
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { SealedSeed } from "@/components/features/card/AddSealedModal"
import { kthumbFit } from "@/lib/sealed-fit"
import { aliasBag, compileQuery, matchCompiled, scoreCompiled, queryTokenCount } from "@/lib/search-alias"

type Item = {
  id: string; name: string; shortName?: string | null; lang: string
  setId?: string | null; setName?: string | null; sku?: string | null
  image?: string | null; setLogo?: string | null
  price?: { value?: number | null } | null
}
const FLAG: Record<string, string> = { FR: "\u{1F1EB}\u{1F1F7}", EN: "\u{1F1FA}\u{1F1F8}", JP: "\u{1F1EF}\u{1F1F5}" }
// Ordonnees par nombre de produits au catalogue FR : ce qu'on cherche le plus
// est a portee sans defiler. Les contenants sont groupes (14 produits en tout).
const SKU_TABS: Array<{ k: string; label: string }> = [
  { k: "", label: "Tous" },
  { k: "display", label: "Display" },
  { k: "etb", label: "ETB" },
  { k: "coffret", label: "Coffret" },
  { k: "booster", label: "Booster" },
  { k: "blister", label: "Blister" },
  { k: "bundle", label: "Bundle" },
  { k: "demi_display", label: "Demi-display" },
  { k: "deck", label: "Deck" },
  { k: "tin", label: "Tin" },
  { k: "tripack", label: "Tripack" },
  { k: "case,display_tin,display_bundle", label: "Lots" },
]
const eur = (n?: number | null) =>
  n == null ? "\u2014" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " \u20AC"

export function AddSealedPicker({ open, onClose, onSwitchToCard, onPick }: {
  open: boolean
  onClose: () => void
  onSwitchToCard: () => void
  onPick: (seed: SealedSeed) => void
}) {
  const [q, setQ] = useState("")
  const [sku, setSku] = useState("")
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const box = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) setTimeout(() => box.current?.focus(), 60) }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      fetch("/api/v1/sealed?limit=1000&sort=price"
        + (sku ? "&sku=" + encodeURIComponent(sku) : ""),
        { credentials: "same-origin", cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (alive) setItems(Array.isArray(d.items) ? d.items : []) })
        .catch(() => { if (alive) setItems([]) })
        .finally(() => { if (alive) setLoading(false) })
    }, 0)
    return () => { alive = false; clearTimeout(t) }
  }, [sku, open])

  // Sac d'alias : nom, serie, SKU, et surtout le CODE de serie (sm12 -> SL12,
  // swsh7 -> EB07) que le q= SQL ne savait pas comparer.
  const index = useMemo(() => {
    const m = new Map<string, string>()
    for (const it of items) {
      m.set(it.id, aliasBag({
        name: it.name, setId: it.setId, setName: it.setName,
        extra: [it.shortName, it.sku, it.lang],
      }))
    }
    return m
  }, [items])

  const compiled = useMemo(() => compileQuery(q), [q])
  const visibles = useMemo(() => {
    if (!q.trim()) return items
    const out = items.filter((it) => matchCompiled(index.get(it.id) || '', compiled))
    if (out.length || queryTokenCount(compiled) < 2) return out
    // Degradation : un jeton fautif n'efface pas un jeton juste.
    let best = 0
    const sc = new Map<string, number>()
    for (const it of items) {
      const n = scoreCompiled(index.get(it.id) || '', compiled)
      if (n > 0) { sc.set(it.id, n); if (n > best) best = n }
    }
    return best > 0 ? items.filter((it) => sc.get(it.id) === best) : []
  }, [items, index, compiled, q])

  if (!open) return null

  const seg = (on: boolean) => ({
    flex: 1, padding: "10px 8px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.6)",
    background: on ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)" : "rgba(255,255,255,0.45)",
    backdropFilter: "blur(12px) saturate(180%)", WebkitBackdropFilter: "blur(12px) saturate(180%)",
    color: on ? "#1D1D1F" : "#48484A", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
    fontFamily: "var(--font-display)", transition: "all .2s cubic-bezier(.2,.85,.3,1)",
    boxShadow: on ? "0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)" : "inset 0 1px 0 rgba(255,255,255,0.7)",
  } as const)

  return createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(20,15,10,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(32px) saturate(180%)", WebkitBackdropFilter: "blur(32px) saturate(180%)", borderRadius: 26, padding: 26, maxWidth: 540, width: "100%", maxHeight: "min(88vh, 680px)", overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeUp .25s ease-out", boxShadow: "0 30px 80px rgba(0,0,0,0.22), 0 10px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(0,0,0,0.05)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#1D1D1F", fontFamily: "var(--font-display)" }}>Ajouter</div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(229,229,234,0.7)", color: "#48484A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexShrink: 0 }}>
          <button onClick={onSwitchToCard} style={seg(false)}>Carte</button>
          <button style={seg(true)}>Scell&eacute;</button>
        </div>

        <input ref={box} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={'Série, code (EB07), display, ETB…'}
          style={{ width: "100%", padding: "12px 13px", borderRadius: 12, border: "1px solid rgba(229,229,234,0.8)", background: "rgba(255,255,255,0.92)", color: "#1D1D1F", fontSize: 13.5, fontFamily: "var(--font-display)", boxSizing: "border-box", outline: "none", marginBottom: 12, flexShrink: 0 }} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 10, marginBottom: 2, flexShrink: 0 }}>
          {SKU_TABS.map((t) => {
            const on = sku === t.k
            return (
              <button key={t.k || "all"} onClick={() => setSku(t.k)}
                style={{ flexShrink: 0, padding: "5px 11px", borderRadius: 99, border: "none", cursor: "pointer",
                  background: on ? "#1D1D1F" : "rgba(255,255,255,0.62)",
                  color: on ? "#FFF" : "#48484A",
                  boxShadow: on ? "none" : "inset 0 0 0 .5px rgba(0,0,0,.07)",
                  fontSize: 11, fontWeight: 600, fontFamily: "var(--font-display)",
                  transition: "background .18s ease, color .18s ease", whiteSpace: "nowrap" }}>
                {t.label}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 10.5, color: "#AEAEB2", fontFamily: "var(--font-display)", padding: "0 4px 8px", flexShrink: 0 }}>
          Prix = la moins ch&egrave;re annonce en cours. Seuls les produits r&eacute;ellement en vente apparaissent.
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 160, display: "flex", flexDirection: "column" }}>
        <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, pointerEvents: "none", zIndex: 1,
          background: "linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0))" }} />
        <div style={{ overflowY: "auto", flex: 1, margin: "0 -6px", padding: "0 6px" }}>
          {loading && items.length === 0 ? (
            <div style={{ padding: "34px 0", textAlign: "center", fontSize: 12.5, color: "#86868B", fontFamily: "var(--font-display)" }}>Recherche\u2026</div>
          ) : visibles.length === 0 ? (
            <div style={{ padding: "34px 0", textAlign: "center", fontSize: 12.5, color: "#86868B", fontFamily: "var(--font-display)" }}>
              {sku || q.trim()
                ? "Aucun produit ne correspond."
                : "Le catalogue ne contient que les produits r\u00E9ellement en vente."}
            </div>
          ) : visibles.map((it) => (
            <button key={it.id}
              onClick={() => onPick({
                name: it.name, set_name: it.setName ?? null, set_id: it.setId ?? null,
                card_type: it.sku ?? null, lang: it.lang, year: 0,
                current_price: it.price?.value ?? null,
                image_url: it.image || it.setLogo || null,
              })}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 10px", marginBottom: 5, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.55)", cursor: "pointer", textAlign: "left", boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.055)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.95)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.55)" }}>
              <div style={{ width: 54, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#F5F5F7" }}>
                {(it.image || it.setLogo) ? (
                  <img src={(it.image || it.setLogo) as string} alt="" loading="lazy"
                    style={{ width: "100%", height: "100%", display: "block", ...kthumbFit({ card_number: "SEALED" }) }}
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1D1D1F", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ marginRight: 5 }}>{FLAG[String(it.lang).toUpperCase()] || ""}</span>
                  {it.setName || it.name}
                </div>
                <div style={{ fontSize: 11.5, color: "#86868B", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                  {it.shortName || it.name}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {it.price?.value != null && (
                  <div style={{ fontSize: 9.5, color: "#AEAEB2", fontFamily: "var(--font-display)", letterSpacing: ".04em", textTransform: "uppercase" }}>d&egrave;s</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: it.price?.value != null ? "#1D1D1F" : "#AEAEB2", fontFamily: "var(--font-data)" }}>
                  {eur(it.price?.value)}
                </div>
              </div>
            </button>
          ))}
        </div>
        </div>
      </div>
    </div>, document.body)
}
export default AddSealedPicker
