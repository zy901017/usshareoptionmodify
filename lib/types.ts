export type OptionType = 'call' | 'put'

export type OptionContract = {
  type: OptionType
  exp: string // ISO date
  strike: number
  bid: number
  ask: number
  iv?: number
  delta?: number
  theta?: number
  gamma?: number
  vega?: number
  oi?: number
  volume?: number
}

export type OptionsChain = {
  asOf: string
  underlying: number
  exp: string
  dte: number
  options: OptionContract[]
  atmIV?: number
}

export type StrategyResult = {
  type: string
  legs: any
  width?: number
  credit?: number
  debit?: number
  qty: number
  netReceive: number
  maxRisk: number
  winProb: number
  roc: number
  score: number
  reasons: string[]
}

export type Summary = {
  S: number
  DTE: number
  iv_atm: number
  ivr: number
  sigma: [number, number]
  gex: string
  earningsSoon?: boolean
}
