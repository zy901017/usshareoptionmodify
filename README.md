# Options Strategist Pro

Educational, server-side **options strategy recommender** built on **Next.js 14 + Vercel**.  
Generates **three prioritized strategies** per symbol (Iron Condor / PCS / Iron Butterfly) and **additional**:
- Covered Call
- Call Ratio Spread
- Calendar Spread
- Diagonal Spread
- Collar

> Target **net credit ≥ $150 per spread** (adjustable).

## Live Flow
1. Input **symbol / expiration / target net / avoid earnings** on the UI
2. Server calls providers (Alpha Vantage primary; Yahoo fallback; optional GEXBOT)
3. Engine computes: ATM IV, DTE, ±1σ, IV Rank, TA score, probability, ROC, liquidity, GEX
4. Returns **top-3** strategies with reasons & scores

## Data Providers
- **Alpha Vantage** (primary): `GLOBAL_QUOTE`, `TREASURY_YIELD`, `REALTIME_OPTIONS (require_greeks=true)`
- **Yahoo Options** (fallback) via server-side fetch
- **GEXBOT** (optional) — placeholder wired
- Finnhub (optional placeholder)

## Environment
Set on Vercel **Project Settings → Environment Variables** (Server only):
- `ALPHA_VANTAGE_API_KEY` (required for production data)
- `GEXBOT_API_KEY` (optional)
- `FINNHUB_API_KEY` (optional)

## Deploy (Vercel + GitHub)
1. **Fork/Upload** this repo to GitHub
2. On Vercel: **New Project → Import from GitHub**
3. Set env vars above
4. Deploy (Node >=18.18 <21)
5. Smoke test:

   - `/api/health`

   - `/api/options?symbol=TSLA`

   - `/api/strategies?symbol=TSLA`


## Local Dev
```bash
pnpm i # or npm ci / yarn
pnpm dev
```
> Without keys, dev runs in **mock mode** so you can test UI & logic.

## Notes
- Logic is **teaching-grade**: normal-approx probabilities, simplified IVR/TA, liquidity heuristics.
- Financial risk management **remains your responsibility**. This is **not investment advice**.

## License
MIT
