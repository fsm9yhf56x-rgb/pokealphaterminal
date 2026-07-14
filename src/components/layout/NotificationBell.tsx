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

export default function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications', { credentials: 'include' })
      if (!res.ok) return
      const d = await res.json()
      setItems(d.items || [])
      setUnread(d.unread || 0)
    } catch { /* silencieux */ }
  }, [])

  // Poll léger du compteur (toutes les 60s) tant que connecté
  useEffect(() => {
    if (!user?.id) { setItems([]); setUnread(0); return }
    fetchNotifs()
    const t = setInterval(fetchNotifs, 60000)
    return () => clearInterval(t)
  }, [user?.id, fetchNotifs])

  // Position du panneau (portal) sous la cloche
  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) })
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) { setLoading(true); fetchNotifs().finally(() => setLoading(false)) }
  }

  const markAll = async () => {
    setUnread(0)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    try { await fetch('/api/v1/notifications', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }) } catch {}
  }

  const clickNotif = async (n: Notif) => {
    if (!n.read) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(u => Math.max(0, u - 1))
      try { await fetch('/api/v1/notifications', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }) } catch {}
    }
    const url = n.data?.url
    if (typeof url === 'string' && url.startsWith('/')) { setOpen(false); router.push(url) }
  }

  if (!user?.id) return null

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Notifications"
        style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, border: `1px solid ${SNOW.border}`, background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: SNOW.ink }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99, background: SNOW.accent, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_TITLE, boxShadow: '0 0 0 2px #fff' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2147483000 }} />
          <div style={{
            position: 'fixed', top: pos.top, right: pos.right, zIndex: 2147483001,
            width: 'min(360px, calc(100vw - 16px))', maxHeight: 'min(520px, 80vh)', overflowY: 'auto',
            background: '#fff', border: `1px solid ${SNOW.border}`, borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)', fontFamily: FONT_BODY,
          }}>
            <div style={{ position: 'sticky', top: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${SNOW.border}` }}>
              <span style={{ fontWeight: 700, fontSize: 15, fontFamily: FONT_TITLE }}>Notifications</span>
              {unread > 0 && <button onClick={markAll} style={{ background: 'none', border: 'none', color: SNOW.accent, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_TITLE }}>Tout marquer lu</button>}
            </div>

            {loading && items.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: SNOW.mutedLight }}>Chargement…</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: SNOW.mutedLight }}>Aucune notification pour l’instant.</div>
            ) : (
              <div>
                {items.map(n => (
                  <button
                    key={n.id}
                    onClick={() => clickNotif(n)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                      padding: '12px 16px', border: 'none', borderBottom: `1px solid ${SNOW.surface}`,
                      background: n.read ? '#fff' : 'rgba(224,48,32,0.035)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {!n.read && <span style={{ width: 7, height: 7, borderRadius: 99, background: SNOW.accent, marginTop: 5, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: n.read ? 500 : 700, color: SNOW.ink, marginBottom: 2 }}>{n.title}</div>
                        {n.body && <div style={{ fontSize: 12.5, color: SNOW.muted, lineHeight: 1.4 }}>{n.body}</div>}
                        <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 4 }}>{n.at}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
