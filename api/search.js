// Vercel Serverless Function: Proxy Search for MFDS Public API with Naver fallback scraper
async function scrapeNaverMedicine(query) {
  try {
    const searchUrl = `https://terms.naver.com/medicineSearch.naver?mode=nameSearch&query=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();
    
    // Find first /entry.naver?docId=(\d+)
    const entryMatch = searchHtml.match(/href="(\/entry\.naver\?docId=(\d+)[^"]*)"/);
    if (!entryMatch) return null;
    
    const docId = entryMatch[2];
    const detailUrl = `https://terms.naver.com/entry.naver?docId=${docId}&cid=51000&categoryId=51000`;
    
    const detailRes = await fetch(detailUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!detailRes.ok) return null;
    let detailHtml = await detailRes.text();
    
    // Simple HTML unescape function
    detailHtml = detailHtml.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
                           .replace(/&amp;/g, '&')
                           .replace(/&lt;/g, '<')
                           .replace(/&gt;/g, '>')
                           .replace(/&quot;/g, '"')
                           .replace(/&#039;/g, "'");
                           
    // Parse title
    let title = '알 수 없음';
    const titleMatch = detailHtml.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].split(':')[0].trim();
    }
    
    // Parse Image URL
    let imageUrl = '';
    const imgMatch = detailHtml.match(/imageUrl=([^&"']+)/);
    if (imgMatch) {
      imageUrl = decodeURIComponent(imgMatch[1]);
    }
    
    // Parse Manufacturer
    let manufacturer = '알 수 없음';
    const manufMatch = detailHtml.match(/(?:제조\/수입사|제조사|제조\/수입업체).*?<\/th>\s*<td>\s*([^<]+)/s);
    if (manufMatch) {
      manufacturer = manufMatch[1].replace(/<[^>]+>/g, '').trim();
    }
    
    // Parse description for Efficacy & Usage
    let efficacy = '';
    let usage = '';
    const metaMatch = detailHtml.match(/<meta[^>]*?property="og:description"[^>]*?content="([^"]+)"/) ||
                      detailHtml.match(/<meta[^>]*?content="([^"]+)"[^>]*?property="og:description"/);
    if (metaMatch) {
      const descContent = metaMatch[1];
      
      const effMatch = descContent.match(/\[효능효과\]\s*(.*?)(?=\s*\[|$)/);
      if (effMatch) efficacy = effMatch[1].trim();
      
      const useMatch = descContent.match(/\[용법용량\]\s*(.*?)(?=\s*\[|$)/);
      if (useMatch) usage = useMatch[1].trim();
    }
    
    return {
      ITEM_SEQ: docId,
      ITEM_NAME: title,
      ENTP_NAME: manufacturer,
      ITEM_IMAGE: imageUrl,
      EFFICIENCY_OUTLINE: efficacy,
      USE_METHOD_OUTLINE: usage,
      UPDATE_DATE: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      CRA_RSTRCN_OUTLINE: ''
    };
  } catch (err) {
    console.error('Naver scrape failed:', err);
    return null;
  }
}

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

  const serviceKey = process.env.YAKSSOOG_API_KEY || req.query.apiKey || req.query.serviceKey || req.query.key;
  let apiSuccess = false;
  let apiData = null;

  if (serviceKey) {
    try {
      const finalKey = serviceKey.includes('%') ? serviceKey : encodeURIComponent(serviceKey);
      const url = `https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01?serviceKey=${finalKey}&item_name=${encodeURIComponent(query)}&pageNo=1&numOfRows=1&type=json`;
      const apiRes = await fetch(url);
      if (apiRes.ok) {
        apiData = await apiRes.json();
        if (apiData && apiData.body && apiData.body.totalCount > 0) {
          apiSuccess = true;
        }
      }
    } catch (error) {
      console.warn('MFDS API error, falling back to Naver:', error.message);
    }
  }

  if (apiSuccess && apiData) {
    return res.status(200).json(apiData);
  }

  // Fallback to Naver scraping
  const naverData = await scrapeNaverMedicine(query);
  if (naverData) {
    const mfdsMock = {
      header: {
        resultCode: '00',
        resultMsg: 'NORMAL SERVICE (Naver Fallback).'
      },
      body: {
        pageNo: 1,
        totalCount: 1,
        numOfRows: 1,
        items: [naverData]
      }
    };
    return res.status(200).json(mfdsMock);
  }

  // If everything fails, return empty result
  const emptyResponse = {
    header: {
      resultCode: '00',
      resultMsg: 'NO DATA FOUND'
    },
    body: {
      pageNo: 1,
      totalCount: 0,
      numOfRows: 1,
      items: []
    }
  };
  return res.status(200).json(emptyResponse);
};
