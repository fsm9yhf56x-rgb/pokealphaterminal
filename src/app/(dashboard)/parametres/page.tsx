'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { usePersona, type Persona } from '@/lib/usePersona'
import { authClient } from '@/lib/auth/client'
import { SNOW, FONT, GLASS, RADIUS, SHADOW, EASE } from '@/lib/design/snow'
import { PlanBadge } from '@/components/ui/PlanBadge'

type Tab = 'profil' | 'securite' | 'abonnement' | 'compte'
type Msg = { type: 'ok' | 'err'; text: string } | null

export default function ParametresPage() {
  const router = useRouter()
  const { user, profile, loading, isPro, signOut } = useAuth() as any
  const [tab, setTab] = useState<Tab>('profil')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading || !user) {
    return <div style={{ padding: 48, fontFamily: FONT.body, color: SNOW.muted }}>Chargement…</div>
  }

  const plan: 'free' | 'pro' | 'premium' = profile?.plan || (isPro ? 'pro' : 'free')

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 90px' }}>
      <h1 style={{
        fontFamily: FONT.display, fontSize: 30, fontWeight: 700, color: SNOW.ink,
        letterSpacing: '-0.6px', margin: '0 0 4px',
      }}>
        Paramètres
      </h1>
      <p style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: '0 0 26px' }}>
        {user.email}
      </p>

      {/* Tabs — glass pill container */}
      <div style={{
        display: 'inline-flex', gap: 2, marginBottom: 26, padding: 4,
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: RADIUS.pill,
        boxShadow: SHADOW.insetSubtle,
        maxWidth: '100%', overflowX: 'auto',
      }}>
        {([
          ['profil', 'Profil'],
          ['securite', 'Sécurité'],
          ['abonnement', 'Abonnement'],
          ['compte', 'Compte'],
        ] as [Tab, string][]).map(([id, label]) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                fontFamily: FONT.display, fontSize: 13, fontWeight: 600,
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                borderRadius: RADIUS.pill, whiteSpace: 'nowrap',
                color: active ? '#1D1D1F' : SNOW.muted,
                background: active ? 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)' : 'transparent',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'none',
                transition: `all ${'.18s'} ${EASE.apple}`,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'profil' && <ProfilTab profile={profile} />}
      {tab === 'securite' && <SecuriteTab />}
      {tab === 'abonnement' && <AbonnementTab plan={plan} proUntil={profile?.pro_until} />}
      {tab === 'compte' && <CompteTab signOut={signOut} router={router} />}
    </div>
  )
}

/* ---------- Shared UI ---------- */

