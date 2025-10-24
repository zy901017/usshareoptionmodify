import { OptionsChain, OptionContract } from './types'
import { estimateATMIV } from './alphaVantage'

export async function getOptionsChainYahoo(symbol:string, exp?:string): Promise<OptionsChain> {
  const base = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`
  const url = exp ? `${base}?date=${Math.floor(new Date(exp).getTime()/1000)}` : base
  const res = await fetch(url, { headers: { 'User-Agent':'Mozilla/5.0' }, cache: 'no-store' })
  if (!res.ok) throw new Error('Yahoo options failed')
  const data = await res.json()
  const result = data?.optionChain?.result?.[0]
  if (!result) throw new Error('Yahoo response parse error')
  const underlying = Number(result?.quote?.regularMarketPrice ?? result?.quote?.postMarketPrice ?? 0)
  const chosenExp = exp ?? (result?.expirationDates?.[0] ? new Date(result.expirationDates[0]*1000).toISOString().slice(0,10) : '')
  const chain = result?.options?.[0]
  if (!chain) throw new Error('Yahoo option chain missing')
  const expISO = chosenExp || (chain?.expiration ? new Date(chain.expiration*1000).toISOString().slice(0,10) : '')
  const options: OptionContract[] = []
  for (const c of (chain.calls||[])) {
    options.push({
      type: 'call',
      exp: expISO,
      strike: Number(c.strike),
      bid: Number(c.bid ?? 0),
      ask: Number(c.ask ?? 0),
      iv: Number(c.impliedVolatility ?? 0),
      oi: Number(c.openInterest ?? 0),
      volume: Number(c.volume ?? 0),
    })
  }
  for (const p of (chain.puts||[])) {
    options.push({
      type: 'put',
      exp: expISO,
      strike: Number(p.strike),
      bid: Number(p.bid ?? 0),
      ask: Number(p.ask ?? 0),
      iv: Number(p.impliedVolatility ?? 0),
      oi: Number(p.openInterest ?? 0),
      volume: Number(p.volume ?? 0),
    })
  }
  const atmIV = estimateATMIV(options, underlying)
  const dte = Math.max(1, Math.round((new Date(expISO).getTime() - Date.now())/86400000))
  return { asOf: new Date().toISOString(), underlying, exp: expISO, dte, options, atmIV }
}
