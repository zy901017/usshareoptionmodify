import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest){
  // Teaching-level placeholder backtest
  const result = {
    equityCurve: [10000, 10150, 10280, 10090, 10420],
    sharpe: 0.9,
    winRate: 0.64,
    avgROC: 0.18,
    maxDD: -0.07
  }
  return NextResponse.json(result)
}
