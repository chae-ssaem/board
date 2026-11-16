// 우리 반 이번 주 시간표
// 예) /api/timetable?code=12345&grade=2&cls=3        (컴시간)
//     &atpt=C10&school=7150000&kind=중학교          (컴시간이 막히면 NEIS로 대체)
import Comcigan from 'parse-comcigan';
import { send, preflight, neis, kstWeek, num, NEIS_TIMETABLE } from './_lib.js';

async function fromComcigan(code, grade, cls) {
  const comci = new Comcigan(code);
  const data = await comci.timetable({ grade, classNum: cls, week: 1 });
  return {
    source: 'comcigan',
    times: data.times, // ['08:50', '09:45', ...] 교시 시작 시각
    days: data.timetable.map((day) =>
      day.items.map((it, i) => ({
        p: i + 1,
        subject: it.subject || '',
        teacher: it.teacher || '',
        room: it.classRoom || '',
        changed: !!it.original,
        before: it.original ? it.original.subject : ''
      }))
    )
  };
}

async function fromNeis(atpt, school, kind, grade, cls) {
  const service = NEIS_TIMETABLE[kind] || 'misTimetable';
  const { from, to } = kstWeek();
  const rows = await neis(service, {
    ATPT_OFCDC_SC_CODE: atpt,
    SD_SCHUL_CODE: school,
    GRADE: grade,
    CLASS_NM: cls,
    TI_FROM_YMD: from,
    TI_TO_YMD: to
  });
  const byDate = {};
  for (const r of rows) {
    (byDate[r.ALL_TI_YMD] ||= []).push({
      p: Number(r.PERIO),
      subject: String(r.ITRT_CNTNT || '').replace(/^[-*]\s*/, ''),
      teacher: '',
      room: '',
      changed: false,
      before: ''
    });
  }
  const days = [];
  const mon = new Date(`${from.slice(0, 4)}-${from.slice(4, 6)}-${from.slice(6)}T00:00:00Z`);
  for (let i = 0; i < 5; i++) {
    const d = new Date(mon.getTime() + i * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    days.push((byDate[d] || []).sort((a, b) => a.p - b.p));
  }
  return { source: 'neis', times: [], days };
}

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const code = num(req.query.code, 1, 999999999);
  const grade = num(req.query.grade, 1, 6);
  const cls = num(req.query.cls, 1, 40);
  const { atpt, school, kind } = req.query;
  if (!grade || !cls) return send(res, 400, { error: '학년과 반을 확인해 주세요.' });

  let comciError = null;
  if (code) {
    try {
      return send(res, 200, await fromComcigan(code, grade, cls), 600);
    } catch (e) {
      comciError = String(e?.message || e);
    }
  }
  if (atpt && school) {
    try {
      const data = await fromNeis(atpt, school, kind, grade, cls);
      data.notice = comciError ? `컴시간 대신 NEIS 시간표를 보여 주고 있어요 (${comciError})` : null;
      return send(res, 200, data, 1800);
    } catch (e) {
      return send(res, 502, { error: `시간표를 가져오지 못했어요: ${comciError || ''} / ${e.message}` });
    }
  }
  send(res, 502, { error: `시간표를 가져오지 못했어요: ${comciError || '학교 정보가 없어요'}` });
}
