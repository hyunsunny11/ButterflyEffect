//* =====================================================================
 /*  나비효과 게임 — ③ 컴퓨터 "창 끄기" 미니게임  (computer_minigame.js)
 * ---------------------------------------------------------------------
 *  ▣ 단독 실행: HTML에서 p5.js를 먼저 로드한 뒤 이 파일을 불러오면 됨.
 *      <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
 *      <script src="computer_minigame.js"></script>
 *    (원하면 <div id="wrap"></div> 안에 캔버스를 넣을 수 있음. 없어도 동작.)
 *  ▣ 프레임워크(main.js 전역 모드) 연결: 파일 맨 아래
 *      [STANDALONE 데모 하네스] 블록만 지우고, main.js의
 *      setup/draw/mousePressed/keyPressed + vmouseX()/vmouseY()를 사용.
 * ===================================================================== */

/* =====================================================================
 *  나비효과 게임 — ③ 컴퓨터 "창 끄기" 미니게임  (scenes/minigames/computer.js)
 * ---------------------------------------------------------------------
 *  ▣ 진입 조건(기획): 싱크대 → 분리수거 를 끝낸 뒤 컴퓨터를 클릭하면
 *     게임 화면이 아니라 "옛날 윈도우 창 끄기 화면"이 뜬다.
 *  ▣ 목표: 화면에 다다닥 뜨는 경고창 / 병맛 광고 팝업을 X로 모두 닫기.
 *  ▣ 끝나는 기준(★): "제한 시간 안에 고정 개수(cm_budget=15) 다 닫기".
 *     - 진입 즉시 11개가 시간차로 쏟아짐(다다닥).
 *     - 창을 닫을 때마다 남은 예산(4개)에서 하나가 "또" 뜸 → 끄면 또 뜨는 짜증.
 *     - 제한 시간(cm_timeLimit초) 카운트다운. 0이 되기 전에 15개를 다 닫으면 승리,
 *       못 닫으면 시간 초과 → cm_onFail()(실제 게임에선 멸망 페널티/엔딩).
 *     - 상단 시간 게이지 + "닫은 창 X / 15" + 디지털 카운트다운을 노출.
 *
 *  ▣ 프레임워크 연결 방법 (main.js 전역 모드 기준):
 *     1) 이 파일에서 ▼[STANDALONE 데모 하네스]▼ 블록만 지운다.
 *     2) 윗부분(상수~씬 함수)을 js/scenes/minigames/computer.js 로 저장.
 *     3) room.js: 컴퓨터가 정답 차례(solvedCount===2)에 클릭되면
 *           enterComputer();  gameState = 'computer';
 *     4) main.js draw 분배기:        case 'computer': updateComputer(); break;
 *        main.js mousePressed 분배기: case 'computer': computerMousePressed(); break;
 *     5) 클리어 시 동작은 cm_onClear()에 연결(아래 주석 참고).
 *
 *  ※ 모든 좌표는 가상 해상도(GW=680, GH=480) 기준. 클릭 판정은 vmouseX()/vmouseY().
 *  ※ p5 전역 모드와 충돌하는 setup/draw/createCanvas 등은 이 씬에 두지 않음.
 * ===================================================================== */

// (GW, GH는 shared/pixel.js에서 전역 선언됨 — 재선언 안 함)

// 전체 글씨체: 수도 잠그기 게임과 동일하게 monospace + 굵게(BOLD).
const CM_FONT = "monospace";

/* ── 팝업 템플릿 ──────────────────────────────────────────────────────
 *  kind:  'sys' = 옛날 윈도우 경고창,  'ad' = 병맛 광고
 *  icon:  본문 좌측 큰 아이콘(이모지)
 *  title: 타이틀바 텍스트,  body: 본문,  btn: 가짜 버튼 라벨
 *  bar:   타이틀바 색(레트로 무드). 경고창=네이비 계열, 광고=원색.
 *  광고는 이 프로젝트(환경/지구/북극곰/텀블러/펭귄)와 엮은 병맛 카피들. */
