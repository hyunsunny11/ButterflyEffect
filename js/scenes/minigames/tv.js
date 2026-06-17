/* =====================================================================
 *  나비효과 게임 — ④ TV "줄 풀기" 미니게임  (scenes/minigames/tv.js)
 * ---------------------------------------------------------------------
 *  ▣ 진입 조건: 텀블러까지 끝낸 뒤(solvedCount===4) TV를 클릭.
 *  ▣ 목표: 빨/노/파/초 전선 4개의 꺾임점(노드)을 드래그해
 *          같은 색 줄 높이에 맞춰 직선으로 편다.
 *          4개 다 펴지면 플러그 활성화 → 아래로 뽑으면 TV OFF.
 *  ▣ GW/GH/vmouseX/vmouseY 는 shared/pixel.js 에서 전역 선언됨.
 * ===================================================================== */

// (GW, GH 는 shared/pixel.js 에서 전역 선언 — 재선언 안 함)
const TV_FONT = "monospace";

// ── 난이도 노브 ──
let tv_timeLimit = 7;    // 제한 시간(초)
let tv_tol = 16;         // 정렬 허용 오차

const TV_COLORS = ['#e23b3b', '#f2c33d', '#3d7bf2', '#36b24a'];
const TV_ROWS   = [150, 212, 274, 336];
const TV_AX = 130, TV_BX = 470;

// ── 상태 (tv_ 접두사) ──
let tv_cables   = [];
let tv_unlocked = false;
let tv_grab     = null;
let tv_hoverNode = -1;
let tv_plug     = null;
let tv_sparks   = [];
let tv_phase    = 'tutorial'; // 'tutorial' | 'play' | 'win' | 'fail'
let tv_winAt    = 0;
let tv_failAt   = 0;
let tv_startMs  = 0;
let tv_remain   = 7;
let tv_started  = false;
let tv_winAlpha = 0, tv_winFadeAmt = 3;
let tv_failAlpha = 0, tv_failFadeAmt = 3;
let tv_tutFlash = 0;     // 튜토리얼 화면 깜빡임 애니메이션 카운터

/* ── 씬 진입: 튜토리얼부터 ── */
function enterTV() {
  tv_phase = 'tutorial';
  tv_cables = [];
  tv_unlocked = false;
  tv_grab = null;
  tv_hoverNode = -1;
  tv_sparks = [];
  tv_plug = { x: 566, hy: 268, y: 268 };
  tv_winAt = 0;
  tv_failAt = 0;
  tv_started = false;
  tv_winAlpha = 0;  tv_winFadeAmt = 3;
  tv_failAlpha = 0; tv_failFadeAmt = 3;
  tv_tutFlash = 0;
}

/* 실제 게임 시작 */
function startActualTV() {
  tv_cables = [];
  const order = tv_shuffleDerangement(4);
  for (let i = 0; i < 4; i++) {
    tv_cables.push({
      color: TV_COLORS[i],
      ax: TV_AX, bx: TV_BX,
      ty: TV_ROWS[i],
      node: { x: random(255, 360), y: TV_ROWS[order[i]] + random(-12, 12) },
      solved: false,
      wig: tv_makeWiggle(),
    });
  }
  tv_unlocked  = false;
  tv_grab      = null;
  tv_hoverNode = -1;
  tv_sparks    = [];
  tv_plug      = { x: 566, hy: 268, y: 268 };
  tv_phase     = 'play';
  tv_winAt     = 0;
  tv_failAt    = 0;
  tv_startMs   = millis();
  tv_remain    = tv_timeLimit;
  tv_started   = true;
  tv_winAlpha = 0;  tv_winFadeAmt = 3;
  tv_failAlpha = 0; tv_failFadeAmt = 3;
}

function tv_shuffleDerangement(n) {
  let a = []; for (let i = 0; i < n; i++) a.push(i);
  let tries = 0;
  do { a = shuffle(a); tries++; } while (tv_hasFixed(a) && tries < 60);
  return a;
}
function tv_hasFixed(a) {
  for (let i = 0; i < a.length; i++) if (a[i] === i) return true;
  return false;
}
function tv_makeWiggle() {
  const fr = [0.16, 0.38, 0.6, 0.82];
  let s = random([-1, 1]), out = [];
  for (const f of fr) {
    out.push({ fx: f, amp: random(40, 74) * s, phase: random(TWO_PI), spd: random(0.018, 0.04) });
    s *= -1;
  }
  return out;
}

