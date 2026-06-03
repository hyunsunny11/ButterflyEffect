// 나비효과 게임 — 최종 엔딩: 클리어 (scenes/endings/clear.js)
// 모든 단계(solvedCount===6) 완료 후 현관문으로 나갈 때 엔딩.
// 팀원 제작 sketch.js(인스턴스 모드) → 전역 모드로 변환.
//   - new p5(function(p){...}) 제거, p.xxx → xxx
//   - W/H/CX/CY/R 등 변수에 cl_ 접두사 (전역 충돌 방지)
//   - createCanvas/noSmooth/pixelDensity 제거 (main.js에서 처리)
//   - ★ loadPixels/updatePixels → 600×600 오프스크린 버퍼(cl_buf)에서 실행
//     (earth.js/desert.js/polarbear.js 패턴과 동일)
//   - rectMode(CORNER) 명시 (main.js의 rectMode(CENTER) 충돌 방지)
//   - keyPressed 원본에 없음 → 추가 (방 처음부터 리스타트)
//   - 키/클릭 → 방 처음부터 리스타트
//
// 씬 함수: enterClearEnding() / updateClearEnding()
//          clearEndingKeyPressed() / clearEndingMousePressed()

const CL_W = 600, CL_H = 600;
const CL_CX = CL_W / 2, CL_CY = CL_H / 2;
const CL_R   = 130;
const CL_PIX = 4;
const CL_GRID = 33;

let cl_stars      = [];
let cl_textAlpha  = 0;
let cl_fadeAmount = 3;
let cl_glowPulse  = 0;
let cl_earthPixels = [];

let cl_buf   = null;
let cl_scale = 1, cl_offX = 0, cl_offY = 0;

/* ── 씬 진입 ── */
function enterClearEnding() {
  cl_scale = GH / CL_H;
  cl_offX  = (GW - CL_W * cl_scale) / 2;
  cl_offY  = 0;

  cl_stars      = [];
  cl_textAlpha  = 0;
  cl_fadeAmount = 3;
  cl_glowPulse  = 0;
  cl_earthPixels = [];

  for (let i = 0; i < 220; i++) {
    cl_stars.push({
      x: random(CL_W), y: random(CL_H),
      sz: random([1, 1, 1, 2, 2]),
      blink: random(255),
      speed: random(0.5, 2)
    });
  }

  cl_buildEarth();

  if (!cl_buf) {
    cl_buf = createGraphics(CL_W, CL_H);
    cl_buf.noSmooth();
    cl_buf.pixelDensity(1);
    cl_buf.textFont('monospace');
  }
}

/* ── 매 프레임 ── */
function updateClearEnding() {
  push();
  rectMode(CORNER);   // ★ main.js의 rectMode(CENTER) 충돌 방지

  cl_glowPulse = sin(frameCount * 0.03) * 0.2 + 0.8;

  const g = cl_buf;
  g.background(2, 4, 18);
  g.noStroke();

  cl_drawStars(g);
  cl_drawEarthGlow(g);
  cl_drawEarth(g);        // ★ g.loadPixels() 사용
  cl_drawAtmosphere(g);
  cl_drawTitle(g);
  cl_drawPixelText(g);

  push();
  imageMode(CORNER);
  image(g, cl_offX, cl_offY, CL_W * cl_scale, CL_H * cl_scale);
  pop();

  pop();
}

/* ── 입력 ── */
function clearEndingKeyPressed()   { cl_restart(); }
function clearEndingMousePressed() { cl_restart(); }

function cl_restart() {
  cl_earthPixels = [];
  gameState = 'room';
  enterRoom();
}

// ─────────────── 지구 데이터 ───────────────

function cl_buildEarth() {
  const landCells = new Set();
  cl_addBlob(landCells, -4, -8,  10, 14);
  cl_addBlob(landCells, -2, -18,  6,  8);
  cl_addBlob(landCells, -18,-12,  8, 22);
  cl_addBlob(landCells, -16, 10,  6, 10);
  cl_addBlob(landCells,  4, -16, 16, 12);
  cl_addBlob(landCells,  6,  -4, 10,  8);
  cl_addBlob(landCells, 12,   8,  8,  6);
  cl_addBlob(landCells, -14, 22, 28,  6);

  for (let gx = -CL_GRID; gx <= CL_GRID; gx++) {
    for (let gy = -CL_GRID; gy <= CL_GRID; gy++) {
      const d     = sqrt(gx*gx + gy*gy);
      const rGrid = CL_R / CL_PIX;
      if (d <= rGrid - 0.5) {
        const key    = `${gx},${gy}`;
        const isLand = landCells.has(key);
        cl_earthPixels.push({ gx, gy, type: isLand ? 'land' : 'ocean' });
      }
    }
  }
}

