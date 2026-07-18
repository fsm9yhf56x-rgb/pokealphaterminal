import { ImageResponse } from 'next/og'

// Image OG du site (partages de liens : X, Discord, iMessage, LinkedIn...).
// Meme stack que les images de partage (next/og + DM Sans jsdelivr).
// DA Snow+ : fond blanc, wordmark KODO/CARDS italique, halo rouge discret.
// Pas de 鼓動 ici : DM Sans n'a pas les glyphes CJK -> tofu garanti.
export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Kodo Cards — la cote de tes cartes Pokémon'

const FONT = 'https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-700-normal.woff'
const FONT_MED = 'https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5.0.8/files/dm-sans-latin-500-normal.woff'

export default async function OgImage() {
  const [bold, med] = await Promise.all([
    fetch(FONT).then(r => r.arrayBuffer()),
    fetch(FONT_MED).then(r => r.arrayBuffer()),
  ])
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#FFFFFF',
        fontFamily: 'DM Sans', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: -180, left: 300, width: 600, height: 420,
          borderRadius: 9999, background: 'radial-gradient(circle, rgba(224,48,32,0.09), rgba(224,48,32,0))',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -200, right: -100, width: 520, height: 420,
          borderRadius: 9999, background: 'radial-gradient(circle, rgba(110,86,207,0.06), rgba(110,86,207,0))',
          display: 'flex',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{
            width: 58, height: 58, background: '#E03020',
            transform: 'rotate(45deg) skewX(-12deg)', display: 'flex',
          }} />
          <div style={{ display: 'flex', fontSize: 108, fontWeight: 700, fontStyle: 'italic', letterSpacing: '-0.02em' }}>
            <span style={{ color: '#1D1D1F' }}>KODO</span>
            <span style={{ color: '#E03020' }}>CARDS</span>
          </div>
        </div>

        <div style={{
          display: 'flex', fontSize: 22, fontWeight: 700, letterSpacing: '0.34em',
          color: '#6E6E73', marginTop: 6, textTransform: 'uppercase',
        }}>
          The heartbeat of TCG
        </div>

        <div style={{
          display: 'flex', fontSize: 30, fontWeight: 500, color: '#3A3A3E', marginTop: 44,
        }}>
          Combien vaut vraiment ta collection&#8239;?
        </div>
        <div style={{
          display: 'flex', fontSize: 21, fontWeight: 500, color: '#86868B', marginTop: 12,
        }}>
          La cote de tes cartes Pokémon — FR · EN · JP, mise à jour chaque nuit
        </div>
      </div>
    ),
    { ...size, fonts: [
      { name: 'DM Sans', data: bold, weight: 700, style: 'normal' as const },
      { name: 'DM Sans', data: med, weight: 500, style: 'normal' as const },
    ] },
  )
}