const CM_TEMPLATES = [
  // ▼ 옛날 윈도우 경고창
  { kind:'sys', icon:'⚠️', title:'시스템 오류',   body:'지구를 찾을 수 없습니다.\n(오류 코드 0xC0FFEE)',            btn:'확인',   bar:'#000080' },
  { kind:'sys', icon:'🛡️', title:'백신 알림',     body:'일회용 컵 바이러스 314개 감지!\n지금 검사하시겠습니까?',     btn:'무시',   bar:'#000080' },
  { kind:'sys', icon:'💾', title:'디스크 공간 부족', body:'드라이브 C:\\빙하\\ 의 용량이\n빠르게 녹는 중입니다…',        btn:'정리',   bar:'#000080' },
  { kind:'sys', icon:'🔌', title:'대기전력 경고',   body:'코드가 256시간째 꽂혀 있습니다.\n뽑으시겠습니까?',           btn:'확인',   bar:'#000080' },
  { kind:'sys', icon:'🖨️', title:'프린터 오류',     body:'종이를 너무 많이 쓰고 있습니다.\n어딘가에서 나무가 웁니다.',  btn:'확인',   bar:'#000080' },
  { kind:'sys', icon:'🔄', title:'업데이트 알림',   body:'지구 OS를 1.5℃ 버전으로\n업데이트하시겠습니까?',           btn:'나중에', bar:'#000080' },
  // ▼ 병맛 광고
  { kind:'ad',  icon:'🐻‍❄️', title:'긴급 모집!!',    body:'북극곰 보러 가실 분 구합니다!\n(편도행 / 수영 필수)',        btn:'신청',   bar:'#0a8a8a' },
  { kind:'ad',  icon:'🍕', title:'오늘만 이 가격',  body:'내일 세계가 망한다면…\n이 피자를 못 먹어 아쉬울 겁니다.',    btn:'주문',   bar:'#c81e5a' },
  { kind:'ad',  icon:'💧', title:'★축하합니다★',    body:'오늘의 물 1,000번째 낭비자로\n당첨되셨습니다!',              btn:'받기',   bar:'#1763c7' },
  { kind:'ad',  icon:'♻️', title:'띵 동',          body:'분리수거 요정이 지금\n당신을 지켜보고 있습니다 👀',          btn:'확인',   bar:'#2e8b2e' },
  { kind:'ad',  icon:'🥤', title:'충격 실화',      body:'텀블러 없이 5년…\n인간 텀블러가 된 그의 사연',              btn:'더보기', bar:'#b8860b' },
  { kind:'ad',  icon:'🐧', title:'새 알림 (1)',    body:'펭귄 1,024마리가\n당신의 게시물을 기다립니다',              btn:'확인',   bar:'#155fa0' },
  { kind:'ad',  icon:'🔥', title:'[속보]',         body:'당신의 방에서\n지구온난화가 시작되었습니다',                btn:'확인',   bar:'#d24a16' },
  { kind:'ad',  icon:'💸', title:'꿀팁 대방출',    body:'전기요금 0원 만드는 법!\n(스포: 불을 끄세요)',              btn:'클릭',   bar:'#7a2cc4' },
  { kind:'ad',  icon:'🌳', title:'클릭 후원',      body:'나무 심기 한 번에 999원!\n(사실 안 심음)',                  btn:'후원',   bar:'#2e8b2e' },
  { kind:'ad',  icon:'☀️', title:'오늘의 운세',     body:'당신의 별자리: 태양을 삼킬 운세\n자세히 보려면 클릭!',       btn:'확인',   bar:'#cc8a00' },
];