/* ── 매 프레임 ── */
function updateTV() {
  push();
  rectMode(CORNER);           // ★ main.js 의 rectMode(CENTER) 를 이 씬 안에서만 CORNER 로
  textFont(TV_FONT);
  textStyle(BOLD);

  tv_drawBackground();
  tv_drawPanel();

  if (tv_phase === 'tutorial') {
    tv_drawTutorial();
    pop();
    return;
  }

  if (tv_phase === 'play') {
    tv_remain = max(0, tv_timeLimit - (millis() - tv_startMs) / 1000);
  }

  let solved = 0;
  for (let i = 0; i < tv_cables.length; i++) {
    const c = tv_cables[i];
    if (!c.solved && abs(c.node.y - c.ty) < tv_tol) {
      c.solved   = true;
      c.node.y   = c.ty;
      c.node.x   = (c.ax + c.bx) / 2;
      if (tv_grab && tv_grab.type === 'node' && tv_grab.i === i) tv_grab = null;
    }
    if (c.solved) solved++;
  }
  tv_unlocked = (solved === 4);

  tv_hoverNode = -1;
  for (let i = tv_cables.length - 1; i >= 0; i--) {
    const c = tv_cables[i];
    if (!c.solved && dist(vmouseX(), vmouseY(), c.node.x, c.node.y) < 18) {
      tv_hoverNode = i; break;
    }
  }

  tv_drawCables();
  tv_drawPlug();
  if (!tv_unlocked && tv_phase === 'play') tv_spawnSparks();
  tv_updateSparks();
  tv_drawSparks();
  tv_drawUI(solved);

 if (tv_phase === 'play' && tv_unlocked && (tv_plug.y - tv_plug.hy) > 90) {
  tv_phase = 'win';
  tv_winAt = millis();

  if (minigameSuccessSound) {
    minigameSuccessSound.play();
  }
}

if (tv_phase === 'play' && tv_remain <= 0) {
  tv_phase = 'fail';
  tv_failAt = millis();

  if (minigameFailSound) {
    minigameFailSound.play();
  }
}

  if (tv_phase === 'win')  tv_drawWin();
  if (tv_phase === 'fail') tv_drawFail();
  pop();
}

/* ── 입력 ── */
function tvMousePressed() {
  if (tv_phase === 'tutorial') {
    const { bx, by, bw, bh } = tv_tutBtnRect();
    if (tv_inRect(vmouseX(), vmouseY(), bx, by, bw, bh)) startActualTV();
    return;
  }
  if (tv_phase === 'win')  { if (millis() - tv_winAt  > 900) tv_onClear(); return; }
  if (tv_phase === 'fail') {
  if (millis() - tv_failAt > 300) tv_onFail();
  return;
}

  const mx = vmouseX(), my = vmouseY();
  if (tv_unlocked && tv_inRect(mx, my, tv_plug.x - 30, tv_plug.y - 26, 60, 52)) {
    tv_grab = { type: 'plug' }; return;
  }
  let best = -1, bestD = 22;
  for (let i = 0; i < tv_cables.length; i++) {
    const c = tv_cables[i];
    if (c.solved) continue;
    const d = dist(mx, my, c.node.x, c.node.y);
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best >= 0) tv_grab = { type: 'node', i: best };
}

function tvMouseDragged() {
  if (!tv_grab || tv_phase !== 'play') return;
  const mx = vmouseX(), my = vmouseY();
  if (tv_grab.type === 'node') {
    const c = tv_cables[tv_grab.i];
    c.node.x = constrain(mx, c.ax + 26, c.bx - 26);
    c.node.y = constrain(my, 92, 408);
  } else if (tv_grab.type === 'plug') {
    tv_plug.y = constrain(my, tv_plug.hy, tv_plug.hy + 150);
  }
}

function tvMouseReleased() {
  if (tv_grab && tv_grab.type === 'plug' && (tv_plug.y - tv_plug.hy) <= 90) {
    tv_plug.y = tv_plug.hy;
  }
  tv_grab = null;
}

function tvKeyPressed() {
  if (tv_phase === 'tutorial') { startActualTV(); return; }
  if (tv_phase === 'win' && millis() - tv_winAt > 900) {
    tv_onClear();   // 연출 후 아무 키 → 클리어
  }
  if (tv_phase === 'fail' && millis() - tv_failAt > 300) tv_onFail();
}

