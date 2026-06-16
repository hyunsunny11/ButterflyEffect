// 나비효과 게임 - 분리수거 미니게임 (scenes/minigames/recycle.js)

const RC_SRC = 600;
const RC_PIX = 4;
const RC_BIN_TYPES = ['종이', '캔', '플라스틱'];

// 타입별 통 색상
const RC_BIN_COLOR = {
  '종이':     [245, 245, 245],
  '캔':       [220, 50,  50 ],
  '플라스틱': [100, 210, 255],
  '음식물':   [60,  180, 80 ],
};

let rc_clearAlpha = 0, rc_clearFadeAmt = 3;
let rc_failAlpha = 0, rc_failFadeAmt = 3;
let rc_scale = 1, rc_offX = 0, rc_offY = 0;
function rcx(v) { return rc_offX + v * rc_scale; }
function rcy(v) { return rc_offY + v * rc_scale; }
function rcs(v) { return v * rc_scale; }

let rc_score, rc_state, rc_basket, rc_items, rc_particles;

// ── 튜토리얼 상태 ──
let rc_tutFlash = 0;
let rc_tutItem = null;   // 데모용 낙하 아이템

function rc_randomBinType(exclude) {
  const choices = exclude
    ? RC_BIN_TYPES.filter(t => t !== exclude)
    : RC_BIN_TYPES;
  return choices[floor(random(choices.length))];
}

/* ── 씬 진입: 튜토리얼부터 ── */
function enterRecycleGame() {
  rc_clearAlpha = 0; rc_clearFadeAmt = 3;
  rc_failAlpha = 0;  rc_failFadeAmt = 3;
  rc_scale = GH / RC_SRC;
  rc_offX = (GW - RC_SRC * rc_scale) / 2;
  rc_offY = 0;

  rc_score = 0;
  rc_state = 'tutorial';
  rc_items = [];
  rc_particles = [];
  rc_basket = { x: RC_SRC / 2, y: RC_SRC - 80, type: '종이' };
  rc_tutFlash = 0;
  // 데모용 아이템: 바구니 위에서 천천히 내려옴
  rc_tutItem = { x: RC_SRC / 2, y: 160, speed: 1.2, type: '종이' };
}

/* 실제 게임 시작 */
function startActualRecycleGame() {
  rc_score = 0;
  rc_state = 'play';
  rc_items = [];
  rc_particles = [];
  rc_basket = { x: RC_SRC / 2, y: RC_SRC - 80, type: rc_randomBinType() };
}

function updateRecycleGame() {
  push();
  textFont("monospace");
  textStyle(BOLD);
  rectMode(CORNER); noStroke();
  fill(22, 28, 40);
  rect(rcx(0), rcy(0), rcs(RC_SRC), rcs(RC_SRC));
  stroke(255, 10);
  for (let y = 0; y < RC_SRC; y += 12) line(rcx(0), rcy(y), rcx(RC_SRC), rcy(y));
  noStroke();
  pop();

  if (rc_state === 'tutorial') {
    rc_drawBasket();
    rc_drawTutorial();
    pop();
    return;
  }

  if (rc_state === 'play') {
    rc_updateBasket();
    rc_spawnItems();
    rc_updateItems();
  }
  rc_drawItems();
  rc_drawBasket();
  rc_drawParticles();
  rc_drawUI();
  if (rc_state === 'clear')   rc_drawClearScreen();
  if (rc_state === 'explode') rc_drawExplosionScreen();
}

