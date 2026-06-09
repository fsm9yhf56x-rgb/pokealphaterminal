/**
 * Generic DB query proxy for client-side hooks.
 *
 * Replaces direct Supabase client calls that used to happen in the
 * browser. Now hooks POST their serialized query here, we execute it
 * server-side against Neon (where DATABASE_URL is available), and
 * return the result.
 *
 * Security model:
 *   - Whitelist of allowed tables (READ_ONLY_TABLES + USER_OWNED_TABLES)
 *   - Mutations on USER_OWNED_TABLES are scoped to the current user_id
 *   - SQL is built parameterized (no string interpolation of user input)
 *
 * Body shape (serialized from supabase-compat):
 *   {
 *     table: string,
 *     mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert',
 *     columns?: string,           // for select
 *     filters?: Array<{col, op, val}>,
 *     orderBy?: {col, asc},
 *     limitN?: number,
 *     rangeFromTo?: [number, number],
 *     insertRows?: any[],
 *     updateValues?: Record<string, any>,
 *     upsertConflict?: string,
 *     ignoreDuplicates?: boolean,
 *     expectSingle?: boolean,
 *   }
 */
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { getCurrentUser } from '@/lib/auth/helpers'
import { canAddCards } from '@/lib/early'

export const dynamic = 'force-dynamic'

// Read-only tables accessible by anyone (data is public-ish)
const PUBLIC_TABLES = new Set([
  'tcg_cards',
  'tcg_sets',
  'card_aliases',
  'set_aliases',
  'prices_snapshots',
  'prices_v2',
  'prices_v2_by_condition',
  'psa_pop_reports',
  'psa_pop_latest',
  'market_indices_v1',
  'undervalued_signals_v1',
  'alpha_signals',
  '_deprecated_prices',
])

// User-owned tables: read & write require auth, scoped to user_id
const USER_TABLES = new Set([
  'portfolio_cards',
  'badges',
  'wishlist',
  'goal_targets',
  'goal_wishlist',
])

