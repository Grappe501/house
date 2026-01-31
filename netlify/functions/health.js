exports.handler = async () => {
  const census = process.env.CENSUS_API_KEY || "";
  const bls = process.env.BLS_API_KEY || "";

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify({
      ok: true,
      keys: {
        census_present: census.length > 0,
        bls_present: bls.length > 0,
        census_len: census.length,
        bls_len: bls.length
      },
      time_utc: new Date().toISOString()
    })
  };
};
