// 이번 주 학사일정 (NEIS)
// 예) /api/schedule?atpt=C10&school=7150000
import { send, preflight, neis, kstWeek } from './_lib.js';

const SKIP = /토요휴업일|^휴업일$/;

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const { atpt, school } = req.query;
  if (!atpt || !school) return send(res, 400, { error: '학교 코드가 필요해요.' });
  const { from, to } = kstWeek();
  try {
    const rows = await neis('SchoolSchedule', {
      ATPT_OFCDC_SC_CODE: atpt,
      SD_SCHUL_CODE: school,
      AA_FROM_YMD: from,
      AA_TO_YMD: to
    });
    const events = rows
      .filter((r) => r.EVENT_NM && !SKIP.test(r.EVENT_NM))
      .map((r) => ({ date: r.AA_YMD, name: r.EVENT_NM }));
    send(res, 200, { from, to, events }, 3600);
  } catch (e) {
    send(res, 502, { error: `학사일정을 가져오지 못했어요: ${e.message}` });
  }
}
