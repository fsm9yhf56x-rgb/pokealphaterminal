'use client'

/**
 * Brique OCR scan — lit le NUMERO/TOTAL d'une carte ("4/102").
 *
 * - Alphabet restreint "0123456789/" : pas de confusion 4<->A.
 * - Self-host (worker + WASM + langue depuis /tesseract/) : pas de CDN, pas de
 *   blocage CSP, plus rapide.
 * - Pretraitement gris + contraste + upscale.
 * - Parsing tolerant.
 *
 * COTE NAVIGATEUR uniquement.
 */

import { createWorker, type Worker } from 'tesseract.js'

export interface OcrNumberResult {
  raw: string
  number: string | null
  total: number | null
  confidence: number | null
}

export type OcrImageSource = File | Blob | HTMLCanvasElement | HTMLImageElement | string

let _worker: Worker | null = null
let _workerPromise: Promise<Worker> | null = null

async function getWorker(): Promise<Worker> {
  if (_worker) return _worker
  if (_workerPromise) return _workerPromise
  _workerPromise = (async () => {
    // Self-host : tous les assets depuis /tesseract/ (servis par 'self').
    const w = await createWorker('eng', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/',
      langPath: '/tesseract/lang',
      gzip: true,
    })
    await w.setParameters({
      tessedit_char_whitelist: '0123456789/',
      tessedit_pageseg_mode: '7' as any,
    })
    _worker = w
    return w
  })()
  return _workerPromise
}

export async function disposeOcr(): Promise<void> {
  if (_worker) { await _worker.terminate(); _worker = null; _workerPromise = null }
  for (const code of Object.keys(_nameWorkers)) {
    await _nameWorkers[code].terminate()
    delete _nameWorkers[code]
    delete _nameWorkerPromises[code]
  }
}

async function toProcessedCanvas(src: OcrImageSource): Promise<HTMLCanvasElement> {
  const img = await loadImage(src)
  const srcW = (img as any).naturalWidth || (img as HTMLCanvasElement).width
  const srcH = (img as any).naturalHeight || (img as HTMLCanvasElement).height
  const canvas = document.createElement('canvas')
  // Upscale agressif pour les petites zones (le numero est petit).
  const scale = srcW < 400 ? 3 : srcW < 800 ? 2 : 1
  canvas.width = srcW * scale
  canvas.height = srcH * scale
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img as any, 0, 0, canvas.width, canvas.height)

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imgData.data
  const contrast = 1.5
  const intercept = 128 * (1 - contrast)
  for (let i = 0; i < d.length; i += 4) {
    let v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    v = v * contrast + intercept
    v = Math.max(0, Math.min(255, v))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(imgData, 0, 0)
  return canvas
}

function loadImage(src: OcrImageSource): Promise<HTMLImageElement | HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    if (src instanceof HTMLCanvasElement) return resolve(src)
    if (src instanceof HTMLImageElement) {
      if (src.complete) return resolve(src)
      src.onload = () => resolve(src)
      src.onerror = reject
      return
    }
    const im = new Image()
    im.onload = () => resolve(im)
    im.onerror = reject
    im.src = typeof src === 'string' ? src : URL.createObjectURL(src)
  })
}

export function parseCardNumber(raw: string): { number: string | null; total: number | null } {
  if (!raw) return { number: null, total: null }
  const cleaned = raw.replace(/[^0-9/]/g, ' ').replace(/\s+/g, ' ').trim()

  // Motif N/T. Sur un label gradee, des chiffres parasites peuvent suivre
  // ("201/165151..."). On capture N, puis on prend les 3 PREMIERS chiffres
  // apres le slash comme total candidat, et on retient le total plausible le
  // plus court (un set fait < 1000 cartes). "201/165151" -> N=201, T=165.
  const m = cleaned.match(/(\d{1,4})\s*\/\s*(\d{1,4})/)
  if (m) {
    const numStr = m[1]
    const totRaw = m[2]
    // total = prefixe de 1 a 3 chiffres de totRaw, le plus grand <= 999.
    // ex "165151" -> essaie "165" (=165, ok) ; "16"(16) ; "1"(1). On prend 165.
    let total: number | null = null
    for (let len = Math.min(3, totRaw.length); len >= 1; len--) {
      const cand = parseInt(totRaw.slice(0, len), 10)
      if (cand >= 1 && cand <= 999) { total = cand; break }
    }
    return { number: stripLeadingZeros(numStr), total }
  }

  // Pas de slash lu -> on tente un nombre isole comme numero, total inconnu.
  const m2 = cleaned.match(/\b(\d{1,4})\b/)
  if (m2) return { number: stripLeadingZeros(m2[1]), total: null }

  return { number: null, total: null }
}

