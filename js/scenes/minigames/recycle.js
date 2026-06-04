// 나비효과 게임 - 분리수거 미니게임 (scenes/minigames/recycle.js)
// 팀원 제작 sketch.js를 우리 씬 구조에 맞게 변환.
//   - 인스턴스 모드(new p5) → 전역 모드 (p. 접두사 제거)
//   - 자체 createCanvas 제거, 변수에 recycle_ 접두사
//   - 600x600 → 게임 가상 해상도(680x480) 중앙 배치 (sx/sy/ssize 변환)
//   - 클리어 시 solvedCount=2로 올리고 방으로 복귀
//   게임 플레이(낙하/받기/점수 ±5)는 원작 그대로 보존.
//   조작: ← → 이동 (keyIsDown), 클리어/폭발 후 클릭·키로 진행/재시도.

const RC_SRC = 600;
const RC_PIX = 4;
const RC_BIN_TYPES = ['종이', '캔', '플라스틱'];

let rc_scale = 1, rc_offX = 0, rc_offY = 0;
function rcx(v) { return rc_offX + v * rc_scale; }
function rcy(v) { return rc_offY + v * rc_scale; }
function rcs(v) { return v * rc_scale; }

let rc_score, rc_state, rc_basket, rc_items, rc_particles;

function rc_randomBinType() {
  return RC_BIN_TYPES[floor(random(RC_BIN_TYPES.length))];
}

function enterRecycleGame() {
  rc_scale = GH / RC_SRC;
  rc_offX = (GW - RC_SRC * rc_scale) / 2;
  rc_offY = 0;

  rc_score = 0;
  rc_state = 'play';
  rc_items = [];
  rc_particles = [];
  rc_basket = { x: RC_SRC / 2, y: RC_SRC - 80, type: rc_randomBinType() };
}

function updateRecycleGame() {
  // 게임 배경 (게임 영역만)
  push();
  rectMode(CORNER); noStroke();
  fill(22, 28, 40);
  rect(rcx(0), rcy(0), rcs(RC_SRC), rcs(RC_SRC));
  stroke(255, 10);
  for (let y = 0; y < RC_SRC; y += 12) line(rcx(0), rcy(y), rcx(RC_SRC), rcy(y));
  noStroke();
  pop();

  if (rc_state === 'play') {
    rc_updateBasket();
    rc_spawnItems();
    rc_updateItems();
  }
  rc_drawItems();
  rc_drawBasket();
  rc_drawParticles();
  rc_drawUI();
  if (rc_state === 'clear') rc_drawClearScreen();
  if (rc_state === 'explode') rc_drawExplosionScreen();
}

function rc_updateBasket() {
  if (keyIsDown(LEFT_ARROW)) rc_basket.x -= 7;
  if (keyIsDown(RIGHT_ARROW)) rc_basket.x += 7;
  rc_basket.x = constrain(rc_basket.x, 60, RC_SRC - 60);
}

function rc_spawnItems() {
  if (frameCount % 35 !== 0) return;
  let r = random();
  let type = (r < 0.22) ? '음식물' : RC_BIN_TYPES[floor(random(RC_BIN_TYPES.length))];
  rc_items.push({ x: random(50, RC_SRC - 50), y: -40, speed: random(2.5, 4.5), type: type });
}

function rc_updateItems() {
  for (let i = rc_items.length - 1; i >= 0; i--) {
    let t = rc_items[i];
    t.y += t.speed;
    let hit =
      t.x + 20 > rc_basket.x - 40 &&
      t.x < rc_basket.x + 40 &&
      t.y + 28 > rc_basket.y - 10 &&
      t.y < rc_basket.y + 55;
    if (hit) { rc_handleCatch(t); rc_items.splice(i, 1); continue; }
    if (t.y > RC_SRC + 50) rc_items.splice(i, 1);
  }
  if (rc_score >= 5 && rc_state === 'play') {
  rc_state = 'clear';

  if (minigameSuccessSound) {
    minigameSuccessSound.play();
  }
}
  if (rc_score <= -5 && rc_state === 'play') rc_explodeBasket();
}

function rc_handleCatch(item) {
   if (wasteSound) {
    wasteSound.play();
  }
  if (item.type === '음식물') { rc_score -= 2; return; }
  if (item.type === rc_basket.type) {
    rc_score += 1;
    rc_basket.type = rc_randomBinType();
  } else {
    rc_score -= 1;
  }
}

// ── 그리기 (원작 좌표를 rcx/rcy/rcs로 감싸 스케일) ──
function rc_drawItems() {
  for (let item of rc_items) {
    switch (item.type) {
      case '종이':     rc_drawPaper(item.x, item.y); break;
      case '캔':       rc_drawCokeCan(item.x, item.y); break;
      case '플라스틱': rc_drawBottle(item.x, item.y); break;
      case '음식물':   rc_drawFood(item.x, item.y); break;
    }
  }
}
function rc_rect(x, y, w, h) { rect(rcx(x), rcy(y), rcs(w), rcs(h)); }

