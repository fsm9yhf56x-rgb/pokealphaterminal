/**
 * Drop-in replacement for Supabase data client, backed by Neon.
 * Supports the subset of Supabase API used in this codebase.
 *
 * Usage:
 *   import { db } from '@/lib/db/supabase-compat'
 *   const { data, error } = await db.from('tcg_cards').select('*').eq('id', cardId).single()
 */
import { sql } from './sql'

type QueryResult<T> = { data: T | null; error: { message: string } | null }
type QueryListResult<T> = { data: T[] | null; error: { message: string } | null; count?: number }

interface QueryBuilder<T = any> {
  select: (cols?: string) => QueryBuilder<T>
  insert: (rows: any | any[]) => QueryBuilder<T>
  update: (values: any) => QueryBuilder<T>
  delete: () => QueryBuilder<T>
  upsert: (rows: any | any[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) => QueryBuilder<T>
  eq: (col: string, val: any) => QueryBuilder<T>
  neq: (col: string, val: any) => QueryBuilder<T>
  gt: (col: string, val: any) => QueryBuilder<T>
  gte: (col: string, val: any) => QueryBuilder<T>
  lt: (col: string, val: any) => QueryBuilder<T>
  lte: (col: string, val: any) => QueryBuilder<T>
  in: (col: string, vals: any[]) => QueryBuilder<T>
  is: (col: string, val: null | boolean) => QueryBuilder<T>
  like: (col: string, pattern: string) => QueryBuilder<T>
  ilike: (col: string, pattern: string) => QueryBuilder<T>
  not: (col: string, op: string, val: any) => QueryBuilder<T>
  or: (filters: string) => QueryBuilder<T>
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder<T>
  limit: (n: number) => QueryBuilder<T>
  range: (from: number, to: number) => QueryBuilder<T>
  single: () => Promise<QueryResult<T>>
  maybeSingle: () => Promise<QueryResult<T>>
  then: (resolve: (val: QueryListResult<T>) => any, reject?: any) => Promise<any>
}

function quoteIdent(name: string): string {
  // Allow only safe identifier chars; reject anything weird
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`)
  }
  return `"${name}"`
}

function buildQuery(table: string) {
  const state: any = {
    table,
    mode: 'select' as 'select' | 'insert' | 'update' | 'delete' | 'upsert',
    columns: '*',
    filters: [] as Array<{ col: string; op: string; val: any }>,
    orderBy: null as { col: string; asc: boolean } | null,
    limitN: null as number | null,
    rangeFromTo: null as [number, number] | null,
    insertRows: null as any[] | null,
    updateValues: null as Record<string, any> | null,
    upsertConflict: null as string | null,
    ignoreDuplicates: false,
    expectSingle: false,
  }

  const escapeVal = (v: any): string => {
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    if (v instanceof Date) return `'${v.toISOString()}'`
    if (Array.isArray(v)) return `ARRAY[${v.map(escapeVal).join(',')}]`
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
    return `'${String(v).replace(/'/g, "''")}'`
  }

  const buildWhere = (): string => {
    if (!state.filters.length) return ''
    const parts = state.filters.map((f: any) => {
      const c = quoteIdent(f.col)
      switch (f.op) {
        case 'eq': return `${c} = ${escapeVal(f.val)}`
        case 'neq': return `${c} <> ${escapeVal(f.val)}`
        case 'gt': return `${c} > ${escapeVal(f.val)}`
        case 'gte': return `${c} >= ${escapeVal(f.val)}`
        case 'lt': return `${c} < ${escapeVal(f.val)}`
        case 'lte': return `${c} <= ${escapeVal(f.val)}`
        case 'in': return `${c} IN (${(f.val as any[]).map(escapeVal).join(',')})`
        case 'is':
          if (f.val === null) return `${c} IS NULL`
          return `${c} IS ${f.val ? 'TRUE' : 'FALSE'}`
        case 'like': return `${c} LIKE ${escapeVal(f.val)}`
        case 'ilike': return `${c} ILIKE ${escapeVal(f.val)}`
        case 'not':
          return `NOT (${c} ${(f.val as any).op} ${escapeVal((f.val as any).val)})`
        case 'or':
          return `(${f.val})`
        default: throw new Error(`Unknown filter op: ${f.op}`)
      }
    })
    return ' WHERE ' + parts.join(' AND ')
  }

  const execute = async (): Promise<any> => {
    let query = ''
    if (state.mode === 'select') {
      query = `SELECT ${state.columns} FROM ${quoteIdent(state.table)}`
      query += buildWhere()
      if (state.orderBy) query += ` ORDER BY ${quoteIdent(state.orderBy.col)} ${state.orderBy.asc ? 'ASC' : 'DESC'}`
      if (state.rangeFromTo) {
        const [from, to] = state.rangeFromTo
        query += ` LIMIT ${to - from + 1} OFFSET ${from}`
      } else if (state.limitN !== null) {
        query += ` LIMIT ${state.limitN}`
      }
    } else if (state.mode === 'insert' || state.mode === 'upsert') {
      const rows = state.insertRows!
      if (!rows.length) return { data: [], error: null }
      const cols = Object.keys(rows[0])
      const colsQuoted = cols.map(quoteIdent).join(',')
      const valuesStr = rows
        .map((r: any) => '(' + cols.map((c) => escapeVal(r[c])).join(',') + ')')
        .join(',')
      query = `INSERT INTO ${quoteIdent(state.table)} (${colsQuoted}) VALUES ${valuesStr}`
      if (state.mode === 'upsert') {
        if (state.ignoreDuplicates) {
          query += ` ON CONFLICT DO NOTHING`
        } else if (state.upsertConflict) {
          const conflictCols = state.upsertConflict.split(',').map((s: string) => quoteIdent(s.trim())).join(',')
          const updates = cols
            .filter((c) => !state.upsertConflict!.split(',').map((s: string) => s.trim()).includes(c))
            .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
            .join(',')
          query += ` ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates}`
        }
      }
      query += ' RETURNING *'
    } else if (state.mode === 'update') {
      const sets = Object.entries(state.updateValues!)
        .map(([k, v]) => `${quoteIdent(k)} = ${escapeVal(v)}`)
        .join(',')
      query = `UPDATE ${quoteIdent(state.table)} SET ${sets}` + buildWhere() + ' RETURNING *'
    } else if (state.mode === 'delete') {
      query = `DELETE FROM ${quoteIdent(state.table)}` + buildWhere() + ' RETURNING *'
    }

    try {
      const rows = await (sql as any).query(query)
      if (state.expectSingle) {
        return { data: rows[0] ?? null, error: null }
      }
      return { data: rows, error: null, count: rows.length }
    } catch (e: any) {
      console.error('[supabase-compat] Query failed:', query, e)
      return { data: null, error: { message: e.message } }
    }
  }

  const builder: QueryBuilder = {
    select(cols = '*') { state.columns = cols.replace(/\s+/g, ' ').trim(); return builder },
    insert(rows) { state.mode = 'insert'; state.insertRows = Array.isArray(rows) ? rows : [rows]; return builder },
    update(values) { state.mode = 'update'; state.updateValues = values; return builder },
    delete() { state.mode = 'delete'; return builder },
    upsert(rows, opts = {}) {
      state.mode = 'upsert'
      state.insertRows = Array.isArray(rows) ? rows : [rows]
      state.upsertConflict = opts.onConflict ?? null
      state.ignoreDuplicates = opts.ignoreDuplicates ?? false
      return builder
    },
    eq(col, val) { state.filters.push({ col, op: 'eq', val }); return builder },
    neq(col, val) { state.filters.push({ col, op: 'neq', val }); return builder },
    gt(col, val) { state.filters.push({ col, op: 'gt', val }); return builder },
    gte(col, val) { state.filters.push({ col, op: 'gte', val }); return builder },
    lt(col, val) { state.filters.push({ col, op: 'lt', val }); return builder },
    lte(col, val) { state.filters.push({ col, op: 'lte', val }); return builder },
    in(col, vals) { state.filters.push({ col, op: 'in', val: vals }); return builder },
    is(col, val) { state.filters.push({ col, op: 'is', val }); return builder },
    like(col, pattern) { state.filters.push({ col, op: 'like', val: pattern }); return builder },
    ilike(col, pattern) { state.filters.push({ col, op: 'ilike', val: pattern }); return builder },
    not(col, op, val) { state.filters.push({ col, op: 'not', val: { op, val } }); return builder },
    or(filters) { state.filters.push({ col: '', op: 'or', val: filters }); return builder },
    order(col, opts = {}) { state.orderBy = { col, asc: opts.ascending !== false }; return builder },
    limit(n) { state.limitN = n; return builder },
    range(from, to) { state.rangeFromTo = [from, to]; return builder },
    single() { state.expectSingle = true; return execute() as any },
    maybeSingle() { state.expectSingle = true; return execute() as any },
    then(resolve, reject) { return execute().then(resolve, reject) },
  }

  return builder
}

export const db = {
  from: <T = any>(table: string) => buildQuery(table) as QueryBuilder<T>,
  rpc: async (fn: string, args: Record<string, any> = {}) => {
    const argsStr = Object.values(args).map((v) => {
      if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
      return String(v)
    }).join(',')
    try {
      const rows = await (sql as any).query(`SELECT * FROM ${fn.replace(/[^a-z0-9_]/gi, '')}(${argsStr})`)
      return { data: rows, error: null }
    } catch (e: any) {
      return { data: null, error: { message: e.message } }
    }
  },
}
