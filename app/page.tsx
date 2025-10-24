'use client'
import React, { useMemo, useState } from 'react'
import OverviewBar from '@/components/OverviewBar'
import StrategyCard from '@/components/StrategyCard'

type Summary = {
  S: number; DTE: number; iv_atm: number; ivr: number; sigma: [number, number]; gex: string; earningsSoon?: boolean
}
type Strategy = {
  type: string; legs: any; width?: number; credit?: number; debit?: number; qty: number; netReceive: number; maxRisk: number; winProb: number; roc: number; score: number; reasons: string[]
}

export default function Page() {
  const [symbol, setSymbol] = useState('TSLA')
  const [exp, setExp] = useState<string | undefined>(undefined)
  const [targetNet, setTargetNet] = useState(150)
  const [avoidEarnings, setAvoidEarnings] = useState(true)
  const [loading, setLoading] = useState(false)
  const [expirations, setExpirations] = useState<string[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [error, setError] = useState<string | null>(null)

  const canRecommend = useMemo(() => symbol.trim().length > 0, [symbol])

  async function fetchOptions() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/options?symbol=${encodeURIComponent(symbol)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'options error')
      setExpirations(data.expirations || [])
      if (data.expirations?.length) setExp(data.expirations[0])
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  async function recommend() {
    if (!canRecommend) return
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ symbol, targetNet: String(targetNet), avoidEarnings: String(avoidEarnings), ...(exp ? { exp } : {}) })
      const res = await fetch(`/api/strategies?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'strategies error')
      setSummary(data.summary)
      setStrategies(data.strategies || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Options Strategist Pro</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 border rounded-2xl p-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600">Symbol</label>
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="border rounded-xl p-2" placeholder="TSLA / SPY / QQQ" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600">Expiration</label>
          <div className="flex gap-2">
            <select value={exp || ''} onChange={e => setExp(e.target.value || undefined)} className="border rounded-xl p-2 flex-1">
              <option value="">Auto</option>
              {expirations.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <button onClick={fetchOptions} className="px-3 py-2 border rounded-xl">Load</button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600">Target Net / spread</label>
          <input type="number" value={targetNet} onChange={e => setTargetNet(parseInt(e.target.value||'150'))} className="border rounded-xl p-2" />
        </div>
        <div className="flex items-center gap-2">
          <input id="earn" type="checkbox" checked={avoidEarnings} onChange={e => setAvoidEarnings(e.target.checked)} />
          <label htmlFor="earn" className="text-sm text-gray-600">Avoid earnings (±7d)</label>
        </div>
        <div className="flex items-end">
          <button disabled={!canRecommend || loading} onClick={recommend} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60">{loading ? 'Loading...' : 'Recommend'}</button>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 border text-sm">{error}</div>}

      {summary && <OverviewBar summary={summary} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((s, i) => <StrategyCard key={i} s={s} />)}
      </div>

      <footer className="text-xs text-gray-500">Educational use only. No financial advice.</footer>
    </main>
  )
}
