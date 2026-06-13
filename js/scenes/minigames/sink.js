// 나비효과 게임 - 수도꼭지 잠그기 미니게임 (scenes/minigames/sink.js)
// 팀원 제작 sketch.js를 우리 씬 구조에 맞게 변환.
//   - 인스턴스 모드(new p5) → 전역 모드 (p. 접두사 제거)
//   - 자체 createCanvas / background 세팅 제거 (우리 캔버스/좌표계 사용)
//   - 전역 변수 충돌 방지: 모두 sink_ 접두사
//   - 좌표를 600x600 → 게임 가상 해상도(GW=680, GH=480)에 맞춰 중앙 배치
//   - 클리어 시 solvedCount=1로 올리고 방(room)으로 복귀
//   게임 플레이(밸브 속도/세이프존/기회 3번)는 원작 그대로 보존.
//
// 씬 함수: enterSinkGame() / updateSinkGame() / sinkMousePressed() / sinkKeyPressed()

// ── 원작 상수 (그대로) ──
const SINK_SUCCESS_ZONE = 10;
const SINK_SPD_DEFAULT = 3;
const SINK_PIX = 3; // 도트 크기 (680x480로 줄며 4→3)

// ── 원작 게임 영역(600x600)을 우리 화면에 배치하기 위한 변환 ──
// 정사각 게임을 세로(GH=480)에 맞춰 스케일하고 가로 중앙 정렬.
const SINK_SRC = 600;
let sink_scale = 1, sink_offX = 0, sink_offY = 0;
// 게임 좌표(0..600) → 화면 좌표 변환 헬퍼
function sx(v) { return sink_offX + v * sink_scale; }
function sy(v) { return sink_offY + v * sink_scale; }
function ssize(v) { return v * sink_scale; }

// ── 상태 ──
let sink_angle, sink_speed, sink_chance, sink_state;
let sink_particles = [];
let sink_textAlpha = 0, sink_fadeAmount = 3; let sink_clearAlpha = 0, sink_clearFadeAmt = 3;
let sink_pipeBuffer = null;

function enterSinkGame() {
  // 600 정사각을 GH(480)에 맞춤 → scale, 가로 중앙
  sink_scale = GH / SINK_SRC;
  sink_offX = (GW - SINK_SRC * sink_scale) / 2;
  sink_offY = 0;
  sink_clearAlpha = 0;
  sink_clearFadeAmt = 3;

  sink_angle = random(360);
  sink_speed = SINK_SPD_DEFAULT;
  sink_chance = 3;
  sink_state = 'play';
  sink_particles = [];
  sink_textAlpha = 0;
  sink_fadeAmount = 3;

  // 수도관 정적 레이어를 버퍼에 한 번만 구움 (원작 최적화 유지)
  if (!sink_pipeBuffer) {
    sink_pipeBuffer = createGraphics(SINK_SRC, SINK_SRC);
    sink_pipeBuffer.noSmooth();
    sink_pipeBuffer.pixelDensity(1);
    sink_renderStaticPipes();
  }
  if (waterSound && waterSound.isPlaying()) {
  waterSound.stop();
}

if (sink_waterSound) {
  sink_waterSound.stop();
  sink_waterSound.loop();
}
}

function updateSinkGame() {
  // 게임 자체 배경 (게임 영역만 칠함)
  push();
  textFont("monospace"); // ← 추가
  textStyle(BOLD);       // ← 추가 (이미 각 함수에 있지만 기본값 통일용)
  rectMode(CORNER);
  noStroke();
  fill(22, 28, 40);
  rect(sx(0), sy(0), ssize(SINK_SRC), ssize(SINK_SRC));
  // 가로 줄무늬
  stroke(255, 10);
  for (let y = 0; y < SINK_SRC; y += 12) line(sx(0), sy(y), sx(SINK_SRC), sy(y));
  noStroke();
  pop();

  // 정적 수도관 버퍼 (스케일해서 올림)
  push();
  imageMode(CORNER);
  image(sink_pipeBuffer, sx(0), sy(0), ssize(SINK_SRC), ssize(SINK_SRC));
  pop();

  if (sink_state === 'play') sink_angle = (sink_angle + sink_speed) % 360;
  sink_drawDynamicSink();
  sink_updateParticles();
  sink_drawParticles();
  sink_drawUI();
  if (sink_state === 'clear') sink_drawClear();
  if (sink_state === 'explode') sink_drawFail();
}

// 도트 사각 (화면 좌표로 스케일해서 그림)
function sink_pxRect(x, y, w, h, c) {
  fill(c); noStroke();
  for (let xx = x; xx < x + w; xx += SINK_PIX)
    for (let yy = y; yy < y + h; yy += SINK_PIX)
      rect(sx(xx), sy(yy), ssize(SINK_PIX) + 1, ssize(SINK_PIX) + 1);
}
// 버퍼용 도트 (버퍼는 원본 600 좌표 그대로)
function sink_pxRectBuf(g, x, y, w, h, c) {
  g.fill(c); g.noStroke();
  for (let xx = x; xx < x + w; xx += 4)
    for (let yy = y; yy < y + h; yy += 4)
      g.rect(xx, yy, 4, 4);
}

