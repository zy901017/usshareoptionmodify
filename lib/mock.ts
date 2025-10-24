import { OptionsChain, OptionContract } from './types'

export function mockChain(symbol:string, exp?:string): OptionsChain {
  const S = 250
  const ex = exp ?? new Date(Date.now()+8*86400000).toISOString().slice(0,10)
  const strikes = Array.from({length: 21}, (_,i)=> 200 + i*5)
  const opts: OptionContract[] = []
  for (const k of strikes) {
    const dist = Math.abs(k - S)
    const baseIv = 0.55 - Math.min(0.3, dist/1000)
    const call: OptionContract = { type:'call', exp: ex, strike: k, bid: Math.max(0, Math.round(Math.max(0, (S - k)*0.5 + 2 + (Math.random()-0.5))) ), ask: Math.max(0.01, Math.round(Math.max(0.1, (S - k)*0.5 + 2.2 + (Math.random()-0.5)))) , iv: baseIv, delta: 0.5, theta: -0.05, gamma: 0.02, vega: 0.1, oi: 500, volume: 100 }
    const put: OptionContract = { type:'put', exp: ex, strike: k, bid: Math.max(0, Math.round(Math.max(0, (k - S)*0.5 + 2 + (Math.random()-0.5))) ), ask: Math.max(0.01, Math.round(Math.max(0.1, (k - S)*0.5 + 2.2 + (Math.random()-0.5)))) , iv: baseIv, delta: -0.5, theta: -0.05, gamma: 0.02, vega: 0.1, oi: 500, volume: 100 }
    call.bid = Math.max(0, call.bid); call.ask = Math.max(call.bid+0.05, call.ask)
    put.bid = Math.max(0, put.bid); put.ask = Math.max(put.bid+0.05, put.ask)
    opts.push(call, put)
  }
  return {
    asOf: new Date().toISOString(),
    underlying: S,
    exp: ex,
    dte: Math.max(1, Math.round((new Date(ex).getTime() - Date.now())/86400000)),
    options: opts,
    atmIV: 0.55
  }
}

export function mockExpirations(): string[] {
  const base = Date.now()
  const days = [7, 14, 21, 28]
  return days.map(d => new Date(base + d*86400000).toISOString().slice(0,10))
}