function GlassCard({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      ...GLASS.card,
      padding: 26,
      marginBottom: 16,
      ...(danger ? {
        background: 'rgba(252,235,235,0.66)',
        boxShadow: `${SHADOW.card}, inset 0 0 0 1px rgba(224,48,32,0.18)`,
      } : {}),
    }}>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontFamily: FONT.display, fontSize: 11, fontWeight: 600,
      color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: 7,
    }}>
      {children}
    </label>
  )
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focus, setFocus] = useState(false)
  return (
    <input
      {...props}
      onFocus={e => { setFocus(true); props.onFocus?.(e) }}
      onBlur={e => { setFocus(false); props.onBlur?.(e) }}
      style={{
        width: '100%', boxSizing: 'border-box', fontFamily: FONT.body, fontSize: 15,
        color: SNOW.ink, background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${focus ? SNOW.ink : SNOW.border}`,
        borderRadius: RADIUS.md, padding: '12px 14px', outline: 'none',
        transition: `border-color .15s ${EASE.apple}`,
        ...(props.style || {}),
      }}
    />
  )
}

function Btn({ children, onClick, variant = 'primary', disabled }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
}) {
  const v: Record<string, React.CSSProperties> = {
    primary: { background: SNOW.ink, color: '#fff', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.16)' },
    ghost: { background: 'rgba(255,255,255,0.6)', color: SNOW.ink, border: `1px solid ${SNOW.borderHover}` },
    danger: { background: SNOW.red, color: '#fff', border: 'none', boxShadow: '0 2px 10px rgba(224,48,32,0.22)' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: FONT.display, fontSize: 14, fontWeight: 600, padding: '12px 20px',
        borderRadius: RADIUS.md, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: `transform .15s ${EASE.apple}`,
        ...v[variant],
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {children}
    </button>
  )
}

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <p style={{
      fontFamily: FONT.body, fontSize: 13, marginTop: 12,
      color: msg.type === 'ok' ? SNOW.greenAccent : SNOW.red,
    }}>
      {msg.text}
    </p>
  )
}

/* ---------- Sélecteur de mode (persona) ---------- */

const PERSONA_OPTS: { id: Persona; title: string; desc: string; accent: string; soft: string; border: string }[] = [
  {
    id: 'collector',
    title: 'Collectionneur',
    desc: 'Collection enrichie : mastersets, illustrateurs, lore. Sans jargon financier.',
    accent: '#E03020', soft: 'rgba(224,48,32,0.10)', border: 'rgba(224,48,32,0.24)',
  },
  {
    id: 'investor',
    title: 'Investisseur',
    desc: 'Le terminal complet : P&L, signaux, Whale Tracker, Deal Hunter arbitrage.',
    accent: '#185FA5', soft: 'rgba(24,95,165,0.10)', border: 'rgba(24,95,165,0.24)',
  },
]

function PersonaPicker() {
  const { persona } = usePersona()
  const [current, setCurrent] = useState<Persona>(persona)
  const [saving, setSaving] = useState<Persona | null>(null)
  const [msg, setMsg] = useState<Msg>(null)

  // resynchronise si le profil charge après le 1er render
  useEffect(() => { setCurrent(persona) }, [persona])

  async function choose(next: Persona) {
    if (next === current || saving) return
    setSaving(next); setMsg(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: next }),
      })
      if (!res.ok) throw new Error()
      setCurrent(next)
      setMsg({ type: 'ok', text: 'Mode mis à jour. Recharge pour voir tous les changements.' })
    } catch {
      setMsg({ type: 'err', text: 'Échec du changement de mode.' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <GlassCard>
      <h3 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: SNOW.ink, margin: '0 0 4px' }}>
        Mode d'expérience
      </h3>
      <p style={{ fontFamily: FONT.body, fontSize: 13, color: SNOW.muted, margin: '0 0 16px', lineHeight: 1.5 }}>
        On adapte l'interface à ta façon de collectionner.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PERSONA_OPTS.map(o => {
          const active = current === o.id
          const busy = saving === o.id
          return (
            <button
              key={o.id}
              onClick={() => choose(o.id)}
              disabled={saving !== null}
              style={{
                textAlign: 'left', cursor: saving !== null ? 'default' : 'pointer',
                display: 'flex', alignItems: 'flex-start', gap: 13, width: '100%',
                padding: '15px 16px', borderRadius: RADIUS.lg,
                background: active ? o.soft : 'rgba(255,255,255,0.55)',
                border: `1px solid ${active ? o.border : SNOW.border}`,
                boxShadow: active ? `inset 0 0 0 1px ${o.border}` : 'none',
                transition: `all .18s ${EASE.apple}`,
              }}
            >
              <span style={{
                flex: '0 0 auto', width: 18, height: 18, borderRadius: '50%',
                border: `2px solid ${active ? o.accent : SNOW.borderHover}`,
                background: active ? o.accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                transition: `all .18s ${EASE.apple}`,
              }}>
                {active && (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 5 4 7 8 3" />
                  </svg>
                )}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: SNOW.ink }}>{o.title}</span>
                  {busy && <span style={{ fontFamily: FONT.body, fontSize: 12, color: SNOW.muted }}>…</span>}
                </span>
                <span style={{ display: 'block', fontFamily: FONT.body, fontSize: 13, color: SNOW.muted, marginTop: 3, lineHeight: 1.45 }}>
                  {o.desc}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <Feedback msg={msg} />
    </GlassCard>
  )
}

/* ---------- Profil ---------- */

function ProfilTab({ profile }: { profile: any }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [lang, setLang] = useState(profile?.lang || 'fr')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function save() {
    setMsg(null)
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setMsg({ type: 'err', text: 'Pseudo : 3-20 caractères, lettres/chiffres/_ uniquement.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, username, lang }),
      })
      if (!res.ok) throw new Error()
      setMsg({ type: 'ok', text: 'Profil enregistré.' })
    } catch {
      setMsg({ type: 'err', text: 'Échec de l’enregistrement.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <GlassCard>
      <div style={{ marginBottom: 18 }}>
        <Label>Nom affiché</Label>
        <Field value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ton nom" maxLength={40} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <Label>Pseudo</Label>
        <Field value={username} onChange={e => setUsername(e.target.value)} placeholder="pseudo" maxLength={20} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <Label>Langue</Label>
        <select
          value={lang}
          onChange={e => setLang(e.target.value)}
          style={{
            width: '100%', fontFamily: FONT.body, fontSize: 15, color: SNOW.ink,
            background: 'rgba(255,255,255,0.7)', border: `1px solid ${SNOW.border}`,
            borderRadius: RADIUS.md, padding: '12px 14px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
      <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Btn>
      <Feedback msg={msg} />
      </GlassCard>
      <PersonaPicker />
    </>
  )
}

/* ---------- Sécurité ---------- */

function SecuriteTab() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function change() {
    setMsg(null)
    if (next.length < 8) { setMsg({ type: 'err', text: 'Min. 8 caractères.' }); return }
    if (next !== confirm) { setMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' }); return }
    setSaving(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current, newPassword: next, revokeOtherSessions: true,
      })
      if (error) {
        setMsg({ type: 'err', text: error.message || 'Mot de passe actuel incorrect.' })
      } else {
        setMsg({ type: 'ok', text: 'Mot de passe mis à jour.' })
        setCurrent(''); setNext(''); setConfirm('')
      }
    } catch {
      setMsg({ type: 'err', text: 'Échec. Compte sans mot de passe (Google) ?' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlassCard>
      <div style={{ marginBottom: 18 }}>
        <Label>Mot de passe actuel</Label>
        <Field type="password" value={current} onChange={e => setCurrent(e.target.value)} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <Label>Nouveau mot de passe</Label>
        <Field type="password" value={next} onChange={e => setNext(e.target.value)} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <Label>Confirmer</Label>
        <Field type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
      <Btn onClick={change} disabled={saving}>{saving ? 'Mise à jour…' : 'Changer le mot de passe'}</Btn>
      <Feedback msg={msg} />
    </GlassCard>
  )
}

/* ---------- Abonnement ---------- */

function AbonnementTab({ plan, proUntil }: { plan: 'free' | 'pro' | 'premium'; proUntil?: string }) {
  const isPaid = plan === 'pro' || plan === 'premium'
  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: SNOW.ink }}>
          Ton forfait
        </span>
        <PlanBadge plan={plan} />
      </div>
      {isPaid && proUntil && (
        <p style={{ fontFamily: FONT.body, fontSize: 13, color: SNOW.muted, margin: '0 0 18px' }}>
          Valide jusqu’au {new Date(proUntil).toLocaleDateString('fr-FR')}
        </p>
      )}
      {!isPaid && (
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: '0 0 18px', lineHeight: 1.5 }}>
          Débloque plus de puissance : signaux, Deal Hunter, Whale Tracker et Kodo AI.
        </p>
      )}
      <a href="/abonnement" style={{ textDecoration: 'none' }}>
        <Btn variant={isPaid ? 'ghost' : 'primary'}>
          {isPaid ? 'Gérer mon abonnement' : 'Voir les forfaits'}
        </Btn>
      </a>
    </GlassCard>
  )
}

/* ---------- Compte ---------- */

function CompteTab({ signOut, router }: { signOut: () => void; router: any }) {
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function destroy() {
    if (confirm !== 'SUPPRIMER') { setMsg({ type: 'err', text: 'Tape SUPPRIMER pour confirmer.' }); return }
    setDeleting(true); setMsg(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
      })
      if (!res.ok) throw new Error()
      await authClient.signOut().catch(() => {})
      router.replace('/')
    } catch {
      setMsg({ type: 'err', text: 'Échec de la suppression.' })
      setDeleting(false)
    }
  }

  return (
    <>
      <GlassCard>
        <h3 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: SNOW.ink, margin: '0 0 6px' }}>
          Session
        </h3>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: '0 0 16px' }}>
          Déconnecte-toi de cet appareil.
        </p>
        <Btn variant="ghost" onClick={() => { signOut(); router.replace('/') }}>Se déconnecter</Btn>
      </GlassCard>

      <GlassCard danger>
        <h3 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: SNOW.red, margin: '0 0 6px' }}>
          Supprimer le compte
        </h3>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: '0 0 16px', lineHeight: 1.5 }}>
          Action <strong>irréversible</strong>. Ton profil et ton identité sont effacés.
          Tape <strong>SUPPRIMER</strong> pour confirmer.
        </p>
        <div style={{ marginBottom: 16 }}>
          <Field value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="SUPPRIMER" />
        </div>
        <Btn variant="danger" onClick={destroy} disabled={deleting || confirm !== 'SUPPRIMER'}>
          {deleting ? 'Suppression…' : 'Supprimer définitivement'}
        </Btn>
        <Feedback msg={msg} />
      </GlassCard>
    </>
  )
}
