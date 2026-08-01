import { ImageResponse } from 'next/og'

// Image OG du site — ce que voient les gens quand un lien kodocards.com est
// partage (WhatsApp, X, Discord, iMessage, LinkedIn). Souvent le PREMIER
// contact avec la marque : elle doit etre le vrai logo, pas une approximation.
//
// FIDELITE AU LOCKUP (BrandMark size=30 inline signature mark={false}) :
//   - KODOCARDS en TEKO 700, pas DM Sans ni Sora. '--font-shonen' = Teko.
//   - Satori ne synthetise PAS l'oblique : le site obtient son italique par
//     fontStyle sur une famille sans italique, ici on incline par skewX.
//   - Signature en Sora 600, 0.22em, avec le point gris et 鼓動 en rouge.
//   - Pas de losange : le lockup du footer n'en porte pas.
//
// CADRAGE : tout tient dans les 1000px centraux. WhatsApp recadre certaines
// vues en carre — un bloc large se fait couper aux extremites (bug corrige ici).
export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Kodo Cards — la cote de tes cartes Pokémon'

const F = {
  teko: 'https://cdn.jsdelivr.net/npm/@fontsource/teko@5.0.0/files/teko-latin-700-normal.woff',
  sora600: 'https://cdn.jsdelivr.net/npm/@fontsource/sora@5.0.0/files/sora-latin-600-normal.woff',
  sora500: 'https://cdn.jsdelivr.net/npm/@fontsource/sora@5.0.0/files/sora-latin-500-normal.woff',
  jp: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.0/files/noto-sans-jp-japanese-700-normal.woff',
}

export default async function OgImage() {
  const [teko, sora6, sora5, jp] = await Promise.all(
    [F.teko, F.sora600, F.sora500, F.jp].map(u => fetch(u).then(r => r.arrayBuffer())),
  )

  const INK = '#1D1D1F'
  const RED = '#E03020'
  const MUTED = '#86868B'

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#FFFFFF',
        fontFamily: 'Sora', padding: '0 100px',
      }}>
        {/* Wordmark — Teko incline, KODO encre + CARDS accent, colles */}
        <div style={{ display: 'flex', transform: 'skewX(-9deg)', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', fontFamily: 'Teko', fontSize: 150, fontWeight: 700, color: INK, letterSpacing: '0.005em', lineHeight: 1 }}>
            KODO
          </div>
          <div style={{ display: 'flex', fontFamily: 'Teko', fontSize: 150, fontWeight: 700, color: RED, letterSpacing: '0.02em', lineHeight: 1, marginLeft: 6 }}>
            CARDS
          </div>
        </div>

        {/* Signature — Sora 600, tres espacee, point gris, 鼓動 rouge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 14 }}>
          <div style={{ display: 'flex', fontSize: 20, fontWeight: 600, letterSpacing: '0.22em', color: MUTED }}>
            THE HEARTBEAT OF TCG
          </div>
          <div style={{ display: 'flex', fontSize: 20, fontWeight: 700, color: '#C7C7CC' }}>·</div>
          <div style={{ display: 'flex', fontFamily: 'Noto Sans JP', fontSize: 24, color: RED, letterSpacing: '0.06em' }}>
            鼓動
          </div>
        </div>

        <div style={{ display: 'flex', width: 190, height: 1, background: '#E5E5EA', margin: '46px 0 40px' }} />

        {/* Une seule promesse. L'ancienne version disait deux fois la meme
            chose ("Combien vaut ta collection" + "La cote de tes cartes"). */}
        <div style={{ display: 'flex', fontSize: 38, fontWeight: 600, color: INK, letterSpacing: '-0.02em', textAlign: 'center' }}>
          Combien vaut vraiment ta collection&#8239;?
        </div>

        {/* Preuve verifiable plutot que slogan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22, fontSize: 21, fontWeight: 500, color: MUTED }}>
          <div style={{ display: 'flex' }}>Français</div>
          <div style={{ display: 'flex', color: '#D8D8DD' }}>·</div>
          <div style={{ display: 'flex' }}>Anglais</div>
          <div style={{ display: 'flex', color: '#D8D8DD' }}>·</div>
          <div style={{ display: 'flex' }}>Japonais</div>
          <div style={{ display: 'flex', color: '#D8D8DD' }}>·</div>
          <div style={{ display: 'flex' }}>Cote mise à jour chaque nuit</div>
        </div>

        <div style={{ display: 'flex', position: 'absolute', bottom: 44, fontSize: 18, fontWeight: 600, color: '#C7C7CC', letterSpacing: '0.12em' }}>
          KODOCARDS.COM
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Teko', data: teko, weight: 700, style: 'normal' as const },
        { name: 'Sora', data: sora6, weight: 600, style: 'normal' as const },
        { name: 'Sora', data: sora5, weight: 500, style: 'normal' as const },
        { name: 'Noto Sans JP', data: jp, weight: 700, style: 'normal' as const },
      ],
    },
  )
}
