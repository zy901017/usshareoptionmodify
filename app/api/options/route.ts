import { NextRequest, NextResponse } from 'next/server'
import { getOptionsChain, getExpirations } from '@/lib/alphaVantage'
import { getOptionsChainYahoo } from '@/lib/yahoo'

export const runtime = 'nodejs'

export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol')||'').toUpperCase()
  const exp = searchParams.get('exp')||undefined
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  try {
    const [chainAV, expirations] = await Promise.all([
      getOptionsChain(symbol, exp).catch(()=>null),
      getExpirations(symbol).catch(()=>[]),
    ])
    const chain = chainAV ?? await getOptionsChainYahoo(symbol, exp).catch(()=>null)
    if (!chain) return NextResponse.json({ error: 'Options chain unavailable from all sources' }, { status: 502 })
    const allExp = expirations?.length ? expirations : [chain.exp]
    return NextResponse.json({ symbol, expirations: allExp, chain })
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'internal error' }, { status: 500 })
  }
}
