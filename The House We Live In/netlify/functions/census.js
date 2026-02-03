/**
 * Netlify Function: /api/census
 * Secure proxy to the U.S. Census API (keeps your key server-side).
 *
 * Examples:
 *   /api/census?year=2023&dataset=acs/acs5&get=NAME,B19013_001E&for=us:1
 *   /api/census?year=2023&dataset=acs/acs5/subject&get=NAME,S2301_C04_001E&for=county:001&in=state:05
 *
 * Notes:
 * - This function passes most query params through to api.census.gov.
 * - Set environment variable: CENSUS_API_KEY
 */
const DEFAULT_BASE = "https://api.census.gov/data";

function allowlistDataset(ds) {
  // Keep this permissive but safe; user controls ds. Prevent protocol injection.
  return typeof ds === "string" && /^[a-z0-9/_-]+$/i.test(ds);
}

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const year = q.year || "2023";
    const dataset = q.dataset || "acs/acs5";
    const get = q.get || "NAME";
    const forParam = q["for"] || "us:1";
    const inParam = q["in"]; // optional
    const key = process.env.CENSUS_API_KEY || "";

    if (!allowlistDataset(dataset)) {
      return { statusCode: 400, headers: {"content-type":"application/json"}, body: JSON.stringify({error:"Invalid dataset"}) };
    }

    const url = new URL(`${DEFAULT_BASE}/${encodeURIComponent(year)}/${dataset}`);
    url.searchParams.set("get", get);
    url.searchParams.set("for", forParam);
    if (inParam) url.searchParams.set("in", inParam);
    if (key) url.searchParams.set("key", key);

    const resp = await fetch(url.toString(), { headers: { "accept": "application/json" }});
    const text = await resp.text();

    // Basic cache: 6 hours at edge/browser
    const headers = {
      "content-type": resp.headers.get("content-type") || "application/json",
      "cache-control": "public, max-age=21600"
    };

    return { statusCode: resp.status, headers, body: text };
  } catch (e) {
    return { statusCode: 500, headers: {"content-type":"application/json"}, body: JSON.stringify({error:String(e)}) };
  }
};