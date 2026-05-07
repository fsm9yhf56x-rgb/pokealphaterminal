'use client'

import type { AllocAggregates, AllocAlert } from './Allocation'

/**
 * Bandeau d'alertes auto-détectées (concentration, surexposition, etc.)
 * Affiché en haut de page, avant le treemap.
 */
export function AllocAlerts({ agg }: { agg: AllocAggregates }) {
  if (agg.alerts.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {agg.alerts.map((alert, i) => (
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
      gap: '12px',
      alignItems: 'flex-start',
      padding: '12px 16px',
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: '10px',
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
          fontSize: '12px',
          fontWeight: 600,
          color: style.titleColor,
          fontFamily: 'var(--font-display)',
          marginBottom: '2px',
        }}>{alert.title}</div>
        <div style={{
          fontSize: '12px',
          color: style.messageColor,
          fontFamily: 'var(--font-display)',
          lineHeight: 1.4,
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
    bg: 'var(--surface)',
    border: 'var(--border)',
    iconBg: '#F0F4F8',
    iconColor: '#4A6B8A',
    titleColor: 'var(--ink)',
    messageColor: 'var(--ink-muted)',
  },
  warn: {
    bg: '#FFF8EC',
    border: '#F5D78E',
    iconBg: '#FCE8B0',
    iconColor: '#8A6500',
    titleColor: '#5C4400',
    messageColor: '#7A5C0A',
  },
  danger: {
    bg: 'var(--perf-down-soft)',
    border: 'var(--red-border)',
    iconBg: 'var(--red-light)',
    iconColor: 'var(--perf-down)',
    titleColor: 'var(--perf-down)',
    messageColor: '#8B2218',
  },
}
