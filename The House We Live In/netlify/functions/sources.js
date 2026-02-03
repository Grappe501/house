/**
 * Netlify Function: /api/sources
 * Returns a curated list of data pulls and intended source endpoints used by the site.
 * In V51 this is a static scaffold; later versions will persist pull logs.
 */
exports.handler = async () => {
  const sources = {
    census: {
      base: "https://api.census.gov/data",
      examples: [
        "/api/census?year=2023&dataset=acs/acs5&get=NAME,B19013_001E&for=us:1",
        "/api/census?year=2023&dataset=acs/acs5&get=NAME,B19013_001E&for=state:05"
      ]
    },
    bls: {
      endpoint: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
      examples: [
        { seriesid:["CUUR0000SA0"], startyear:"2015", endyear:"2025" }
      ]
    }
  };
  return {
    statusCode: 200,
    headers: { "content-type":"application/json", "cache-control":"public, max-age=86400" },
    body: JSON.stringify(sources)
  };
};