import { requireAdmin } from '@/lib/auth-admin';
import RefreshButton from './RefreshButton';
import {
  getSystemStats,
  getSetsWithGaps,
  getRecentSyncs,
  getPricesOverview,
} from '@/lib/admin-queries';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminPage() {
  const user = await requireAdmin();

  const [stats, gaps, syncs, prices] = await Promise.all([
    getSystemStats(),
    getSetsWithGaps(10),
    getRecentSyncs(15),
    getPricesOverview(),
  ]);

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, color: '#6e6e73' }}>
            Logged in as <strong>{user?.email}</strong>
          </div>
          <RefreshButton />
        </div>
      </div>

      {/* Stats KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
        <Kpi label="Cartes en DB" value={stats.totalCards.toLocaleString('fr')} />
        <Kpi
          label="Avec image"
          value={`${stats.cardsWithImage.toLocaleString('fr')}`}
          sub={`${((stats.cardsWithImage / stats.totalCards) * 100).toFixed(1)}%`}
        />
        <Kpi label="Sets" value={stats.totalSets.toLocaleString('fr')} />
        <Kpi label="Prix trackés" value={stats.totalPrices.toLocaleString('fr')} />
        <Kpi label="Users" value={stats.totalUsers.toLocaleString('fr')} />
        <Kpi label="Cartes en portfolio" value={stats.totalPortfolioCards.toLocaleString('fr')} />
      </div>

      {/* Coverage par langue */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Couverture images par langue</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stats.coverageByLang.map((c) => (
            <div key={c.lang} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 32, fontWeight: 600 }}>{c.lang}</span>
              <div style={{ flex: 1, height: 10, background: '#f5f5f7', borderRadius: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${c.pct}%`,
                    height: '100%',
                    background: c.pct > 95 ? '#34c759' : c.pct > 85 ? '#ff9500' : '#ff3b30',
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: '#6e6e73', minWidth: 160, textAlign: 'right' }}>
                {c.withImage.toLocaleString('fr')} / {c.total.toLocaleString('fr')} · {c.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Sets avec trous */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Sets avec images manquantes (top 10)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6e6e73' }}>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea' }}>Set</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea' }}>Lang</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea', textAlign: 'right' }}>Manquant</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea', textAlign: 'right' }}>Total</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea', textAlign: 'right' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {gaps.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 12, color: '#6e6e73', textAlign: 'center' }}>🎉 Aucun trou d'image !</td></tr>
            ) : gaps.map((g) => (
              <tr key={g.set_id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                <td style={{ padding: 8 }}>
                  <code style={{ fontSize: 12, background: '#f5f5f7', padding: '2px 6px', borderRadius: 4 }}>{g.set_id}</code>
                  {g.set_name && <span style={{ marginLeft: 8, color: '#6e6e73' }}>{g.set_name}</span>}
                </td>
                <td style={{ padding: 8 }}>{g.lang}</td>
                <td style={{ padding: 8, textAlign: 'right', fontWeight: 600, color: '#ff3b30' }}>{g.missing}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{g.total}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{g.pct.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Prix overview */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Prix — Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6 }}>Par source (sur 5000 échantillonnés)</div>
            {prices.bySource.map((s) => (
              <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                <span>{s.source}</span>
                <span style={{ fontWeight: 600 }}>{s.count.toLocaleString('fr')}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 6 }}>Par tier</div>
            {prices.byTier.map((t) => (
              <div key={t.tier} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                <span>{t.tier}</span>
                <span style={{ fontWeight: 600 }}>{t.count.toLocaleString('fr')}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 12 }}>
          Total: {prices.totalRows.toLocaleString('fr')} rows · Dernière mise à jour:{' '}
          {prices.lastUpdated ? new Date(prices.lastUpdated).toLocaleString('fr') : 'jamais'}
        </div>
      </section>

      {/* Sync logs */}
      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Historique des syncs</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6e6e73' }}>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea' }}>Job</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea' }}>Status</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea' }}>Trigger</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea', textAlign: 'right' }}>Added</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea', textAlign: 'right' }}>Images</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea', textAlign: 'right' }}>Durée</th>
              <th style={{ padding: 8, borderBottom: '1px solid #e5e5ea' }}>Quand</th>
            </tr>
          </thead>
          <tbody>
            {syncs.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                <td style={{ padding: 8 }}><code style={{ fontSize: 11 }}>{s.job_name}</code></td>
                <td style={{ padding: 8 }}>
                  <StatusPill status={s.status} />
                </td>
                <td style={{ padding: 8, color: '#6e6e73' }}>{s.triggered_by || '—'}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{s.stats?.new_cards ?? '—'}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{s.stats?.images_uploaded ?? '—'}</td>
                <td style={{ padding: 8, textAlign: 'right', color: '#6e6e73' }}>
                  {s.duration_sec !== null ? `${s.duration_sec}s` : '—'}
                </td>
                <td style={{ padding: 8, color: '#6e6e73' }}>{timeAgo(s.started_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* External tools */}
      <section style={{ marginTop: 32, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Outils externes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <ExternalLink
            label="Supabase"
            desc="DB, auth, storage"
            href="https://supabase.com/dashboard/project/jtheycxwbkweehfezyem"
            icon="🗄"
          />
          <ExternalLink
            label="GitHub Actions"
            desc="Sync workflows"
            href="https://github.com/fsm9yhf56x-rgb/pokealphaterminal/actions"
            icon="⚙"
          />
          <ExternalLink
            label="Cloudflare R2"
            desc="Images bucket"
            href="https://dash.cloudflare.com/f7155f5c8c83f3528736c91ce3a505c4/r2/default/buckets/pokealphaterminal-images"
            icon="☁"
          />
          <ExternalLink
            label="Vercel"
            desc="Deployments"
            href="https://vercel.com/dashboard"
            icon="▲"
          />
        </div>
      </section>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e5e5ea', fontSize: 12, color: '#86868b' }}>
        PokéAlpha Terminal · Admin dashboard · Data refreshed on each page load
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// UI primitives
// ─────────────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ padding: 16, background: '#f5f5f7', borderRadius: 10 }}>
      <div style={{ fontSize: 12, color: '#6e6e73', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#34c759', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === 'success' ? '#34c759' :
    status === 'failed' ? '#ff3b30' :
    status === 'running' ? '#007aff' :
    '#86868b';
  return (
    <span style={{
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 10,
      background: `${color}20`,
      color,
      fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

function ExternalLink({ label, desc, href, icon }: { label: string; desc: string; href: string; icon: string }) {
  return (
    <a
    
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        padding: 14,
        background: '#f5f5f7',
        borderRadius: 10,
        textDecoration: 'none',
        color: '#1D1D1F',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label} ↗</div>
        <div style={{ fontSize: 12, color: '#6e6e73' }}>{desc}</div>
      </div>
    </a>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}j ago`;
}
