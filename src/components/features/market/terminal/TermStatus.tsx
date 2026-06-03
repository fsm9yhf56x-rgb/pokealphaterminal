'use client'

import { useState, useEffect } from 'react'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'

export function TermStatus({
  status, lastUpdate,
}: {
  status: 'open' | 'closed'
  lastUpdate: Date | null
}) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      ...GLASS.card,
      padding: '16px 20px',
      boxShadow: `${GLASS.card.boxShadow as string}, 0 0 0 0.5px rgba(255,255,255,0.7)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <div>
        <p style={{ fontSize:'10px', color:SNOW.mutedLight, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 4px', fontFamily:FONT.display }}>Market</p>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
          <h1 style={{ fontSize:'26px', fontWeight:600, color:SNOW.ink, fontFamily:FONT.display, letterSpacing:'-0.5px', margin:0 }}>Terminal</h1>
          <StatusBadge status={status} />
        </div>
      </div>

      <div style={{ textAlign:'right', display:'flex', flexDirection:'column', gap:'4px' }}>
        <div style={{ fontSize:'20px', fontWeight:500, color:SNOW.ink, fontFamily:FONT.data, letterSpacing:'-0.3px', fontVariantNumeric:'tabular-nums', lineHeight:1.1 }}>
          {formatClock(now)}
          <span style={{ fontSize:'11px', color:SNOW.mutedLight, marginLeft:'6px', fontWeight:400, letterSpacing:'0.05em' }}>{getTimezoneAbbr(now)}</span>
        </div>
        <div style={{ fontSize:'10px', color:SNOW.mutedLight, fontFamily:FONT.display }}>
          {lastUpdate
            ? <>Dernière mise à jour · <span style={{ color:SNOW.ink }}>{formatRelative(lastUpdate, now)}</span></>
            : '—'}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'open' | 'closed' }) {
  const isOpen = status === 'open'
  const dot    = isOpen ? SNOW.greenAccent : SNOW.mutedLight
  const bg     = isOpen ? 'rgba(38,166,91,.10)' : SNOW.surface
  const border = isOpen ? 'rgba(38,166,91,.28)' : SNOW.border
  const text   = isOpen ? SNOW.greenAccent : SNOW.mutedLight

  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'4px 10px', background:bg, border:`1px solid ${border}`, borderRadius:'6px' }}>
      <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:dot, animation:isOpen?'pulse-status 2s ease-in-out infinite':'none' }} />
      <span style={{ fontSize:'10px', fontWeight:700, color:text, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:FONT.display }}>
        {isOpen ? 'Open' : 'Closed'}
      </span>
      <style>{`
        @keyframes pulse-status { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        @media (prefers-reduced-motion: reduce){ @keyframes pulse-status { 0%,100%{opacity:1;transform:none} } }
      `}</style>
    </div>
  )
}

function formatClock(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function getTimezoneAbbr(d: Date): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(d)
    const tz = formatted.find(p => p.type === 'timeZoneName')?.value
    if (tz) return tz
  } catch {}
  const offsetMin = d.getTimezoneOffset()
  const sign = offsetMin <= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const hh = Math.floor(abs / 60).toString().padStart(2, '0')
  return `UTC${sign}${hh}`
}

function formatRelative(then: Date, now: Date): string {
  const diff = (now.getTime() - then.getTime()) / 1000
  if (diff < 5)    return 'à l\'instant'
  if (diff < 60)   return `il y a ${Math.floor(diff)}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}
