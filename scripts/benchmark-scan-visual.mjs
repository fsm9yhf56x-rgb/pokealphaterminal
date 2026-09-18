#!/usr/bin/env node
/**
 * Benchmark visuel reproductible du scanner.
 * Échantillonne le catalogue FR, génère des captures dégradées déterministes,
 * compare le dHash historique à un ensemble dHash + pHash + couleur.
 */
import fs from 'node:fs'
import sharp from 'sharp'

const SAMPLE = Number(process.env.SCAN_BENCH_SAMPLE || 80)
const cardsBySet = JSON.parse(fs.readFileSync('public/data/cards-FR.json', 'utf8'))
const all = Object.entries(cardsBySet).flatMap(([setId, cards]) =>
  (cards || []).map((card) => ({ ...card, setId })).filter((card) => /^https?:/.test(card.img || ''))
)
const seed = (text) => {
  let h = 2166136261
  for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return h >>> 0
}
all.sort((a, b) => seed(a.id) - seed(b.id))
const selected = all.slice(0, SAMPLE)

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let cursor = 0
  await Promise.all(Array.from({ length: limit }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      try { out[i] = await fn(items[i], i) } catch { out[i] = null }
    }
  }))
  return out.filter(Boolean)
}

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'KodoCards-Scanner-Benchmark/1.0' } })
  if (!response.ok) throw new Error(String(response.status))
  return Buffer.from(await response.arrayBuffer())
}

async function dhash(buf) {
  const { data } = await sharp(buf).grayscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const bits = new Uint8Array(256)
  let k = 0
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) bits[k++] = data[y * 17 + x] > data[y * 17 + x + 1] ? 1 : 0
  return bits
}

async function phash(buf) {
  const { data } = await sharp(buf).grayscale().resize(32, 32, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const coeffs = []
  for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
    let sum = 0
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      sum += data[y * 32 + x]
        * Math.cos(((2 * x + 1) * u * Math.PI) / 64)
        * Math.cos(((2 * y + 1) * v * Math.PI) / 64)
    }
    coeffs.push(sum)
  }
  const median = [...coeffs.slice(1)].sort((a, b) => a - b)[Math.floor((coeffs.length - 1) / 2)]
  return Uint8Array.from(coeffs.map((value, index) => index === 0 ? 0 : value > median ? 1 : 0))
}

async function colorVector(buf) {
  const { data } = await sharp(buf).resize(6, 6, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const values = Float64Array.from(data)
  let mean = 0
  for (const value of values) mean += value
  mean /= values.length
  let variance = 0
  for (const value of values) variance += (value - mean) ** 2
  const std = Math.sqrt(variance / values.length) || 1
  return Float64Array.from(values, (value) => (value - mean) / std)
}

async function signature(buf) {
  const [d, p, c] = await Promise.all([dhash(buf), phash(buf), colorVector(buf)])
  return { d, p, c }
}

function hamming(a, b) {
  let n = 0
  for (let i = 0; i < a.length; i++) n += a[i] === b[i] ? 0 : 1
  return n / a.length
}

function colorDistance(a, b) {
  let dot = 0, aa = 0, bb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2 }
  return 1 - dot / Math.max(1e-9, Math.sqrt(aa * bb))
}

function distances(query, ref) {
  return { d: hamming(query.d, ref.d), p: hamming(query.p, ref.p), c: colorDistance(query.c, ref.c) }
}

async function variants(buf) {
  const meta = await sharp(buf).metadata()
  const width = Math.max(200, meta.width || 600)
  const height = Math.max(280, meta.height || 840)
  return Promise.all([
    sharp(buf).jpeg({ quality: 58 }).toBuffer(),
    sharp(buf).modulate({ brightness: 0.72, saturation: 0.78 }).jpeg({ quality: 64 }).toBuffer(),
    sharp(buf).modulate({ brightness: 1.24, saturation: 1.18 }).jpeg({ quality: 64 }).toBuffer(),
    sharp(buf).blur(0.75).jpeg({ quality: 55 }).toBuffer(),
    sharp(buf).rotate(2.2, { background: '#17191f' }).resize(width, height, { fit: 'fill' }).jpeg({ quality: 62 }).toBuffer(),
    sharp(buf).rotate(-2.4, { background: '#e7e1d5' }).resize(width, height, { fit: 'fill' }).sharpen().jpeg({ quality: 62 }).toBuffer(),
  ])
}

