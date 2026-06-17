// 나비효과 게임 - 게임 오버(엔딩) 화면 (scenes/gameover.js)
// 클리어 엔딩 컷툰 이후 표시.
// 나비 1인칭 시점으로 화면이 계속 위로 패럴랙스 이동 → 하늘이 점점 어두워져 우주가 됨
// → 멀리서 밝은 지구가 떠오름. 이후 타이틀 텍스트 등장.
// 아무 키/클릭 → 타이틀 화면으로 복귀.
//
// ── 단계 ──
// 'rise'  : 화면이 위로 스크롤, 하늘이 점점 어두워짐(아침 하늘 → 우주)
// 'earth' : 우주에 도달, 지구가 점점 커지며 떠오름
// 'title' : 타이틀 텍스트 등장 + 재시작 안내

let go_timer    = 0;
let go_blinkT   = 0;
let go_phase    = 'rise';
let go_wingAngle = 0;
let go_wingDir   = 1;
let go_alpha    = 0;     // 페이드인
let go_scrollY  = 0;     // 위로 누적 스크롤 거리(패럴랙스 별 이동에 사용)
let go_skyT     = 0;     // 0=맑은 하늘, 1=완전한 우주(검정)
let go_earthScale = 0;   // 지구 등장 스케일(0→1)
let go_stars    = [];    // 배경 별 목록 {x, y, size, baseAlpha, twinklePhase}
let go_titleStartedAt = -1; // title 단계 진입 시점의 go_timer 값(텍스트 페이드인 타이밍용)

function enterGameOver() {
  go_timer       = 0;
  go_blinkT      = 0;
  go_phase       = 'rise';
  go_wingAngle   = 0;
  go_wingDir     = 1;
  go_alpha       = 255;  // 검은 화면에서 페이드인
  go_scrollY     = 0;
  go_skyT        = 0;
  go_earthScale  = 0;
  go_titleStartedAt = -1;
  phase = 'gameover'; // intro.js의 phase 값과 분리 — drawButterfly()의 단계별 감쇠 로직이 적용되지 않도록

  // 별을 미리 넉넉히 깔아둠(위로 스크롤되며 반복 사용)
  go_stars = [];
  for (let i = 0; i < 90; i++) {
    go_stars.push({
      x: random(GW),
      y: random(GH * 3),       // 화면 위아래로 넉넉히 분포시켜 스크롤 중 끊기지 않게
      size: random(1) > 0.82 ? PS : PS * 0.6,
      baseAlpha: random(120, 220),
      twinklePhase: random(TWO_PI),
    });
  }
}

function updateGameOver() {
  // ── 하늘 배경: go_skyT(0=아침 하늘 ~ 1=우주 검정) 기준으로 그라데이션 ──
  go_drawSky();
  go_drawStars();

  // ── 단계 전환 타이밍 ──
  if (go_phase === 'rise') {
    go_skyT = min(1, go_timer / 220);          // 약 3.6초에 걸쳐 우주로 전환
    go_scrollY += 1.6 + go_skyT * 1.4;          // 점점 빨라지는 상승감

    if (go_skyT >= 1 && go_timer > 230) {
      go_phase = 'earth';
    }
  } else if (go_phase === 'earth') {
    go_scrollY += 0.4; // 우주에서도 별은 천천히 흐름
    go_earthScale = min(1, go_earthScale + 0.012);
    if (go_earthScale >= 1 && go_timer > 420) {
      go_phase = 'title';
    }
  } else if (go_phase === 'title') {
    go_scrollY += 0.4;
  }

  // ── 지구 (earth/title 단계에서 그림) ──
  if (go_phase === 'earth' || go_phase === 'title') {
    go_drawEarth();
  }

  // ── 나비: 화면 하단 중앙에 고정, 날갯짓만 계속 (1인칭 시점이라 위치는 고정) ──
  go_wingAngle += go_wingDir * 0.18;
  if (go_wingAngle > 0.9) go_wingDir = -1;
  if (go_wingAngle < -0.1) go_wingDir = 1;

  wingAngle      = go_wingAngle;
  butterflyX     = GW / 2;
  butterflyY     = GH - 86 + sin(go_timer * 0.04) * 6;
  butterflyScale = 1.15;
  drawButterfly();

  // ── 타이틀 텍스트 + 안내 (title 단계에서만) ──
  if (go_phase === 'title') {
    let titleAlpha = min(255, (go_timer - go_titlePhaseStart()) * 4);
    push();
    noStroke(); textAlign(CENTER, CENTER);
    fill(255, 220, 50, titleAlpha);
    textSize(40); textStyle(BOLD);
    text('나비효과', GW / 2, 90);
    textStyle(NORMAL);
    fill(180, 160, 80, titleAlpha);
    textSize(20);
    text('THE BUTTERFLY EFFECT', GW / 2, 130);
    pop();

    if (go_timer - go_titlePhaseStart() > 60) {
      go_blinkT++;
      let a = map(abs(sin(go_blinkT * 0.04)), 0, 1, 80, 220);
      push();
      noStroke(); fill(255, 255, 255, a);
      textSize(13); textAlign(CENTER, CENTER); textStyle(NORMAL);
      text('PRESS ANY KEY OR CLICK TO RESTART', GW / 2, GH - 36);
      pop();
    }
  }

  // ── 페이드인 (진입 시 검은 화면에서) ──
  if (go_alpha > 0) {
    go_alpha = max(0, go_alpha - 6);
    push();
    rectMode(CORNER); noStroke();
    fill(0, go_alpha);
    rect(0, 0, GW, GH);
    pop();
  }

  go_timer++;
}

