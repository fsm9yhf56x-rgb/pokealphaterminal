'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import type { AnalyticsOverview } from '@/lib/analytics-queries'

export default function AnalyticsDashboard({ data }: { data: AnalyticsOverview }) {
  const t = data.totals || {}
  const maxPage = Math.max(1, ...data.topPages.map((p: any) => p.n))

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif', color: '#1D1D1F' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Analytics</h1>
        <a href="/admin" style={{ fontSize: 13, color: '#6E6E73', textDecoration: 'none' }}>← Admin</a>
      </div>
      <p style={{ fontSize: 13, color: '#86868B', margin: '0 0 24px' }}>30 derniers jours</p>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        <Kpi label="Visiteurs uniques" value={fmt(t.visitors)} />
        <Kpi label="Pages vues" value={fmt(t.page_views)} />
        <Kpi label="Sessions" value={fmt(t.sessions)} />
        <Kpi label="Événements" value={fmt(t.events)} />
        <Kpi label="Connectés / anon." value={`${fmt(t.logged_events)} / ${fmt(t.anon_events)}`} />
      </div>

      {/* Courbe vues + visiteurs / jour */}
      <Section title="Fréquentation par jour">
        {data.byDay.length === 0 ? (
          <Empty />
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={data.byDay} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#86868B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#86868B' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E5EA', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="vues" name="Pages vues" stroke="#E03020" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="visiteurs" name="Visiteurs" stroke="#185FA5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Funnel de conversion */}
      <Section title="Funnel de conversion">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <FunnelStep label="Inscriptions" value={data.funnel.signups} />
          <FunnelStep label="Vue tarifs" value={data.funnel.pricing_views} />
          <FunnelStep label="Checkout lancé" value={data.funnel.checkout_started} />
          <FunnelStep label="Checkout payé" value={data.funnel.checkout_completed} accent />
          <FunnelStep label="Murs premium" value={data.funnel.gate_hits} />
        </div>
        <p style={{ fontSize: 12, color: '#AEAEB2', margin: '10px 0 0' }}>
          Ces étapes se rempliront quand les événements correspondants seront instrumentés (prochaine étape).
        </p>
      </Section>

      {/* Top pages */}
      <Section title="Pages les plus vues">
        {data.topPages.length === 0 ? <Empty /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.topPages.map((p: any) => (
              <div key={p.path} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12.5, minWidth: 220, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.path}>{p.path}</span>
                <div style={{ flex: 1, height: 10, background: '#F5F5F7', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${(p.n / maxPage) * 100}%`, height: '100%', background: '#E03020' }} />
                </div>
                <span style={{ fontSize: 12.5, color: '#6E6E73', minWidth: 48, textAlign: 'right' }}>{fmt(p.n)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Top events */}
      <Section title="Événements">
        {data.topEvents.length === 0 ? <Empty /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {data.topEvents.map((e: any) => (
              <div key={e.event} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F5F5F7', borderRadius: 8, fontSize: 13 }}>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{e.event}</span>
                <strong>{fmt(e.n)}</strong>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function fmt(n: any): string {
  return typeof n === 'number' ? n.toLocaleString('fr') : '0'
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: '#86868B', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function FunnelStep({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div style={{ background: accent ? 'rgba(224,48,32,0.06)' : '#F5F5F7', border: accent ? '1px solid rgba(224,48,32,0.2)' : '1px solid #E5E5EA', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? '#C42E1F' : '#1D1D1F' }}>{fmt(value)}</div>
      <div style={{ fontSize: 11, color: '#86868B', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  )
}

function Empty() {
  return <div style={{ fontSize: 13, color: '#AEAEB2', padding: '20px 0' }}>Aucune donnée sur la période.</div>
}
