export function envSummary(){
  return {
    ALPHA_VANTAGE_API_KEY: !!process.env.ALPHA_VANTAGE_API_KEY,
    GEXBOT_API_KEY: !!process.env.GEXBOT_API_KEY,
    FINNHUB_API_KEY: !!process.env.FINNHUB_API_KEY,
  }
}
