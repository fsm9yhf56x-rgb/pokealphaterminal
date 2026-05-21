export const SNOW = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  surfaceSoft: '#FBFBFC',
  border: '#E5E5EA',
  borderSoft: '#F0F0F2',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  mutedLight: '#86868B',
  red: '#E03020',
  green: '#27500A',
  greenLight: '#EAF3DE',
  redLight: '#FCEBEB',
  blueLight: '#E6F1FB',
  blueDark: '#185FA5',
  pink: '#FBEAF0',
  pinkDark: '#4B1528',
  purple: '#EEEDFE',
  purpleDark: '#26215C',
  amber: '#FFF8E5',
  amberDark: '#8A6500',
} as const

export const FONT = {
  display: 'var(--font-sora, "Sora", sans-serif)',
  body: 'var(--font-dm, "DM Sans", sans-serif)',
  data: 'var(--font-data, "Space Mono", monospace)',
} as const

export function fmtPrice(
  value: number | null | undefined,
  currency: string = 'EUR',
  usdToEur: number = 0.92,
): string {
  if (value == null || isNaN(value)) return '—'
  const eur = currency === 'USD' ? value * usdToEur : value
  if (eur >= 1000) return `${Math.round(eur).toLocaleString('fr-FR')} €`
  if (eur >= 100) return `${Math.round(eur).toLocaleString('fr-FR')} €`
  return `${eur.toFixed(2).replace('.', ',')} €`
}

export function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d}j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
