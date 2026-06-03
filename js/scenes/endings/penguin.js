// 나비효과 게임 - 엔딩: 펭귄 단결 (scenes/endings/penguin.js)
// 1단계(싱크대만 잠그고 분리수거 안 하고 현관문으로 나감) 엔딩.
// 팀원 제작 엔딩 sketch.js를 우리 구조에 맞게 변환.
//   - 인스턴스 모드 → 전역 모드, 변수 pg_ 접두사
//   - 600x600 오프스크린 버퍼(peng_buf)에 그린 뒤 게임 화면에 스케일해서 올림
//   - 키/클릭 → 방 처음부터 리스타트
//
// 씬 함수: enterPenguinEnding() / updatePenguinEnding()
//          / penguinEndingKeyPressed() / penguinEndingMousePressed()

const PG_W = 600, PG_H = 600, PG_PIX = 4;
let peng_buf = null;
let pg_textAlpha = 0, pg_fadeAmount = 3, pg_t = 0;
let pg_snow = [];
let pg_scale = 1, pg_offX = 0, pg_offY = 0;

function enterPenguinEnding() {
  pg_scale = GH / PG_H;
  pg_offX = (GW - PG_W * pg_scale) / 2;
  pg_offY = 0;

  if (!peng_buf) {
    peng_buf = createGraphics(PG_W, PG_H);
    peng_buf.noSmooth();
    peng_buf.pixelDensity(1);
    peng_buf.textFont('monospace');
  }
  pg_snow = [];
  for (let i = 0; i < 50; i++) pg_snow.push(pg_makeSnow(true));
  pg_textAlpha = 0;
  pg_fadeAmount = 3;
  // 정적 배경을 별도 버퍼에 1회 렌더
  pg_renderStaticBg();
}

let peng_bg = null;
function pg_makeSnow(init) {
  return {
    x: random(PG_W),
    y: init ? random(PG_H) : random(-20, 0),
    vy: random(0.3, 0.8), vx: random(-0.2, 0.2),
    sz: floor(random(1, 3)) * PG_PIX,
    alpha: floor(random(140, 220)),
  };
}

function pg_renderStaticBg() {
  if (!peng_bg) { peng_bg = createGraphics(PG_W, PG_H); peng_bg.noSmooth(); }
  const pg = peng_bg;
  pg.noStroke();
  // 하늘
  for (let y = 0; y < PG_H; y += PG_PIX) {
    const ratio = y / PG_H;
    pg.fill(floor(lerp(80,140,ratio)), floor(lerp(120,175,ratio)), floor(lerp(170,210,ratio)));
    pg.rect(0, y, PG_W, PG_PIX);
  }
  // 눈 쌓인 땅
  for (let x = 0; x < PG_W; x += PG_PIX) {
    for (let y = 460; y < PG_H; y += PG_PIX) {
      const shade = noise(x * 0.03, y * 0.03);
      const b = floor(210 + shade * 40);
      pg.fill(b, b, floor(b * 1.04));
      pg.rect(x, y, PG_PIX, PG_PIX);
    }
  }
  // 땅 표면
  for (let x = 0; x < PG_W; x += PG_PIX) {
    const surf = 460 + floor(noise(x * 0.04) * 8);
    pg.fill(240, 245, 255);
    pg.rect(x, surf, PG_PIX, PG_PIX * 2);
  }
  // 산
  for (let x = 0; x < PG_W; x += PG_PIX) {
    const mh = 320 + noise(x * 0.012) * 110;
    for (let y = mh; y < 460; y += PG_PIX) {
      const shade = noise(x * 0.015, y * 0.015);
      pg.fill(floor(lerp(180,220,shade)), floor(lerp(200,235,shade)), floor(lerp(225,252,shade)), 130);
      pg.rect(x, y, PG_PIX, PG_PIX);
    }
  }
}

function updatePenguinEnding() {
  const g = peng_buf;
  pg_t = frameCount;
  g.image(peng_bg, 0, 0);
  pg_drawSnow(g);
  pg_drawPenguins(g);
  pg_drawTitle(g);
  pg_drawPixelText(g);

  push();
  imageMode(CORNER);
  image(g, pg_offX, pg_offY, PG_W * pg_scale, PG_H * pg_scale);
  pop();
}

function pg_drawSnow(g) {
  g.noStroke();
  for (let i = 0; i < pg_snow.length; i++) {
    const s = pg_snow[i];
    s.x += s.vx; s.y += s.vy;
    g.fill(240, 245, 255, s.alpha);
    g.rect(floor(s.x/PG_PIX)*PG_PIX, floor(s.y/PG_PIX)*PG_PIX, s.sz, s.sz);
    if (s.y > 465) pg_snow[i] = pg_makeSnow(false);
  }
}

