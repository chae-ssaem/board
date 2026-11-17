// 우리 반 칠판 — 칠판(index.html)과 리모컨(remote.html)이 같이 쓰는 기능
// 파이어베이스 연결, 체험 모드, 날짜·글자 도우미

export const FIREBASE_VER = '10.12.2';
export const DEL = { __op: 'del' };
export const NOW = { __op: 'now' };
export const inc = (n) => ({ __op: 'inc', n });
const isOp = (v, op) => !!v && typeof v === 'object' && v.__op === op;
const isPlain = (v) => Object.prototype.toString.call(v) === '[object Object]';

// 미리보기 페이지(칠판+폰 한 화면)에서는 부모 창의 체험 저장소를 같이 써요
export function sharedDemo() {
  try { return window.parent !== window && window.parent.__uribanStore ? window.parent.__uribanStore : null; } catch { return null; }
}
// 체험 모드에서는 확인 창 없이 진행해요 (미리보기 화면은 확인 창을 막아요)
export function ask(msg) {
  if (window.__uribanDemoMode) return true;
  try { return window.confirm(msg); } catch { return true; }
}

/* ---------- 작은 도우미 ---------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const pad = (n) => String(n).padStart(2, '0');
export const tsMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : null);

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function ymd(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
export function hm(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function minutesOf(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
export function fromMinutes(m) {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
// 이번 주 월요일 (토·일이면 다음 주 월요일)
export function weekMonday(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return m;
}
export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export const DAYS_EN = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'];

// 받침에 따라 '로/으로' 고르기 (ㄹ 받침은 '로')
export function ro(word) {
  const ch = String(word || '').trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return '(으)로';
  const jong = code % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}
// 호출 문구: 장소를 고르면 "○○로 와 주세요!", 직접 쓴 문장이 있으면 그 문장 그대로
export function callText(names, place, message) {
  const msg = String(message || '').trim();
  const who = names.length ? `${names.join(' · ')} 학생,` : msg ? '우리 반 친구들,' : '';
  return { who, where: msg || `${place}${ro(place)} 와 주세요!` };
}
export function callSummary(c) {
  const who = (c.names || []).join(' · ') || '반 전체';
  return c.message ? `${who} · "${c.message}"` : `${who} → ${c.place}`;
}

export function randomId(len = 20) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => abc[x % abc.length]).join('');
}

/* ---------- 저장(이 기기) ---------- */
const LS_KEY = 'uriban.v1';
export function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
}
export function saveLocal(v) {
  try { v ? localStorage.setItem(LS_KEY, JSON.stringify(v)) : localStorage.removeItem(LS_KEY); } catch { /* 저장 불가 브라우저 */ }
}

/* ---------- 연결 링크(QR) ---------- */
export function encodeLink(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeLink(s) {
  try {
    const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
export function remoteUrl(conn) {
  const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
  return `${base}remote.html#c=${encodeLink(conn)}`;
}
export function boardUrl(conn) {
  const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
  return `${base}index.html#c=${encodeLink(conn)}`;
}
export function connFromHash() {
  const m = /[#&]c=([^&]+)/.exec(location.hash);
  return m ? decodeLink(m[1]) : null;
}

// 파이어베이스 콘솔에서 복사한 firebaseConfig 글자를 읽어요 (JSON이든 JS 객체든)
export function parseFirebaseConfig(text) {
  const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const cfg = {};
  for (const k of keys) {
    const m = new RegExp(`["']?${k}["']?\\s*:\\s*["']([^"']+)["']`).exec(text);
    if (m) cfg[k] = m[1].trim();
  }
  return cfg.apiKey && cfg.projectId && cfg.appId ? cfg : null;
}

/* ---------- 학생 명단 붙여넣기 ---------- */
// 한 줄에 "번호  이름  (생일)" — 엑셀·나이스에서 복사한 탭/쉼표/띄어쓰기 모두 OK
export function parseStudents(text) {
  const out = [];
  let auto = 1;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim().replace(/(\d{1,2})\s*월\s*(\d{1,2})\s*일?/, '$1/$2');
    if (!line) continue;
    const parts = line.split(/\t|,|\s{2,}|\s(?=\d)|(?<=\d)\s/).map((p) => p.trim()).filter(Boolean);
    let no = null;
    let name = '';
    let bday = '';
    for (const p of parts) {
      const bd = /^(?:\d{4}[-./])?(\d{1,2})[-./월]\s*(\d{1,2})일?$/.exec(p) || /^(\d{2})(\d{2})$/.exec(p.length === 4 && no !== null ? p : '');
      if (no === null && /^\d{1,3}$/.test(p)) no = Number(p);
      else if (bd && name) bday = `${pad(bd[1])}-${pad(bd[2])}`;
      else if (!name && /[가-힣A-Za-z]/.test(p) && !/^(번호|이름|성명|생일)$/.test(p)) name = p;
    }
    if (!name) continue;
    if (no === null) no = auto;
    auto = no + 1;
    out.push({ no, name, bday });
  }
  const seen = new Set();
  return out.filter((s) => (seen.has(s.no) ? false : seen.add(s.no))).sort((a, b) => a.no - b.no);
}
export function studentsToText(list) {
  return (list || []).map((s) => [s.no, s.name, s.bday].filter(Boolean).join('\t')).join('\n');
}

/* ---------- 중계(컴시간·NEIS) ---------- */
export function defaultRelay() {
  return /^https?:/.test(location.protocol) ? `${location.origin}/api` : '';
}
export async function relay(base, path, params) {
  const url = new URL(`${(base || defaultRelay()).replace(/\/$/, '')}/${path}`);
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `중계 오류 (${r.status})`);
  return j;
}

/* ---------- 파이어베이스 저장소 ---------- */
let fb = null;
async function loadFirebase() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VER}`;
  const [app, fs] = await Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-firestore.js`)]);
  fb = { ...app, ...fs };
  return fb;
}

