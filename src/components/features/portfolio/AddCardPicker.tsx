"use client"
// Choix d'une carte AVANT le formulaire. Renversement du flux : on cherchait
// dans une serie qu'il fallait choisir d'abord — il fallait connaitre la reponse
// pour poser la question. Ici on cherche dans tout le catalogue, et la serie,
// le numero et l'image se deduisent du resultat choisi.
//
// Le formulaire existant reste la seconde etape : etat, gradation, edition,
// prix, quantite ne se deduisent d'aucun catalogue, c'est l'utilisateur qui sait.
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { getAllCardsFlat, getSets, type FlatCard } from "@/lib/cardDb"
import { aliasBag, compileQuery, matchCompiled, scoreCompiled, queryTokenCount } from "@/lib/search-alias"

export interface CardSeed {
  lang: 'FR' | 'EN' | 'JP'
  setId: string
  setName: string
  name: string
  localId: string
  image: string | null
  rarity: string | null
}

const LANGS: Array<{ k: 'FR' | 'EN' | 'JP'; label: string; flag: string }> = [
  { k: 'FR', label: 'Francais', flag: "\u{1F1EB}\u{1F1F7}" },
  { k: 'EN', label: 'English', flag: "\u{1F1FA}\u{1F1F8}" },
  { k: 'JP', label: "\u65E5\u672C\u8A9E", flag: "\u{1F1EF}\u{1F1F5}" },
]