/* ── 튜토리얼 화면 ── */
function rc_drawTutorial() {
  rc_tutFlash = (rc_tutFlash + 1) % 70;

  // 데모 아이템 천천히 내려오다 바구니에 닿으면 위로 리셋
  rc_tutItem.y += rc_tutItem.speed;
  if (rc_tutItem.y > rc_basket.y - 20) rc_tutItem.y = 160;
  rc_drawPaper(rc_tutItem.x, rc_tutItem.y);

  // 아이템에 맥박 링 강조
  const pulse = 0.5 + 0.5 * sin(rc_tutFlash * TWO_PI / 70);
  const ringR = rcs(20 + pulse * 7);
  noFill();
  stroke(255, 240, 100, 180 + pulse * 75);
  strokeWeight(2 + pulse * 1.5);
  ellipse(rcx(rc_tutItem.x + 10), rcy(rc_tutItem.y + 14), ringR * 2, ringR * 2);
  noStroke();

  // 화살표 (아이템 → 바구니)
  const arrowAlpha = 120 + 135 * sin(rc_tutFlash * TWO_PI / 70);
  fill(255, 240, 100, arrowAlpha);
  textAlign(CENTER, CENTER); textSize(rcs(22)); textStyle(BOLD);
  text('↓', rcx(rc_tutItem.x + 10), rcy(rc_tutItem.y + 50));
  textStyle(BOLD);

  // 모달 패널 (하단)
  const pw = rcs(430), ph = rcs(195);
  const px = rcx(RC_SRC / 2) - pw / 2, py = rcy(370);

  noStroke(); fill(0, 110); rect(px + 5, py + 6, pw, ph, rcs(8));
  fill(22, 28, 40); rect(px, py, pw, ph, rcs(8));
  fill(30, 38, 52); rect(px + 2, py + 2, pw - 4, ph - 4, rcs(7));

  // 타이틀바
  fill(20, 100, 60); noStroke(); rect(px + 3, py + 3, pw - 6, rcs(28), rcs(5));
  fill(255); textAlign(LEFT, CENTER); textSize(rcs(14)); textStyle(BOLD);
  text('📖  게임 방법', px + rcs(12), py + rcs(17));
  textStyle(BOLD);

  // 본문
  fill(200, 240, 215); textAlign(CENTER, TOP); textSize(rcs(16));
  text('바구니에 표시된 것과 같은 쓰레기를 담으세요',  rcx(RC_SRC / 2), py + rcs(38));
  text('같은 종류 +1점 / 다른쓰레기·음식물 -1점',    rcx(RC_SRC / 2), py + rcs(62));
  text('5점 달성하면 성공, -5점이 되면 폭발!',           rcx(RC_SRC / 2), py + rcs(86));
  text('← → 키로 이동하세요.',                            rcx(RC_SRC / 2), py + rcs(110));

  // 시작 버튼
  const { bx, by, bw, bh } = rc_tutBtnRect();
  const btnHot = rcInRect(mouseX, mouseY, bx, by, bw, bh);
  fill(btnHot ? color(60, 210, 120) : color(30, 150, 80));
  noStroke(); rect(bx, by, bw, bh, rcs(5));
  fill(255); textAlign(CENTER, CENTER); textSize(rcs(14)); textStyle(BOLD);
  text('시작하기! 🚀', bx + bw / 2, by + bh / 2);
  textStyle(BOLD);
}

/* 버튼 좌표 — draw 와 mousePressed 가 공유 */
function rc_tutBtnRect() {
  const pw = rcs(430), ph = rcs(195);
  const px = rcx(RC_SRC / 2) - pw / 2, py = rcy(370);
  const bw = rcs(130), bh = rcs(32);
  const bx = rcx(RC_SRC / 2) - bw / 2, by = py + ph - bh - rcs(14);
  return { bx, by, bw, bh };
}

// ── 원작 함수들 ──

function rc_updateBasket() {
  if (keyIsDown(LEFT_ARROW))  rc_basket.x -= 7;
  if (keyIsDown(RIGHT_ARROW)) rc_basket.x += 7;
  rc_basket.x = constrain(rc_basket.x, 60, RC_SRC - 60);
}

function rc_spawnItems() {
  if (frameCount % 35 !== 0) return;
  let r = random();
  let type;
  if (r < 0.25) {
    type = '음식물';                          // 25% 음식물(방해)
  } else if (r < 0.55) {
    type = rc_basket.type;                    // 30% 현재 바구니 타입(맞출 기회)
  } else {
    type = rc_randomBinType(rc_basket.type);  // 45% 다른 타입(방해)
  }
  rc_items.push({ x: random(50, RC_SRC - 50), y: -40, speed: random(2.5, 4.5), type });
}

