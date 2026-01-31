/**
 * Netlify Function: /api/health
 * Lightweight "is the backend alive" endpoint + lists configured env vars (redacted).
 * Useful for debugging on Netlify without exposing secrets.
 */
exports.handler = async () => {
  const hasCensus = !!process.env.CENSUS_API_KEY;
  const hasBls = !!process.env.BLS_API_KEY;
  return {
    statusCode: 200,
    headers: { "content-type":"application/json", "cache-control":"no-store" },
    body: JSON.stringify({
      ok: true,
      env: { CENSUS_API_KEY: hasCensus ? "set" : "missing", BLS_API_KEY: hasBls ? "set" : "missing" },
      time_utc: new Date().toISOString()
    })
  };
};