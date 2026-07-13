'use client'

import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import { getSets, getCardsForSet, type StaticCard } from '@/lib/cardDb'
import { resolveDisplayPrice } from '@/lib/pricing/resolveDisplayPrice'
import { getCardImageUrl } from '@/lib/images'
import type { GoalTarget, WishlistItem, GoalMetric } from '@/lib/useGoals'
import { GlassButton } from '@/components/ui/GlassButton'

interface Props {
  mode: 'target' | 'wish'
  onClose: () => void
  onAddTarget: (target: Omit<GoalTarget, 'id'>) => Promise<GoalTarget>
  onAddWish: (item: Omit<WishlistItem, 'id'>) => Promise<WishlistItem | { error: 'wishlist_limit' }>
  /** Valeurs courantes des métriques (pour ancrer la cible). Optionnel. */
  currentValues?: Partial<Record<GoalMetric, number>>
  /** Si fourni, le modal passe en mode édition d'objectif (formulaire pré-rempli). */
  editTarget?: GoalTarget | null
  onUpdateTarget?: (id: string, patch: { target_value?: number; label?: string | null; deadline?: string | null }) => Promise<any> | void
}

const METRIC_OPTIONS: { value: GoalMetric; label: string; placeholder: string; unit?: string }[] = [
  { value: 'portfolio_value', label: 'Valeur portfolio',  placeholder: '10000',  unit: '€' },
  { value: 'cards_count',     label: 'Nombre de cartes',  placeholder: '500'                },
  { value: 'roi_pct',         label: 'ROI annuel %',      placeholder: '15',     unit: '%' },
  { value: 'graded_count',    label: 'Cartes gradées',    placeholder: '10'                 },
]

/* Item d'autocomplétion — data porte l'objet source (carte/set) pour l'enrichissement au pick */
type AcItem = { label: string; sub?: string; value: string; meta?: string; data?: any }

/* Normalisation accent-insensible (identique au modal Holdings) */
const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')
const cardNum = (c: StaticCard) => parseInt(String(c.lid).replace(/\D/g, ''), 10) || 0

/* Formatage euro propre (2 décimales sous 100 €, entier au-delà) */
const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n < 100 ? 2 : 0 }).format(n)

/* Sets promo/collection à repousser en bas du parcours (McDonald's, decks, starters…) */
const PROMO_SET_RE = /mcdonald|collection|jumbo|promo|precon|trainer kit|starter|black star|league|champion|deck kit/i
const isPromoSet = (st: { name: string; id: string }) => PROMO_SET_RE.test(st.name) || /^\d{4}/.test(st.id)