/* ── 클리어 / 실패 훅 ── */
function tv_onClear() {
  solvedCount = 5;          // TV(index 4) 완료 → 5단계(light 차례)
  gameState = 'room';
  roomReenterAfterMinigame();
}
function tv_onFail() {
  startActualTV();          // 튜토리얼 없이 재시작 (다른 미니게임들과 동일한 패턴)
}

/* ===================== 그리기 (모두 tv_ 접두사) ===================== */

function tv_drawBackground() {
  background(22, 28, 40);
  stroke(255, 10);
  for (let y = 0; y < GH; y += 12) line(0, y, GW, y);
  noStroke();
}

function tv_drawPanel() {
  push();
  noStroke();
  fill(30, 38, 52); rect(36, 64, 608, 372, 10);
  fill(40, 50, 66); rect(44, 72, 592, 356, 8);
  fill(20, 26, 36);
  rect(TV_AX - 26, 120, 30, 250, 6);
  rect(TV_BX - 4,  120, 30, 250, 6);
  pop();
  for (let i = 0; i < 4; i++) {
    const y = TV_ROWS[i], c = color(TV_COLORS[i]);
    tv_terminal(TV_AX, y, c);
    tv_terminal(TV_BX, y, c);
  }
}

function tv_terminal(x, y, c) {
  push(); noStroke();
  fill(0, 120); ellipse(x, y, 22, 22);
  fill(c);      ellipse(x, y, 16, 16);
  fill(255, 80); ellipse(x - 2, y - 2, 6, 6);
  pop();
}

function tv_drawCables() {
  tv_drawLanes();
  let act = -1;
  if (tv_grab && tv_grab.type === 'node') act = tv_grab.i;
  else if (tv_hoverNode >= 0) act = tv_hoverNode;
  if (act >= 0 && tv_cables[act].solved) act = -1;

  for (let i = 0; i < tv_cables.length; i++) {
    const c = tv_cables[i];
    if (c.solved || i === act) continue;
    tv_drawSnake(c, false);
  }
  for (const c of tv_cables) if (c.solved) tv_drawStraight(c);
  if (act >= 0) tv_drawSnake(tv_cables[act], true);
  for (let i = 0; i < tv_cables.length; i++) {
    if (tv_cables[i].solved) continue;
    tv_drawKnob(tv_cables[i], i === act);
  }
}

function tv_cableStroke(c, w, col) {
  const ampScale = constrain(abs(c.node.y - c.ty) / 70, 0, 1);
  let pts = [{ x: c.ax, y: c.ty }];
  for (const wg of c.wig) {
    pts.push({
      x: lerp(c.ax, c.bx, wg.fx),
      y: c.ty + wg.amp * ampScale * (0.55 + 0.45 * sin(frameCount * wg.spd + wg.phase)),
    });
  }
  pts.push({ x: c.node.x, y: c.node.y });
  pts.push({ x: c.bx, y: c.ty });
  pts.sort((a, b) => a.x - b.x);
  push(); noFill(); stroke(col); strokeWeight(w); strokeJoin(ROUND);
  beginShape();
  curveVertex(pts[0].x, pts[0].y);
  for (const p of pts) curveVertex(p.x, p.y);
  curveVertex(pts[pts.length - 1].x, pts[pts.length - 1].y);
  endShape();
  pop();
}

function tv_drawSnake(c, active) {
  let sh = color(0); sh.setAlpha(120);
  tv_cableStroke(c, 11, sh);
  if (active) { let g = color(c.color); g.setAlpha(70); tv_cableStroke(c, 18, g); }
  let main = color(c.color); main.setAlpha(active ? 255 : 140);
  tv_cableStroke(c, active ? 8 : 6, main);
}

function tv_drawStraight(c) {
  push(); noFill();
  stroke(0, 120);      strokeWeight(9); line(c.ax, c.ty, c.bx, c.ty);
  stroke(color(c.color)); strokeWeight(6); line(c.ax, c.ty, c.bx, c.ty);
  stroke(255, 150);    strokeWeight(2); line(c.ax, c.ty - 1.5, c.bx, c.ty - 1.5);
  pop();
}

function tv_drawLanes() {
  push();
  for (let i = 0; i < 4; i++) {
    const y = TV_ROWS[i];
    let cc = color(TV_COLORS[i]); cc.setAlpha(55);
    stroke(cc); strokeWeight(2);
    for (let x = TV_AX; x < TV_BX; x += 14) line(x, y, x + 7, y);
  }
  pop();
}

