// 나비효과 게임 - 수도꼭지 잠그기 미니게임 (scenes/minigames/sink.js)

const SINK_SUCCESS_ZONE = 10;
const SINK_SPD_DEFAULT = 3;
const SINK_PIX = 3;

const SINK_SRC = 600;
let sink_scale = 1, sink_offX = 0, sink_offY = 0;
function sx(v) { return sink_offX + v * sink_scale; }
function sy(v) { return sink_offY + v * sink_scale; }
function ssize(v) { return v * sink_scale; }

// ── 상태 ──
let sink_angle, sink_speed, sink_chance, sink_state;
let sink_particles = [];
let sink_textAlpha = 0, sink_fadeAmount = 3;
let sink_clearAlpha = 0, sink_clearFadeAmt = 3;
let sink_pipeBuffer = null;

// ── 튜토리얼 상태 ──
let sink_tutFlash = 0;

/* ── 씬 진입: 튜토리얼부터 ── */
function enterSinkGame() {
  sink_scale = GH / SINK_SRC;
  sink_offX = (GW - SINK_SRC * sink_scale) / 2;
  sink_offY = 0;

  if (!sink_pipeBuffer) {
    sink_pipeBuffer = createGraphics(SINK_SRC, SINK_SRC);
    sink_pipeBuffer.noSmooth();
    sink_pipeBuffer.pixelDensity(1);
    sink_renderStaticPipes();
  }

  sink_state = 'tutorial';
  sink_tutFlash = 0;
  // 튜토리얼에서도 밸브가 돌아가 보이도록 게임 변수 초기화
  sink_angle = 60;   // 세이프존 밖에서 시작해 분위기 전달
  sink_speed = SINK_SPD_DEFAULT;
  sink_chance = 3;
  sink_particles = [];
  sink_textAlpha = 0;
  sink_fadeAmount = 3;
  sink_clearAlpha = 0;
  sink_clearFadeAmt = 3;
}

/* 실제 게임 시작 */
function startActualSinkGame() {
  sink_angle = random(360);
  sink_speed = SINK_SPD_DEFAULT;
  sink_chance = 3;
  sink_state = 'play';
  sink_particles = [];
  sink_textAlpha = 0;
  sink_fadeAmount = 3;
  sink_clearAlpha = 0;
  sink_clearFadeAmt = 3;

  if (sink_waterSound && !sink_waterSound.isPlaying()) {
    sink_waterSound.loop();
  }
}

function updateSinkGame() {
  push();
  textFont("monospace");
  textStyle(BOLD);
  rectMode(CORNER);
  noStroke();
  fill(22, 28, 40);
  rect(sx(0), sy(0), ssize(SINK_SRC), ssize(SINK_SRC));
  stroke(255, 10);
  for (let y = 0; y < SINK_SRC; y += 12) line(sx(0), sy(y), sx(SINK_SRC), sy(y));
  noStroke();
  pop();

  push();
  imageMode(CORNER);
  image(sink_pipeBuffer, sx(0), sy(0), ssize(SINK_SRC), ssize(SINK_SRC));
  pop();

  // 튜토리얼: 밸브는 돌지 않고 정지 상태로 보여줌
  if (sink_state !== 'tutorial') {
    if (sink_state === 'play') sink_angle = (sink_angle + sink_speed) % 360;
  }

  sink_drawDynamicSink();
  sink_updateParticles();
  sink_drawParticles();

  if (sink_state === 'tutorial') {
    sink_drawTutorial();
  } else {
    sink_drawUI();
    if (sink_state === 'clear')   sink_drawClear();
    if (sink_state === 'explode') sink_drawFail();
  }
}

/* 튜토리얼 버튼 좌표 — drawTutorial 과 mousePressed 가 공유 */
function sink_tutBtnRect() {
  const cx = SINK_SRC / 2;
  const pw = ssize(420), ph = ssize(200);
  const px = sx(cx) - pw / 2, py = sy(340);
  const bw = ssize(130), bh = ssize(32);
  const bx = sx(cx) - bw / 2, by = py + ph - bh - ssize(14);
  return { px, py, pw, ph, bx, by, bw, bh };
}