// title 단계가 시작된 시점의 go_timer 값을 추정(텍스트 페이드인 타이밍용)
function go_titlePhaseStart() {
  if (go_titleStartedAt < 0) go_titleStartedAt = go_timer;
  return go_titleStartedAt;
}

/* ── 하늘: 아침 하늘(go_skyT=0) → 우주 검정(go_skyT=1) ── */
function go_drawSky() {
  const SPACE_TOP = [6, 8, 18];
  const SPACE_BOT = [18, 14, 34];
  let topR = lerp(118, SPACE_TOP[0], go_skyT), topG = lerp(184, SPACE_TOP[1], go_skyT), topB = lerp(234, SPACE_TOP[2], go_skyT);
  let botR = lerp(198, SPACE_BOT[0], go_skyT), botG = lerp(224, SPACE_BOT[1], go_skyT), botB = lerp(244, SPACE_BOT[2], go_skyT);
  push();
  noStroke();
  rectMode(CORNER);
  for (let y = 0; y < GH; y += PS) {
    let t = y / GH;
    fill(lerp(topR, botR, t), lerp(topG, botG, t), lerp(topB, botB, t));
    rect(0, y, GW, PS + 2);
  }
  pop();
}

/* ── 별: 위로 패럴랙스 스크롤, go_skyT가 높아질수록 또렷해짐 ── */
function go_drawStars() {
  if (go_skyT <= 0.02) return;
  push();
  noStroke(); rectMode(CORNER);
  const wrapH = GH * 3;
  for (const s of go_stars) {
    let sy = ((s.y - go_scrollY) % wrapH + wrapH) % wrapH;
    if (sy > GH) continue; // 화면 밖이면 스킵(아래쪽 여분 영역)
    let twinkle = 0.7 + 0.3 * sin(go_timer * 0.05 + s.twinklePhase);
    fill(220, 224, 235, s.baseAlpha * go_skyT * twinkle);
    rect(round(s.x / PS) * PS, round(sy / PS) * PS, s.size, s.size);
  }
  pop();
}

