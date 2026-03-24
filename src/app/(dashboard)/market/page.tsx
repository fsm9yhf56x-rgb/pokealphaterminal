export const metadata = { title: 'Market' }
export default function MarketPage() {
  return (
    <div>
      <p style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>Market</p>
      <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#111', fontFamily: 'var(--font-display)', letterSpacing: '-0.3px', margin: '0 0 20px' }}>Tendances</h1>
      <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Tendances marché · en construction</p>
      </div>
    </div>
  )
}
