'use client'
import React from 'react'

type Strategy = {
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

export default function StrategyCard({ s }: { s: Strategy }) {
  return (
    <div className="border rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{s.type}</h3>
        <span className="text-sm px-2 py-1 rounded-full bg-gray-100">Score {Math.round(s.score)}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
        <KV k="Qty" v={`${s.qty}`} />
        <KV k="Net Credit" v={`$${s.netReceive.toFixed(2)}`} />
        <KV k="Max Risk" v={`$${s.maxRisk.toFixed(2)}`} />
        <KV k="Win Prob" v={`${Math.round(s.winProb * 100)}%`} />
        <KV k="ROC" v={`${(s.roc * 100).toFixed(1)}%`} />
        <KV k="Pricing" v={s.credit != null ? `$${s.credit.toFixed(2)} credit` : `$${s.debit?.toFixed(2)} debit`} />
      </div>
      <div className="text-xs overflow-x-auto">
        <pre className="bg-gray-50 rounded-xl p-3">{JSON.stringify(s.legs, null, 2)}</pre>
      </div>
      <ul className="list-disc pl-5 text-sm">
        {s.reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border p-2">
      <div className="text-gray-500">{k}</div>
      <div className="font-semibold">{v}</div>
    </div>
  )
}
