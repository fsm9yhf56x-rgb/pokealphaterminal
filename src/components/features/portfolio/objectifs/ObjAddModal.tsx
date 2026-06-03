'use client'

import { useState, useEffect } from 'react'
import type { GoalTarget, WishlistItem, GoalMetric } from '@/lib/useGoals'
import { GlassButton } from '@/components/ui/GlassButton'

interface Props {
  mode: 'target' | 'wish'
  onClose: () => void
  onAddTarget: (target: Omit<GoalTarget, 'id'>) => Promise<GoalTarget>
  onAddWish: (item: Omit<WishlistItem, 'id'>) => Promise<WishlistItem>
}

const METRIC_OPTIONS: { value: GoalMetric; label: string; placeholder: string; unit?: string }[] = [
  { value: 'portfolio_value', label: 'Valeur portfolio',  placeholder: '10000',  unit: '€' },
  { value: 'cards_count',     label: 'Nombre de cartes',  placeholder: '500'                },
  { value: 'roi_pct',         label: 'ROI annuel %',      placeholder: '15',     unit: '%' },
  { value: 'graded_count',    label: 'Cartes gradées',    placeholder: '10'                 },
]

export function ObjAddModal({ mode, onClose, onAddTarget, onAddWish }: Props) {
  /* Target form state */
  const [metric, setMetric] = useState<GoalMetric>('portfolio_value')
  const [targetValue, setTargetValue] = useState('')
  const [targetLabel, setTargetLabel] = useState('')
  const [deadline, setDeadline] = useState('')

  /* Wish form state */
  const [wishName, setWishName] = useState('')
  const [wishSet, setWishSet] = useState('')
  const [wishLang, setWishLang] = useState<'EN' | 'FR' | 'JP'>('FR')
  const [wishRarity, setWishRarity] = useState('')
  const [wishPriority, setWishPriority] = useState<1 | 2 | 3>(2)
  const [wishTargetPrice, setWishTargetPrice] = useState('')
  const [wishNotes, setWishNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)

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
        const meta = METRIC_OPTIONS.find(o => o.value === metric)!
        await onAddTarget({
          metric,
          target_value: parseFloat(targetValue),
          unit: meta.unit || null,
          label: targetLabel.trim() || null,
          deadline: deadline || null,
        })
      } else {
        await onAddWish({
          card_name: wishName.trim(),
          set_name: wishSet.trim() || null,
          lang: wishLang,
          rarity: wishRarity.trim() || null,
          priority: wishPriority,
          target_price: wishTargetPrice ? parseFloat(wishTargetPrice) : null,
          notes: wishNotes.trim() || null,
        })
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
            }}>{mode === 'target' ? 'Nouvel objectif' : 'Nouvelle wishlist'}</div>
            <div style={{
              fontSize: 19,
              fontWeight: 700,
              color: '#1D1D1F',
              letterSpacing: '-0.4px',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
            }}>{mode === 'target' ? 'Définir une cible' : 'Ajouter une carte'}</div>
          </div>
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
          />
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <GlassButton fullWidth onClick={onClose} style={{ flex: 1 }}>Annuler</GlassButton>
          <GlassButton fullWidth active disabled={!canSubmit} onClick={handleSubmit} style={{ flex: 1 }}>
            {submitting ? 'En cours…' : (mode === 'target' ? 'Créer l\'objectif' : 'Ajouter à la wishlist')}
          </GlassButton>
        </div>
      </div>
    </div>
  )
}

/* ── Target form ────────────────────────── */

function TargetForm({
  metric, setMetric,
  targetValue, setTargetValue,
  targetLabel, setTargetLabel,
  deadline, setDeadline,
}: any) {
  const meta = METRIC_OPTIONS.find(o => o.value === metric)!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Field label="Métrique">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
        }}>
          {METRIC_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setMetric(opt.value)}
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
                cursor: 'pointer',
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
}: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Field label="Nom de la carte *">
        <Input
          value={wishName}
          onChange={setWishName}
          placeholder="Ex: Charizard Alt Art"
          autoFocus
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
        <Field label="Set">
          <Input value={wishSet} onChange={setWishSet} placeholder="Ex: SV151" />
        </Field>

        <Field label="Langue">
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['FR', 'EN', 'JP'] as const).map(l => (
              <button
                key={l}
                onClick={() => setWishLang(l)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: wishLang === l ? 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)' : 'rgba(255,255,255,0.45)',
                  color: wishLang === l ? '#1D1D1F' : '#86868B',
                  border: `0.5px solid rgba(255,255,255,0.6)`,
                  boxShadow: wishLang === l ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                  borderRadius: 9,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sora, Sora, sans-serif)',
                  letterSpacing: '0.02em',
                  transition: 'all .15s cubic-bezier(.2,.85,.3,1)',
                }}
              >{l}</button>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Rareté (optionnel)">
        <Input value={wishRarity} onChange={setWishRarity} placeholder="Ex: Illustration Rare" />
      </Field>

      <Field label="Priorité">
        <div style={{ display: 'flex', gap: '6px' }}>
          {([1, 2, 3] as const).map(p => {
            const stars = '★'.repeat(p) + '☆'.repeat(3 - p)
            const active = wishPriority === p
            return (
              <button
                key={p}
                onClick={() => setWishPriority(p)}
                style={{
                  flex: 1,
                  padding: 11,
                  background: active ? 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)' : 'rgba(255,255,255,0.45)',
                  color: active ? '#1D1D1F' : '#86868B',
                  border: `0.5px solid rgba(255,255,255,0.6)`,
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                  borderRadius: 9,
                  fontSize: 14,
                  fontFamily: 'var(--font-sora, Sora, sans-serif)',
                  letterSpacing: '-1px',
                  cursor: 'pointer',
                  transition: 'all .15s cubic-bezier(.2,.85,.3,1)',
                }}
              >{stars}</button>
            )
          })}
        </div>
      </Field>

      <Field label="Prix cible (€)">
        <Input
          type="number"
          value={wishTargetPrice}
          onChange={setWishTargetPrice}
          placeholder="Ex: 80"
        />
      </Field>

      <Field label="Notes (optionnel)">
        <Input value={wishNotes} onChange={setWishNotes} placeholder="Ex: Variant 3D ou avec couronne" />
      </Field>
    </div>
  )
}

/* ── Form atoms ─────────────────────────── */

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
