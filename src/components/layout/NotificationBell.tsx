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

const TYPE_ICON: Record<string, { icon: string; tint: string }> = {
  wishlist_price: { icon: '▾', tint: '#1D9E75' },
  goal_reached: { icon: '★', tint: '#E03020' },
  goal_almost: { icon: '◍', tint: '#C9A84C' },
  referral_reward: { icon: '◈', tint: '#6E56CF' },
  set_release: { icon: '▸', tint: '#2A82DD' },
  // Completion de serie : le moment fort du collectionneur.
  set_completed: { icon: '◆', tint: '#1D9E75' },
  set_almost: { icon: '◇', tint: '#C9A84C' },
  beta_ending: { icon: '○', tint: '#E03020' },
  test: { icon: '●', tint: '#86868B' },
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
  const [cascade, setCascade] = useState(false)
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

  useEffect(() => {
    if (unread > prevUnread.current) {
      setBump(true); setSwing(true)
      const t1 = setTimeout(() => setBump(false), 620)
      const t2 = setTimeout(() => setSwing(false), 620)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
    prevUnread.current = unread
  }, [unread])

  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 12, right: Math.max(8, window.innerWidth - r.right) })
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      setSwing(true); setTimeout(() => setSwing(false), 620)
      setLoading(true); fetchNotifs().finally(() => setLoading(false))
    }
  }

  const markAll = async () => {
    setCascade(true)
    setTimeout(() => setCascade(false), 900)
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
        @keyframes nb-pop   { 0%{ transform:scale(0) } 55%{ transform:scale(1.3) } 78%{ transform:scale(0.9) } 100%{ transform:scale(1) } }
        @keyframes nb-bump  { 0%,100%{ transform:scale(1) } 28%{ transform:scale(1.4) } 55%{ transform:scale(0.88) } 78%{ transform:scale(1.08) } }
        @keyframes nb-swing { 0%{ transform:rotate(0) } 14%{ transform:rotate(14deg) } 34%{ transform:rotate(-11deg) } 52%{ transform:rotate(7deg) } 68%{ transform:rotate(-4.5deg) } 84%{ transform:rotate(2deg) } 100%{ transform:rotate(0) } }
        @keyframes nb-panel-in { 0%{ opacity:0; transform:translateY(-14px) scale(0.93) } 58%{ opacity:1; transform:translateY(2px) scale(1.014) } 100%{ opacity:1; transform:translateY(0) scale(1) } }
        @keyframes nb-row-in   { 0%{ opacity:0; transform:translateY(12px) scale(0.97); filter:blur(7px) } 100%{ opacity:1; transform:translateY(0) scale(1); filter:blur(0) } }
        @keyframes nb-shine    { 0%{ transform:translateX(-150%) rotate(16deg); opacity:0 } 18%{ opacity:1 } 100%{ transform:translateX(170%) rotate(16deg); opacity:0 } }

        /* ── Cloche nue : pas de cercle, juste l'icone ── */
        .nb-btn{
          position:relative; width:40px; height:40px; padding:0; cursor:pointer;
          display:inline-flex; align-items:center; justify-content:center;
          background:none; border:none; box-shadow:none; color:${SNOW.ink};
          -webkit-tap-highlight-color: transparent;
        }
        .nb-ico{ transition: transform .22s cubic-bezier(.2,1.5,.4,1), color .2s; transform-origin: 50% 12%; }
        .nb-btn:hover .nb-ico{ transform: scale(1.1); }
        .nb-btn:active .nb-ico{ transform: scale(0.88); }
        .nb-btn.open .nb-ico{ color:${SNOW.accent}; }
        .nb-ico.swing{ animation: nb-swing .62s cubic-bezier(.28,.9,.3,1); }

        .nb-badge{ animation: nb-pop .42s cubic-bezier(.2,1.4,.4,1); }
        .nb-badge.bump{ animation: nb-bump .62s cubic-bezier(.28,.9,.3,1); }

        /* ── Panneau : verre depoli ── */
        .nb-panel{
          position:fixed; overflow:hidden; border-radius:24px; isolation:isolate;
          background:
            radial-gradient(150% 100% at 84% -10%, rgba(255,255,255,0.75), rgba(255,255,255,0) 58%),
            linear-gradient(180deg, rgba(255,255,255,0.74), rgba(249,251,255,0.64));
          backdrop-filter: blur(36px) saturate(200%) brightness(1.06);
          -webkit-backdrop-filter: blur(36px) saturate(200%) brightness(1.06);
          border:1px solid transparent; background-clip: padding-box;
          box-shadow:
            0 32px 74px rgba(16,20,38,0.24),
            0 12px 28px rgba(16,20,38,0.13),
            0 2px 6px rgba(16,20,38,0.06),
            inset 0 1px 0 rgba(255,255,255,0.98),
            inset 0 -14px 28px rgba(255,255,255,0.30);
          animation: nb-panel-in .38s cubic-bezier(.2,.9,.3,1) backwards;
          transform-origin: top right;
        }
        /* arete refractee */
        .nb-panel::after{
          content:''; position:absolute; inset:0; border-radius:24px; padding:1px; pointer-events:none; z-index:4;
          background: linear-gradient(150deg, rgba(255,255,255,1), rgba(255,255,255,0.28) 38%, rgba(255,255,255,0.06) 62%, rgba(130,138,160,0.34));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }
        /* balayage de lumiere a l'ouverture */
        .nb-shine{
          position:absolute; top:-30%; left:0; width:44%; height:170%; pointer-events:none; z-index:3;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%);
          filter: blur(9px);
          animation: nb-shine 1.05s cubic-bezier(.25,.6,.3,1) .1s backwards;
        }
        .nb-scroll{ position:relative; z-index:1; max-height:min(540px, 80vh); overflow-y:auto; overscroll-behavior:contain; }
        .nb-head{
          position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:space-between; padding:15px 18px;
          background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.42));
          backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%);
          border-bottom:1px solid rgba(16,20,38,0.06);
        }
        .nb-markall{ background:none; border:none; color:${SNOW.accent}; font-size:12.5px; font-weight:600; cursor:pointer; font-family:${FONT_TITLE}; padding:4px 6px; border-radius:8px; transition: background .18s, transform .12s; }
        .nb-markall:hover{ background: rgba(224,48,32,0.08); }
        .nb-markall:active{ transform: scale(0.94); }

        .nb-row{
          animation: nb-row-in .44s cubic-bezier(.2,1,.3,1) backwards;
          transition: background .2s, transform .18s cubic-bezier(.2,1,.3,1);
        }
        .nb-row:hover{ background: rgba(224,48,32,0.06) !important; transform: translateX(3px); }
        .nb-row:active{ transform: translateX(3px) scale(0.985); }
        .nb-chip{
          position:relative; flex-shrink:0; width:34px; height:34px; border-radius:11px; display:flex; align-items:center; justify-content:center;
          font-size:15px; margin-top:1px; border:1px solid rgba(255,255,255,0.7);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(16,20,38,0.07);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          transition: transform .22s cubic-bezier(.2,1.5,.4,1);
        }
        .nb-row:hover .nb-chip{ transform: scale(1.09) rotate(-4deg); }

        .nb-dot{ transition: transform .4s cubic-bezier(.2,1,.3,1), opacity .35s ease; }
        .nb-dot.read{ transform: scale(0); opacity: 0; }

        @media (prefers-reduced-motion: reduce){
          .nb-ico,.nb-badge,.nb-panel,.nb-row,.nb-dot,.nb-chip,.nb-shine{ animation:none !important; transition:none !important; }
          .nb-shine{ display:none; }
        }
      `}</style>

      <button ref={btnRef} onClick={toggle} aria-label="Notifications" className={`nb-btn${open ? ' open' : ''}`}>
        <svg className={`nb-ico${swing ? ' swing' : ''}`} viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span key={unread} className={`nb-badge${bump ? ' bump' : ''}`} style={{
            position: 'absolute', top: 3, right: 3, minWidth: 17, height: 17, padding: '0 4.5px', borderRadius: 99,
            background: `linear-gradient(180deg, #F14C3D, ${SNOW.accent})`, color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_TITLE, lineHeight: 1,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.95), 0 2px 8px rgba(224,48,32,0.5), inset 0 1px 0 rgba(255,255,255,0.45)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2147483000 }} />
          <div className="nb-panel" style={{
            top: pos.top, right: pos.right, zIndex: 2147483001,
            width: 'min(372px, calc(100vw - 16px))', fontFamily: FONT_BODY,
          }}>
            <div className="nb-shine" />
            <div className="nb-scroll">
              <div className="nb-head">
                <span style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: '-0.01em', fontFamily: FONT_TITLE, color: SNOW.ink }}>Notifications</span>
                {unread > 0 && <button onClick={markAll} className="nb-markall">Tout marquer lu</button>}
              </div>

              {loading && items.length === 0 ? (
                <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: SNOW.mutedLight }}>Chargement…</div>
              ) : items.length === 0 ? (
                <div style={{ padding: '38px 18px', textAlign: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, display: 'block', marginInline: 'auto' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <div style={{ fontSize: 13, color: SNOW.mutedLight }}>Aucune notification pour l’instant.</div>
                </div>
              ) : (
                <div style={{ padding: '6px 8px 8px' }}>
                  {items.map((n, i) => {
                    const meta = TYPE_ICON[n.type] || TYPE_ICON.test
                    return (
                      <button key={n.id} onClick={() => clickNotif(n)} className="nb-row" style={{
                        display: 'flex', width: '100%', textAlign: 'left', cursor: 'pointer', alignItems: 'flex-start', gap: 12,
                        padding: '12px', border: 'none', borderRadius: 14, background: n.read ? 'transparent' : 'rgba(224,48,32,0.05)',
                        animationDelay: `${Math.min(i, 8) * 45}ms`, marginBottom: 2,
                      }}>
                        <span className="nb-chip" style={{ background: `linear-gradient(180deg, ${meta.tint}26, ${meta.tint}10)`, color: meta.tint }}>{meta.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`nb-dot${n.read ? ' read' : ''}`} style={{
                              width: 7, height: 7, borderRadius: 99, background: SNOW.accent, flexShrink: 0,
                              transitionDelay: cascade ? `${Math.min(i, 8) * 55}ms` : '0ms',
                            }} />
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
          </div>
        </>,
        document.body,
      )}
    </>
  )
}