/* Score de pertinence d'un set (plus bas = plus pertinent) : préfixe > début de mot > contient */
function setScore(name: string, id: string, nq: string): number {
  const nName = norm(name)
  if (nName.startsWith(nq)) return 0
  const words = name.split(/[\s\-:'.]+/).map(norm).filter(Boolean)
  if (words.some(w => w.startsWith(nq))) return 1
  if (nName.includes(nq)) return 2
  if (norm(id).includes(nq)) return 3
  return -1
}

export function ObjAddModal({ mode, onClose, onAddTarget, onAddWish, currentValues, editTarget, onUpdateTarget }: Props) {
  const isEdit = !!editTarget

  /* Target form state (pré-rempli en mode édition) */
  const [metric, setMetric] = useState<GoalMetric>(editTarget?.metric ?? 'portfolio_value')
  const [targetValue, setTargetValue] = useState(editTarget ? String(editTarget.target_value) : '')
  const [targetLabel, setTargetLabel] = useState(editTarget?.label ?? '')
  const [deadline, setDeadline] = useState(editTarget?.deadline ? String(editTarget.deadline).slice(0, 10) : '')

  /* Wish form state */
  const [wishName, setWishName] = useState('')
  const [wishSet, setWishSet] = useState('')
  const [wishLang, setWishLang] = useState<'EN' | 'FR' | 'JP'>('FR')
  const [wishRarity, setWishRarity] = useState('')
  const [wishPriority, setWishPriority] = useState<1 | 2 | 3>(2)
  const [wishTargetPrice, setWishTargetPrice] = useState('')
  const [wishNotes, setWishNotes] = useState('')
  /* Set résolu (le champ visible garde le nom) + carte pointée (pour vignette ET payload) */
  const [wishSetId, setWishSetId] = useState('')
  const [wishCard, setWishCard] = useState<StaticCard | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [limitErr, setLimitErr] = useState(false)

  /* ESC key closes modal */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isTargetValid = mode === 'target'
    ? targetValue && parseFloat(targetValue) > 0
    : true

  const isWishValid = mode === 'wish'
    ? wishName.trim().length > 0
    : true

  const canSubmit = (mode === 'target' ? isTargetValid : isWishValid) && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      if (mode === 'target') {
        if (isEdit && editTarget && onUpdateTarget) {
          await onUpdateTarget(editTarget.id, {
            target_value: parseFloat(targetValue),
            label: targetLabel.trim() || null,
            deadline: deadline || null,
          })
        } else {
          const meta = METRIC_OPTIONS.find(o => o.value === metric)!
          await onAddTarget({
            metric,
            target_value: parseFloat(targetValue),
            unit: meta.unit || null,
            label: targetLabel.trim() || null,
            deadline: deadline || null,
          })
        }
      } else {
        const res = await onAddWish({
          card_name: wishName.trim(),
          set_id: wishSetId || null,
          set_name: wishSet.trim() || null,
          card_number: wishCard?.lid ?? null,
          lang: wishLang,
          rarity: wishRarity.trim() || null,
          priority: wishPriority,
          target_price: wishTargetPrice ? parseFloat(wishTargetPrice) : null,
          notes: wishNotes.trim() || null,
        })
        if (res && typeof res === 'object' && 'error' in res) {
          setLimitErr(true)
          return
        }
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal((
    <div
      onClick={onClose}
      style={{
        position: 'fixed' as const,
        inset: 0,
        background: 'rgba(20, 20, 30, 0.42)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'objModalFadeIn 0.2s cubic-bezier(.2,.85,.3,1)',
        padding: 16,
      }}
    >
      <style>{`
        @keyframes objModalFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes objModalSlideUp { from{opacity:0;transform:translateY(12px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: 20,
          padding: 28,
          width: 440,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto' as const,
          boxShadow: '0 32px 80px rgba(0,0,0,0.24), 0 6px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          animation: 'objModalSlideUp 0.28s cubic-bezier(.2,.85,.3,1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
        }}>
          <div>
            <div style={{
              fontSize: 10,
              color: '#86868B',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              marginBottom: 5,
              fontWeight: 700,
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
            }}>{isEdit ? 'Objectif' : (mode === 'target' ? 'Nouvel objectif' : 'Nouvelle wishlist')}</div>
            <div style={{
              fontSize: 19,
              fontWeight: 700,
              color: '#1D1D1F',
              letterSpacing: '-0.4px',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
            }}>{isEdit ? 'Modifier l\'objectif' : (mode === 'target' ? 'Définir une cible' : 'Ajouter une carte')}</div>
          </div>
          {limitErr && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const,
              padding: '10px 14px', borderRadius: 12, marginBottom: 10,
              background: 'rgba(224,48,32,0.07)', border: '1px solid rgba(224,48,32,0.18)',
              fontSize: 12.5, color: '#1D1D1F', fontFamily: 'var(--font-dm,"DM Sans",system-ui)',
            }}>
              <span>Wishlist limitée à <strong>3 cartes</strong> en Gratuit.</span>
              <a href="/abonnement" style={{ color: '#E03020', fontWeight: 700, textDecoration: 'none' }}>Passer Pro pour l'illimité →</a>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#86868B',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all .15s cubic-bezier(.2,.85,.3,1)',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(196,46,31,0.1)'
              e.currentTarget.style.color = '#C42E1F'
              e.currentTarget.style.borderColor = 'rgba(196,46,31,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.6)'
              e.currentTarget.style.color = '#86868B'
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
            }}
          >×</button>
        </div>

        {/* Form fields */}
        {mode === 'target' ? (
          <TargetForm
            metric={metric} setMetric={setMetric}
            targetValue={targetValue} setTargetValue={setTargetValue}
            targetLabel={targetLabel} setTargetLabel={setTargetLabel}
            deadline={deadline} setDeadline={setDeadline}
            currentValues={currentValues}
            locked={isEdit}
          />
        ) : (
          <WishForm
            wishName={wishName} setWishName={setWishName}
            wishSet={wishSet} setWishSet={setWishSet}
            wishLang={wishLang} setWishLang={setWishLang}
            wishRarity={wishRarity} setWishRarity={setWishRarity}
            wishPriority={wishPriority} setWishPriority={setWishPriority}
            wishTargetPrice={wishTargetPrice} setWishTargetPrice={setWishTargetPrice}
            wishNotes={wishNotes} setWishNotes={setWishNotes}
            wishSetId={wishSetId} setWishSetId={setWishSetId}
            wishCard={wishCard} setWishCard={setWishCard}
          />
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <GlassButton fullWidth onClick={onClose} style={{ flex: 1 }}>Annuler</GlassButton>
          <GlassButton fullWidth active disabled={!canSubmit} onClick={handleSubmit} style={{ flex: 1 }}>
            {submitting ? 'En cours…' : isEdit ? 'Enregistrer' : (mode === 'target' ? 'Créer l\'objectif' : 'Ajouter à la wishlist')}
          </GlassButton>
        </div>
      </div>
    </div>
  ), document.body)
}

/* ── Target form ────────────────────────── */

function TargetForm({
  metric, setMetric,
  targetValue, setTargetValue,
  targetLabel, setTargetLabel,
  deadline, setDeadline,
  currentValues,
  locked,
}: any) {
  const meta = METRIC_OPTIONS.find(o => o.value === metric)!
  const current: number | undefined = currentValues?.[metric]
  const fmtVal = (v: number) => {
    if (meta.unit === '€') return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
    if (meta.unit === '%') return `${v.toFixed(1)} %`
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Field label={locked ? 'Métrique (non modifiable)' : 'Métrique'}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
        }}>
          {METRIC_OPTIONS.map(opt => (
            <button
              key={opt.value}
              disabled={locked}
              onClick={() => { if (!locked) setMetric(opt.value) }}
              style={{
                padding: '10px 12px',
                background: metric === opt.value ? 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)' : 'rgba(255,255,255,0.45)',
                color: metric === opt.value ? '#1D1D1F' : '#86868B',
                border: `0.5px solid rgba(255,255,255,0.6)`,
                boxShadow: metric === opt.value ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                borderRadius: 9,
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: 'var(--font-sora, Sora, sans-serif)',
                cursor: locked ? 'default' : 'pointer',
                opacity: locked && metric !== opt.value ? 0.4 : 1,
                textAlign: 'left' as const,
                transition: 'all .15s cubic-bezier(.2,.85,.3,1)',
              }}
            >{opt.label}</button>
          ))}
        </div>
      </Field>

      <Field label={`Valeur cible${meta.unit ? ` (${meta.unit})` : ''}`}>
        <Input
          type="number"
          value={targetValue}
          onChange={setTargetValue}
          placeholder={meta.placeholder}
          autoFocus
        />
        {current != null && (
          <div style={{ marginTop: 7, fontSize: 11.5, fontFamily: 'var(--font-sora, Sora, sans-serif)', color: '#6E6E73' }}>
            Actuellement : <strong style={{ color: '#1D1D1F', fontFamily: 'var(--font-data, "Space Mono", monospace)' }}>{fmtVal(current)}</strong>
            {(() => {
              const t = parseFloat(targetValue)
              if (!targetValue || isNaN(t)) return null
              const gap = t - current
              if (gap <= 0) return <span style={{ marginLeft: 8, color: '#1D9E75', fontWeight: 700 }}>✓ cible atteinte</span>
              return <span style={{ marginLeft: 8, color: '#86868B' }}>· il reste {fmtVal(gap)}</span>
            })()}
          </div>
        )}
      </Field>

      <Field label="Description (optionnel)">
        <Input
          value={targetLabel}
          onChange={setTargetLabel}
          placeholder={`Ex: Atteindre ${meta.placeholder}${meta.unit || ''} d'ici Q4`}
        />
      </Field>

      <Field label="Date butoir (optionnel)">
        <Input
          type="date"
          value={deadline}
          onChange={setDeadline}
        />
      </Field>
    </div>
  )
}

/* ── Wish form ──────────────────────────── */

function WishForm({
  wishName, setWishName,
  wishSet, setWishSet,
  wishLang, setWishLang,
  wishRarity, setWishRarity,
  wishPriority, setWishPriority,
  wishTargetPrice, setWishTargetPrice,
  wishNotes, setWishNotes,
  wishSetId, setWishSetId,
  wishCard, setWishCard,
}: any) {
  const [cardPrice, setCardPrice] = useState<number | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  /* Cote actuelle de la carte pointée : route Kodo + règle headline officielle (resolveDisplayPrice) */
  useEffect(() => {
    if (!wishCard || !wishSetId) { setCardPrice(null); setPriceLoading(false); return }
    const cardId = `${String(wishLang).toLowerCase()}-${wishSetId}-${wishCard.lid}`
    let cancelled = false
    setPriceLoading(true); setCardPrice(null)
    fetch('/api/kodo/prices/' + encodeURIComponent(cardId))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled) return
        if (!d) { setCardPrice(null); return }
        const { price } = resolveDisplayPrice(wishLang, undefined, {
          fairValueEur: d.fairValueEur, coteFrEur: d.coteFrEur, fairValueMethod: d.fairValueMethod,
        })
        setCardPrice(price)
      })
      .catch(() => { if (!cancelled) setCardPrice(null) })
      .finally(() => { if (!cancelled) setPriceLoading(false) })
    return () => { cancelled = true }
  }, [wishCard, wishSetId, wishLang])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Field label="Langue">
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['FR', 'EN', 'JP'] as const).map(l => (
            <button
              key={l}
              onClick={() => { setWishLang(l); setWishSet(''); setWishName(''); setWishSetId(''); setWishCard(null) }}
              style={{
                flex: 1, padding: '10px 0',
                background: wishLang === l ? 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)' : 'rgba(255,255,255,0.45)',
                color: wishLang === l ? '#1D1D1F' : '#86868B',
                border: '0.5px solid rgba(255,255,255,0.6)',
                boxShadow: wishLang === l ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                borderRadius: 9, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-sora, Sora, sans-serif)', letterSpacing: '0.02em',
                transition: 'all .15s cubic-bezier(.2,.85,.3,1)',
              }}
            >{l}</button>
          ))}
        </div>
      </Field>

      <Field label="Set">
        <AutocompleteInput
          value={wishSet}
          onChange={(v) => { setWishSet(v); setWishSetId(''); setWishName(''); setWishCard(null) }}
          placeholder="Cherche un set — ex : 151, Prismatique…"
          fetcher={async (q) => {
            const sets = await getSets(wishLang)
            const nq = norm(q)
            let ranked: typeof sets
            if (!nq) {
              // Parcours : sets principaux d'abord, promos/collections repoussées en bas
              ranked = [...sets].sort((a, b) => (isPromoSet(a) ? 1 : 0) - (isPromoSet(b) ? 1 : 0))
            } else {
              // Recherche classée : prefixe > debut de mot > contient, promos en dernier a score egal
              ranked = sets
                .map(st => ({ st, s: setScore(st.name, st.id, nq) }))
                .filter(x => x.s >= 0)
                .sort((a, b) =>
                  a.s - b.s ||
                  (isPromoSet(a.st) ? 1 : 0) - (isPromoSet(b.st) ? 1 : 0) ||
                  a.st.name.localeCompare(b.st.name, 'fr')
                )
                .map(x => x.st)
            }
            return ranked.map(st => ({ label: st.name, value: st.name, meta: st.id, data: st }))
          }}
          deps={[wishLang]}
          onPick={(item) => { setWishSetId(item.meta || ''); setWishName(''); setWishCard(null) }}
        />
      </Field>

      <Field label="Nom de la carte *">
        <AutocompleteInput
          value={wishName}
          onChange={(v) => { setWishName(v); setWishCard(null) }}
          placeholder={wishSet ? 'Cherche dans le set — ou parcours la liste' : 'Nom de la carte…'}
          autoFocus
          fetcher={async (q) => {
            const sets = await getSets(wishLang)
            const match = sets.find(st => st.id === wishSetId || st.name === wishSet)
            if (!match) return []
            const cards = await getCardsForSet(wishLang, match.id)
            const sorted = [...cards].sort((a, b) => cardNum(a) - cardNum(b) || String(a.lid).localeCompare(String(b.lid)))
            const nq = norm(q)
            const list = nq ? sorted.filter(c => c.n && norm(c.n).startsWith(nq)) : sorted
            return list.map(c => ({ label: c.n, value: c.n, meta: c.r || '', data: { card: c, setId: match.id } }))
          }}
          deps={[wishLang, wishSet, wishSetId]}
          disabled={!wishSet}
          disabledHint="Choisis d'abord un set"
          onPick={(item) => {
            const d = item.data as { card: StaticCard; setId: string } | undefined
            if (d?.card) { setWishCard(d.card); setWishSetId(d.setId); setWishRarity(d.card.r || '') }
          }}
        />
      </Field>

      {/* Carte résolue → vignette (image + rareté + n°). Sinon → rareté libre en fallback. */}
      {wishCard ? (
        <Field label="Carte sélectionnée">
          <SelectedCardCard card={wishCard} lang={wishLang} setId={wishSetId} onClear={() => setWishCard(null)} />
        </Field>
      ) : (
        <Field label="Rareté (optionnel)">
          <Input value={wishRarity} onChange={setWishRarity} placeholder="Ex: Illustration Rare" />
        </Field>
      )}

      <Field label="Priorité">
        <div style={{ display: 'flex', gap: '6px' }}>
          {([1, 2, 3] as const).map(pr => {
            const stars = '★'.repeat(pr) + '☆'.repeat(3 - pr)
            const active = wishPriority === pr
            return (
              <button
                key={pr}
                onClick={() => setWishPriority(pr)}
                style={{
                  flex: 1, padding: 11,
                  background: active ? 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)' : 'rgba(255,255,255,0.45)',
                  color: active ? '#1D1D1F' : '#86868B',
                  border: '0.5px solid rgba(255,255,255,0.6)',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                  borderRadius: 9, fontSize: 14, fontFamily: 'var(--font-sora, Sora, sans-serif)',
                  letterSpacing: '-1px', cursor: 'pointer', transition: 'all .15s cubic-bezier(.2,.85,.3,1)',
                }}
              >{stars}</button>
            )
          })}
        </div>
      </Field>

      <Field label="Prix cible (€)">
        <Input type="number" value={wishTargetPrice} onChange={setWishTargetPrice} placeholder="Ex: 80" />
        {wishCard && (
          <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontFamily: 'var(--font-sora, Sora, sans-serif)' }}>
            {priceLoading ? (
              <span style={{ color: '#AEAEB2' }}>Cote actuelle…</span>
            ) : cardPrice != null ? (
              <>
                <span style={{ color: '#6E6E73' }}>
                  Cote actuelle : <strong style={{ color: '#1D1D1F', fontFamily: 'var(--font-data, "Space Mono", monospace)' }}>{fmtEur(cardPrice)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setWishTargetPrice(String(Math.round(cardPrice)))}
                  style={{ color: '#C42E1F', fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', fontFamily: 'var(--font-sora, Sora, sans-serif)', fontSize: 11.5 }}
                >Utiliser</button>
              </>
            ) : (
              <span style={{ color: '#AEAEB2' }}>Cote indisponible pour cette carte</span>
            )}
          </div>
        )}
      </Field>

      <Field label="Notes (optionnel)">
        <Input value={wishNotes} onChange={setWishNotes} placeholder="Ex: Variant 3D ou avec couronne" />
      </Field>
    </div>
  )
}