function sink_renderStaticPipes() {
  const g = sink_pipeBuffer;
  const cx = SINK_SRC / 2, cy = 220;
  sink_pxRectBuf(g, cx-22, cy-20, 44, 256, color(55,75,85));
  sink_pxRectBuf(g, cx-18, cy-20, 36, 252, color(85,135,155));
  sink_pxRectBuf(g, cx-14, cy-20, 8, 252, color(125,175,195));
  sink_pxRectBuf(g, cx+10, cy-20, 6, 252, color(55,95,115));
  sink_pxRectBuf(g, cx-94, cy-39, 188, 38, color(55,75,85));
  sink_pxRectBuf(g, cx-90, cy-35, 180, 30, color(85,135,155));
  sink_pxRectBuf(g, cx-86, cy-35, 12, 30, color(125,175,195));
  sink_pxRectBuf(g, cx+70, cy-35, 10, 30, color(55,95,115));
  sink_pxRectBuf(g, cx+51, cy-9, 38, 63, color(55,75,85));
  sink_pxRectBuf(g, cx+55, cy-5, 30, 55, color(85,135,155));
  sink_pxRectBuf(g, cx+59, cy-5, 8, 55, color(125,175,195));
  sink_pxRectBuf(g, cx-144, 426, 288, 63, color(45,58,75));
  sink_pxRectBuf(g, cx-140, 430, 280, 55, color(135,155,175));
  sink_pxRectBuf(g, cx-136, 434, 40, 6, color(195,215,235));
  sink_pxRectBuf(g, cx-136, 434, 6, 45, color(195,215,235));
  sink_pxRectBuf(g, cx+100, 434, 36, 47, color(85,105,125));
  sink_pxRectBuf(g, cx-100, 442, 200, 35, color(75,105,125));
  sink_pxRectBuf(g, cx-96, 446, 192, 28, color(55,85,105));
  sink_pxRectBuf(g, cx-114, 481, 228, 22, color(45,58,75));
  sink_pxRectBuf(g, cx-110, 485, 220, 18, color(105,125,145));
  sink_pxRectBuf(g, cx-20, 488, 40, 8, color(65,85,105));
  sink_pxRectBuf(g, cx-16, 490, 32, 4, color(38,55,75));
  sink_pxRectBuf(g, cx+46, 444, 48, 20, color(45,58,75));
  sink_pxRectBuf(g, cx+50, 448, 40, 16, color(95,115,135));
  sink_pxRectBuf(g, cx+54, 450, 8, 8, color(155,195,215));
  sink_pxRectBuf(g, cx+68, 450, 8, 8, color(155,195,215));
}

function sink_drawDynamicSink() {
  const cx = SINK_SRC / 2, cy = 220;

  // 세이프 존 (초록 부채꼴) — 화면 좌표로 직접
  push();
  translate(sx(cx), sy(cy - 20));
  noStroke();
  fill(0, 255, 120, 70);
  arc(0, 0, ssize(150), ssize(150), radians(-SINK_SUCCESS_ZONE), radians(SINK_SUCCESS_ZONE), PIE);
  pop();

  // 회전 밸브 레버
  push();
  translate(sx(cx), sy(cy - 20));
  rotate(radians(sink_angle));
  let P = ssize(SINK_PIX) + 1;
  // 레버를 스케일 좌표로 도트
  const lever = [
    [-55,-9,110,18, color(140,30,30)],
    [-55,-7,110,14, color(220,60,60)],
    [-55,-7,110,4,  color(255,100,100)],
    [-59,-7,8,14,   color(255,120,120)],
    [51,-7,8,14,    color(255,120,120)],
  ];
  for (let [lx,ly,lw,lh,c] of lever) {
    fill(c); noStroke();
    for (let xx=lx; xx<lx+lw; xx+=SINK_PIX)
      for (let yy=ly; yy<ly+lh; yy+=SINK_PIX)
        rect(xx*sink_scale, yy*sink_scale, P, P);
  }
  fill(30,35,50); noStroke(); circle(0,0,ssize(28));
  fill(195,200,215); circle(0,0,ssize(22));
  fill(235,240,255); circle(ssize(-3),ssize(-3),ssize(10));
  fill(75,80,100); circle(0,0,ssize(8));
  pop();

  // 물줄기
  if (sink_state === 'play') {
    const wx = cx + 70, wy = cy + 50, endY = 448;
    stroke(120, 220, 255);
    strokeWeight(ssize(5 + (3 - sink_chance)));
    line(sx(wx), sy(wy), sx(wx), sy(endY));
    for (let i = 0; i < 14; i++) {
      let yy = wy + ((frameCount * (8 + (3 - sink_chance) * 3)) + i * 25) % (endY - wy);
      line(sx(wx-4), sy(yy), sx(wx+4), sy(yy+8));
    }
    noStroke();
  }
}

