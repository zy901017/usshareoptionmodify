'use client'
import React from 'react'

type Summary = {
  S: number
  DTE: number
  iv_atm: number
  ivr: number
  sigma: [number, number]
  gex: string
  earningsSoon?: boolean
}

export default function OverviewBar({ summary }: { summary: Summary }) {
  const { S, DTE, iv_atm, ivr, sigma, gex, earningsSoon } = summary
  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border rounded-2xl shadow-sm">
      <Item label="Price" value={`$${S.toFixed(2)}`} />
      <Item label="DTE" value={`${DTE}d`} />
      <Item label="ATM IV" value={`${(iv_atm * 100).toFixed(1)}%`} />
      <Item label="IV Rank" value={`${Math.round(ivr)}%`} />
      <Item label="±1σ Range" value={`$${sigma[0].toFixed(2)} ~ $${sigma[1].toFixed(2)}`} />
      <Item label="GEX" value={gex + (earningsSoon ? ' · Earnings <7d' : '')} />
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}