function pg_drawPenguins(g) {
  pg_penguin(g, 130, false, 0.0, 'trashbag');
  pg_penguin(g, 300, true, 1.2, 'none');
  pg_penguin(g, 470, false, 2.4, 'trashbag');
}

function pg_PE(g, cx, cy, rw, rh, col) {
  g.fill(col[0], col[1], col[2], col[3] !== undefined ? col[3] : 255);
  for (let gx = -rw; gx <= rw; gx += PG_PIX)
    for (let gy = -rh; gy <= rh; gy += PG_PIX)
      if ((gx*gx)/(rw*rw) + (gy*gy)/(rh*rh) <= 1.0)
        g.rect(floor((cx+gx)/PG_PIX)*PG_PIX, floor((cy+gy)/PG_PIX)*PG_PIX, PG_PIX, PG_PIX);
}

function pg_penguin(g, cx, hasSign, offset, headItem) {
  g.noStroke();
  const groundY = 462;
  const sway = sin(pg_t * 0.04 + offset) * 3;
  const bob = sin(pg_t * 0.06 + offset) * 2;
  const bx = cx + sway;
  const bodyBot = groundY - PG_PIX * 8;
  const bodyH = 76, bodyTop = bodyBot - bodyH, bodyCY = bodyBot - bodyH / 2;
  let armRaise = 0;
  if (hasSign) armRaise = -((sin(pg_t * 0.08 + offset) + 1) / 2) * 32;

  // 발
  g.fill(255, 155, 15);
  g.rect(floor((bx-26)/PG_PIX)*PG_PIX, floor((groundY-PG_PIX*2)/PG_PIX)*PG_PIX, PG_PIX*10, PG_PIX*3.5);
  g.rect(floor((bx+6)/PG_PIX)*PG_PIX, floor((groundY-PG_PIX*2)/PG_PIX)*PG_PIX, PG_PIX*10, PG_PIX*3.5);
  // 다리
  g.fill(230, 135, 10);
  g.rect(floor((bx-18)/PG_PIX)*PG_PIX, floor((groundY-PG_PIX*8)/PG_PIX)*PG_PIX, PG_PIX*6, PG_PIX*7);
  g.rect(floor((bx+4)/PG_PIX)*PG_PIX, floor((groundY-PG_PIX*8)/PG_PIX)*PG_PIX, PG_PIX*6, PG_PIX*7);
  // 몸통/배
  pg_PE(g, bx, bodyCY + bob, 56, 44, [28,28,33]);
  pg_PE(g, bx, bodyCY + 12 + bob, 44, 34, [235,238,242]);
  // 날개
  if (hasSign) {
    pg_PE(g, bx - 56, bodyCY - 4 + bob + armRaise, 16, 28, [28,28,33]);
    pg_PE(g, bx + 54, bodyCY + bob, 16, 30, [28,28,33]);
  } else {
    pg_PE(g, bx - 54, bodyCY + bob, 16, 30, [28,28,33]);
    pg_PE(g, bx + 54, bodyCY + bob, 16, 30, [28,28,33]);
  }
  // 머리
  const headCY = bodyTop - 8 + bob;
  pg_PE(g, bx, headCY, 40, 32, [28,28,33]);
  // 머리 위 아이템
  if (headItem === 'trashbag') pg_trashBag(g, bx, headCY - 32 - 58);
  // 눈
  pg_PE(g, bx - 16, headCY - 6, 10, 9, [240,240,245]);
  pg_PE(g, bx + 16, headCY - 6, 10, 9, [240,240,245]);
  g.fill(10, 10, 15);
  g.rect(floor((bx-18)/PG_PIX)*PG_PIX, floor((headCY-9)/PG_PIX)*PG_PIX, PG_PIX*3, PG_PIX*3);
  g.rect(floor((bx+13)/PG_PIX)*PG_PIX, floor((headCY-9)/PG_PIX)*PG_PIX, PG_PIX*3, PG_PIX*3);
  g.fill(255);
  g.rect(floor((bx-17)/PG_PIX)*PG_PIX, floor((headCY-10)/PG_PIX)*PG_PIX, PG_PIX, PG_PIX);
  g.rect(floor((bx+14)/PG_PIX)*PG_PIX, floor((headCY-10)/PG_PIX)*PG_PIX, PG_PIX, PG_PIX);
  // 부리
  g.fill(255, 185, 30);
  g.rect(floor((bx-6)/PG_PIX)*PG_PIX, floor((headCY+2)/PG_PIX)*PG_PIX, PG_PIX*9, PG_PIX*4);
  g.fill(220, 150, 20);
  g.rect(floor((bx-6)/PG_PIX)*PG_PIX, floor((headCY+4)/PG_PIX)*PG_PIX, PG_PIX*9, PG_PIX*2);
  // 팻말
  if (hasSign) pg_sign(g, bx - 56, bodyCY - 4 + bob + armRaise);
}