export function AddCardPicker({ open, onClose, onSwitchToSealed, onPick, defaultLang = 'FR' }: {
  open: boolean
  onClose: () => void
  onSwitchToSealed: () => void
  onPick: (seed: CardSeed) => void
  defaultLang?: 'FR' | 'EN' | 'JP'
}) {
  const [lang, setLang] = useState<'FR' | 'EN' | 'JP'>(defaultLang)
  const [q, setQ] = useState("")
  const [cards, setCards] = useState<FlatCard[]>([])
  const [setNames, setSetNames] = useState<Record<string, string>>({})
  const [setList, setSetList] = useState<Array<{ id: string; name: string; n: number }>>([])
  const [setFilter, setSetFilter] = useState("")
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
    Promise.all([getAllCardsFlat(lang), getSets(lang).catch(() => [])])
      .then(([flat, sets]) => {
        if (!alive) return
        const noms: Record<string, string> = {}
        for (const s of sets as any[]) {
          const id = String(s.id ?? '')
          const nom = String(s.name ?? s.n ?? '')
          if (id && nom) noms[id] = nom
        }
        setSetNames(noms)
        setCards(flat)
        // Parcourir reste possible : la liste deroulante d'avant MONTRAIT ce qui
        // existe. Sans elle l'ecran demande de se souvenir au lieu de reconnaitre.
        const compte = new Map<string, number>()
        for (const c of flat) compte.set(c.setId, (compte.get(c.setId) || 0) + 1)
        setSetList([...compte.entries()]
          .map(([id, n]) => ({ id, name: noms[id] || id, n }))
          .sort((a, b) => a.name.localeCompare(b.name)))
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [lang, open])

  // Sac d'alias : UNE fois par carte et par langue, jamais dans la boucle de frappe.
  const index = useMemo(() => {
    const totaux = new Map<string, number>()
    for (const c of cards) totaux.set(c.setId, (totaux.get(c.setId) || 0) + 1)
    const m = new Map<string, string>()
    for (const c of cards) {
      m.set(c.id, aliasBag({
        name: c.name, setId: c.setId, setName: setNames[c.setId] || null,
        localId: c.localId, setTotal: totaux.get(c.setId) || null,
        extra: [c.rarity],
      }))
    }
    return m
  }, [cards, setNames])

  const compiled = useMemo(() => compileQuery(q), [q])
  const numOf = (c: FlatCard) => {
    const m = String(c.localId || '').match(/[0-9]+/)
    return m ? parseInt(m[0], 10) : 99999
  }
  const resultats = useMemo(() => {
    const base = setFilter ? cards.filter(c => c.setId === setFilter) : cards
    // Une serie choisie SANS recherche : on liste la serie entiere, dans l'ordre
    // des numeros. C'est exactement l'ancien parcours, devenu facultatif.
    if (!q.trim() || q.trim().length < 2) {
      return setFilter ? [...base].sort((a, b) => numOf(a) - numOf(b)) : []
    }
    const out: FlatCard[] = []
    for (const c of base) {
      if (matchCompiled(index.get(c.id) || '', compiled)) out.push(c)
      if (out.length >= 40) break
    }
    if (out.length || queryTokenCount(compiled) < 2) return out
    // Degradation : un jeton fautif n'efface pas un jeton juste.
    let best = 0
    const scores = new Map<string, number>()
    for (const c of base) {
      const n = scoreCompiled(index.get(c.id) || '', compiled)
      if (n > 0) { scores.set(c.id, n); if (n > best) best = n }
    }
    return best > 0 ? base.filter(c => scores.get(c.id) === best).slice(0, 40) : []
  }, [cards, index, compiled, q, setFilter])

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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#1D1D1F", fontFamily: "var(--font-display)" }}>Ajouter</div>
          <button onClick={onClose} aria-label="Fermer" style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(229,229,234,0.7)", color: "#48484A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexShrink: 0 }}>
          <button style={seg(true)}>Carte</button>
          <button onClick={onSwitchToSealed} style={seg(false)}>Scell&eacute;</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexShrink: 0 }}>
          {LANGS.map((l) => (
            <button key={l.k} onClick={() => setLang(l.k)}
              style={{ ...seg(lang === l.k), display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12 }}>
              <span style={{ fontSize: 15 }}>{l.flag}</span>{l.label}
            </button>
          ))}
        </div>

        {setFilter && (
          <button onClick={() => setSetFilter("")}
            style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 10,
              padding: "5px 11px", borderRadius: 99, border: "none", cursor: "pointer", flexShrink: 0,
              background: "#1D1D1F", color: "#FFF", fontSize: 11.5, fontWeight: 600, fontFamily: "var(--font-display)" }}>
            {setNames[setFilter] || setFilter}
            <span style={{ opacity: .7 }}>&times;</span>
          </button>
        )}
        <input ref={box} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={'Nom, s\u00E9rie, code (EB07), num\u00E9ro (25/102)\u2026'}
          style={{ width: "100%", padding: "12px 13px", borderRadius: 12, border: "1px solid rgba(229,229,234,0.8)", background: "rgba(255,255,255,0.92)", color: "#1D1D1F", fontSize: 13.5, fontFamily: "var(--font-display)", boxSizing: "border-box", outline: "none", marginBottom: 12, flexShrink: 0 }} />

        <div style={{ overflowY: "auto", flex: 1, minHeight: 140, margin: "0 -6px", padding: "0 6px" }}>
          {loading && !cards.length ? (
            <div style={{ padding: "34px 0", textAlign: "center", fontSize: 12.5, color: "#86868B", fontFamily: "var(--font-display)" }}>Chargement du catalogue&hellip;</div>
          ) : q.trim().length < 2 && !setFilter ? (
            <div>
              <div style={{ fontSize: 11.5, color: "#86868B", fontFamily: "var(--font-display)", padding: "2px 4px 8px" }}>
                {cards.length.toLocaleString('fr-FR') + ' cartes. Essaie :'}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 4px 16px" }}>
                {['Mewtwo GX', 'EB07', '25/102', 'Evolution Celeste'].map((ex) => (
                  <button key={ex} onClick={() => setQ(ex)}
                    style={{ padding: "5px 11px", borderRadius: 99, border: "none", cursor: "pointer",
                      background: "rgba(255,255,255,0.62)", boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.07)",
                      color: "#48484A", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-display)" }}>
                    {ex}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: "#86868B", fontFamily: "var(--font-display)", padding: "0 4px 8px" }}>
                &hellip; ou parcours une s&eacute;rie :
              </div>
              {setList.map((st) => (
                <button key={st.id} onClick={() => setSetFilter(st.id)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%",
                    padding: "9px 11px", marginBottom: 4, borderRadius: 10, border: "none", cursor: "pointer",
                    background: "rgba(255,255,255,0.55)", textAlign: "left", boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.055)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.95)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.55)" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1D1D1F", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.name}</span>
                  <span style={{ fontSize: 11, color: "#AEAEB2", fontFamily: "var(--font-data)", flexShrink: 0 }}>{st.n}</span>
                </button>
              ))}
            </div>
          ) : resultats.length === 0 ? (
            <div style={{ padding: "34px 0", textAlign: "center", fontSize: 12.5, color: "#86868B", fontFamily: "var(--font-display)" }}>Aucune carte ne correspond.</div>
          ) : resultats.map((c) => (
            <button key={c.id}
              onClick={() => onPick({
                lang, setId: c.setId, setName: setNames[c.setId] || c.setId,
                name: c.name, localId: c.localId, image: c.image, rarity: c.rarity,
              })}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 10px", marginBottom: 5, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.55)", cursor: "pointer", textAlign: "left", boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.055)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.95)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.55)" }}>
              <div style={{ width: 34, height: 47, borderRadius: 5, overflow: "hidden", flexShrink: 0, background: "#F0F0F3" }}>
                {c.image ? (
                  <img src={c.image} alt="" loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden" }} />
                ) : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1D1D1F", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: "#86868B", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                  {setNames[c.setId] || c.setId} &middot; #{c.localId}{c.rarity ? " \u00B7 " + c.rarity : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>, document.body)
}
export default AddCardPicker
