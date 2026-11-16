// 오늘의 급식 (NEIS)
// 예) /api/meal?atpt=C10&school=7150000            (오늘)
//     /api/meal?atpt=C10&school=7150000&date=20261117
import { send, preflight, neis, kstDate } from './_lib.js';

function cleanDish(s) {
  return s
    .replace(/\s*\(\s*\d+(?:\s*\.\s*\d+)*\s*\.?\s*\)\s*$/, '') // (1.2.5) 알레르기 표시
    .replace(/(?:\d+\.)+\d*\s*$/, '')                          // 1.2.5. 알레르기 표시
    .replace(/^[*#]+/, '')
    .trim();
}

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const { atpt, school } = req.query;
  const date = /^\d{8}$/.test(req.query.date || '') ? req.query.date : kstDate();
  if (!atpt || !school) return send(res, 400, { error: '학교 코드가 필요해요.' });
  try {
    const rows = await neis('mealServiceDietInfo', {
      ATPT_OFCDC_SC_CODE: atpt,
      SD_SCHUL_CODE: school,
      MLSV_YMD: date
    });
    const lunch = rows.find((r) => r.MMEAL_SC_CODE === '2') || rows[0];
    const menu = lunch
      ? String(lunch.DDISH_NM).split(/<br\s*\/?>/i).map(cleanDish).filter(Boolean)
      : [];
    send(res, 200, { date, menu, kcal: lunch ? lunch.CAL_INFO : '' }, 3600);
  } catch (e) {
    send(res, 502, { error: `급식을 가져오지 못했어요: ${e.message}` });
  }
}
