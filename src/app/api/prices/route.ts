import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const set = searchParams.get('set')
  const sets = searchParams.get('sets')?.split(',').filter(Boolean)
  
  let query = supabase.from('prices')
    .select('card_name, card_number, set_slug, set_name, ebay_avg, tcg_avg, top_price, tier, has_graded, psa10_avg, fetched_at, poketrace_id, variant')
  
  if (set) {
    query = query.eq('set_slug', set)
  } else if (sets?.length) {
    query = query.in('set_slug', sets)
  }
  
  const { data, error } = await query
    .not('top_price', 'is', null)
    .order('top_price', { ascending: false, nullsFirst: false })
    .limit(2000)
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
