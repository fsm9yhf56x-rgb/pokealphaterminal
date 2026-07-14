'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

interface Notif {
  id: number
  type: string
  title: string
  body: string | null
  data: any
  read: boolean
  at: string
}

const SNOW = { ink: '#1D1D1F', muted: '#6E6E73', mutedLight: '#86868B', border: '#E5E5EA', surface: '#F5F5F7', accent: '#E03020' }
const FONT_TITLE = "var(--font-sora, 'Sora', sans-serif)"
const FONT_BODY = "var(--font-dm, 'DM Sans', system-ui, sans-serif)"

// Icône par type (émoji discret dans une pastille de couleur)
const TYPE_ICON: Record<string, { icon: string; tint: string }> = {
  wishlist_price: { icon: '▾', tint: '#1D9E75' },
  goal_reached: { icon: '★', tint: '#E03020' },
  goal_almost: { icon: '◍', tint: '#C9A84C' },
  referral_reward: { icon: '🎁', tint: '#6E56CF' },
  test: { icon: '🔔', tint: '#86868B' },
}

export default function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const [swing, setSwing] = useState(false)
  const [bump, setBump] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const prevUnread = useRef(0)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications', { credentials: 'include' })
      if (!res.ok) return
      const d = await res.json()
      setItems(d.items || [])
      setUnread(d.unread || 0)
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => {
    if (!user?.id) { setItems([]); setUnread(0); return }
    fetchNotifs()
    const t = setInterval(fetchNotifs, 60000)
    return () => clearInterval(t)
  }, [user?.id, fetchNotifs])

  // Pulse quand un nouveau non-lu arrive
  useEffect(() => {
    if (unread > prevUnread.current) { setBump(true); const t = setTimeout(() => setBump(false), 600); return () => clearTimeout(t) }
    prevUnread.current = unread
  }, [unread])

  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 10, right: Math.max(8, window.innerWidth - r.right) })
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      setSwing(true); setTimeout(() => setSwing(false), 500)
      setLoading(true); fetchNotifs().finally(() => setLoading(false))
    }
  }

  const markAll = async () => {
    setUnread(0); prevUnread.current = 0
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    try { await fetch('/api/v1/notifications', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }) } catch {}
  }

  const clickNotif = async (n: Notif) => {
    if (!n.read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(u => { const v = Math.max(0, u - 1); prevUnread.current = v; return v })
      try { await fetch('/api/v1/notifications', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }) } catch {}
    }
    const url = n.data?.url
    if (typeof url === 'string' && url.startsWith('/')) { setOpen(false); router.push(url) }
  }

  if (!user?.id) return null

  return (
    <>
      <style>{`
        @keyframes nb-pop { 0%{ transform:scale(0); } 60%{ transform:scale(1.25); } 100%{ transform:scale(1); } }
        @keyframes nb-bump { 0%,100%{ transform:scale(1); } 30%{ transform:scale(1.35); } 60%{ transform:scale(0.92); } }
        @keyframes nb-swing { 0%{ transform:rotate(0); } 20%{ transform:rotate(11deg); } 45%{ transform:rotate(-9deg); } 68%{ transform:rotate(5deg); } 85%{ transform:rotate(-3deg); } 100%{ transform:rotate(0); } }
        @keyframes nb-panel-in { 0%{ opacity:0; transform:translateY(-8px) scale(0.96); } 100%{ opacity:1; transform:translateY(0) scale(1); } }
        @keyframes nb-row-in { 0%{ opacity:0; transform:translateY(6px); } 100%{ opacity:1; transform:translateY(0); } }
        .nb-btn{ transition: background .2s, box-shadow .2s, transform .12s; }
        .nb-btn:hover{ transform: translateY(-1px); }
        .nb-btn:active{ transform: translateY(0) scale(0.96); }
        .nb-ico{ transition: transform .2s; }
        .nb-ico.swing{ animation: nb-swing .5s ease; transform-origin: 50% 15%; }
        .nb-badge{ animation: nb-pop .35s cubic-bezier(.2,1.4,.4,1); }
        .nb-badge.bump{ animation: nb-bump .55s ease; }
        .nb-panel{ animation: nb-panel-in .22s cubic-bezier(.2,1,.3,1); transform-origin: top right; }
        .nb-row{ animation: nb-row-in .28s cubic-bezier(.2,1,.3,1) both; }
        .nb-row:hover{ background: rgba(224,48,32,0.05) !important; }
        .nb-dot{ transition: transform .35s cubic-bezier(.2,1,.3,1), opacity .35s ease; }
        .nb-dot.read{ transform: scale(0); opacity: 0; }
        @media (prefers-reduced-motion: reduce){
          .nb-btn,.nb-ico,.nb-badge,.nb-panel,.nb-row,.nb-dot{ animation: none !important; transition: none !important; }
        }
      `}</style>

      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Notifications"
        className="nb-btn"
        style={{
          position: 'relative', width: 40, height: 40, borderRadius: 12, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: SNOW.ink,
          background: open ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.62)',
          backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
        }}
      >
        <svg className={`nb-ico${swing ? ' swing' : ''}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span key={unread} className={`nb-badge${bump ? ' bump' : ''}`} style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99,
            background: SNOW.accent, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_TITLE, boxShadow: '0 0 0 2px #fff, 0 2px 8px rgba(224,48,32,0.5)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2147483000 }} />
          <div className="nb-panel" style={{
            position: 'fixed', top: pos.top, right: pos.right, zIndex: 2147483001,
            width: 'min(370px, calc(100vw - 16px))', maxHeight: 'min(540px, 80vh)', overflowY: 'auto',
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(40px) saturate(190%)', WebkitBackdropFilter: 'blur(40px) saturate(190%)',
            border: '1px solid rgba(255,255,255,0.7)', borderRadius: 20,
            boxShadow: '0 18px 50px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
            fontFamily: FONT_BODY,
          }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: `1px solid ${SNOW.surface}` }}>
              <span style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.01em', fontFamily: FONT_TITLE }}>Notifications</span>
              {unread > 0 && <button onClick={markAll} style={{ background: 'none', border: 'none', color: SNOW.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_TITLE }}>Tout marquer lu</button>}
            </div>

            {loading && items.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: SNOW.mutedLight }}>Chargement…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '36px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, marginBottom: 8, opacity: 0.5 }}>🔔</div>
                <div style={{ fontSize: 13, color: SNOW.mutedLight }}>Aucune notification pour l’instant.</div>
              </div>
            ) : (
              <div style={{ padding: '6px 8px' }}>
                {items.map((n, i) => {
                  const meta = TYPE_ICON[n.type] || TYPE_ICON.test
                  return (
                    <button
                      key={n.id}
                      onClick={() => clickNotif(n)}
                      className="nb-row"
                      style={{
                        display: 'flex', width: '100%', textAlign: 'left', cursor: 'pointer', alignItems: 'flex-start', gap: 12,
                        padding: '12px 12px', border: 'none', borderRadius: 14, background: n.read ? 'transparent' : 'rgba(224,48,32,0.04)',
                        animationDelay: `${Math.min(i, 8) * 32}ms`, marginBottom: 2,
                      }}
                    >
                      <span style={{
                        flexShrink: 0, width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: meta.tint + '18', color: meta.tint, fontSize: 15, marginTop: 1,
                      }}>{meta.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`nb-dot${n.read ? ' read' : ''}`} style={{ width: 7, height: 7, borderRadius: 99, background: SNOW.accent, flexShrink: 0 }} />
                          <span style={{ fontSize: 13.5, fontWeight: n.read ? 500 : 700, color: SNOW.ink }}>{n.title}</span>
                        </div>
                        {n.body && <div style={{ fontSize: 12.5, color: SNOW.muted, lineHeight: 1.45, marginTop: 3 }}>{n.body}</div>}
                        <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 5 }}>{n.at}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