/* ── 미니게임 상태 (cm_ 접두사로 전역 충돌 방지) ── */
let cm_popups = [];      // 살아있는 팝업들 (배열 끝 = 화면 맨 위)
let cm_queue = [];       // 시간차로 등장 대기 중인 팝업들
let cm_deck = [];        // 셔플된 템플릿 덱(중복 줄이기용)
let cm_budget = 15;      // ★ 총 스폰 예산(닫아야 하는 창 개수)
let cm_burst = 11;       // 진입 시 다다닥 쏟아질 개수 (나머지는 닫을 때 리스폰)
let cm_spawned = 0;      // 지금까지 등장 예약된 총 개수
let cm_closed = 0;       // 닫은 개수
let cm_timeLimit = 12;   // ★ 제한 시간(초) — 난이도 조절 노브
let cm_startMs = 0;      // 카운트다운 시작 시각(ms)
let cm_remain = 12;      // 남은 시간(초)
let cm_phase = 'play';   // 'play' | 'win' | 'fail'
let cm_winAt = 0;        // 클리어 시각(ms)
let cm_failAt = 0;       // 시간 초과 시각(ms)
let cm_seq = 0;          // 팝업 고유 id
let cm_shake = 0;        // 잘못 클릭 시 흔들림 효과
let cm_started = false;
let cm_winAlpha = 0, cm_winFadeAmt = 3;

/* ── 씬 진입 ── */
function enterComputer() {
  cm_popups = [];
  cm_queue = [];
  cm_deck = [];
  cm_spawned = 0;
  cm_closed = 0;
  cm_phase = 'play';
  cm_winAt = 0;
  cm_failAt = 0;
  cm_startMs = millis();
  cm_remain = cm_timeLimit;
  cm_seq = 0;
  cm_shake = 0;
  cm_started = true;
  cm_failAlpha = 0;
  cm_failFadeAmt = 3;
  cm_winAlpha = 0;
  cm_winFadeAmt = 3;

  // 진입 즉시: cm_burst 개를 0~900ms 사이에 흩뿌려 "다다닥" 느낌
  for (let i = 0; i < cm_burst; i++) {
    cm_queue.push({ at: millis() + random(0, 900), p: makePopup() });
    cm_spawned++;
  }
}

/* 템플릿 덱에서 하나 뽑아 팝업 인스턴스 생성 */
function makePopup() {
  if (cm_deck.length === 0) {
    cm_deck = shuffle(CM_TEMPLATES.slice());
  }
  const t = cm_deck.pop();
  const w = floor(random(214, 268));
  const h = 150;

  if (errorSound) {
    errorSound.play();
  }
  
  return {
    id: cm_seq++,
    t,
    w, h,
    x: random(12, GW - w - 12),
    y: random(34, GH - h - 46),
    born: millis(),
    pop: 0,            // 등장 애니메이션(0→1)
    hoverX: false,
  };
}

/* ── 매 프레임 ── */
function updateComputer() {
  push();
  rectMode(CORNER);     // ★ main.js의 rectMode(CENTER)를 이 씬 안에서만 CORNER로 재설정
  textFont(CM_FONT);    // 수도 잠그기 게임과 동일: monospace
  textStyle(BOLD);      // 전체 굵게 — push/pop 안이라 다른 씬에 새지 않음

  // 제한 시간 카운트다운(플레이 중에만 감소)
  if (cm_phase === 'play') {
    cm_remain = max(0, cm_timeLimit - (millis() - cm_startMs) / 1000);
  }

  drawDesktop();        // 배경 데스크톱 + 아이콘
  releaseFromQueue();   // 대기열에서 시간 된 팝업 등장

  // 팝업 그리기(뒤→앞)
  for (let i = 0; i < cm_popups.length; i++) {
    drawPopup(cm_popups[i], i === cm_popups.length - 1);
  }

  drawTaskbar();        // 하단 작업표시줄 + 카운터

  // 흔들림 감쇠
  cm_shake *= 0.86;

  // 승리 판정: 더 등장할 팝업 없음 + 화면에 남은 팝업 없음
  if (cm_phase === 'play' && cm_spawned >= cm_budget &&
      cm_queue.length === 0 && cm_popups.length === 0) {
    cm_phase = 'win';
    cm_winAt = millis();
  }
  // 실패 판정: 시간 초과
  if (cm_phase === 'play' && cm_remain <= 0) {
    cm_phase = 'fail';
    cm_failAt = millis();
  }

  if (cm_phase === 'win') drawWin();
  if (cm_phase === 'fail') drawFail();

  pop();
}

/* 대기열 → 화면 */
function releaseFromQueue() {
  for (let i = cm_queue.length - 1; i >= 0; i--) {
    if (millis() >= cm_queue[i].at) {
      cm_popups.push(cm_queue[i].p);
      cm_queue.splice(i, 1);
    }
  }
}

