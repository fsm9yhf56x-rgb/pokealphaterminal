'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { authClient } from '@/lib/auth/client'

const C = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  faint: '#86868B',
  accent: '#E03020',
  green: '#2E9E6A',
}
const fSora = 'var(--font-sora, Sora, system-ui, sans-serif)'
const fDM = 'var(--font-dm, "DM Sans", system-ui, sans-serif)'

type Tab = 'profil' | 'securite' | 'abonnement' | 'compte'

export default function ParametresPage() {
  const router = useRouter()
  const { user, profile, loading, isPro, signOut } = useAuth() as any
  const [tab, setTab] = useState<Tab>('profil')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div style={{ padding: 40, fontFamily: fDM, color: C.muted }}>
        Chargement…
      </div>
    )
  }

  const plan: string = profile?.plan || (isPro ? 'pro' : 'free')

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1 style={{
        fontFamily: fSora, fontSize: 28, fontWeight: 700, color: C.ink,
        letterSpacing: '-0.5px', margin: '0 0 4px',
      }}>
        Paramètres
      </h1>
      <p style={{ fontFamily: fDM, fontSize: 14, color: C.muted, margin: '0 0 24px' }}>
        {user.email}
      </p>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}`,
        marginBottom: 28, overflowX: 'auto',
      }}>
        {([
          ['profil', 'Profil'],
          ['securite', 'Sécurité'],
          ['abonnement', 'Abonnement'],
          ['compte', 'Compte'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              fontFamily: fSora, fontSize: 14, fontWeight: 600,
              padding: '10px 14px', border: 'none', background: 'transparent',
              color: tab === id ? C.ink : C.faint, cursor: 'pointer',
              borderBottom: tab === id ? `2px solid ${C.accent}` : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'profil' && <ProfilTab profile={profile} />}
      {tab === 'securite' && <SecuriteTab />}
      {tab === 'abonnement' && <AbonnementTab plan={plan} proUntil={profile?.pro_until} />}
      {tab === 'compte' && <CompteTab signOut={signOut} router={router} />}
    </div>
  )
}

/* ---------- Shared UI ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: 24, marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontFamily: fSora, fontSize: 12, fontWeight: 600,
      color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 6,
    }}>
      {children}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%', boxSizing: 'border-box', fontFamily: fDM, fontSize: 15,
        color: C.ink, background: props.disabled ? C.surface : C.bg,
        border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 13px',
        outline: 'none', ...(props.style || {}),
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
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: C.ink, color: '#fff', border: 'none' },
    ghost: { background: C.bg, color: C.ink, border: `1px solid ${C.borderStrong}` },
    danger: { background: C.accent, color: '#fff', border: 'none' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: fSora, fontSize: 14, fontWeight: 600, padding: '11px 18px',
        borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, ...styles[variant],
      }}
    >
      {children}
    </button>
  )
}

function Feedback({ msg }: { msg: { type: 'ok' | 'err'; text: string } | null }) {
  if (!msg) return null
  return (
    <p style={{
      fontFamily: fDM, fontSize: 13, marginTop: 12,
      color: msg.type === 'ok' ? C.green : C.accent,
    }}>
      {msg.text}
    </p>
  )
}

/* ---------- Profil ---------- */

function ProfilTab({ profile }: { profile: any }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [lang, setLang] = useState(profile?.lang || 'fr')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setSaving(true); setMsg(null)
    if (username && !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setSaving(false)
      setMsg({ type: 'err', text: 'Pseudo : 3-20 caractères, lettres/chiffres/_ uniquement.' })
      return
    }
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
    <Card>
      <div style={{ marginBottom: 18 }}>
        <Label>Nom affiché</Label>
        <Input value={displayName} onChange={e => setDisplayName(e.target.value)}
          placeholder="Ton nom" maxLength={40} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <Label>Pseudo</Label>
        <Input value={username} onChange={e => setUsername(e.target.value)}
          placeholder="pseudo" maxLength={20} />
      </div>
      <div style={{ marginBottom: 22 }}>
        <Label>Langue</Label>
        <select
          value={lang}
          onChange={e => setLang(e.target.value)}
          style={{
            width: '100%', fontFamily: fDM, fontSize: 15, color: C.ink,
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '11px 13px', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>
      <Btn onClick={save} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </Btn>
      <Feedback msg={msg} />
    </Card>
  )
}

/* ---------- Sécurité ---------- */

function SecuriteTab() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function change() {
    setMsg(null)
    if (next.length < 8) { setMsg({ type: 'err', text: 'Min. 8 caractères.' }); return }
    if (next !== confirm) { setMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' }); return }
    setSaving(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
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
    <Card>
      <div style={{ marginBottom: 18 }}>
        <Label>Mot de passe actuel</Label>
        <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <Label>Nouveau mot de passe</Label>
        <Input type="password" value={next} onChange={e => setNext(e.target.value)} />
      </div>
      <div style={{ marginBottom: 22 }}>
        <Label>Confirmer</Label>
        <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
      </div>
      <Btn onClick={change} disabled={saving}>
        {saving ? 'Mise à jour…' : 'Changer le mot de passe'}
      </Btn>
      <Feedback msg={msg} />
    </Card>
  )
}

/* ---------- Abonnement (lecture seule) ---------- */

function AbonnementTab({ plan, proUntil }: { plan: string; proUntil?: string }) {
  const labels: Record<string, string> = {
    free: 'Gratuit', pro: 'Pro', premium: 'Premium',
  }
  const isPaid = plan === 'pro' || plan === 'premium'
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: fSora, fontSize: 18, fontWeight: 700, color: C.ink }}>
          Plan {labels[plan] || 'Gratuit'}
        </span>
        {isPaid && (
          <span style={{
            fontFamily: fSora, fontSize: 11, fontWeight: 700, padding: '3px 8px',
            borderRadius: 6, background: C.accent, color: '#fff', letterSpacing: '0.05em',
          }}>
            ACTIF
          </span>
        )}
      </div>
      {isPaid && proUntil && (
        <p style={{ fontFamily: fDM, fontSize: 13, color: C.muted, margin: '0 0 16px' }}>
          Valide jusqu’au {new Date(proUntil).toLocaleDateString('fr-FR')}
        </p>
      )}
      {!isPaid && (
        <p style={{ fontFamily: fDM, fontSize: 14, color: C.muted, margin: '0 0 16px', lineHeight: 1.5 }}>
          Passe à Pro pour les signaux illimités, le Deal Hunter, le Whale Tracker
          et Dexy AI sans limite.
        </p>
      )}
      <a href="/abonnement" style={{ textDecoration: 'none' }}>
        <Btn variant={isPaid ? 'ghost' : 'primary'}>
          {isPaid ? 'Gérer mon abonnement' : 'Découvrir Pro'}
        </Btn>
      </a>
    </Card>
  )
}

/* ---------- Compte (zone danger) ---------- */

function CompteTab({ signOut, router }: { signOut: () => void; router: any }) {
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function destroy() {
    if (confirm !== 'SUPPRIMER') {
      setMsg({ type: 'err', text: 'Tape SUPPRIMER pour confirmer.' })
      return
    }
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
      <Card>
        <h3 style={{ fontFamily: fSora, fontSize: 16, fontWeight: 700, color: C.ink, margin: '0 0 6px' }}>
          Session
        </h3>
        <p style={{ fontFamily: fDM, fontSize: 14, color: C.muted, margin: '0 0 16px' }}>
          Déconnecte-toi de cet appareil.
        </p>
        <Btn variant="ghost" onClick={() => { signOut(); router.replace('/') }}>
          Se déconnecter
        </Btn>
      </Card>

      <div style={{
        background: '#FFF5F4', border: `1px solid ${C.accent}33`, borderRadius: 14, padding: 24,
      }}>
        <h3 style={{ fontFamily: fSora, fontSize: 16, fontWeight: 700, color: C.accent, margin: '0 0 6px' }}>
          Supprimer le compte
        </h3>
        <p style={{ fontFamily: fDM, fontSize: 14, color: C.muted, margin: '0 0 16px', lineHeight: 1.5 }}>
          Action <strong>irréversible</strong>. Ton profil et ton identité sont effacés.
          Tape <strong>SUPPRIMER</strong> ci-dessous pour confirmer.
        </p>
        <div style={{ marginBottom: 16 }}>
          <Input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="SUPPRIMER" />
        </div>
        <Btn variant="danger" onClick={destroy} disabled={deleting || confirm !== 'SUPPRIMER'}>
          {deleting ? 'Suppression…' : 'Supprimer définitivement'}
        </Btn>
        <Feedback msg={msg} />
      </div>
    </>
  )
}
