// 공통 도우미: CORS, 캐시, NEIS 호출, 날짜 계산
// 파일 이름이 _ 로 시작해서 Vercel 주소(/api/...)로는 열리지 않아요.

export function send(res, status, body, cacheSeconds = 0) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (status === 200 && cacheSeconds > 0) {
    // Vercel CDN이 잠깐 저장해 두었다가 같은 요청에 바로 돌려줘요 (컴시간 서버 부담 줄이기)
    res.setHeader('Cache-Control', `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 6}`);
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  res.status(status).send(JSON.stringify(body));
}

export function preflight(req, res) {
  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return true;
  }
  return false;
}

// 한국 시간 기준 날짜 (YYYYMMDD)
export function kstDate(offsetDays = 0) {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

// 이번 주 월요일~금요일 (토·일이면 다음 주)
export function kstWeek() {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  let day = now.getUTCDay(); // 0=일
  let diff = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
  const mon = new Date(now.getTime() + diff * 86400 * 1000);
  const fri = new Date(mon.getTime() + 4 * 86400 * 1000);
  const f = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  return { from: f(mon), to: f(fri) };
}

// NEIS 교육정보 개방 포털 호출. 인증키(NEIS_KEY)가 없으면 한 번에 5줄까지만 받아요.
export async function neis(service, params) {
  const url = new URL(`https://open.neis.go.kr/hub/${service}`);
  url.searchParams.set('Type', 'json');
  url.searchParams.set('pIndex', '1');
  url.searchParams.set('pSize', process.env.NEIS_KEY ? '200' : '5');
  if (process.env.NEIS_KEY) url.searchParams.set('KEY', process.env.NEIS_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const r = await fetch(url, { headers: { 'User-Agent': 'uri-ban-chilpan/1.0' } });
  if (!r.ok) throw new Error(`NEIS 응답 오류 (${r.status})`);
  const json = await r.json();
  const block = json[service];
  if (!Array.isArray(block)) return []; // INFO-200: 데이터 없음
  const rows = block.find((b) => Array.isArray(b.row));
  return rows ? rows.row : [];
}

export const NEIS_TIMETABLE = {
  '초등학교': 'elsTimetable',
  '중학교': 'misTimetable',
  '고등학교': 'hisTimetable'
};

export function num(v, min, max) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}