/* ── 입력 ── */
function computerMousePressed() {
  if (cm_phase === 'win') {
    // 연출(900ms) 후 클릭하면 클리어
    if (millis() - cm_winAt > 900) cm_onClear();
    return;
  }
  if (cm_phase === 'fail') {
  if (millis() - cm_failAt > 300) cm_onFail();
  return;
}

  const mx = vmouseX(), my = vmouseY();

  // 맨 위(배열 끝)부터 히트 테스트
  for (let i = cm_popups.length - 1; i >= 0; i--) {
    const p = cm_popups[i];
    if (!inRect(mx, my, p.x, p.y, p.w, p.h)) continue;

    // 닫기(X) 버튼 영역?
    const cb = closeBtnRect(p);
    if (inRect(mx, my, cb.x, cb.y, cb.w, cb.h)) {
      closePopup(i);
    } else {
      // 본문 클릭 → 맨 앞으로(z-order), 살짝 흔들림(가짜 광고가 안 닫히는 짜증)
      cm_popups.push(cm_popups.splice(i, 1)[0]);
      cm_shake = 4;
    }
    return; // 한 번 클릭에 하나만 처리
  }
}

/* 팝업 닫기 + "끄면 또 뜨는" 리스폰(예산 내에서만) */
function closePopup(i) {
  cm_popups.splice(i, 1);
  cm_closed++;

  if (cm_spawned < cm_budget) {
    cm_spawned++;
    // 닫자마자 마우스 근처에서 새 창이 펑
    const np = makePopup();
    np.x = constrain(vmouseX() - np.w / 2 + random(-30, 30), 12, GW - np.w - 12);
    np.y = constrain(vmouseY() - 16 + random(-20, 20), 34, GH - np.h - 46);
    cm_queue.push({ at: millis() + random(120, 360), p: np });
  }
}

/* ── 클리어 훅 ────────────────────────────────────────────────────────
 *  프레임워크에 붙일 땐 여기 내용을 교체:
 *     solvedCount = 3;            // 컴퓨터까지 완료
 *     gameState = 'room';         // 방으로 복귀(배경 room_bg3로 전환)
 *  데모에선 미니게임을 재시작한다. */
function cm_onClear() {
  // 컴퓨터까지 완료 → 3단계로 올리고 방으로 복귀 (배경 room_bg3로 전환)
  solvedCount = 3;
  gameState = 'room';
  roomReenterAfterMinigame();
}

/* ── 키 입력: 실패 화면에서 아무 키나 누르면 재시도 ──
 *  프레임워크 연결 시 main.js keyPressed 분배기에:
 *     case 'computer': computerKeyPressed(); break;  */
function computerKeyPressed() {
  if (cm_phase === 'win' && millis() - cm_winAt > 900) {
    cm_onClear();   // 연출 후 아무 키 → 클리어
  }
  if (cm_phase === 'fail' && millis() - cm_failAt > 300) {
    cm_onFail();
  }
}

/* ── 실패(시간 초과) 훅 ───────────────────────────────────────────────
 *  실제 게임에선 멸망 페널티/엔딩으로 분기. 예:
 *     gameState = 'ending'; showEnding(0);   // "게임만 하다 지구가 멸망"
 *  데모에선 미니게임을 재시작한다. */
function cm_onFail() {
  enterComputer();
}

/* ===================== 그리기 헬퍼 ===================== */

function drawDesktop() {
  background('#0a8a8a');                 // 클래식 윈도우 청록 바탕
  // 데스크톱 아이콘 2개
  drawDesktopIcon(22, 26, '🖥️', '내 지구');
  drawDesktopIcon(22, 96, '🗑️', '분리수거함');
}

function drawDesktopIcon(x, y, ic, label) {
  push();
  textAlign(CENTER, TOP);
  textSize(26); text(ic, x + 22, y);
  noStroke(); fill(255);
  textSize(11); text(label, x + 22, y + 34);
  pop();
}