function rc_updateItems() {
  for (let i = rc_items.length - 1; i >= 0; i--) {
    let t = rc_items[i];
    t.y += t.speed;
    let hit =
      t.x + 20 > rc_basket.x - 40 &&
      t.x      < rc_basket.x + 40 &&
      t.y + 28 > rc_basket.y - 10 &&
      t.y      < rc_basket.y + 55;
    if (hit) { rc_handleCatch(t); rc_items.splice(i, 1); continue; }
    if (t.y > RC_SRC + 50) rc_items.splice(i, 1);
  }
  if (rc_score >=  5 && rc_state === 'play') {
    rc_state = 'clear';
    if (typeof minigameSuccessSound !== 'undefined' && minigameSuccessSound) minigameSuccessSound.play();
  }
  if (rc_score <= -5 && rc_state === 'play') rc_explodeBasket();
}

function rc_handleCatch(item) {
  if (typeof wasteSound !== 'undefined' && wasteSound) wasteSound.play();
  if (item.type === '음식물') { rc_score -= 2; return; }
  if (item.type === rc_basket.type) {
    rc_score += 1;
    rc_basket.type = rc_randomBinType(rc_basket.type);  // 방금 담은 것과 다른 타입으로
  } else {
    rc_score -= 1;
  }
}

function rc_drawItems() {
  for (let item of rc_items) {
    switch (item.type) {
      case '종이':     rc_drawPaper(item.x, item.y);    break;
      case '캔':       rc_drawCokeCan(item.x, item.y);  break;
      case '플라스틱': rc_drawBottle(item.x, item.y);   break;
      case '음식물':   rc_drawFood(item.x, item.y);     break;
    }
  }
}

function rc_rect(x, y, w, h) {
  rectMode(CORNER);
  rect(rcx(x), rcy(y), rcs(w), rcs(h));
}
function rc_drawPaper(x, y) {
  noStroke(); fill(245); rc_rect(x, y, 20, 28);
  fill(180);
  rc_rect(x+4, y+6,  12, 2);
  rc_rect(x+4, y+12, 12, 2);
  rc_rect(x+4, y+18, 12, 2);
}
function rc_drawCokeCan(x, y) {
  noStroke(); fill(220, 40, 40); rc_rect(x, y, 18, 28);
  fill(255); rc_rect(x+7, y+4, 4, 20);
  fill(180);
  rc_rect(x,   y,    18, 4);
  rc_rect(x,   y+24, 18, 4);
}
function rc_drawBottle(x, y) {
  noStroke(); fill(120, 220, 255);
  rc_rect(x+6, y,   6,  6);
  rc_rect(x+2, y+6, 14, 22);
  fill(240); rc_rect(x+5, y+12, 8, 6);
}
function rc_drawFood(x, y) {
  noStroke(); fill(90, 180, 90); rc_rect(x+2, y+2, 16, 16);
  fill(120, 80, 40);
  rc_rect(x+4,  y+4,  4, 4);
  rc_rect(x+12, y+8,  4, 4);
  rc_rect(x+8,  y+12, 4, 4);
}

function rc_drawBasket() {
  let bx = rc_basket.x, by = rc_basket.y;
  const col = RC_BIN_COLOR[rc_basket.type] || [80, 80, 80];

  noStroke();
  // 그림자
  fill(0, 60); ellipse(rcx(bx), rcy(by+60), rcs(90), rcs(16));

  // 통 몸통 (타입 색)
  fill(col[0], col[1], col[2]);
  quad(rcx(bx-40), rcy(by),    rcx(bx+40), rcy(by),
       rcx(bx+30), rcy(by+55), rcx(bx-30), rcy(by+55));

  // 텍스트 (원작 그대로)
  push();
  textFont("monospace");
  fill(rc_basket.type === '종이' ? 0 : 255);  // 흰 통엔 검정 글씨
  textAlign(CENTER, BASELINE); textSize(rcs(14)); textStyle(BOLD);
  text(rc_basket.type, rcx(bx), rcy(by+28));
  pop();

  // 테두리 선 (원작 그대로)
  noFill(); stroke(40);
  quad(rcx(bx-40), rcy(by),    rcx(bx+40), rcy(by),
       rcx(bx+30), rcy(by+55), rcx(bx-30), rcy(by+55));
  noStroke();
}

