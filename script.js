// ============================================================
// 타임게팅 script.js
// 구조:
//   1. NTP 시간 동기화 (worldtimeapi → 브라우저 오프셋 보정)
//   2. 상단 시계 = 선택한 사이트 기준으로 전환
//   3. 디폴트: 네이버 (www.naver.com)
//   4. 사이트 클릭 → favicon + 이름 바뀌고 해당 서버 핑 측정
//   5. 카테고리별 그리드 렌더링
// ============================================================

// ── 1. 시간 오프셋 ──────────────────────────────────────────
let timeOffset = 0;

async function syncTime() {
  try {
    const t1 = Date.now();
    const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Seoul');
    const t2 = Date.now();
    const data = await res.json();
    const serverMs = new Date(data.datetime).getTime();
    const rtt = (t2 - t1) / 2;
    timeOffset = serverMs - t2 + rtt;
  } catch {
    timeOffset = 0;
  }
}

function getNow() { return new Date(Date.now() + timeOffset); }

// ── 2. 사이트 데이터 ────────────────────────────────────────
const SITES = {
  ticket: [
    { name: '티켓링크',      url: 'www.ticketlink.co.kr' },
    { name: '인터파크 티켓', url: 'ticket.interpark.com' },
    { name: '멜론 티켓팅',   url: 'ticket.melon.com' },
    { name: '예스24 티켓',   url: 'ticket.yes24.com' },
    { name: '네이버 예약',   url: 'booking.naver.com' },
  ],
  univ: [
    { name: '서울대',   url: 'sugang.snu.ac.kr' },
    { name: '연세대',   url: 'ysweb.yonsei.ac.kr' },
    { name: '고려대',   url: 'sugang.korea.ac.kr' },
    { name: '성균관대', url: 'sugang.skku.edu' },
    { name: '경희대',   url: 'sugang.khu.ac.kr' },
    { name: '한양대',   url: 'sugang.hanyang.ac.kr' },
    { name: '중앙대',   url: 'sugang.cau.ac.kr' },
    { name: '경북대',   url: 'sugang.knu.ac.kr' },
    { name: '부산대',   url: 'sugang.pusan.ac.kr' },
    { name: '인하대',   url: 'sugang.inha.ac.kr' },
    { name: '홍익대',   url: 'sugang.hongik.ac.kr' },
  ],
  etc: [
    { name: '네이버',      url: 'www.naver.com' },
    { name: 'FC온라인',    url: 'fconline.nexon.com' },
    { name: '피파온라인4', url: 'fifaonline4.nexon.com' },
  ],
};

const DEFAULT = { name: '네이버', url: 'www.naver.com' };

// ── 3. DOM 참조 ─────────────────────────────────────────────
const clockEl  = document.getElementById('clock');
const msEl     = document.getElementById('ms');
const dateEl   = document.getElementById('date-str');
const chkMs    = document.getElementById('chk-ms');
const heroFav  = document.getElementById('hero-favicon');
const heroName = document.getElementById('hero-site-name');
const heroPing = document.getElementById('hero-ping');

const pad  = (n, len=2) => String(n).padStart(len, '0');
const DAYS = ['일','월','화','수','목','금','토'];

// ── 4. 시계 렌더링 ───────────────────────────────────────────
function tick() {
  const t  = getNow();
  const h  = pad(t.getHours());
  const m  = pad(t.getMinutes());
  const s  = pad(t.getSeconds());
  const ms = pad(t.getMilliseconds(), 3);

  clockEl.textContent = `${h}:${m}:${s}`;
  msEl.textContent    = chkMs.checked ? '' : ms;

  const y   = t.getFullYear();
  const mo  = pad(t.getMonth()+1);
  const d   = pad(t.getDate());
  const day = DAYS[t.getDay()];
  dateEl.textContent = `${y}.${mo}.${d} (${day})`;

  if (t.getSeconds() === 0 && t.getMilliseconds() < 50) triggerAlarm();
}

function loop() { tick(); requestAnimationFrame(loop); }

// ── 5. 히어로 사이트 전환 ────────────────────────────────────
function setHeroSite(site) {
  heroName.textContent = site.name;
  heroFav.src = `https://www.google.com/s2/favicons?domain=${site.url}&sz=32`;
  heroPing.textContent = '측정중...';
  pingHost(site.url).then(ms => {
    heroPing.textContent = ms !== null ? `${ms}ms` : '응답없음';
  });
  history.replaceState(null, '', `?host=${site.url}`);
}

async function pingHost(host) {
  try {
    const t1 = performance.now();
    await fetch(`https://${host}/favicon.ico`, { mode: 'no-cors', cache: 'no-store' });
    return Math.round(performance.now() - t1);
  } catch { return null; }
}

// ── 6. 그리드 렌더링 ────────────────────────────────────────
function renderGrid(sites, gridId) {
  const grid = document.getElementById(gridId);
  sites.forEach(site => {
    const btn = document.createElement('button');
    btn.className = 'host-btn';
    btn.innerHTML = `
      <img src="https://www.google.com/s2/favicons?domain=${site.url}&sz=32" alt="" class="host-favicon">
      <span class="host-btn-text">
        <span class="host-name">${site.name}</span>
        <span class="host-url">${site.url}</span>
      </span>
    `;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.host-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setHeroSite(site);
    });
    grid.appendChild(btn);
  });
}

renderGrid(SITES.ticket, 'grid-ticket');
renderGrid(SITES.univ,   'grid-univ');
renderGrid(SITES.etc,    'grid-etc');

// ── 7. 커스텀 입력 ──────────────────────────────────────────
document.getElementById('custom-btn').addEventListener('click', () => {
  let val = document.getElementById('custom-input').value.trim();
  if (!val) return;
  val = val.replace(/^https?:\/\//, '');
  setHeroSite({ name: val, url: val });
});
document.getElementById('custom-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('custom-btn').click();
});

// ── 8. 정각 알람 ────────────────────────────────────────────
let alarmOn    = false;
let alarmFired = false;
let audioCtx   = null;

const btnAlarm = document.getElementById('btn-alarm');
btnAlarm.addEventListener('click', () => {
  alarmOn = !alarmOn;
  btnAlarm.textContent = alarmOn ? '🔔 알람 켜짐 (클릭하면 끔)' : '🔔 정각 알람 켜기';
  btnAlarm.classList.toggle('on', alarmOn);
  if (alarmOn && !audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
});

function triggerAlarm() {
  if (!alarmOn || alarmFired) return;
  alarmFired = true;
  setTimeout(() => { alarmFired = false; }, 2000);
  if (audioCtx) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.8);
  }
  document.body.classList.add('flashing');
  setTimeout(() => document.body.classList.remove('flashing'), 900);
}

// ── 9. 밀리초 토글 ──────────────────────────────────────────
chkMs.addEventListener('change', () => {
  msEl.style.display = chkMs.checked ? 'none' : '';
});

// ── 10. URL 파라미터 처리 (?host=xxx) ───────────────────────
const params = new URLSearchParams(location.search);
if (params.has('host')) {
  const h     = params.get('host');
  const all   = [...SITES.ticket, ...SITES.univ, ...SITES.etc];
  const found = all.find(s => s.url === h);
  setHeroSite(found || { name: h, url: h });
} else {
  setHeroSite(DEFAULT);
}

// ── 11. 초기화 ──────────────────────────────────────────────
syncTime().then(loop);
setInterval(syncTime, 5 * 60 * 1000);
