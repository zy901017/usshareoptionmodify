import { NextResponse } from 'next/server'
import { envSummary } from './deps'

export const runtime = 'nodejs'

export async function GET(){
  return NextResponse.json({
    env: envSummary(),
    providers: { alphaVantage: 'ok', yahoo: 'ok' },
    endpoints: { GLOBAL_QUOTE: 'ok', REALTIME_OPTIONS: 'ok' }
  })
}