function toFs(v, F) {
  if (isOp(v, 'del')) return F.deleteField();
  if (isOp(v, 'now')) return F.serverTimestamp();
  if (isOp(v, 'inc')) return F.increment(v.n);
  if (Array.isArray(v)) return v.map((x) => toFs(x, F));
  if (isPlain(v)) {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = toFs(x, F);
    return o;
  }
  return v;
}

export async function connectFirebase(cfg, classId) {
  const F = await loadFirebase();
  const name = `uriban-${cfg.projectId}`;
  const app = F.getApps().find((a) => a.name === name) || F.initializeApp(cfg, name);
  let db;
  try {
    db = F.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    db = F.getFirestore(app);
  }
  const settingsRef = F.doc(db, 'classes', classId);
  const liveRef = F.doc(db, 'classes', classId, 'state', 'live');
  const checksCol = F.collection(db, 'classes', classId, 'checks');
  const unsubs = [];
  return {
    demo: false,
    onSettings(cb, onErr) { unsubs.push(F.onSnapshot(settingsRef, (s) => cb(s.data() || null), onErr)); },
    onLive(cb, onErr) { unsubs.push(F.onSnapshot(liveRef, (s) => cb(s.data() || {}), onErr)); },
    onChecks(cb) {
      const q = F.query(checksCol, F.orderBy('closedAt', 'desc'), F.limit(20));
      unsubs.push(F.onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([])));
    },
    async init(settings, live) {
      await F.setDoc(settingsRef, toFs(settings, F), { merge: true });
      const cur = await F.getDoc(liveRef);
      if (!cur.exists()) await F.setDoc(liveRef, toFs(live, F));
    },
    saveSettings: (patch) => F.updateDoc(settingsRef, toFs(patch, F)),
    update: (patch) => F.updateDoc(liveRef, toFs(patch, F)),
    archiveCheck: (data) => F.addDoc(checksCol, toFs({ ...data, closedAt: NOW }, F)),
    close() { unsubs.forEach((u) => u()); }
  };
}

