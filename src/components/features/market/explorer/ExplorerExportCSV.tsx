'use client'

import { useState } from 'react'
import type { ExplorerResult } from '@/lib/useExplorerSearch'

/**
 * Export CSV des résultats actuels (page courante).
 * Génère un blob côté client + déclenche download (pas de BDD).
 */
export function ExplorerExportCSV({
  results,
}: {
  results: ExplorerResult[]
}) {
  const [exporting, setExporting] = useState(false)
  const disabled = results.length === 0 || exporting

  const handleExport = () => {
    if (results.length === 0) return
    setExporting(true)

    try {
      const csv = generateCSV(results)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const filename = `kodocards-explorer-${formatDate()}.csv`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      // Tiny delay so the user sees the visual feedback
      setTimeout(() => setExporting(false), 600)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      title={disabled ? 'Aucun résultat à exporter' : `Exporter ${results.length} résultats en CSV`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '8px',
        color: disabled ? 'var(--ink-faint)' : 'var(--ink-muted)',
        fontSize: '11px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-display)',
        transition: 'all 0.12s',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--ink)'
          e.currentTarget.style.color = 'var(--ink)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--border-strong)'
          e.currentTarget.style.color = 'var(--ink-muted)'
        }
      }}
    >
      <DownloadIcon />
      {exporting ? 'Export…' : 'Exporter CSV'}
      {results.length > 0 && (
        <span style={{
          padding: '1px 5px',
          background: 'var(--border)',
          color: 'var(--ink-muted)',
          fontSize: '9px',
          fontWeight: 600,
          borderRadius: '3px',
          fontFamily: 'var(--font-data, var(--font-display))',
        }}>{results.length}</span>
      )}
    </button>
  )
}

/* ── CSV generation ───────────────────────── */

const HEADERS = [
  'Nom', 'Set', 'Variant',
  'Top prix', 'Tendance %',
  'eBay avg', 'eBay ventes',
  'TCGP avg', 'PSA10 avg',
  'Tier', 'Graded',
  'Card ref',
]

function generateCSV(results: ExplorerResult[]): string {
  const rows = [HEADERS.join(',')]
  for (const r of results) {
    rows.push([
      csvEscape(r.card_name),
      csvEscape(r.set_name || r.set_slug || ''),
      csvEscape(r.variant || ''),
      formatNumber(r.top_price),
      formatNumber(r.cardmarket_trend),
      formatNumber(r.ebay_avg),
      r.ebay_sales != null ? String(r.ebay_sales) : '',
      formatNumber(r.tcg_avg),
      formatNumber(r.psa10_avg),
      r.tier || '',
      r.has_graded ? 'oui' : 'non',
      csvEscape(r.card_ref),
    ].join(','))
  }
  return rows.join('\n')
}

function csvEscape(s: string): string {
  if (!s) return ''
  // Escape quotes + wrap in quotes if contains , " \n
  if (/[,"\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function formatNumber(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return ''
  return Number(v).toFixed(2)
}

function formatDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${y}${m}${day}-${h}${min}`
}

function DownloadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M5.5 1.5v6m0 0L3 5.5m2.5 2L8 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