function tv_drawKnob(c, active) {
  const r = active ? 20 : 15;
  push(); noStroke();
  fill(0, 130); ellipse(c.node.x, c.node.y + 2, r + 7, r + 7);
  fill(color(c.color)); ellipse(c.node.x, c.node.y, r, r);
  fill(255, 90); ellipse(c.node.x - r * 0.18, c.node.y - r * 0.18, r * 0.42, r * 0.42);
  noFill(); stroke(255, active ? 240 : 150); strokeWeight(2);
  ellipse(c.node.x, c.node.y, r + 6, r + 6);
  pop();
}

function tv_drawPlug() {
  const x = tv_plug.x, y = tv_plug.y;
  const socketY = tv_plug.hy - 36;
  const pulled  = tv_plug.y - tv_plug.hy;
  push();
  noStroke(); fill(18, 24, 34); rect(x - 34, socketY - 22, 68, 46, 6);
  fill(tv_unlocked ? color(40, 90, 55) : color(70, 30, 30));
  rect(x - 26, socketY - 14, 52, 30, 4);
  fill(0, 160);
  rect(x - 12, socketY - 6, 6, 14, 2);
  rect(x + 6,  socketY - 6, 6, 14, 2);
  stroke(180, 185, 200); strokeWeight(4);
  const pinLen = 20; // 핀의 고정 길이
const pinBottom = y - 22; // 핀 아랫부분 = 플러그 몸체 상단에 고정
const pinTopY = pinBottom - pinLen; // 핀 윗부분 = 항상 20px 위
line(x - 9, pinBottom, x - 9, pinTopY);
line(x + 9, pinBottom, x + 9, pinTopY);
  noStroke();
  const body = tv_unlocked ? color(70, 180, 110) : color(120, 130, 150);
  fill(0, 120); rect(x - 28, y - 22 + 3, 56, 46, 6);
  fill(body);   rect(x - 28, y - 22,     56, 44, 6);
  fill(255, 60); rect(x - 28, y - 22,    56,  6, 6);
  stroke(40, 46, 60); strokeWeight(7); noFill();
  line(x, y + 22, x + 14, GH - 30);
  noStroke();
  if (tv_unlocked && tv_phase === 'play' && frameCount % 50 < 32) {
    fill(120, 240, 160); textAlign(CENTER, CENTER); textSize(13);
    text('↓ 플러그를 뽑으세요', x, y + 40);
  }
  pop();
}

function tv_spawnSparks() {
  if (frameCount % 4 === 0) {
    const sx = tv_plug.x, sy = tv_plug.hy - 36;
    tv_sparks.push({ x: sx + random(-14, 14), y: sy + random(-8, 8),
                     vx: random(-2.5, 2.5), vy: random(-3, 1), life: random(10, 22) });
  }
}
function tv_updateSparks() {
  for (let i = tv_sparks.length - 1; i >= 0; i--) {
    const s = tv_sparks[i];
    s.x += s.vx; s.y += s.vy; s.vy += 0.18; s.life--;
    if (s.life <= 0) tv_sparks.splice(i, 1);
  }
}
function tv_drawSparks() {
  push(); noStroke();
  for (const s of tv_sparks) {
    fill(255, 240, 140, s.life * 11);
    rect(s.x, s.y, 3, 3);
  }
  pop();
}

function tv_drawUI(solved) {
  const frac = constrain(tv_remain / tv_timeLimit, 0, 1);
  noStroke(); fill(0, 80); rect(0, 0, GW, 7);
  const gc = frac > 0.5  ? color(60, 200, 90)
           : frac > 0.25 ? color(235, 200, 40)
           : color(226, 59, 59);
  fill(gc); rect(0, 0, GW * frac, 7);
  fill(255); textAlign(LEFT, CENTER); textSize(15);
  text('엉킨 전선 중 같은 색을 골라 줄에 맞추세요', 24, 40);
  const low = tv_remain <= 2;
  textAlign(RIGHT, CENTER); textSize(15);
  fill(220); text('정렬 ' + solved + ' / 4', GW - 130, 40);
  fill(low && (frameCount % 16 < 8) ? color(255, 90, 90) : color(255));
  text('⏱ ' + nf(tv_remain, 1, 1), GW - 24, 40);
}