/* ── 튜토리얼 화면 ── */
function sink_drawTutorial() {
  push();
  rectMode(CORNER); // main.js 전역 기본값(CENTER)과 무관하게 이 함수 안에서는 항상 CORNER로 그림

  sink_tutFlash = (sink_tutFlash + 1) % 70;

  const cx = SINK_SRC / 2;

  // 세이프존 강조: 맥박 링
  push();
  translate(sx(cx), sy(200));
  const pulse = 0.5 + 0.5 * sin(sink_tutFlash * TWO_PI / 70);
  const ringR = ssize(82 + pulse * 12);
  noFill();
  stroke(0, 255, 120, 180 + pulse * 75);
  strokeWeight(2.5 + pulse * 2);
  arc(0, 0, ringR * 2, ringR * 2, radians(-SINK_SUCCESS_ZONE - 4), radians(SINK_SUCCESS_ZONE + 4), OPEN);
  noStroke();
  pop();

  // 모달 패널
  const { px, py, pw, ph, bx, by, bw, bh } = sink_tutBtnRect();

  noStroke(); fill(0, 110); rect(px + 5, py + 6, pw, ph, ssize(8));
  fill(22, 28, 40); rect(px, py, pw, ph, ssize(8));
  fill(30, 38, 52); rect(px + 2, py + 2, pw - 4, ph - 4, ssize(7));

  // 타이틀바
  fill(20, 90, 50); noStroke(); rect(px + 3, py + 3, pw - 6, ssize(28), ssize(5));
  fill(255); textAlign(LEFT, CENTER); textSize(ssize(14)); textStyle(BOLD);
  text('📖  게임 방법', px + ssize(12), py + ssize(17));
  textStyle(BOLD);

  // 본문
  fill(210, 240, 220); textAlign(CENTER, TOP); textSize(ssize(14));
  text('수도꼭지에서 물이 새고 있어요!', sx(cx), py + ssize(40));
  text('밸브가 초록 구간(세이프존)에 오면', sx(cx), py + ssize(64));
  text('SPACE 또는 클릭으로 잠그세요.', sx(cx), py + ssize(88));
  text('기회는 3번. 실패하면 속도가 빨라집니다!', sx(cx), py + ssize(112));

  // 시작 버튼
  const btnHot = inRect(vmouseX(), vmouseY(), bx, by, bw, bh);
  fill(btnHot ? color(60, 210, 120) : color(30, 150, 80));
  noStroke(); rect(bx, by, bw, bh, ssize(5));
  fill(255); textAlign(CENTER, CENTER); textSize(ssize(14)); textStyle(BOLD);
  text('시작하기! 🚀', bx + bw / 2, by + bh / 2);
  textStyle(BOLD);

  pop();
}

// ── 원작 함수들 (변경 없음) ──

function sink_pxRect(x, y, w, h, c) {
  fill(c); noStroke();
  for (let xx = x; xx < x + w; xx += SINK_PIX)
    for (let yy = y; yy < y + h; yy += SINK_PIX)
      rect(sx(xx), sy(yy), ssize(SINK_PIX) + 1, ssize(SINK_PIX) + 1);
}
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
  push();
  rectMode(CORNER); // 이 함수의 모든 rect()는 좌상단 좌표 기준으로 작성되어 있음

  const cx = SINK_SRC / 2, cy = 220;

  // 세이프 존
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

  // 물줄기 (play 중에만)
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
  pop();
}

function sink_tryLock() {
  let a = ((sink_angle % 360) + 360) % 360;
  let success = (a>=0 && a<=10) || (a>=170 && a<=190) || (a>=350 && a<=360);
  if (success) {
    sink_state = 'clear';
    if (sink_waterSound && sink_waterSound.isPlaying()) sink_waterSound.stop();
    if (minigameSuccessSound) minigameSuccessSound.play();
    return;
  }
  sink_chance--;
  sink_speed *= 1.45;
  for (let i = 0; i < 80; i++) {
    sink_particles.push({ x: 370, y: 280, vx: random(-8,8), vy: random(-8,8), life: random(20,45) });
  }
  if (sink_chance <= 0) {
    sink_state = 'explode';
    if (sink_waterSound && sink_waterSound.isPlaying()) sink_waterSound.stop();
    if (minigameFailSound) minigameFailSound.play();
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
  push();
  rectMode(CORNER);
  noStroke();
  for (let pt of sink_particles) {
    fill(120, 220, 255, pt.life * 4);
    rect(sx(pt.x), sy(pt.y), ssize(4)+1, ssize(4)+1);
  }
  pop();
}

function sink_drawUI() {
  push();
  textFont("monospace");
  fill(255); textSize(ssize(24)); textStyle(BOLD); textAlign(LEFT, BASELINE);
  text('남은 기회 : ' + sink_chance, sx(20), sy(40));
  textSize(ssize(16));
  text('SPACE 또는 클릭 : 수도 잠그기', sx(20), sy(70));
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
  fill(255, sink_clearAlpha); textSize(ssize(18));
  text('PRESS ANY KEY OR CLICK TO CONTINUE', sx(SINK_SRC/2), sy(SINK_SRC/2) + ssize(60));
  pop();
}

function sink_drawFail() {
  push();
  textFont("monospace");
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
  if (sink_state === 'tutorial') { startActualSinkGame(); return; }
  if (sink_state === 'play' && keyCode === 32) sink_tryLock();
  else if (sink_state === 'explode') startActualSinkGame();   // 튜토리얼 없이 재시작
  else if (sink_state === 'clear') sinkComplete();
}
function sinkMousePressed() {
  if (sink_state === 'tutorial') {
    const { bx, by, bw, bh } = sink_tutBtnRect();
    if (inRect(vmouseX(), vmouseY(), bx, by, bw, bh)) startActualSinkGame();
    return;
  }
  if (sink_state === 'play') sink_tryLock();
  else if (sink_state === 'clear') sinkComplete();
  else if (sink_state === 'explode') startActualSinkGame();   // 튜토리얼 없이 재시작
}

function sinkComplete() {
  if (sink_waterSound && sink_waterSound.isPlaying()) sink_waterSound.stop();
  solvedCount = 1;
  gameState = 'room';
  roomReenterAfterMinigame();
}