/* ── 지구: 화면 중앙에서 점점 커지며 떠오르는 코드 그래픽 ── */
function go_drawEarth() {
  const cx = GW / 2;
  const cy = 255;
  const r = 100 * go_earthScale;
  if (r <= 0) return;

  push();
  translate(cx, cy);

  // 대기 발광(부드러운 후광) — 구체 바깥쪽
  noStroke();
  for (let g = 3; g >= 1; g--) {
    fill(140, 200, 255, 12);
    ellipse(0, 0, (r + g * 6) * 2, (r + g * 6) * 2);
  }

  // ── 구체 안쪽만 그리도록 원형 클리핑 ──
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.arc(0, 0, r, 0, TWO_PI);
  drawingContext.clip();

  // 바다(베이스) — 위는 밝고 아래는 어두운 그라데이션 느낌을 띠 여러 겹으로
  noStroke();
  fill(72, 146, 232);
  ellipse(0, 0, r * 2, r * 2);
  fill(54, 118, 205);
  ellipse(0, r * 0.25, r * 2, r * 1.7);

  // 대륙 (참고 사진: 아메리카 대륙이 세로로 길게 이어지는 서반구 뷰)
  // 북아메리카(위, 큰 덩어리) → 중앙아메리카(좁은 지협) → 남아메리카(아래, 큰 덩어리)가
  // 하나의 긴 띠로 이어지도록 배치. 전체적으로 구체 면적의 상당 부분을 차지하게 크게 그림.
  fill(86, 168, 92);
  noStroke();
  // 북아메리카 (왼쪽 위, 가장 큰 덩어리)
  go_continentBlob(-r * 0.18, -r * 0.55, r * 0.95, r * 0.62, 8, 101);
  // 중앙아메리카 (좁은 지협, 북-남을 이어줌)
  go_continentBlob(-r * 0.05, -r * 0.12, r * 0.32, r * 0.26, 5, 102);
  // 남아메리카 (아래, 큰 덩어리, 동쪽으로 더 뻗어나감)
  go_continentBlob(r * 0.12, r * 0.42, r * 0.78, r * 0.92, 9, 103);
  // 동쪽 먼 바다의 작은 섬들(아프리카 서해안 쪽 암시)
  go_continentBlob(r * 0.78, -r * 0.05, r * 0.22, r * 0.3, 5, 104);
  go_continentBlob(r * 0.7, r * 0.5, r * 0.16, r * 0.2, 4, 105);

  // 진한 녹지(산맥/숲) 음영을 살짝 겹쳐 평면적이지 않게 — 안데스/로키 산맥 라인 느낌
  fill(64, 138, 76);
  go_continentBlob(-r * 0.32, -r * 0.5, r * 0.34, r * 0.4, 5, 111);
  go_continentBlob(r * 0.05, r * 0.55, r * 0.26, r * 0.62, 5, 112);
  // 사막/고지대 느낌의 옅은 황토색 음영 (북미 서부, 사진 속 노란빛 영역 참고)
  fill(168, 150, 90, 150);
  go_continentBlob(-r * 0.42, -r * 0.62, r * 0.3, r * 0.26, 4, 113);

  // 극지방 만년설(사진처럼 화면 위/아래 가장자리에 살짝만 보이도록 작게)
  fill(245, 248, 252, 200);
  noStroke();
  ellipse(0, -r * 0.95, r * 0.85, r * 0.32);
  ellipse(0, r * 0.97, r * 0.8, r * 0.3);

  // 구름 (참고 사진의 나선형 태풍 패턴을 단순화해 표현, 대륙 가려지지 않게 가장자리 위주로 배치)
  fill(255, 255, 255, 150);
  noStroke();
  go_continentBlob(-r * 0.75, -r * 0.15, r * 0.42, r * 0.5, 6, 201);  // 좌상단 태풍
  go_continentBlob(-r * 0.7, r * 0.55, r * 0.4, r * 0.34, 5, 202);    // 좌하단 태풍
  go_continentBlob(r * 0.55, -r * 0.55, r * 0.3, r * 0.22, 4, 203);   // 우상단 구름대
  go_continentBlob(-r * 0.05, -r * 0.78, r * 0.5, r * 0.2, 5, 204);   // 북쪽 가로 구름대
  go_continentBlob(r * 0.5, r * 0.7, r * 0.34, r * 0.22, 4, 205);     // 우하단 구름

  // 터미네이터(밤/낮 경계) — 오른쪽 절반을 어둡게 덮어 입체감 부여
  fill(10, 14, 30, 95);
  noStroke();
  ellipse(r * 0.55, 0, r * 1.7, r * 2.1);

  drawingContext.restore(); // 클리핑 해제

  // 테두리 살짝 밝게(가장자리 대기광)
  noFill(); stroke(180, 220, 255, 150); strokeWeight(2);
  ellipse(0, 0, r * 2, r * 2);
  noStroke();

  pop();
}

// 지구 표면에 그릴 불규칙한 덩어리(대륙/구름/만년설 공용).
// n개의 원을 중심 주변에 흩뿌려 겹쳐서 해안선처럼 울퉁불퉁한 윤곽을 만듦.
// seed를 고정해 매 프레임 같은 모양이 그려지도록 함(랜덤이 매 프레임 바뀌면 깜빡이는 노이즈가 됨).
// randomSeed()는 push()/pop()으로 복원되지 않는 전역 상태이므로, 함수 끝에서 시드를 다시 풀어 다른 코드에 영향이 가지 않게 함.
function go_continentBlob(x, y, w, h, n, seed) {
  n = n || 5;
  randomSeed(seed !== undefined ? seed : floor(x * 13 + y * 7)); // 좌표 기반 고정 시드
  ellipse(x, y, w, h); // 베이스
  for (let i = 0; i < n; i++) {
    const a = (TWO_PI / n) * i;
    const ox = cos(a) * w * 0.28;
    const oy = sin(a) * h * 0.28;
    const sw = w * random(0.4, 0.65);
    const sh = h * random(0.4, 0.65);
    ellipse(x + ox, y + oy, sw, sh);
  }
  randomSeed(millis() * 1000 + frameCount); // 시드 해제: 이후 다른 random() 호출에 영향 없도록
}

function gameOverMousePressed() {
  if (go_timer < 60) return;
  gameState = 'title';
  enterTitle();
}

function gameOverKeyPressed() {
  if (go_timer < 60) return;
  gameState = 'title';
  enterTitle();
}