/* ── Carte sélectionnée (vignette) ──────── */

function SelectedCardCard({ card, lang, setId, onClear }: { card: StaticCard; lang: string; setId: string; onClear: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 12,
      background: 'rgba(255,255,255,0.55)',
      border: '0.5px solid rgba(255,255,255,0.7)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        width: 40, height: 56, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
        background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {(() => {
          // R2 d'abord (gère le .jpg JP), repli TCGdex (card.img) si R2 manque l'image.
          const primary = getCardImageUrl({ lang: lang || 'EN', setId: setId || undefined, localId: card.lid })
          const fallback = card.img || ''
          const initial = primary || fallback
          return initial ? (
            <img
              src={initial}
              alt={card.n}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => {
                const img = e.currentTarget as HTMLImageElement
                if (fallback && img.src !== fallback) img.src = fallback
                else img.style.display = 'none'
              }}
            />
          ) : (
            <span style={{ fontSize: 10, color: '#AEAEB2', fontFamily: 'var(--font-sora, Sora, sans-serif)' }}>—</span>
          )
        })()}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#1D1D1F',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{card.n}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {card.r && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#C42E1F',
              background: 'rgba(224,48,32,0.08)', padding: '2px 7px', borderRadius: 6,
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
            }}>{card.r}</span>
          )}
          <span style={{ fontSize: 11, color: '#86868B', fontFamily: 'var(--font-data, "Space Mono", monospace)' }}>N° {card.lid}</span>
        </div>
      </div>
      <button
        onClick={onClear}
        style={{
          flexShrink: 0, fontSize: 11, fontWeight: 600, color: '#86868B',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sora, Sora, sans-serif)', padding: 6,
        }}
      >Changer</button>
    </div>
  )
}

