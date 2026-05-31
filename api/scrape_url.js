// Vercel Serverless Function: Scrape a given Naver 의약품사전 URL for med info
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: 'url 파라미터가 필요합니다.' });

  // Only allow Naver 의약품사전 and health.kr
  if (!url.includes('terms.naver.com') && !url.includes('health.kr')) {
    return res.status(400).json({ success: false, error: '지원하지 않는 URL입니다.' });
  }

  try {
    // For Naver, extract docId and fetch the canonical desktop URL (more parseable)
    let fetchUrl = url;
    const docIdMatch = url.match(/docId=(\d+)/);
    if (docIdMatch) {
      fetchUrl = `https://terms.naver.com/entry.naver?docId=${docIdMatch[1]}&cid=51000&categoryId=51000`;
    }

    const pageRes = await fetch(fetchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YakSsoog/1.0)' }
    });
    if (!pageRes.ok) {
      return res.status(502).json({ success: false, error: `페이지 로딩 실패 (${pageRes.status})` });
    }

    let html = await pageRes.text();

    // Unescape HTML entities
    html = html
      .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d))
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

    // --- Parse name from <title> ---
    let name = '';
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      name = titleMatch[1].split(':')[0].split('|')[0].trim();
    }
    // og:title is more accurate than <title> (no site suffix)
    const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/)||
                         html.match(/content="([^"]+)"\s+property="og:title"/);
    if (ogTitleMatch) name = ogTitleMatch[1].trim();

    // --- Parse manufacturer ---
    let manufacturer = '알 수 없음';
    const manufMatch = html.match(/(?:제조\/수입사|제조사|제조\/수입업체)[^<]*<\/th>\s*<td[^>]*>\s*([^<\n]+)/s);
    if (manufMatch) manufacturer = manufMatch[1].replace(/<[^>]+>/g, '').trim();

    // --- Parse efficacy & usage from og:description meta ---
    let efficacy = '';
    let usage = '';
    const ogDescMatch = html.match(/property="og:description"\s+content="([^"]+)"/) ||
                        html.match(/content="([^"]+)"\s+property="og:description"/);
    if (ogDescMatch) {
      const desc = ogDescMatch[1];
      const effM = desc.match(/\[효능효과\]\s*(.*?)(?=\s*\[|$)/);
      if (effM) efficacy = effM[1].trim();
      const useM = desc.match(/\[용법용량\]\s*(.*?)(?=\s*\[|$)/);
      if (useM) usage = useM[1].trim();
    }

    // --- Parse image URL ---
    let image_url = '';
    const imgMatch = html.match(/imageUrl=([^&"']+)/) || html.match(/og:image[^>]+content="([^"]+)"/);
    if (imgMatch) image_url = decodeURIComponent(imgMatch[1]);

    if (!name) {
      return res.status(200).json({ success: false, error: '약 이름을 파싱하지 못했습니다. URL을 확인하세요.' });
    }

    return res.status(200).json({
      success: true,
      data: { name, manufacturer, efficacy, usage, image_url }
    });

  } catch (err) {
    console.error('scrape_url error:', err);
    return res.status(500).json({ success: false, error: '서버 오류: ' + err.message });
  }
};