function stripLeadingZeros(s: string): string {
  return s.replace(/^0+(\d)/, '$1')
}

// ── Worker NOM, un par langue (cache) : pas de whitelist, langue chargee. ──
const _nameWorkers: Record<string, Worker> = {}
const _nameWorkerPromises: Record<string, Promise<Worker>> = {}

const LANG_TO_TESS: Record<string, string> = { fr: 'fra', en: 'eng', jp: 'jpn' }

async function getNameWorker(lang: string): Promise<Worker> {
  const code = LANG_TO_TESS[lang] || 'eng'
  const existing = _nameWorkers[code] as Worker | undefined
  if (existing) return existing
  const pending = _nameWorkerPromises[code] as Promise<Worker> | undefined
  if (pending) return pending
  _nameWorkerPromises[code] = (async () => {
    const w = await createWorker(code, 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/',
      langPath: '/tesseract/lang',
      gzip: true,
    })
    // PSM 7 = ligne unique (le nom est sur une ligne). Pas de whitelist.
    await w.setParameters({ tessedit_pageseg_mode: '7' as any })
    _nameWorkers[code] = w
    return w
  })()
  return _nameWorkerPromises[code]
}

export interface OcrNameResult {
  raw: string
  name: string | null
  confidence: number | null
}

// Extrait un nom candidat d'un OCR bruite. Pour les langues latines : le plus
// long mot alphabetique (le nom du Pokemon, vs "Niveau", "PV"...). Pour le JP :
// on garde la sequence de caracteres CJK la plus longue.
export function parseCardName(raw: string, lang: string): string | null {
  if (!raw) return null
  const t = raw.replace(/\s+/g, ' ').trim()
  if (lang === 'jp') {
    // sequences de caracteres japonais : on les concatene (le nom peut etre
    // sur une seule sequence ; on garde la plus longue comme ancre).
    const seqs = (t.match(/[\u3040-\u30ff\u4e00-\u9faf]+/g) || []).sort((a, b) => b.length - a.length)
    return seqs[0] || null
  }
  // latin : on retire chiffres + mots-parasites, et on garde les 2 mots
  // alphabetiques les PLUS LONGS (le nom du Pokemon + un eventuel qualificatif
  // type "obscur"). On evite de trainer "man de asset" (texte d'evolution) en
  // ne gardant que les mots longs, tries par longueur. Le resolveur fera le
  // matching sous-chaine, donc un fragment correct (ex "obscur") suffit.
  const STOP = /^(niveau|pv|hp|stage|basic|base|illus|ill|place|sur|carte|la|le|les|de|des|du|man|asset|evolution|pokemon)$/i
  const words = (t.replace(/[0-9]/g, ' ').match(/[A-Za-zÀ-ÿ'’\-]{3,}/g) || [])
    .filter((w) => !STOP.test(w))
    .sort((a, b) => b.length - a.length)
  if (words.length === 0) return null
  // On renvoie les 2 plus longs (souvent "dracaufeu" + "obscur"), joints.
  return words.slice(0, 2).join(' ')
}

export async function readCardName(src: OcrImageSource, lang: string): Promise<OcrNameResult> {
  const canvas = await toProcessedCanvas(src)
  const worker = await getNameWorker(lang)
  const { data } = await worker.recognize(canvas)
  const raw = (data.text || '').trim()
  return { raw, name: parseCardName(raw, lang), confidence: typeof data.confidence === 'number' ? data.confidence : null }
}

export async function readCardNumber(src: OcrImageSource, psm: '7' | '11' = '7'): Promise<OcrNumberResult> {
  const canvas = await toProcessedCanvas(src)
  const worker = await getWorker()
  // PSM 7 = ligne unique (zone numero serree) ; 11 = sparse text (label charge,
  // plusieurs nombres -> on laisse le parser prendre celui avec le slash).
  await worker.setParameters({ tessedit_pageseg_mode: psm as any })
  const { data } = await worker.recognize(canvas)
  const raw = (data.text || '').trim()
  const { number, total } = parseCardNumber(raw)
  return { raw, number, total, confidence: typeof data.confidence === 'number' ? data.confidence : null }
}
