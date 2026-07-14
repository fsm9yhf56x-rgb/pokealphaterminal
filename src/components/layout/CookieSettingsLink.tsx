'use client'

export default function CookieSettingsLink({ className, label = 'Gestion des cookies', style }: { className?: string; label?: string; style?: React.CSSProperties }) {
  const open = () => window.dispatchEvent(new CustomEvent('kodo:open-cookie-settings'))
  return (
    <a
      className={className}
      role="button"
      tabIndex={0}
      onClick={(e) => { e.preventDefault(); open() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
      style={{ cursor: 'pointer', ...style }}
    >
      {label}
    </a>
  )
}
