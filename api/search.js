// 학교 검색: 컴시간 학교 목록 + NEIS 학교 정보(급식·학사일정용 코드)를 같이 돌려줘요.
// 예) /api/search?q=동수영중
import Comcigan from 'parse-comcigan';
import { send, preflight, neis } from './_lib.js';

export default async function handler(req, res) {
  if (preflight(req, res)) return;
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return send(res, 400, { error: '학교 이름을 두 글자 이상 입력해 주세요.' });

  const [comci, school] = await Promise.allSettled([
    Comcigan.search(q),
    neis('schoolInfo', { SCHUL_NM: q })
  ]);

  const result = {
    comci: comci.status === 'fulfilled'
      ? comci.value.map((s) => ({ code: s.code, name: s.name, region: s.region }))
      : [],
    neis: school.status === 'fulfilled'
      ? school.value.map((s) => ({
          atpt: s.ATPT_OFCDC_SC_CODE,
          code: s.SD_SCHUL_CODE,
          name: s.SCHUL_NM,
          kind: s.SCHUL_KND_SC_NM,
          region: s.LCTN_SC_NM,
          addr: s.ORG_RDNMA
        }))
      : [],
    errors: {
      comci: comci.status === 'rejected' ? String(comci.reason?.message || comci.reason) : null,
      neis: school.status === 'rejected' ? String(school.reason?.message || school.reason) : null
    }
  };
  // 둘 중 하나라도 실패했으면 저장(캐시)하지 않아요
  send(res, 200, result, result.errors.comci || result.errors.neis ? 0 : 86400);
}
