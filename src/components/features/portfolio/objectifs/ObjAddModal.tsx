'use client'

import { useState, useEffect } from 'react'
import type { GoalTarget, WishlistItem, GoalMetric } from '@/lib/useGoals'

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
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          width: '420px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.18)',
          fontFamily: 'var(--font-display)',
          animation: 'slideUp 0.2s ease-out',
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
              fontSize: '9px',
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}>{mode === 'target' ? 'Nouvel objectif' : 'Nouvelle wishlist'}</div>
            <div style={{
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.3px',
            }}>{mode === 'target' ? 'Définir une cible' : 'Ajouter une carte'}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--ink-muted)',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px',
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: '10px',
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--ink)',
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
            }}
          >Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1,
              padding: '11px',
              background: canSubmit ? 'var(--ink)' : 'var(--border)',
              border: 'none',
              borderRadius: '10px',
              color: canSubmit ? 'var(--surface)' : 'var(--ink-muted)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-display)',
              transition: 'all 0.15s',
            }}
          >{submitting ? 'En cours…' : (mode === 'target' ? 'Créer l\'objectif' : 'Ajouter à la wishlist')}</button>
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
                padding: '8px 10px',
                background: metric === opt.value ? 'var(--ink)' : 'var(--surface)',
                color: metric === opt.value ? 'var(--surface)' : 'var(--ink-muted)',
                border: `1px solid ${metric === opt.value ? 'var(--ink)' : 'var(--border)'}`,
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 500,
                fontFamily: 'var(--font-display)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s',
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
                  padding: '9px 0',
                  background: wishLang === l ? 'var(--ink)' : 'var(--surface)',
                  color: wishLang === l ? 'var(--surface)' : 'var(--ink-muted)',
                  border: `1px solid ${wishLang === l ? 'var(--ink)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
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
                  padding: '9px',
                  background: active ? 'var(--ink)' : 'var(--surface)',
                  color: active ? 'var(--surface)' : 'var(--ink-muted)',
                  border: `1px solid ${active ? 'var(--ink)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-1px',
                  cursor: 'pointer',
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
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '6px',
        fontFamily: 'var(--font-display)',
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
        padding: '10px 12px',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        fontSize: '13px',
        background: 'var(--surface)',
        color: 'var(--ink)',
        outline: 'none',
        fontFamily: type === 'number' ? 'var(--font-data, var(--font-display))' : 'var(--font-display)',
        boxSizing: 'border-box',
        transition: 'border-color 0.12s',
      }}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--ink)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    />
  )
}
