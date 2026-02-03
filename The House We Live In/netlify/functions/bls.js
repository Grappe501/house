/**
 * Netlify Function: /api/bls
 * Secure proxy to the U.S. Bureau of Labor Statistics API (keeps your key server-side).
 *
 * Request (POST recommended):
 *   POST /api/bls
 *   { "seriesid": ["CUUR0000SA0","LNS14000000"], "startyear":"2015", "endyear":"2025" }
 *
 * GET supported for simple usage:
 *   /api/bls?seriesid=CUUR0000SA0,LNS14000000&startyear=2015&endyear=2025
 *
 * Set environment variable: BLS_API_KEY
 */
const ENDPOINT = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

function parseBody(event) {
  try { return event.body ? JSON.parse(event.body) : null; } catch { return null; }
}

exports.handler = async (event) => {
  try {
    const key = process.env.BLS_API_KEY || "";
    let payload = parseBody(event);

    if (!payload) {
      const q = event.queryStringParameters || {};
      const seriesid = (q.seriesid || "").split(",").map(s=>s.trim()).filter(Boolean);
      payload = {
        seriesid: seriesid.length ? seriesid : ["CUUR0000SA0"],
        startyear: q.startyear || "2015",
        endyear: q.endyear || "2025"
      };
    }

    if (key) payload.registrationkey = key;

    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "accept":"application/json" },
      body: JSON.stringify(payload)
    });

    const text = await resp.text();
    const headers = {
      "content-type": "application/json",
      "cache-control": "public, max-age=21600"
    };
    return { statusCode: resp.status, headers, body: text };
  } catch (e) {
    return { statusCode: 500, headers: {"content-type":"application/json"}, body: JSON.stringify({error:String(e)}) };
  }
};