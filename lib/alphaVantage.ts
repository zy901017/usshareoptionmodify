import { memo } from './cache'
import { OptionsChain, OptionContract } from './types'
import { mockChain, mockExpirations } from './mock'

const AV = 'https://www.alphavantage.co/query'

function key(){ return process.env.ALPHA_VANTAGE_API_KEY }

export async function getQuote(symbol:string){
  if (!key() && process.env.NODE_ENV !== 'production') {
    const ch = mockChain(symbol)
    return { last: ch.underlying }
  }
  const url = `${AV}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key()}`
  const res = await fetch(url, { next: { revalidate: 5 } })
  if (!res.ok) throw new Error('GLOBAL_QUOTE failed')
  const data = await res.json()
  const last = Number(data?.['Global Quote']?.['05. price'] ?? data?.['Global Quote']?.['05. Price'])
  if (!Number.isFinite(last)) throw new Error('quote parse error')
  return { last }
}

export async function getRiskFreeRate(){
  if (!key() && process.env.NODE_ENV !== 'production') {
    return 0.045
  }
  const url = `${AV}?function=TREASURY_YIELD&interval=monthly&maturity=2year&apikey=${key()}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('TREASURY_YIELD failed')
  const data = await res.json()
  const arr = data?.data || []
  const last = Number(arr?.[0]?.['value'])/100
  if (!Number.isFinite(last)) return 0.04
  return last
}

export async function getOptionsChain(symbol:string, exp?:string): Promise<OptionsChain>{
  if (!key() && process.env.NODE_ENV !== 'production') {
    return mockChain(symbol, exp)
  }
  const fn = 'REALTIME_OPTIONS'
  const params = `?function=${fn}&symbol=${encodeURIComponent(symbol)}&require_greeks=true&apikey=${key()}`
  const res = await fetch(AV + params, { next: { revalidate: 2 } })
  if (!res.ok) throw new Error('REALTIME_OPTIONS failed')
  const data = await res.json()
  const asOf = new Date().toISOString()
  // Normalize from AV response (schema may differ; this is a best-effort)
  const underlying = Number(data?.underlying_price ?? data?.UnderlyingPrice ?? data?.underlying ?? 0)
  const expirations: string[] = data?.expirations ?? []
  const chosenExp = exp ?? expirations?.[0]
  const raw = (data?.options ?? []).filter((o:any)=> !chosenExp || o?.expiration === chosenExp)
  if (!raw.length) throw new Error('No options data from AV')
  const options: OptionContract[] = raw.map((o:any)=> ({
    type: (o.option_type || o.type || '').toLowerCase() === 'call' ? 'call' : 'put',
    exp: o.expiration || chosenExp,
    strike: Number(o.strike),
    bid: Number(o.bid),
    ask: Number(o.ask),
    iv: Number(o.implied_volatility ?? o.iv),
    delta: Number(o.delta),
    theta: Number(o.theta),
    gamma: Number(o.gamma),
    vega: Number(o.vega),
    oi: Number(o.open_interest ?? o.oi ?? 0),
    volume: Number(o.volume ?? 0),
  }))
  const atmIV = estimateATMIV(options, underlying)
  const dte = Math.max(1, Math.round((new Date(chosenExp).getTime() - Date.now())/86400000))
  return { asOf, underlying, exp: chosenExp, dte, options, atmIV }
}

export async function getExpirations(symbol:string): Promise<string[]> {
  if (!key() && process.env.NODE_ENV !== 'production') return mockExpirations()
  // Best-effort: use REALTIME_OPTIONS metadata
  try {
    const ch = await getOptionsChain(symbol)
    return Array.from(new Set(ch.options.map(o=>o.exp))).sort()
  } catch {
    return []
  }
}

export function estimateATMIV(options: OptionContract[], S:number){
  let best = options[0]?.iv ?? 0.5
  let bestDist = Infinity
  for (const o of options) {
    const dist = Math.abs(o.strike - S)
    if (o.iv && dist < bestDist) { best = o.iv; bestDist = dist }
  }
  return best || 0.5
}
