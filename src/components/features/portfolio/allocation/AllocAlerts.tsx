'use client'

import type { AllocAggregates, AllocAlert } from './Allocation'

/**
 * Bandeau d'alertes auto-détectées (concentration, surexposition, etc.)
 * Affiché en haut de page, avant le treemap.
 */
export function AllocAlerts({ agg }: { agg: AllocAggregates }) {
  // Les alertes "Surexposition X" font doublon avec les footers de AllocBreakdowns
  // (chaque breakdown affiche deja "Forte concentration sur X"). On ne garde ici
  // que les alertes de synthese globale (concentration), le vrai takeaway.
  const alerts = agg.alerts.filter(a => !a.title.startsWith('Surexposition'))
  if (alerts.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {alerts.map((alert, i) => (
        <AlertBanner key={i} alert={alert} />
      ))}
    </div>
  )
}

function AlertBanner({ alert }: { alert: AllocAlert }) {
  const style = LEVEL_STYLES[alert.level]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: 12,
      alignItems: 'flex-start',
      padding: '14px 18px',
      background: style.bg,
      backdropFilter: 'blur(14px) saturate(180%)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
      border: `1px solid ${style.border}`,
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: style.iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '1px',
      }}>
        <Icon level={alert.level} color={style.iconColor} />
      </div>

      <div>
        <div style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: style.titleColor,
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          marginBottom: 3,
        }}>{alert.title}</div>
        <div style={{
          fontSize: 12,
          color: style.messageColor,
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          lineHeight: 1.45,
        }}>{alert.message}</div>
      </div>
    </div>
  )
}

function Icon({ level, color }: { level: AllocAlert['level']; color: string }) {
  if (level === 'danger' || level === 'warn') {
    // Triangle warning
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 1.5L11 10.5H1L6 1.5Z"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M6 5V7"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="6" cy="9" r="0.6" fill={color} />
      </svg>
    )
  }
  // Info circle
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M6 5V8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="3.5" r="0.6" fill={color} />
    </svg>
  )
}

/* Snow+ alert palette — semantic tokens */
const LEVEL_STYLES: Record<AllocAlert['level'], {
  bg: string
  border: string
  iconBg: string
  iconColor: string
  titleColor: string
  messageColor: string
}> = {
  info: {
    bg: 'rgba(255,255,255,0.65)',
    border: 'rgba(0,0,0,0.06)',
    iconBg: 'rgba(74,107,138,0.12)',
    iconColor: '#4A6B8A',
    titleColor: '#1D1D1F',
    messageColor: '#86868B',
  },
  warn: {
    bg: 'rgba(255,248,236,0.7)',
    border: 'rgba(201,168,76,0.3)',
    iconBg: 'rgba(201,168,76,0.18)',
    iconColor: '#8A6500',
    titleColor: '#5C4400',
    messageColor: '#7A5C0A',
  },
  danger: {
    bg: 'rgba(254,242,242,0.7)',
    border: 'rgba(196,46,31,0.25)',
    iconBg: 'rgba(196,46,31,0.12)',
    iconColor: '#C42E1F',
    titleColor: '#C42E1F',
    messageColor: '#8B2218',
  },
}