/* ── Form atoms ─────────────────────────── */

function AutocompleteInput({
  value, onChange, placeholder, autoFocus, fetcher, deps = [], onPick, disabled, disabledHint,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  fetcher: (q: string) => Promise<AcItem[]>
  deps?: any[]
  onPick?: (item: AcItem) => void
  disabled?: boolean
  disabledHint?: string
}) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [items, setItems] = useState<AcItem[]>([])
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const tRef = useRef<any>(null)

  useEffect(() => {
    if (disabled) { setItems([]); setOpen(false); return }
    if (tRef.current) clearTimeout(tRef.current)
    const run = async () => {
      try {
        const res = await fetcher(value.trim())
        setItems(res); setActive(0)
        setOpen(focused && res.length > 0)
      } catch { setItems([]); setOpen(false) }
    }
    // instantané à l'ouverture (query vide), léger debounce à la frappe
    tRef.current = setTimeout(run, value.trim() ? 160 : 0)
    return () => { if (tRef.current) clearTimeout(tRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, disabled, focused, ...deps])

  function pick(item: AcItem) {
    onChange(item.value)
    onPick?.(item)
    setOpen(false)
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder={disabled ? (disabledHint || placeholder) : placeholder}
        autoFocus={autoFocus}
        onFocus={e => {
          setFocused(true)
          e.currentTarget.style.borderColor = '#1D1D1F'
          e.currentTarget.style.background = 'rgba(255,255,255,0.85)'
          e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04), 0 0 0 3px rgba(0,0,0,0.05)'
          if (items.length > 0) setOpen(true)
        }}
        onBlur={e => {
          setFocused(false)
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.6)'
          e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'
          setTimeout(() => setOpen(false), 120)
        }}
        onKeyDown={e => {
          if (!open || items.length === 0) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); pick(items[active]) }
          else if (e.key === 'Escape') { setOpen(false) }
        }}
        style={{
          width: '100%', padding: '11px 14px',
          border: '1px solid rgba(0,0,0,0.08)', borderRadius: 9, fontSize: 13,
          background: disabled ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          color: disabled ? '#AEAEB2' : '#1D1D1F', outline: 'none',
          fontFamily: 'var(--font-sora, Sora, sans-serif)', boxSizing: 'border-box' as const,
          transition: 'all .15s cubic-bezier(.2,.85,.3,1)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
      {open && items.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.9)',
          overflow: 'hidden', maxHeight: 264, overflowY: 'auto',
        }}>
          {items.map((it, idx) => (
            <div
              key={it.value + idx}
              onMouseDown={e => { e.preventDefault(); pick(it) }}
              onMouseEnter={() => setActive(idx)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '10px 14px', cursor: 'pointer',
                background: idx === active ? 'rgba(0,0,0,0.05)' : 'transparent',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', fontFamily: 'var(--font-sora, Sora, sans-serif)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{it.label}</span>
              {it.sub && <span style={{ fontSize: 11, color: '#86868B', fontFamily: 'var(--font-data, "Space Mono", monospace)', flexShrink: 0 }}>{it.sub}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 10.5,
        fontWeight: 700,
        color: '#86868B',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.07em',
        marginBottom: 8,
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>{label}</label>
      {children}
    </div>
  )
}

function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: '100%',
        padding: '11px 14px',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 9,
        fontSize: 13,
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: '#1D1D1F',
        outline: 'none',
        fontFamily: type === 'number' ? 'var(--font-data, "Space Mono", monospace)' : 'var(--font-sora, Sora, sans-serif)',
        boxSizing: 'border-box' as const,
        transition: 'all .15s cubic-bezier(.2,.85,.3,1)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = '#1D1D1F'
        e.currentTarget.style.background = 'rgba(255,255,255,0.85)'
        e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04), 0 0 0 3px rgba(0,0,0,0.05)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.6)'
        e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)'
      }}
    />
  )
}