function sink_tryLock() {
  let a = ((sink_angle % 360) + 360) % 360;
  let success = (a>=0 && a<=10) || (a>=170 && a<=190) || (a>=350 && a<=360);
  if (success) {
  sink_state = 'clear';

  if (sink_waterSound && sink_waterSound.isPlaying()) {
    sink_waterSound.stop();
  }

  if (minigameSuccessSound) {
    minigameSuccessSound.play();
  }

  return;
}
  sink_chance--;
  sink_speed *= 1.45;
  for (let i = 0; i < 80; i++) {
    sink_particles.push({ x: 370, y: 280, vx: random(-8,8), vy: random(-8,8), life: random(20,45) });
  }
  if (sink_chance <= 0) {
  sink_state = 'explode';

  if (sink_waterSound && sink_waterSound.isPlaying()) {
    sink_waterSound.stop();
  }

  if (minigameFailSound) {
    minigameFailSound.play();
  }
}
}

function sink_updateParticles() {
  for (let i = sink_particles.length - 1; i >= 0; i--) {
    let pt = sink_particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.life--;
    if (pt.life <= 0) sink_particles.splice(i, 1);
  }
}
function sink_drawParticles() {
  noStroke();
  for (let pt of sink_particles) {
    fill(120, 220, 255, pt.life * 4);
    rect(sx(pt.x), sy(pt.y), ssize(4)+1, ssize(4)+1);
  }
}

function sink_drawUI() {
  push();
  textFont("monospace"); // ← 추가
  fill(255); textSize(ssize(24)); textStyle(BOLD); textAlign(LEFT, BASELINE);
  text('남은 기회 : ' + sink_chance, sx(20), sy(40));
  textSize(ssize(16));
  text('SPACE : 수도 잠그기', sx(20), sy(70));
  pop();
}

function sink_drawClear() {
  push();
  textFont("monospace");
  fill(0, 180); rectMode(CORNER); rect(sx(0), sy(0), ssize(SINK_SRC), ssize(SINK_SRC));
  fill(255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(ssize(42));
  text('수도 잠그기 성공!', sx(SINK_SRC/2), sy(SINK_SRC/2));

  sink_clearAlpha += sink_clearFadeAmt;
  if (sink_clearAlpha <= 0 || sink_clearAlpha >= 255) sink_clearFadeAmt *= -1;
  sink_clearAlpha = constrain(sink_clearAlpha, 0, 255);
  fill(255, sink_clearAlpha);      // RETRY와 동일: 흰색 페이드
  textSize(ssize(18));             // RETRY와 동일: 18
  text('PRESS ANY KEY OR CLICK TO CONTINUE', sx(SINK_SRC/2), sy(SINK_SRC/2) + ssize(60));
  pop();
}

function sink_drawFail() {
  push();
  textFont("monospace"); // ← 추가
  fill(0, 180); rectMode(CORNER); rect(sx(0), sy(0), ssize(SINK_SRC), ssize(SINK_SRC));
  fill(120, 220, 255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(ssize(42));
  text('수도관 폭발!', sx(SINK_SRC/2), sy(SINK_SRC/2) - ssize(40));
  sink_textAlpha += sink_fadeAmount;
  if (sink_textAlpha < 0 || sink_textAlpha > 255) sink_fadeAmount *= -1;
  sink_textAlpha = constrain(sink_textAlpha, 0, 255);
  fill(255, sink_textAlpha); textSize(ssize(20));
  text('PRESS ANY KEY OR CLICK TO RETRY', sx(SINK_SRC/2), sy(SINK_SRC/2) + ssize(80));
  pop();
}

// ── 입력 ──
function sinkKeyPressed() {
  if (sink_state === 'play' && keyCode === 32) sink_tryLock();          // SPACE
  else if (sink_state === 'explode') enterSinkGame();                    // 재시도
  else if (sink_state === 'clear') sinkComplete();                       // 계속
}
function sinkMousePressed() {
  // 마우스로도 진행 가능하게: play 중 클릭=잠그기 시도, clear=계속, explode=재시도
  if (sink_state === 'play') sink_tryLock();
  else if (sink_state === 'clear') sinkComplete();
  else if (sink_state === 'explode') enterSinkGame();
}

// 클리어 → 방으로 복귀하며 1단계 완료 처리
function sinkComplete() {
  if (sink_waterSound && sink_waterSound.isPlaying()) {
  sink_waterSound.stop();
}
  solvedCount = 1;
  gameState = 'room';
  // 방의 물 페널티 등 1단계 상태를 깨끗이 하기 위해 다시 들어가되 solvedCount 유지
  // enterRoom()은 solvedCount=0으로 리셋하므로, 여기선 직접 복귀 처리
  roomReenterAfterMinigame();
}