function pg_sign(g, handX, handY) {
  g.noStroke();
  const hx = floor(handX/PG_PIX)*PG_PIX, hy = floor(handY/PG_PIX)*PG_PIX;
  const sw = 132, sh = 80;
  const signLeft = hx - sw/2 + PG_PIX*2, signTop = hy - 110;
  g.fill(140, 100, 55);
  for (let y = signTop; y < hy + PG_PIX*6; y += PG_PIX) g.rect(hx, y, PG_PIX*4, PG_PIX);
  g.fill(250, 250, 246); g.rect(signLeft, signTop, sw, sh);
  g.fill(215, 35, 35);
  g.rect(signLeft, signTop, sw, PG_PIX*3);
  g.rect(signLeft, signTop + sh - PG_PIX*3, sw, PG_PIX*3);
  g.rect(signLeft, signTop, PG_PIX*3, sh);
  g.rect(signLeft + sw - PG_PIX*3, signTop, PG_PIX*3, sh);
  g.textAlign(CENTER, CENTER); g.textStyle(BOLD);
  g.fill(210, 30, 30);
  g.textSize(17); g.text('쓰레기 투기', hx + PG_PIX*2, signTop + sh*0.35);
  g.textSize(24); g.text('X', hx + PG_PIX*2, signTop + sh*0.72);
}

function pg_trashBag(g, cx, topY) {
  g.noStroke();
  g.fill(200, 90, 5);
  g.rect(floor((cx-4)/PG_PIX)*PG_PIX, floor(topY/PG_PIX)*PG_PIX, PG_PIX*8, PG_PIX*3);
  g.fill(180, 75, 5);
  g.rect(floor((cx-8)/PG_PIX)*PG_PIX, floor((topY+PG_PIX*2)/PG_PIX)*PG_PIX, PG_PIX*4, PG_PIX*2);
  g.rect(floor((cx+4)/PG_PIX)*PG_PIX, floor((topY+PG_PIX*2)/PG_PIX)*PG_PIX, PG_PIX*4, PG_PIX*2);
  g.fill(210, 100, 8);
  for (let gx = -8; gx <= 8; gx += PG_PIX)
    g.rect(floor((cx+gx)/PG_PIX)*PG_PIX, floor((topY+PG_PIX*4)/PG_PIX)*PG_PIX, PG_PIX, PG_PIX*4);
  const bagTop = topY + PG_PIX*7, bagH = 48;
  for (let gy = 0; gy < bagH; gy += PG_PIX) {
    const ry = gy / bagH;
    const halfW = floor(sin(ry * PI) * 22 + 6);
    for (let gx = -halfW; gx <= halfW; gx += PG_PIX) {
      const shade = noise(gx * 0.12, gy * 0.10 + 30);
      const isEdge = abs(gx) >= halfW - PG_PIX*2;
      g.fill(
        floor(lerp(isEdge?190:235, isEdge?215:255, shade)),
        floor(lerp(isEdge?90:130, isEdge?110:155, shade)),
        floor(lerp(isEdge?5:15, isEdge?15:30, shade))
      );
      g.rect(floor((cx+gx)/PG_PIX)*PG_PIX, floor((bagTop+gy)/PG_PIX)*PG_PIX, PG_PIX, PG_PIX);
    }
  }
}

function pg_drawTitle(g) {
  g.noStroke(); g.textAlign(CENTER, TOP); g.textStyle(BOLD); g.textSize(23);
  g.fill(0, 30, 80, 200); g.text('쓰레기가 범람하자, 펭귄들은 단결했습니다', PG_W/2 + 2, 42);
  g.fill(220, 240, 255); g.text('쓰레기가 범람하자, 펭귄들은 단결했습니다', PG_W/2, 40);
}
function pg_drawPixelText(g) {
  pg_textAlpha += pg_fadeAmount;
  if (pg_textAlpha < 0 || pg_textAlpha > 255) pg_fadeAmount *= -1;
  pg_textAlpha = constrain(pg_textAlpha, 0, 255);
  g.noStroke(); g.textSize(18); g.textAlign(CENTER, CENTER); g.textStyle(BOLD);
  g.fill(0, 30, 80, pg_textAlpha * 0.6); g.text('PRESS ANY KEY OR CLICK TO CONTINUE', PG_W/2 + 2, PG_H - 70);
  g.fill(200, 230, 255, pg_textAlpha); g.text('PRESS ANY KEY OR CLICK TO CONTINUE', PG_W/2, PG_H - 72);
}

// ── 입력: 키/클릭 → 방 처음부터 리스타트 ──
function penguinEndingKeyPressed() { pg_restart(); }
function penguinEndingMousePressed() { pg_restart(); }
function pg_restart() { gameState = 'room'; enterRoom(1); }