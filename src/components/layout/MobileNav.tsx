'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNav } from '@/lib/useNav'
import type { SoonInfo } from '@/lib/constants/navigation'
import { SoonModal, SoonBadge } from '@/components/ui/snow'

/**
 * MobileNav — drawer de navigation principale < 1024px.
 *
 * Twist signature : la section active porte le point vert "live" du logo
 * (meme pulse), comme un terminal allume. Icone morph hamburger -> X avec
 * barre centrale rouge accent. Items en cascade a l'ouverture.
 *
 * Rendu via portal sur <body> : le header parent a un backdrop-filter qui
 * piegerait un position:fixed (containing block).
 */
export function MobileNav() {
  const NAV = useNav()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [soonModal, setSoonModal] = useState<SoonInfo | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const openSoon = (info: SoonInfo) => { setOpen(false); setSoonModal(info) }

  const drawer = (
    <>
      <div
        className={`kmnav-overlay${open ? ' on' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <nav
        className={`kmnav-panel${open ? ' on' : ''}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Navigation principale"
      >
        <div className="kmnav-brand">
          <span className="kmnav-tile">K<span className="kmnav-tile-dot" /></span>
          <span className="kmnav-brand-name">Kodo<span style={{ color: '#C42E1F' }}> Cards</span></span>
        </div>

        <div className="kmnav-eyebrow">Navigation</div>

        <div className="kmnav-list">
          {NAV.map((item, i) => {
            const active = pathname.startsWith(item.href) ||
              item.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))

            if (item.soon) {
              return (
                <a
                  key={item.href}
                  href="#"
                  className="kmnav-item"
                  style={{ ['--i' as any]: i }}
                  onClick={(e) => { e.preventDefault(); openSoon(item.soon!) }}
                >
                  <span className="kmnav-dot" />
                  <span>{item.label}</span>
                  <SoonBadge version={item.soon.version} variant="inline" style={{ marginLeft: 'auto' }} />
                </a>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.children?.[0]?.href ?? item.href}
                className={`kmnav-item${active ? ' act' : ''}`}
                style={{ ['--i' as any]: i }}
              >
                <span className="kmnav-dot" />
                <span>{item.label}</span>
                {item.pro && <span className="kmnav-pro">PRO</span>}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
  return (
    <>
      <style>{`
        .kmnav-trigger {
          display: none;
          width: 38px; height: 38px; border-radius: 11px;
          border: 0.5px solid rgba(255,255,255,0.6);
          background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.5));
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          box-shadow: 0 4px 14px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9);
          cursor: pointer; padding: 0; flex-shrink: 0; margin-right: 10px;
          align-items: center; justify-content: center;
          transition: transform .2s cubic-bezier(.2,.85,.3,1);
        }
        .kmnav-trigger:active { transform: scale(.93); }
        @media (max-width: 1023px) { .kmnav-trigger { display: inline-flex !important; } }

        .kmnav-ico { position: relative; width: 18px; height: 14px; display: inline-block; }
        .kmnav-ico span {
          position: absolute; left: 0; height: 2px; width: 100%;
          background: #1D1D1F; border-radius: 2px;
          transition: transform .34s cubic-bezier(.2,.85,.3,1), opacity .2s, width .34s;
        }
        .kmnav-ico span:nth-child(1) { top: 0; }
        .kmnav-ico span:nth-child(2) { top: 6px; width: 64%; background: #E03020; }
        .kmnav-ico span:nth-child(3) { top: 12px; }
        .kmnav-ico.on span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .kmnav-ico.on span:nth-child(2) { opacity: 0; width: 0; }
        .kmnav-ico.on span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

        .kmnav-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(20,20,28,0.30);
          backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
          opacity: 0; pointer-events: none; transition: opacity .32s ease;
        }
        .kmnav-overlay.on { opacity: 1; pointer-events: auto; }

        .kmnav-panel {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 1001;
          width: min(82vw, 318px); padding: 20px 14px 26px;
          display: flex; flex-direction: column;
          background: linear-gradient(180deg, rgba(255,255,255,0.93), rgba(255,255,255,0.87));
          backdrop-filter: blur(38px) saturate(180%);
          -webkit-backdrop-filter: blur(38px) saturate(180%);
          border-right: 0.5px solid rgba(255,255,255,0.6);
          box-shadow: 0 24px 70px rgba(0,0,0,0.20), inset -1px 0 0 rgba(255,255,255,0.5);
          transform: translateX(-101%);
          transition: transform .38s cubic-bezier(.2,.9,.25,1);
          overflow-y: auto;
        }
        .kmnav-panel.on { transform: translateX(0); }

        .kmnav-brand { display: flex; align-items: center; gap: 9px; padding: 4px 10px; }
        .kmnav-tile {
          position: relative; width: 30px; height: 30px; border-radius: 9px;
          background: #1D1D1F; color: #fff; font-weight: 800; font-size: 13.5px;
          display: flex; align-items: center; justify-content: center; letter-spacing: -0.02em;
          box-shadow: 0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14);
          font-family: var(--font-sora, Sora, sans-serif);
        }
        .kmnav-tile-dot {
          position: absolute; top: -2px; right: -2px; width: 6px; height: 6px;
          border-radius: 50%; background: #2E9E6A;
          box-shadow: 0 0 6px rgba(46,158,106,0.7);
          animation: kmnavPulse 2.4s ease-in-out infinite;
        }
        .kmnav-brand-name {
          font-size: 15px; font-weight: 700; color: #1D1D1F;
          letter-spacing: -0.025em; font-family: var(--font-sora, Sora, sans-serif);
        }

        .kmnav-eyebrow {
          font-size: 10px; font-weight: 700; color: #AEAEB2;
          text-transform: uppercase; letter-spacing: 0.16em;
          padding: 18px 12px 8px; font-family: var(--font-sora, Sora, sans-serif);
        }

        .kmnav-list { display: flex; flex-direction: column; gap: 3px; }
        .kmnav-item {
          display: flex; align-items: center; gap: 11px;
          padding: 13px 14px; border-radius: 13px;
          font-size: 15px; font-weight: 500; color: #1D1D1F;
          letter-spacing: -0.01em; text-decoration: none;
          border: 0.5px solid transparent;
          font-family: var(--font-sora, Sora, sans-serif);
          opacity: 0; transform: translateX(-9px);
          transition: background .2s, border-color .2s, box-shadow .2s;
        }
        .kmnav-panel.on .kmnav-item {
          animation: kmnavIn .42s cubic-bezier(.2,.85,.3,1) forwards;
          animation-delay: calc(var(--i) * 42ms + 130ms);
        }
        @keyframes kmnavIn { to { opacity: 1; transform: translateX(0); } }
        .kmnav-item:active { background: rgba(0,0,0,0.04); }
        .kmnav-item.act {
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72));
          border-color: rgba(0,0,0,0.05); font-weight: 600;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.95);
        }

        .kmnav-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: transparent; flex-shrink: 0; transition: background .3s;
        }
        .kmnav-item.act .kmnav-dot {
          background: #2E9E6A;
          box-shadow: 0 0 7px rgba(46,158,106,0.75);
          animation: kmnavPulse 2.4s ease-in-out infinite;
        }

        .kmnav-pro {
          margin-left: auto; font-size: 8.5px; font-weight: 800;
          background: linear-gradient(135deg, #C9A84C, #FFE08A); color: #5C4200;
          padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;
          font-family: var(--font-sora, Sora, sans-serif);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
        }

        @keyframes kmnavPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .45; transform: scale(.7); }
        }
      `}</style>

      <button
        className="kmnav-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={open}
      >
        <span className={`kmnav-ico${open ? ' on' : ''}`}>
          <span /><span /><span />
        </span>
      </button>

      {mounted && createPortal(drawer, document.body)}

      {soonModal && (
        <SoonModal
          open={!!soonModal}
          onClose={() => setSoonModal(null)}
          feature={soonModal.feature}
          version={soonModal.version}
          description={soonModal.description}
          bullets={soonModal.bullets}
          brevoListId={Number(process.env.NEXT_PUBLIC_BREVO_WAITLIST_V2_LIST_ID) || 3}
        />
      )}
    </>
  )
}
