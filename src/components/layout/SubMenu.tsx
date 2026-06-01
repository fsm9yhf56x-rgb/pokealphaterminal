'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { NAV } from '@/lib/constants/navigation'
import type { SoonInfo } from '@/lib/constants/navigation'
import { SoonModal, SoonBadge } from '@/components/ui/snow'

export function SubMenu() {
  const pathname = usePathname()
  const [open] = useState(true)
  const [soonModal, setSoonModal] = useState<SoonInfo | null>(null)

  const section = NAV.find(n => pathname.startsWith(n.href) && n.href !== '/')
    ?? NAV.find(n => n.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/')))

  if (!section?.children?.length) return null

  return (
    <>
      <style>{`
        .ksub-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          color: #6E6E73;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          letter-spacing: -0.01em;
          text-decoration: none;
          transition: all .2s cubic-bezier(.2,.8,.2,1);
          cursor: pointer;
          position: relative;
        }
        .ksub-link:hover {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          color: #1D1D1F;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85);
        }
        .ksub-link.act {
          background: rgba(224,48,32,0.08);
          color: #E03020;
          font-weight: 600;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
        }
        .ksub-link.act::before {
          content: \'\';
          position: absolute;
          left: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 16px;
          border-radius: 2px;
          background: #E03020;
          box-shadow: 0 0 8px rgba(224,48,32,0.5);
        }
        .ksub-pro {
          font-size: 8.5px;
          font-weight: 800;
          background: linear-gradient(135deg, #E03020, #FF6644);
          color: #fff;
          padding: 1px 5px;
          border-radius: 4px;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          margin-left: auto;
          letter-spacing: 0.05em;
          box-shadow: 0 1px 2px rgba(224,48,32,0.3);
        }
      `}</style>

      <aside style={{
        width: open ? 220 : 0,
        minWidth: open ? 220 : 0,
        padding: open ? '24px 12px' : 0,
        overflow: 'hidden',
        transition: 'all .3s cubic-bezier(.2,.8,.2,1)',
        flexShrink: 0,
        position: 'relative' as const,
        zIndex: 1,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.4) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderRight: '0.5px solid rgba(255,255,255,0.55)',
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.02), inset 1px 0 0 rgba(255,255,255,0.7)',
      }}>
        {open && (
          <>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#AEAEB2',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.16em',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              padding: '0 14px 4px',
              marginBottom: 10,
            }}>{section.label}</div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
              {section.children.map(child => {
                const isActive = pathname === child.href ||
                  (child.href !== section.href && pathname.startsWith(child.href + '/'))

                if (child.soon) {
                  return (
                    <a
                      key={child.href}
                      href="#"
                      onClick={(e) => { e.preventDefault(); setSoonModal(child.soon!) }}
                      className="ksub-link"
                    >
                      {child.label}
                      <SoonBadge version={child.soon.version} variant="inline" style={{ marginLeft: 'auto' }} />
                    </a>
                  )
                }

                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`ksub-link${isActive ? ' act' : ''}`}
                  >
                    {child.label}
                    {child.pro && <span className="ksub-pro">PRO</span>}
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </aside>

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
