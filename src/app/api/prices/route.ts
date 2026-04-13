import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const names = searchParams.get('names')?.split(',').map(n => n.trim()).filter(Boolean)
  const setSlug = searchParams.get('set')
  
  let query = supabase.from('prices').select('card_name, card_number, set_slug, set_name, ebay_avg, tcg_avg, top_price, tier, has_graded, psa10_avg, fetched_at')
  
  if (names?.length) {
    query = query.in('card_name', names)
  }
  if (setSlug) {
    query = query.eq('set_slug', setSlug)
  }
  
  const { data, error } = await query.order('top_price', { ascending: false, nullsFirst: false }).limit(200)
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