function rc_drawUI() {
  push();
  textFont("monospace");
  fill(255); textAlign(LEFT, BASELINE); textStyle(BOLD);
  textSize(rcs(24)); text('점수 : ' + rc_score, rcx(20), rcy(40));
  textSize(rcs(16));
  text('← → 이동', rcx(20), rcy(70));
  text('+5 성공 / -5 폭발', rcx(20), rcy(95));
  const legendY = 125, iconX = 20, gap = 34;
  textSize(rcs(10)); textStyle(NORMAL);
  const types = [
    { label: '플라스틱', draw: rc_drawBottle  },
    { label: '종이',     draw: rc_drawPaper   },
    { label: '캔',       draw: rc_drawCokeCan },
    { label: '음식물',   draw: rc_drawFood    },
  ];
  for (let i = 0; i < types.length; i++) {
    const y = legendY + i * gap;
    types[i].draw(iconX, y);
    fill(255); text(types[i].label, rcx(iconX + 25), rcy(y + 8));
  }
  pop();
}

function rc_explodeBasket() {
  if (typeof minigameFailSound !== 'undefined' && minigameFailSound) minigameFailSound.play();
  rc_state = 'explode';
  for (let i = 0; i < 180; i++) {
    rc_particles.push({ x: rc_basket.x, y: rc_basket.y,
                        vx: random(-8,8), vy: random(-8,8), life: random(30,80) });
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
  textFont("monospace");
  fill(0, 180); rectMode(CORNER); rect(rcx(0), rcy(0), rcs(RC_SRC), rcs(RC_SRC));
  fill(255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(rcs(42));
  text('분리수거 성공!', rcx(RC_SRC/2), rcy(RC_SRC/2 - 40));
  rc_clearAlpha += rc_clearFadeAmt;
  if (rc_clearAlpha <= 0 || rc_clearAlpha >= 255) rc_clearFadeAmt *= -1;
  rc_clearAlpha = constrain(rc_clearAlpha, 0, 255);
  fill(255, rc_clearAlpha); textSize(rcs(18));
  text('PRESS ANY KEY OR CLICK TO CONTINUE', rcx(RC_SRC/2), rcy(RC_SRC/2 + 40));
  pop();
}
function rc_drawExplosionScreen() {
  push();
  textFont("monospace");
  fill(0, 180); rectMode(CORNER); rect(rcx(0), rcy(0), rcs(RC_SRC), rcs(RC_SRC));
  fill(255, 70, 70); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(rcs(42));
  text('쓰레기통 폭발!', rcx(RC_SRC/2), rcy(RC_SRC/2 - 40));
  fill(255); textSize(rcs(20));
  text('분리수거 실패', rcx(RC_SRC/2), rcy(RC_SRC/2));
  rc_failAlpha += rc_failFadeAmt;
  if (rc_failAlpha <= 0 || rc_failAlpha >= 255) rc_failFadeAmt *= -1;
  rc_failAlpha = constrain(rc_failAlpha, 0, 255);
  fill(255, rc_failAlpha); textSize(rcs(18));
  text('PRESS ANY KEY OR CLICK TO RETRY', rcx(RC_SRC/2), rcy(RC_SRC/2 + 80));
  pop();
}

// ── 입력 ──
function recycleKeyPressed() {
  if (rc_state === 'tutorial') { startActualRecycleGame(); return; }
  if (rc_state === 'explode')  { startActualRecycleGame(); return; }  // 튜토리얼 없이 재시작
  if (rc_state === 'clear')    { recycleComplete(); return; }
}
function recycleMousePressed() {
  if (rc_state === 'tutorial') {
    const { bx, by, bw, bh } = rc_tutBtnRect();
    if (rcInRect(mouseX, mouseY, bx, by, bw, bh)) startActualRecycleGame();
    return;
  }
  if (rc_state === 'explode') startActualRecycleGame();
  else if (rc_state === 'clear') recycleComplete();
}

function recycleComplete() {
  solvedCount = 2;
  gameState = 'room';
  roomReenterAfterMinigame();
}

function rcInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}