console.log(`Catalogue FR avec image: ${all.length}; échantillon demandé: ${selected.length}`)
const downloaded = await mapLimit(selected, 8, async (card) => ({ card, buf: await fetchBuffer(card.img) }))
if (downloaded.length < 30) throw new Error(`Seulement ${downloaded.length} images téléchargeables`)
console.log(`Images téléchargées: ${downloaded.length}`)

const refs = await mapLimit(downloaded, 4, async ({ card, buf }) => ({ id: card.id, sig: await signature(buf), buf }))
const queries = []
for (const ref of refs) {
  const vars = await variants(ref.buf)
  for (let i = 0; i < vars.length; i++) queries.push({ id: ref.id, variant: i, sig: await signature(vars[i]) })
}
console.log(`Requêtes synthétiques: ${queries.length}`)

const matrix = queries.map((query) => ({
  query,
  rows: refs.map((ref) => ({ id: ref.id, ...distances(query.sig, ref.sig) })),
}))

function evaluate(weights) {
  let top1 = 0, top5 = 0
  const margins = []
  for (const item of matrix) {
    const ranked = item.rows.map((row) => ({
      ...row,
      score: row.d * weights.d + row.p * weights.p + row.c * weights.c,
    })).sort((a, b) => a.score - b.score)
    if (ranked[0].id === item.query.id) top1++
    if (ranked.slice(0, 5).some((row) => row.id === item.query.id)) top5++
    margins.push({ correct: ranked[0].id === item.query.id, margin: ranked[1].score - ranked[0].score })
  }
  return { weights, top1: top1 / matrix.length, top5: top5 / matrix.length, margins }
}

const historical = evaluate({ d: 1, p: 0, c: 0 })
let best = null
for (let d = 0; d <= 10; d++) for (let p = 0; p <= 10 - d; p++) {
  const c = 10 - d - p
  if (d + p + c === 0) continue
  const result = evaluate({ d: d / 10, p: p / 10, c: c / 10 })
  if (!best || result.top1 > best.top1 || (result.top1 === best.top1 && result.top5 > best.top5)) best = result
}

const thresholds = [...new Set(best.margins.map((x) => x.margin))].sort((a, b) => a - b)
let gate = { threshold: Infinity, precision: 1, coverage: 0 }
for (const threshold of thresholds) {
  const accepted = best.margins.filter((x) => x.margin >= threshold)
  if (!accepted.length) continue
  const precision = accepted.filter((x) => x.correct).length / accepted.length
  const coverage = accepted.length / best.margins.length
  if (precision >= 0.99 && coverage > gate.coverage) gate = { threshold, precision, coverage }
}

const pct = (n) => `${(n * 100).toFixed(1)}%`
console.log(`dHash historique  top1=${pct(historical.top1)} top5=${pct(historical.top5)}`)
console.log(`Meilleur ensemble  d=${best.weights.d} p=${best.weights.p} c=${best.weights.c} top1=${pct(best.top1)} top5=${pct(best.top5)}`)
console.log(`Garde 99%         marge>=${Number.isFinite(gate.threshold) ? gate.threshold.toFixed(4) : 'aucune'} précision=${pct(gate.precision)} couverture=${pct(gate.coverage)}`)

const report = {
  sample: refs.length,
  queries: queries.length,
  historical: { top1: historical.top1, top5: historical.top5 },
  best: { weights: best.weights, top1: best.top1, top5: best.top5 },
  gate,
}
fs.mkdirSync('artifacts', { recursive: true })
fs.writeFileSync('artifacts/scan-visual-benchmark.json', JSON.stringify(report, null, 2))

if (best.top1 < 0.95 || best.top5 < 0.995) {
  console.error('Benchmark insuffisant pour réactiver la validation automatique.')
  process.exit(2)
}