function rc_drawPaper(x, y) {
  fill(245); rc_rect(x, y, 20, 28);
  fill(180); rc_rect(x+4, y+6, 12, 2); rc_rect(x+4, y+12, 12, 2); rc_rect(x+4, y+18, 12, 2);
}
function rc_drawCokeCan(x, y) {
  fill(220,40,40); rc_rect(x, y, 18, 28);
  fill(255); rc_rect(x+7, y+4, 4, 20);
  fill(180); rc_rect(x, y, 18, 4); rc_rect(x, y+24, 18, 4);
}
function rc_drawBottle(x, y) {
  fill(120,220,255); rc_rect(x+6, y, 6, 6); rc_rect(x+2, y+6, 14, 22);
  fill(240); rc_rect(x+5, y+12, 8, 6);
}
function rc_drawFood(x, y) {
  fill(90,180,90); rc_rect(x+2, y+2, 16, 16);
  fill(120,80,40); rc_rect(x+4, y+4, 4, 4); rc_rect(x+12, y+8, 4, 4); rc_rect(x+8, y+12, 4, 4);
}

function rc_drawBasket() {
  let bx = rc_basket.x, by = rc_basket.y;
  noStroke();
  fill(0, 60); ellipse(rcx(bx), rcy(by+60), rcs(90), rcs(16));
  // (뚜껑 제거) 사다리꼴 몸통만 그림
  fill(80);
  quad(rcx(bx-40), rcy(by), rcx(bx+40), rcy(by), rcx(bx+30), rcy(by+55), rcx(bx-30), rcy(by+55));
  fill(255); textAlign(CENTER, BASELINE); textSize(rcs(16)); textStyle(BOLD);
  text(rc_basket.type, rcx(bx), rcy(by+28));
  noFill(); stroke(40);
  quad(rcx(bx-40), rcy(by), rcx(bx+40), rcy(by), rcx(bx+30), rcy(by+55), rcx(bx-30), rcy(by+55));
  noStroke();
}

function rc_drawUI() {
  push();
  fill(255); textAlign(LEFT, BASELINE); textStyle(BOLD);
  textSize(rcs(24)); text('점수 : ' + rc_score, rcx(20), rcy(40));
  textSize(rcs(16));
  text('← → 이동', rcx(20), rcy(70));
  text('+5 성공 / -5 폭발', rcx(20), rcy(95));

  // 오브젝트 범례
  const legendY = 125;
  const iconX = 20;
  const labelOffX = 25;  // 아이콘(20px) + 여백
  const gap = 34;        // 항목 간격
  textSize(rcs(10)); textStyle(NORMAL);

  const types = [
    { label: '플라스틱', draw: rc_drawBottle },
    { label: '종이',     draw: rc_drawPaper  },
    { label: '캔',       draw: rc_drawCokeCan},
    { label: '음식물',   draw: rc_drawFood   },
  ];
  for (let i = 0; i < types.length; i++) {
    const y = legendY + i * gap;
    types[i].draw(iconX, y);
    fill(255); text(types[i].label, rcx(iconX + labelOffX), rcy(y + 8));
  }
  pop();
}

function rc_explodeBasket() {
  if (minigameFailSound) {
    minigameFailSound.play();
  }
  rc_state = 'explode';
  for (let i = 0; i < 180; i++) {
    rc_particles.push({ x: rc_basket.x, y: rc_basket.y, vx: random(-8,8), vy: random(-8,8), life: random(30,80) });
  }
}
function rc_drawParticles() {
  noStroke();
  for (let i = rc_particles.length - 1; i >= 0; i--) {
    let pt = rc_particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.15; pt.life--;
    fill(255, 180, 60, pt.life * 4);
    rect(rcx(pt.x), rcy(pt.y), rcs(RC_PIX)+1, rcs(RC_PIX)+1);
    if (pt.life <= 0) rc_particles.splice(i, 1);
  }
}

function rc_drawClearScreen() {
  push();
  fill(0, 180); rectMode(CORNER); rect(rcx(0), rcy(0), rcs(RC_SRC), rcs(RC_SRC));
  fill(255); textAlign(CENTER, CENTER); textSize(rcs(42));
  text('분리수거 성공!', rcx(RC_SRC/2), rcy(RC_SRC/2 - 40));
  textSize(rcs(18)); fill(200,230,255);
  text('PRESS ANY KEY OR CLICK TO CONTINUE', rcx(RC_SRC/2), rcy(RC_SRC/2 + 40));
  pop();
}
function rc_drawExplosionScreen() {
  push();
  fill(0, 180); rectMode(CORNER); rect(rcx(0), rcy(0), rcs(RC_SRC), rcs(RC_SRC));
  fill(255, 70, 70); textAlign(CENTER, CENTER); textSize(rcs(42));
  text('쓰레기통 폭발!', rcx(RC_SRC/2), rcy(RC_SRC/2 - 40));
  fill(255); textSize(rcs(20)); text('분리수거 실패', rcx(RC_SRC/2), rcy(RC_SRC/2));
  let alpha = 120 + sin(frameCount * 0.037) * 135;
  fill(255, alpha); textSize(rcs(20));
  text('PRESS ANY KEY OR CLICK TO RETRY', rcx(RC_SRC/2), rcy(RC_SRC/2 + 80));
  pop();
}

// ── 입력 ──
function recycleKeyPressed() {
  if (rc_state === 'explode') { enterRecycleGame(); return; }      // 재시도
  if (rc_state === 'clear') { recycleComplete(); return; }          // 계속
}
function recycleMousePressed() {
  if (rc_state === 'explode') enterRecycleGame();
  else if (rc_state === 'clear') recycleComplete();
}

function recycleComplete() {
  solvedCount = 2;
  gameState = 'room';
  roomReenterAfterMinigame();
}