function quoteIdent(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`)
  }
  return `"${name}"`
}

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { table, mode = 'select' } = body
  if (typeof table !== 'string') {
    return NextResponse.json({ error: 'Missing table' }, { status: 400 })
  }

  const isPublicTable = PUBLIC_TABLES.has(table)
  const isUserTable = USER_TABLES.has(table)
  if (!isPublicTable && !isUserTable) {
    return NextResponse.json({ error: `Table not whitelisted: ${table}` }, { status: 403 })
  }

  // For user tables, require auth + scope to current user
  let currentUserId: string | null = null
  if (isUserTable || mode !== 'select') {
    const user = await getCurrentUser()
    currentUserId = user?.id ?? null
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Build the SQL query + params
    // Gate plan Gratuit : plafond de cartes (non contournable, tout INSERT passe ici).
    if (table === 'portfolio_cards' && (mode === 'insert' || mode === 'upsert') && currentUserId) {
      const n = Array.isArray(body.insertRows) ? body.insertRows.length : 1
      const chk = await canAddCards(currentUserId, n)
      if (!chk.ok) {
        return NextResponse.json(
          { data: null, error: { message: 'free_limit', code: 'free_limit', current: chk.current, limit: chk.limit } },
          { status: 403 }
        )
      }
    }
    const { query, params, expectSingle } = buildQuery(body, currentUserId, isUserTable)
    const rawRows = await sql.query(query, params)
    // Neon returns PG NUMERIC/DECIMAL as strings. Coerce them to numbers
    // so that React components calling .toFixed() etc. don't crash.
    const rows = rawRows.map(coerceNumerics)
    if (expectSingle) {
      return NextResponse.json({ data: rows[0] ?? null, error: null })
    }
    return NextResponse.json({ data: rows, error: null, count: rows.length })
  } catch (e: any) {
    console.error('[api/db/query]', e.message, 'body:', JSON.stringify(body).slice(0, 200))
    return NextResponse.json({ data: null, error: { message: e.message } }, { status: 500 })
  }
}

function buildQuery(
  body: any,
  currentUserId: string | null,
  isUserTable: boolean,
): { query: string; params: any[]; expectSingle: boolean } {
  const {
    table,
    mode,
    columns = '*',
    filters = [],
    orderBy = null,
    limitN = null,
    rangeFromTo = null,
    insertRows = null,
    updateValues = null,
    upsertConflict = null,
    ignoreDuplicates = false,
    expectSingle = false,
  } = body

  const t = quoteIdent(table)
  const params: any[] = []
  let p = 0
  const placeholder = (v: any) => {
    params.push(v)
    return `$${++p}`
  }

  // Sanitize columns (allow simple list or '*')
  let cols = '*'
  if (columns !== '*' && typeof columns === 'string') {
    // Allow comma-separated columns, alias syntax, count(*)
    if (/^[a-zA-Z0-9_*,\s()]+$/.test(columns)) {
      cols = columns
    }
  }

  // Filter user scope on USER_TABLES
  const allFilters = [...filters]
  if (isUserTable && currentUserId) {
    allFilters.push({ col: 'user_id', op: 'eq', val: currentUserId })
  }

  const buildWhere = (): string => {
    if (!allFilters.length) return ''
    const parts = allFilters.map((f: any) => {
      // 'or' is a special op : col is empty, val is "col1.op1.val1,col2.op2.val2"
      // IMPORTANT: traiter 'or' AVANT quoteIdent (sinon quoteIdent('') throw)
      if (f.op === 'or') {
        return parseOrExpression(f.val as string, placeholder)
      }
      const c = quoteIdent(f.col)
      switch (f.op) {
        case 'eq': return `${c} = ${placeholder(f.val)}`
        case 'neq': return `${c} <> ${placeholder(f.val)}`
        case 'gt': return `${c} > ${placeholder(f.val)}`
        case 'gte': return `${c} >= ${placeholder(f.val)}`
        case 'lt': return `${c} < ${placeholder(f.val)}`
        case 'lte': return `${c} <= ${placeholder(f.val)}`
        case 'in': {
          const vs = (f.val as any[]).map(placeholder).join(',')
          return `${c} IN (${vs})`
        }
        case 'is':
          if (f.val === null) return `${c} IS NULL`
          return `${c} IS ${f.val ? 'TRUE' : 'FALSE'}`
        case 'like': return `${c} LIKE ${placeholder(f.val)}`
        case 'ilike': return `${c} ILIKE ${placeholder(f.val)}`
        case 'not':
          return `NOT (${c} ${(f.val as any).op} ${placeholder((f.val as any).val)})`
        default: throw new Error(`Unknown filter op: ${f.op}`)
      }
    })
    return ' WHERE ' + parts.join(' AND ')
  }

  function parseOrExpression(expr: string, placeholder: (v: any) => string): string {
    // Parse "col1.op1.val1,col2.op2.val2,..." into "(col1 op1 val1) OR (col2 op2 val2)"
    // Supports ops: eq, neq, gt, gte, lt, lte, is (with .null / .true / .false)
    const opMap: Record<string, string> = {
      eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=',
    }
    const conditions = expr.split(',').map((piece) => {
      const dotIdx1 = piece.indexOf('.')
      const dotIdx2 = piece.indexOf('.', dotIdx1 + 1)
      if (dotIdx1 < 0 || dotIdx2 < 0) {
        throw new Error(`Invalid or-expression piece: ${piece}`)
      }
      const col = piece.slice(0, dotIdx1)
      const op = piece.slice(dotIdx1 + 1, dotIdx2)
      const val = piece.slice(dotIdx2 + 1)
      const cQ = quoteIdent(col)
      if (op === 'is') {
        if (val === 'null') return `${cQ} IS NULL`
        if (val === 'true') return `${cQ} IS TRUE`
        if (val === 'false') return `${cQ} IS FALSE`
        throw new Error(`Invalid is value: ${val}`)
      }
      const sqlOp = opMap[op]
      if (!sqlOp) throw new Error(`Unknown or-expression op: ${op}`)
      // Coerce numeric strings to numbers for proper parameter binding
      const v = /^-?\d+(\.\d+)?$/.test(val) ? Number(val) : val
      return `${cQ} ${sqlOp} ${placeholder(v)}`
    })
    return '(' + conditions.join(' OR ') + ')'
  }

  if (mode === 'select') {
    let q = `SELECT ${cols} FROM ${t}` + buildWhere()
    if (orderBy) q += ` ORDER BY ${quoteIdent(orderBy.col)} ${orderBy.asc ? 'ASC' : 'DESC'}`
    if (rangeFromTo) {
      const [from, to] = rangeFromTo
      q += ` LIMIT ${to - from + 1} OFFSET ${from}`
    } else if (limitN !== null) {
      q += ` LIMIT ${limitN}`
    }
    return { query: q, params, expectSingle }
  }

  if (mode === 'insert' || mode === 'upsert') {
    const rows = insertRows!
    if (!rows.length) return { query: 'SELECT 0', params: [], expectSingle: false }
    // Force user_id on USER_TABLES
    const rowsScoped = isUserTable
      ? rows.map((r: any) => ({ ...r, user_id: currentUserId }))
      : rows
    const cols2 = Object.keys(rowsScoped[0])
    const colsQuoted = cols2.map(quoteIdent).join(',')
    const valuesStr = rowsScoped
      .map((r: any) => '(' + cols2.map((c) => placeholder(r[c])).join(',') + ')')
      .join(',')
    let q = `INSERT INTO ${t} (${colsQuoted}) VALUES ${valuesStr}`
    if (mode === 'upsert') {
      if (ignoreDuplicates) {
        q += ` ON CONFLICT DO NOTHING`
      } else if (upsertConflict) {
        const conflictCols = upsertConflict
          .split(',')
          .map((s: string) => quoteIdent(s.trim()))
          .join(',')
        const updates = cols2
          .filter((c) => !upsertConflict.split(',').map((s: string) => s.trim()).includes(c))
          .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
          .join(',')
        q += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates}`
      }
    }
    q += ' RETURNING *'
    return { query: q, params, expectSingle }
  }

  if (mode === 'update') {
    const sets = Object.entries(updateValues!)
      .map(([k, v]) => `${quoteIdent(k)} = ${placeholder(v)}`)
      .join(',')
    const q = `UPDATE ${t} SET ${sets}` + buildWhere() + ' RETURNING *'
    return { query: q, params, expectSingle }
  }

  if (mode === 'delete') {
    const q = `DELETE FROM ${t}` + buildWhere() + ' RETURNING *'
    return { query: q, params, expectSingle }
  }

  throw new Error(`Unknown mode: ${mode}`)
}

// Convert numeric-looking string values to numbers.
// Neon's @neondatabase/serverless returns PG NUMERIC/DECIMAL/BIGINT as
// strings (preserves precision), but most React components expect numbers.
function coerceNumerics(row: any): any {
  if (row === null || typeof row !== 'object') return row
  const out: any = {}
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
      // Looks like a plain number (int or decimal). Parse it.
      const n = Number(v)
      out[k] = Number.isFinite(n) ? n : v
    } else {
      out[k] = v
    }
  }
  return out
}