function cl_addBlob(set, x0, y0, w, h) {
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      const nx = x0 + dx + floor(sin(dx * 0.9 + dy * 0.7) * 2);
      const ny = y0 + dy + floor(cos(dy * 0.8 + dx * 0.5) * 2);
      set.add(`${nx},${ny}`);
    }
  }
}

// ─────────────── 그리기 함수 (모두 버퍼 g 에 그림) ───────────────

function cl_drawStars(g) {
  g.noStroke();
  for (let s of cl_stars) {
    s.blink += s.speed;
    const alpha = 150 + sin(s.blink * 0.05) * 105;
    g.fill(200, 220, 255, alpha);
    g.rect(floor(s.x), floor(s.y), s.sz, s.sz);
  }
}

function cl_drawEarthGlow(g) {
  g.noStroke();
  for (let i = 5; i > 0; i--) {
    const gr = CL_R + 6 + i * 10;
    const ga = (6 - i) * 8 * cl_glowPulse;
    g.fill(60, 180, 100, ga);
    g.ellipse(CL_CX, CL_CY, gr * 2, gr * 2);
  }
}

function cl_drawEarth(g) {
  // ★ g.loadPixels() — 버퍼에서 픽셀 직접 조작
  g.loadPixels();
  const t = frameCount * 0.006;

  for (let ep of cl_earthPixels) {
    const px = CL_CX + ep.gx * CL_PIX;
    const py = CL_CY + ep.gy * CL_PIX;
    let r, gr, b;

    if (ep.type === 'ocean') {
      const vary = noise(ep.gx * 0.12 + t * 0.4, ep.gy * 0.12) * 255;
      if      (vary > 200) { r = 40;  gr = 120; b = 200; }
      else if (vary > 130) { r = 20;  gr = 80;  b = 160; }
      else                 { r = 10;  gr = 40;  b = 100; }
    } else {
      const vary = noise(ep.gx * 0.15 + t * 0.2, ep.gy * 0.15 + 100);
      if      (vary > 0.68) { r = 80; gr = 200; b = 90; }
      else if (vary > 0.50) { r = 50; gr = 140; b = 60; }
      else                  { r = 30; gr = 90;  b = 40; }
    }

    for (let dy = 0; dy < CL_PIX; dy++) {
      const yCoord = py + dy;
      if (yCoord < 0 || yCoord >= CL_H) continue;
      for (let dx = 0; dx < CL_PIX; dx++) {
        const xCoord = px + dx;
        if (xCoord < 0 || xCoord >= CL_W) continue;
        let idx = (yCoord * CL_W + xCoord) * 4;
        g.pixels[idx]   = r;
        g.pixels[idx+1] = gr;
        g.pixels[idx+2] = b;
        g.pixels[idx+3] = 255;
      }
    }
  }
  g.updatePixels();
}

function cl_drawAtmosphere(g) {
  g.noStroke();
  for (let a = 0; a < TWO_PI; a += 0.04) {
    const ar = CL_R + 4;
    const ax = CL_CX + cos(a) * ar;
    const ay = CL_CY + sin(a) * ar;
    g.fill(100, 200, 140, 60);
    g.rect(floor(ax/CL_PIX)*CL_PIX, floor(ay/CL_PIX)*CL_PIX, CL_PIX, CL_PIX);
  }
}

function cl_drawTitle(g) {
  g.noStroke();
  g.textAlign(CENTER, TOP); g.textStyle(BOLD); g.textSize(30);
  g.fill(0, 60, 20, 200);
  g.text('CLEAR! 당신은 진정한 영웅입니다', CL_W / 2 + 3, 40 + 3);
  g.fill(140, 240, 160);
  g.text('CLEAR! 당신은 진정한 영웅입니다', CL_W / 2, 40);
}

function cl_drawPixelText(g) {
  cl_textAlpha += cl_fadeAmount;
  if (cl_textAlpha < 0 || cl_textAlpha > 255) cl_fadeAmount *= -1;
  cl_textAlpha = constrain(cl_textAlpha, 0, 255);
  g.noStroke(); g.textSize(18); g.textAlign(CENTER, CENTER); g.textStyle(BOLD);
  g.fill(0, 60, 20, cl_textAlpha * 0.6);
  g.text('PRESS ANY KEY OR CLICK TO PLAY AGAIN', CL_W / 2 + 2, CL_H - 72 + 2);
  g.fill(140, 240, 160, cl_textAlpha);
  g.text('PRESS ANY KEY OR CLICK TO PLAY AGAIN', CL_W / 2, CL_H - 72);
}