/* 튜토리얼 버튼 좌표 — tv_drawTutorial 과 tvMousePressed 가 공유 */
function tv_tutBtnRect() {
  const pw = 460, ph = 210;
  const px = GW / 2 - pw / 2, py = GH - ph - 16;
  const bw = 130, bh = 32;
  const bx = GW / 2 - bw / 2, by = py + ph - bh - 14;
  return { px, py, pw, ph, bx, by, bw, bh };
}

/* ── 튜토리얼 화면 ── */
function tv_drawTutorial() {
  push();
  rectMode(CORNER); // main.js 전역 기본값(CENTER)과 무관하게 이 함수 안에서는 항상 CORNER로 그림

  tv_tutFlash = (tv_tutFlash + 1) % 70;

  const { px, py, pw, ph, bx, by, bw, bh } = tv_tutBtnRect();

  noStroke(); fill(0, 110); rect(px + 5, py + 6, pw, ph, 8);
  fill(22, 28, 40); rect(px, py, pw, ph, 8);
  fill(30, 38, 52); rect(px + 2, py + 2, pw - 4, ph - 4, 7);

  // 타이틀바
  fill(20, 90, 50); noStroke(); rect(px + 3, py + 3, pw - 6, 28, 5);
  fill(255); textAlign(LEFT, CENTER); textSize(14); textStyle(BOLD);
  text('📖  게임 방법', px + 12, py + 17);
  textStyle(BOLD);

  // 본문
  fill(210, 240, 220); textAlign(CENTER, TOP); textSize(14);
  text('전선 4개가 엉켜 있어요!',                          GW / 2, py + 38);
  text('각 전선의 매듭(동그라미)을 드래그해서',             GW / 2, py + 60);
  text('같은 색 줄에 일직선으로 맞춰주세요.',               GW / 2, py + 82);
  text('4개를 모두 맞추면 플러그를 아래로 뽑으세요.',       GW / 2, py + 104);
  text('제한 시간 안에 끝내야 합니다!',                     GW / 2, py + 126);

  // 시작 버튼
  const btnHot = tv_inRect(vmouseX(), vmouseY(), bx, by, bw, bh);
  fill(btnHot ? color(60, 210, 120) : color(30, 150, 80));
  noStroke(); rect(bx, by, bw, bh, 5);
  fill(255); textAlign(CENTER, CENTER); textSize(14); textStyle(BOLD);
  text('시작하기! 🚀', bx + bw / 2, by + bh / 2);
  textStyle(BOLD);

  pop();
}

function tv_drawWin() {
  const t = millis() - tv_winAt;
  push();
  fill(0, min(190, t * 0.45)); rect(0, 0, GW, GH);
  fill(255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(42);
  text('TV 끄기 성공!', GW / 2, GH / 2);
  if (t > 900) {
    tv_winAlpha += tv_winFadeAmt;
    if (tv_winAlpha <= 0 || tv_winAlpha >= 255) tv_winFadeAmt *= -1;
    tv_winAlpha = constrain(tv_winAlpha, 0, 255);
    fill(255, tv_winAlpha);
    textSize(18);
    text('PRESS ANY KEY OR CLICK TO CONTINUE', GW / 2, GH / 2 + 60);
  }
  pop();
}

function tv_drawFail() {
  let solved = 0; for (const c of tv_cables) if (c.solved) solved++;
  const t = millis() - tv_failAt;
  push();
  fill(0, min(190, t * 0.5)); rect(0, 0, GW, GH);
  textAlign(CENTER, CENTER); textStyle(BOLD);
  fill(255, 90, 90); textSize(40);
  text('⏰ 시간 초과', GW / 2, GH / 2 - 78);
  fill(255); textSize(20);
  text('전선을 제때 정리하지 못했습니다!', GW / 2, GH / 2 - 30);
  fill(200); textSize(15);
  text('대기전력이 줄줄 새어 나갑니다…', GW / 2, GH / 2 + 2);
  text('정렬 ' + solved + ' / 4', GW / 2, GH / 2 + 30);
  tv_failAlpha += tv_failFadeAmt;
  if (tv_failAlpha <= 0 || tv_failAlpha >= 255) tv_failFadeAmt *= -1;
  tv_failAlpha = constrain(tv_failAlpha, 0, 255);
  fill(255, tv_failAlpha);
  textSize(18);
  text('PRESS ANY KEY OR CLICK TO RETRY', GW / 2, GH / 2 + 80);
  pop();
}

/* ── 유틸 (tv_ 접두사로 inRect 중복 방지) ── */
function tv_inRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}