/* ---------- 체험 모드(파이어베이스 없이 이 기기 안에서만) ---------- */
function fakeTs() { const ms = Date.now(); return { toMillis: () => ms }; }
function resolveVal(v, prev) {
  if (isOp(v, 'now')) return fakeTs();
  if (isOp(v, 'inc')) return (Number(prev) || 0) + v.n;
  if (Array.isArray(v)) return v.map((x) => resolveVal(x));
  if (isPlain(v)) {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = resolveVal(x);
    return o;
  }
  return v;
}
function applyPatch(obj, patch) {
  for (const [path, v] of Object.entries(patch)) {
    const keys = path.split('.');
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) o = (o[keys[i]] && typeof o[keys[i]] === 'object') ? o[keys[i]] : (o[keys[i]] = {});
    const last = keys[keys.length - 1];
    if (isOp(v, 'del')) delete o[last];
    else o[last] = resolveVal(v, o[last]);
  }
}
export function demoStore(settings, live) {
  const S = structuredClone(settings);
  const L = structuredClone(live);
  const subs = { s: [], l: [], c: [] };
  const checks = [];
  const emit = () => {
    subs.s.forEach((cb) => cb(S));
    subs.l.forEach((cb) => cb(L));
    subs.c.forEach((cb) => cb(checks));
  };
  return {
    demo: true,
    onSettings(cb) { subs.s.push(cb); setTimeout(() => cb(S)); },
    onLive(cb) { subs.l.push(cb); setTimeout(() => cb(L)); },
    onChecks(cb) { subs.c.push(cb); setTimeout(() => cb(checks)); },
    async init() {},
    async saveSettings(p) { applyPatch(S, p); emit(); },
    async update(p) { applyPatch(L, p); emit(); },
    async archiveCheck(d) { checks.unshift({ id: randomId(6), ...resolveVal(d), closedAt: fakeTs() }); emit(); },
    close() {}
  };
}

/* ---------- 처음 만들 때 기본값 ---------- */
export const DEFAULT_PLACES = ['교무실'];
export const DEFAULT_CLOSING = ['창문 닫기', '불 끄기', '칠판 정리', '분리수거', '전자칠판 끄기'];
export function defaultSettings() {
  return {
    title: '우리 반 칠판',
    school: null,
    grade: 1,
    cls: 1,
    relay: '',
    students: [],
    places: DEFAULT_PLACES,
    auto: { morningStart: '08:00', attendance: true, classMins: 45, closingMins: 30, firstStart: '09:00' },
    sound: 'voice',
    version: 1
  };
}
export function defaultLive() {
  return {
    call: null,
    overlay: null,
    check: null,
    stars: { count: 0, goal: 50, reward: '' },
    pickUsed: [],
    closing: { date: '', done: {} },
    board: {
      duty: [], dutyNext: 0, notices: [], cleaning: [], roles: [],
      question: '', tasks: [], ddays: [], closingItems: DEFAULT_CLOSING
    }
  };
}

/* ---------- 체험 모드 예시 데이터 ---------- */
export function demoData() {
  const names = ['김하늘', '이바다', '박구름', '최별', '정솔', '강나래', '조은결', '윤다온', '장하람', '임새봄', '한가람', '오누리', '서이안', '신아라', '권도윤', '황보미', '안시우', '송하린', '류이든', '전예솔', '홍라온', '고은별', '문채아', '양지후', '손바름', '배수아', '백온유'];
  const md = `${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;
  const settings = {
    ...defaultSettings(), title: '우리 반 칠판',
    school: { name: '체험중학교', region: '부산광역시', kind: '중학교' },
    students: names.map((n, i) => ({ no: i + 1, name: n, bday: i === 2 ? md : '' }))
  };
  const tk = todayKey();
  const mon = weekMonday();
  const dk = (i) => todayKey(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
  const live = {
    ...defaultLive(),
    stars: { count: 34, goal: 50, reward: '피자 파티' },
    board: {
      duty: ['한가람', '오누리'], dutyNext: 12,
      notices: ['내일 체육복 챙기기', '가정통신문 금요일까지 제출'],
      cleaning: [{ zone: '교실 바닥', names: '김하늘 · 이바다 · 박구름' }, { zone: '칠판·교탁', names: '최별 · 정솔' }, { zone: '복도', names: '강나래 · 조은결 · 윤다온' }, { zone: '분리수거', names: '장하람 · 임새봄' }],
      roles: ['칠판 지우기', '펜·지우개 정리', '불 끄기', '창문 닫기', '냉난방기', '우유 배달', '급식 수저', '분리수거', '화분 물 주기', '신발장 정리', '사물함 점검', '게시판 정리', '학습지 배부', '출석부 전달', '전자칠판 끄기', '청소함 정리'].map((r, i) => ({ role: r, name: names[(i + 10) % names.length] })),
      question: '', closingItems: ['창문 닫기', '불 끄기', '전자칠판 끄기'],
      tasks: [{ date: dk(1), type: '수행', text: '국어 수행평가' }, { date: dk(2), type: '준비물', text: '체육복' }, { date: tk, type: '준비물', text: '실험 노트' }],
      ddays: [{ label: '현장체험학습', date: dk(3) }, { label: '1회 정기시험', date: todayKey(new Date(Date.now() + 17 * 86400000)) }]
    }
  };
  return { settings, live };
}