function drawPopup(p, isTop) {
  // 등장 팝(스케일) 애니메이션
  p.pop = min(1, p.pop + 0.18);
  const s = 0.86 + 0.14 * easeOut(p.pop);

  const cb = closeBtnRect(p);
  p.hoverX = inRect(vmouseX(), vmouseY(), cb.x, cb.y, cb.w, cb.h);

  push();
  // 맨 위 창은 흔들림 적용
  const sk = isTop ? random(-cm_shake, cm_shake) : 0;
  translate(p.x + p.w / 2 + sk, p.y + p.h / 2);
  scale(s);
  translate(-p.w / 2, -p.h / 2);

  // 그림자
  noStroke(); fill(0, 70); rect(5, 6, p.w, p.h);

  // 창 본체(레트로 베벨)
  bevelRect(0, 0, p.w, p.h, '#d4d0c8', true);

  // 타이틀바
  fill(p.t.bar); noStroke();
  rect(3, 3, p.w - 6, 20);
  // 타이틀바 하이라이트(살짝 밝은 줄)
  fill(255, 40); rect(3, 3, p.w - 6, 2);
  // 타이틀 아이콘 + 텍스트
  textAlign(LEFT, CENTER); textSize(12); textStyle(NORMAL); // ★ NORMAL로 초기화
  text(p.t.icon, 8, 13);
  fill(255); textStyle(BOLD);
  text(p.t.title, 26, 13);
  // textStyle(BOLD) 중복 제거

  // 타이틀바 우측 버튼들(_ □ ✕) — ✕만 기능
  drawTitleButton(p.w - 60, 5, '＿', false);
  drawTitleButton(p.w - 39, 5, '☐', false);
  drawTitleButton(p.w - 21, 5, '✕', p.hoverX); // ★ 로컬 좌표로 직접 지정

  // 본문 패널(살짝 함몰)
  bevelRect(8, 28, p.w - 16, p.h - 64, '#ffffff', false);
  // 큰 아이콘
  textAlign(CENTER, CENTER); textSize(30); textStyle(NORMAL);
  text(p.t.icon, 34, 28 + (p.h - 64) / 2);
  // 본문 텍스트
  fill('#101010'); textAlign(LEFT, TOP); textSize(12); textStyle(NORMAL);
  text(p.t.body, 58, 38, p.w - 70, p.h - 70);

  // 하단 가짜 버튼
  const bw = 64, bh = 20, bx = p.w - bw - 12, by = p.h - bh - 10;
  bevelRect(bx, by, bw, bh, '#d4d0c8', true);
  fill('#101010'); textAlign(CENTER, CENTER); textSize(12); textStyle(NORMAL);
  text(p.t.btn, bx + bw / 2, by + bh / 2 - 1);

  pop();
}

/* 타이틀바 작은 버튼 */
function drawTitleButton(x, y, glyph, hot) {
  bevelRect(x, y, 18, 16, hot ? '#e23b3b' : '#d4d0c8', true);
  fill(hot ? 255 : '#101010');
  textAlign(CENTER, CENTER); textSize(11); textStyle(BOLD);
  text(glyph, x + 9, y + 7);
  // ★ 중복 textStyle(BOLD) 제거
}

/* 닫기 버튼의 화면상 절대 좌표(히트 테스트용) */
function closeBtnRect(p) {
  return { x: p.x + p.w - 21, y: p.y + 5, w: 18, h: 16 };
}

