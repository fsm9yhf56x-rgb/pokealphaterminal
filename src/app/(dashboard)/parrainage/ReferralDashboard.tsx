'use client'

import { useState } from 'react'

interface Props {
  code: string
  link: string
  counts: { total: number; qualified: number; rewarded: number }
  filleuls: { status: string; date: string }[]
  premiumUntil: string | null
  leaderboard: { name: string | null; total: number; rewarded: number; isMe: boolean }[]
}

const SNOW = { ink: '#1D1D1F', muted: '#6E6E73', mutedLight: '#86868B', border: '#E5E5EA', surface: '#F5F5F7', accent: '#E03020' }
const FONT_TITLE = "var(--font-sora, 'Sora', sans-serif)"
const FONT_BODY = "var(--font-dm, 'DM Sans', system-ui, sans-serif)"
const FONT_MONO = "var(--font-mono, 'Space Mono', monospace)"

function maskName(name: string | null): string {
  if (!name || !name.trim()) return 'Dresseur Kodo'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: '#86868B', bg: '#F5F5F7' },
  qualified: { label: 'Qualifié', color: '#C9A84C', bg: 'rgba(201,168,76,0.12)' },
  rewarded: { label: 'Récompensé', color: '#1D9E75', bg: 'rgba(29,158,117,0.12)' },
}

export default function ReferralDashboard({ code, link, counts, filleuls, premiumUntil, leaderboard }: Props) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const copy = (text: string, which: 'code' | 'link') => {
    try {
      navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 1800)
    } catch { /* ignore */ }
  }

  const share = async () => {
    const text = 'Rejoins-moi sur Kodo Cards pour suivre ta collection Pokémon 🔥 Avec mon lien, on gagne chacun 1 mois Premium.'
    try {
      if (navigator.share) await navigator.share({ title: 'Kodo Cards', text, url: link })
      else copy(link, 'link')
    } catch { /* annulé */ }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 24, fontFamily: FONT_BODY, color: SNOW.ink }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px', fontFamily: FONT_TITLE }}>Parrainage</h1>
      <p style={{ fontSize: 14, color: SNOW.muted, margin: '0 0 24px', lineHeight: 1.5 }}>
        Partage ton lien. Quand un filleul prend un <strong>abonnement annuel</strong>, vous gagnez chacun <strong>1 mois Premium offert</strong>.
      </p>

      {/* Carte code + partage */}
      <div style={{ background: '#fff', border: `1px solid ${SNOW.border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: SNOW.mutedLight, marginBottom: 10 }}>Ton code</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', color: SNOW.accent }}>{code}</div>
          <button onClick={() => copy(code, 'code')} style={btnGhost}>{copied === 'code' ? 'Copié ✓' : 'Copier le code'}</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: '1 1 260px', minWidth: 0, padding: '10px 12px', borderRadius: 10, background: SNOW.surface,
            border: `1px solid ${SNOW.border}`, fontSize: 12.5, color: SNOW.muted, fontFamily: FONT_MONO,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{link}</div>
          <button onClick={() => copy(link, 'link')} style={btnGhost}>{copied === 'link' ? 'Copié ✓' : 'Copier le lien'}</button>
          <button onClick={share} style={btnPrimary}>Partager</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: premiumUntil ? 14 : 24 }}>
        <Stat label="Filleuls" value={counts.total} />
        <Stat label="Abonnés annuels" value={counts.qualified} />
        <Stat label="Mois Premium gagnés" value={counts.rewarded} accent />
      </div>

      {premiumUntil && (
        <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 12, background: 'rgba(110,86,207,0.08)', border: '1px solid rgba(110,86,207,0.25)', fontSize: 13.5, color: '#5B4BC4' }}>
          🎁 Premium offert actif jusqu’au <strong>{premiumUntil}</strong>.
        </div>
      )}

      {/* Filleuls */}
      <Section title={`Mes filleuls${counts.total ? ` · ${counts.total}` : ''}`}>
        {filleuls.length === 0 ? (
          <Empty>Aucun filleul pour l’instant. Partage ton lien pour commencer.</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filleuls.map((f, i) => {
              const st = STATUS_LABEL[f.status] || STATUS_LABEL.pending
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', border: `1px solid ${SNOW.border}`, borderRadius: 10 }}>
                  <span style={{ fontSize: 13.5, color: SNOW.ink }}>Filleul · inscrit le {f.date}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: st.color, background: st.bg, padding: '4px 10px', borderRadius: 99 }}>{st.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* Leaderboard */}
      <Section title="Classement des parrains">
        {leaderboard.length === 0 ? (
          <Empty>Le classement s’affichera dès les premiers parrainages.</Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {leaderboard.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
                background: r.isMe ? 'rgba(224,48,32,0.06)' : '#fff',
                border: `1px solid ${r.isMe ? 'rgba(224,48,32,0.25)' : SNOW.border}`,
              }}>
                <span style={{ width: 26, fontWeight: 700, fontFamily: FONT_MONO, color: i < 3 ? SNOW.accent : SNOW.mutedLight, fontSize: 14 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: r.isMe ? 700 : 500, color: SNOW.ink }}>
                  {maskName(r.name)}{r.isMe && <span style={{ color: SNOW.accent, fontWeight: 700 }}> · toi</span>}
                </span>
                <span style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT_MONO }}>{r.total} filleul{r.total > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ background: accent ? 'rgba(224,48,32,0.05)' : '#fff', border: `1px solid ${accent ? 'rgba(224,48,32,0.2)' : SNOW.border}`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: accent ? '#C42E1F' : SNOW.ink, fontFamily: FONT_MONO }}>{value.toLocaleString('fr')}</div>
      <div style={{ fontSize: 11.5, color: SNOW.mutedLight, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, fontFamily: FONT_TITLE }}>{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: SNOW.mutedLight, padding: '16px 0' }}>{children}</div>
}

const btnGhost: React.CSSProperties = {
  fontFamily: FONT_TITLE, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '9px 14px',
  borderRadius: 999, background: '#fff', color: SNOW.ink, border: `1px solid ${SNOW.border}`,
}
const btnPrimary: React.CSSProperties = {
  fontFamily: FONT_TITLE, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '9px 16px',
  borderRadius: 999, background: SNOW.accent, color: '#fff', border: `1px solid ${SNOW.accent}`,
}
