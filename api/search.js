// Vercel Serverless Function: Proxy Search for MFDS Public API
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "query" is required' });
  }

  const serviceKey = process.env.YAKSSOOG_API_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Server environment variable YAKSSOOG_API_KEY is not set.' });
  }

  try {
    const url = `https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01?serviceKey=${encodeURIComponent(serviceKey)}&item_name=${encodeURIComponent(query)}&pageNo=1&numOfRows=1&type=json`;
    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: `Public API returned status ${apiRes.status}` });
    }
    const data = await apiRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