function drawTaskbar() {
  const ty = GH - 30;
  // 작업표시줄
  bevelRect(0, ty, GW, 30, '#d4d0c8', true);
  // 시작 버튼
  bevelRect(6, ty + 4, 78, 22, '#d4d0c8', true);
  textAlign(LEFT, CENTER); textSize(13); textStyle(BOLD);
  fill('#101010'); text('🦋', 12, ty + 15);
  text('시작', 32, ty + 15); textStyle(BOLD);

  // ★ 끝나는 기준을 보여주는 카운터
  bevelRect(GW - 168, ty + 4, 96, 22, '#d4d0c8', false);
  textAlign(CENTER, CENTER); textSize(10); fill('#101010');
  text('닫은 창 ' + cm_closed + ' / ' + cm_budget, GW - 120, ty + 15);

  // 실시간 카운트다운(6초 이하 빨갛게 깜빡)
  const low = cm_remain <= 3;
  bevelRect(GW - 66, ty + 4, 60, 22,
            low && (frameCount % 16 < 8) ? '#e23b3b' : '#d4d0c8', false);
  textStyle(BOLD); textSize(12);
  fill(low ? '#7a0000' : '#101010');
  text('⏱ ' + nf(cm_remain, 1, 1), GW - 36, ty + 15);
  textStyle(BOLD);

  // 상단 제한시간 게이지(남은 비율: 초록→노랑→빨강)
  const frac = constrain(cm_remain / cm_timeLimit, 0, 1);
  noStroke(); fill(0, 70); rect(0, 0, GW, 7);
  const gc = frac > 0.5 ? color(60, 200, 90)
           : frac > 0.25 ? color(235, 200, 40)
           : color(226, 59, 59);
  fill(gc); rect(0, 0, GW * frac, 7);
}

function drawWin() {
  const t = millis() - cm_winAt;
  push();
  fill(0, min(180, t * 0.4)); rect(0, 0, GW, GH);
  fill(255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(42);
  text('창 닫기 성공!', GW / 2, GH / 2);
  if (t > 900) {
    cm_winAlpha += cm_winFadeAmt;
    if (cm_winAlpha <= 0 || cm_winAlpha >= 255) cm_winFadeAmt *= -1;
    cm_winAlpha = constrain(cm_winAlpha, 0, 255);
    fill(255, cm_winAlpha);  // 실패와 동일: 흰색 페이드
    textSize(18);
    text('PRESS ANY KEY OR CLICK TO CONTINUE', GW / 2, GH / 2 + 60);
  }
  pop();
}

function drawFail() {
  const t = millis() - cm_failAt;

  // sink_drawFail처럼 페이드 인/아웃 알파 변수 필요 → cm_failAlpha 추가
  // (파일 상단 전역변수에 아래 두 줄 추가)
  // let cm_failAlpha = 0, cm_failFadeAmt = 3;

  push();
  fill(0, min(190, t * 0.5)); rect(0, 0, GW, GH);
  textAlign(CENTER, CENTER); textStyle(BOLD);
  fill(255, 90, 90); textSize(40);
  text('⏰ 시간 초과', GW / 2, GH / 2 - 78);
  fill(255); textSize(20);
  text('창을 제때 닫지 못했습니다!', GW / 2, GH / 2 - 30);
  fill(200); textSize(15);
  text('게임만 하다 지구가 멸망할 뻔…', GW / 2, GH / 2 + 2);
  text('닫은 창 ' + cm_closed + ' / ' + cm_budget, GW / 2, GH / 2 + 30);

  // ↓ 이 블록을 교체
  cm_failAlpha += cm_failFadeAmt;
  if (cm_failAlpha <= 0 || cm_failAlpha >= 255) cm_failFadeAmt *= -1;
  cm_failAlpha = constrain(cm_failAlpha, 0, 255);
  fill(255, cm_failAlpha);         // ← sink_drawFail과 동일: 흰색 페이드
  textSize(18);                    // ← 18로 통일 (기존: 20)
  text('PRESS ANY KEY OR CLICK TO RETRY', GW / 2, GH / 2 + 80); // ← y 통일
  pop();
}

/* ── 작은 유틸 ── */
function bevelRect(x, y, w, h, bg, raised) {
  noStroke(); fill(bg); rect(x, y, w, h);
  const light = raised ? '#ffffff' : '#808080';
  const dark  = raised ? '#808080' : '#ffffff';
  strokeWeight(1);
  stroke(light); line(x, y, x + w, y); line(x, y, x, y + h);            // 위/왼
  stroke(dark);  line(x, y + h, x + w, y + h); line(x + w, y, x + w, y + h); // 아래/오른
  noStroke(); // ★ stroke 상태 초기화 (이후 fill만 쓰는 도형에 선이 남는 현상 방지)
}
function inRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}
function easeOut(t) { return 1 - (1 - t) * (1 - t); }