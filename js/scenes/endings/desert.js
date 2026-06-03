// 나비효과 게임 — 엔딩: 사막 (scenes/endings/desert.js)
// TV 단계(solvedCount===4)에서 현관문으로 나갈 때 엔딩.
// 팀원 제작 sketch.js(인스턴스 모드) → 전역 모드로 변환.
//   - new p5(function(p){...}) 제거, p.xxx → xxx
//   - W/H 등 변수에 ds_ 접두사 (전역 충돌 방지)
//   - createCanvas/noSmooth/pixelDensity 제거 (main.js에서 처리)
//   - ★ loadPixels/updatePixels 를 메인 캔버스가 아닌 600×600 오프스크린
//     버퍼(ds_buf)에서 실행 (earth.js의 g.loadPixels 패턴과 동일).
//     translate+scale 후 메인 캔버스 픽셀 인덱스가 어긋나는 문제 방지.
//   - rectMode(CORNER) 명시 (main.js의 rectMode(CENTER) 충돌 방지)
//   - keyPressed 함수가 원본에 없음 → 추가 (방 리스타트)
//   - 키/클릭 → 방 처음부터 리스타트
//
// 씬 함수: enterDesertEnding() / updateDesertEnding()
//          desertEndingKeyPressed() / desertEndingMousePressed()

const DS_W = 600, DS_H = 600;
const DS_PIX = 4;

const DS_STATUE_PIXELS = [];

let ds_stars       = [];
let ds_sandParticles = [];
let ds_textAlpha   = 0;
let ds_fadeAmount  = 3;
let ds_sandCover   = 0;

let ds_buf   = null;   // 600×600 오프스크린 버퍼 (loadPixels 용)
let ds_scale = 1, ds_offX = 0, ds_offY = 0;

/* ── 씬 진입 ── */
function enterDesertEnding() {
  ds_scale = GH / DS_H;
  ds_offX  = (GW - DS_W * ds_scale) / 2;
  ds_offY  = 0;

  ds_stars         = [];
  ds_sandParticles = [];
  ds_textAlpha     = 0;
  ds_fadeAmount    = 3;
  ds_sandCover     = 0;
  DS_STATUE_PIXELS.length = 0;

  for (let i = 0; i < 150; i++) {
    ds_stars.push({
      x: random(DS_W), y: random(DS_H * 0.5),
      sz: random([1, 1, 2]),
      blink: random(255),
      speed: random(0.5, 1.5)
    });
  }

  ds_buildStatue();
  ds_precomputeStatueColors();

  // 버퍼는 최초 1회만 생성
  if (!ds_buf) {
    ds_buf = createGraphics(DS_W, DS_H);
    ds_buf.noSmooth();
    ds_buf.pixelDensity(1);
    ds_buf.textFont('monospace');
  }
}

/* ── 매 프레임 ── */
function updateDesertEnding() {
  push();
  rectMode(CORNER);   // ★ main.js의 rectMode(CENTER) 충돌 방지

  ds_sandCover = min(1, ds_sandCover + 0.002);

  const g = ds_buf;

  // 하늘 배경
  const skyR = floor(lerp(18, 80,  ds_sandCover));
  const skyG = floor(lerp(24, 50,  ds_sandCover));
  const skyB = floor(lerp(50, 15,  ds_sandCover));
  g.background(skyR, skyG, skyB);
  g.noStroke();

  ds_drawStars(g);
  ds_drawSun(g);
  ds_drawGround(g);       // loadPixels → g.loadPixels
  ds_drawStatue(g);
  ds_spawnSand();
  ds_updateSand();
  ds_drawSand(g);
  ds_drawSandAccumulation(g);  // loadPixels → g.loadPixels
  ds_drawTitle(g);
  ds_drawPixelText(g);

  // 버퍼를 게임 화면에 스케일해서 배치
  push();
  imageMode(CORNER);
  image(g, ds_offX, ds_offY, DS_W * ds_scale, DS_H * ds_scale);
  pop();

  pop();
}

/* ── 입력 ── */
function desertEndingKeyPressed()   { ds_restart(); }
function desertEndingMousePressed() { ds_restart(); }

function ds_restart() {
  ds_sandCover     = 0;
  ds_sandParticles = [];
  ds_textAlpha     = 0;
  gameState = 'room';
  enterRoom();
}

// ─────────────── 석탑 데이터 ───────────────

function ds_buildStatue() {
  const cells = [
    ...ds_rectCells(0,  -58, 1, 2, 'stone'),
    ...ds_rectCells(-1, -56, 3, 2, 'stone'),
    ...ds_rectCells(-2, -54, 5, 2, 'stone'),
    ...ds_rectCells(-2, -52, 5, 3, 'stone'),
    ...ds_rectCells(-2, -49, 5, 3, 'stone'),
    ...ds_rectCells(-3, -49, 7, 1, 'roof'),
    ...ds_rectCells(-3, -45, 7, 3, 'stone'),
    ...ds_rectCells(-4, -45, 9, 1, 'roof'),
    ...ds_rectCells(-4, -41, 9, 3, 'stone'),
    ...ds_rectCells(-5, -41, 11, 1, 'roof'),
    ...ds_rectCells(-5, -37, 11, 3, 'stone'),
    ...ds_rectCells(-6, -37, 13, 1, 'roof'),
    ...ds_rectCells(-6, -33, 13, 3, 'stone'),
    ...ds_rectCells(-7, -33, 15, 1, 'roof'),
    ...ds_rectCells(-7, -29, 15, 3, 'stone'),
    ...ds_rectCells(-8, -29, 17, 1, 'roof'),
    ...ds_rectCells(-8, -25, 17, 4, 'stone'),
    ...ds_rectCells(-9, -25, 19, 1, 'roof'),
    ...ds_rectCells(-9, -20, 19, 4, 'stone'),
    ...ds_rectCells(-10, -20, 21, 1, 'roof'),
    ...ds_rectCells(-10, -15, 21, 5, 'stone'),
    ...ds_rectCells(-11, -15, 23, 1, 'roof'),
    ...ds_rectCells(-12, -9, 25, 4, 'base'),
    ...ds_rectCells(-14, -5, 29, 4, 'base'),
    ...ds_rectCells(-16, -1, 33, 5, 'base'),
    ...ds_rectCells(-18, 4, 37, 3, 'ground'),
  ];
  for (let c of cells) DS_STATUE_PIXELS.push(c);
}

function ds_rectCells(x, y, w, h, type) {
  const cells = [];
  for (let dx = 0; dx < w; dx++)
    for (let dy = 0; dy < h; dy++)
      cells.push({ gx: x + dx, gy: y + dy, type });
  return cells;
}

function ds_precomputeStatueColors() {
  for (let sp of DS_STATUE_PIXELS) {
    let r, g, b;
    switch (sp.type) {
      case 'roof': {
        const sh = noise(sp.gx * 0.3, sp.gy * 0.2);
        r = floor(80  + sh * 25); g = floor(85  + sh * 25); b = floor(95  + sh * 25);
        break;
      }
      case 'stone': {
        const sh = noise(sp.gx * 0.4, sp.gy * 0.4);
        r = floor(190 + sh * 40); g = floor(180 + sh * 38); b = floor(165 + sh * 35);
        break;
      }
      case 'base': {
        const sh = noise(sp.gx * 0.2, sp.gy * 0.2);
        r = floor(160 + sh * 35); g = floor(150 + sh * 32); b = floor(135 + sh * 28);
        break;
      }
      case 'ground': {
        const sh = noise(sp.gx * 0.2, sp.gy * 0.2);
        r = floor(130 + sh * 25); g = floor(122 + sh * 22); b = floor(108 + sh * 20);
        break;
      }
      default: r = 160; g = 150; b = 135;
    }
    sp.baseR = r; sp.baseG = g; sp.baseB = b;
  }
}

// ─────────────── 그리기 함수 (모두 버퍼 g 에 그림) ───────────────

function ds_drawStars(g) {
  g.noStroke();
  const starAlpha = floor(lerp(180, 0, ds_sandCover * 2));
  if (starAlpha <= 0) return;
  for (let s of ds_stars) {
    s.blink += s.speed;
    const alpha = min(starAlpha, 100 + sin(s.blink * 0.05) * 80);
    g.fill(255, 240, 200, alpha);
    g.rect(floor(s.x/DS_PIX)*DS_PIX, floor(s.y/DS_PIX)*DS_PIX, s.sz, s.sz);
  }
}

function ds_drawSun(g) {
  g.noStroke();
  const sunX = 480, sunY = 160, sunR = 30;
  const alpha = floor(lerp(40, 120, ds_sandCover));
  for (let i = 4; i > 0; i--) {
    g.fill(220, 160, 60, floor(alpha * 0.4 * i));
    g.ellipse(sunX, sunY, (sunR + i*14)*2, (sunR + i*14)*2);
  }
  for (let gx = -sunR; gx <= sunR; gx += DS_PIX) {
    for (let gy = -sunR; gy <= sunR; gy += DS_PIX) {
      if (gx*gx + gy*gy <= sunR*sunR) {
        const r = floor(lerp(255, 220, ds_sandCover));
        const gr = floor(lerp(230, 150, ds_sandCover));
        const b  = floor(lerp(150, 40,  ds_sandCover));
        g.fill(r, gr, b, 200);
        g.rect(sunX + gx, sunY + gy, DS_PIX, DS_PIX);
      }
    }
  }
}

function ds_drawGround(g) {
  // ★ g.loadPixels() — 버퍼에서 직접 픽셀 조작 (메인 캔버스 scale과 충돌 없음)
  g.loadPixels();
  for (let x = 0; x < DS_W; x += DS_PIX) {
    const groundY = 430 + floor(noise(x * 0.015) * 20);
    let startY = floor(groundY / DS_PIX) * DS_PIX;
    for (let y = startY; y < DS_H; y += DS_PIX) {
      const wave = noise(x * 0.02, y * 0.02);
      const r = floor(lerp(150, 200, wave));
      const gr = floor(lerp(100, 150, wave));
      const b  = floor(lerp(30,  70,  wave));
      for (let dy = 0; dy < DS_PIX; dy++) {
        if (y + dy >= DS_H) break;
        for (let dx = 0; dx < DS_PIX; dx++) {
          if (x + dx >= DS_W) break;
          let idx = ((y + dy) * DS_W + (x + dx)) * 4;
          g.pixels[idx]   = r;
          g.pixels[idx+1] = gr;
          g.pixels[idx+2] = b;
          g.pixels[idx+3] = 255;
        }
      }
    }
  }
  g.updatePixels();
}

function ds_drawStatue(g) {
  g.noStroke();
  const CX = 300, CY = 390;
  const statueBottomGy = 7, statueTopGy = -58;
  const sandLineGy = lerp(statueBottomGy, statueTopGy - 4, ds_sandCover);

  for (let sp of DS_STATUE_PIXELS) {
    if (sp.gy > sandLineGy) continue;
    const px = CX + sp.gx * DS_PIX;
    const py = CY + sp.gy * DS_PIX;
    let r = sp.baseR, gr = sp.baseG, b = sp.baseB;

    const distToSand = sandLineGy - sp.gy;
    if (distToSand < 8) {
      const blend = pow(1 - distToSand / 8, 2);
      const wave = noise(px * 0.02, (CY + sandLineGy * DS_PIX) * 0.02);
      const sr = floor(lerp(150, 200, wave));
      const sg = floor(lerp(100, 150, wave));
      const sb = floor(lerp(30,  70,  wave));
      r  = floor(lerp(r,  sr, blend));
      gr = floor(lerp(gr, sg, blend));
      b  = floor(lerp(b,  sb, blend));
    }
    g.fill(r, gr, b);
    g.rect(px, py, DS_PIX, DS_PIX);
  }
}

function ds_spawnSand() {
  const count = floor(4 + ds_sandCover * 12);
  for (let i = 0; i < count; i++) {
    const side = random() > 0.5 ? 1 : -1;
    ds_sandParticles.push({
      x:     side > 0 ? random(DS_W * 0.5, DS_W) : random(0, DS_W * 0.5),
      y:     random(DS_H * 0.3, DS_H * 0.85),
      vx:    side * random(1.5, 4.0),
      vy:    random(-0.5, 0.5),
      life:  random(30, 80),
      sz:    floor(random(1, 3)) * DS_PIX,
      alpha: floor(random(100, 200))
    });
  }
}

function ds_updateSand() {
  for (let i = ds_sandParticles.length - 1; i >= 0; i--) {
    const s = ds_sandParticles[i];
    s.x += s.vx;
    s.y += s.vy + sin(frameCount * 0.05 + i) * 0.3;
    s.life--;
    if (s.life <= 0 || s.x < 0 || s.x > DS_W) ds_sandParticles.splice(i, 1);
  }
}

function ds_drawSand(g) {
  g.noStroke();
  for (let s of ds_sandParticles) {
    const ratio = s.life / 80;
    const wave  = noise(s.x * 0.02, s.y * 0.02);
    const r  = floor(lerp(150, 200, wave));
    const gr = floor(lerp(100, 150, wave));
    const b  = floor(lerp(30,  70,  wave));
    g.fill(r, gr, b, s.alpha * ratio);
    g.rect(floor(s.x/DS_PIX)*DS_PIX, floor(s.y/DS_PIX)*DS_PIX, s.sz, s.sz);
  }
}

function ds_drawSandAccumulation(g) {
  // ★ g.loadPixels() — 버퍼에서 직접 픽셀 조작
  const CX = 300, CY = 390;
  const statueBottomGy = 7, statueTopGy = -58;
  const sandLineGy = lerp(statueBottomGy, statueTopGy - 4, ds_sandCover);
  const sandTopY = CY + sandLineGy * DS_PIX;

  g.loadPixels();
  for (let x = 0; x < DS_W; x += DS_PIX) {
    const distFromCenter = abs(x - CX);
    const heapOffset = max(0, (100 - distFromCenter) * 0.5 * ds_sandCover);
    const duneNoise  = noise(x * 0.025) * 10;
    const surfaceY   = sandTopY - heapOffset + duneNoise;
    let startY = floor(surfaceY / DS_PIX) * DS_PIX;
    if (startY < 0) startY = 0;

    for (let y = startY; y < DS_H; y += DS_PIX) {
      const wave = noise(x * 0.02, y * 0.02);
      const r  = floor(lerp(150, 200, wave));
      const gr = floor(lerp(100, 150, wave));
      const b  = floor(lerp(30,  70,  wave));
      for (let dy = 0; dy < DS_PIX; dy++) {
        if (y + dy >= DS_H) break;
        for (let dx = 0; dx < DS_PIX; dx++) {
          if (x + dx >= DS_W) break;
          let idx = ((y + dy) * DS_W + (x + dx)) * 4;
          g.pixels[idx]   = r;
          g.pixels[idx+1] = gr;
          g.pixels[idx+2] = b;
          g.pixels[idx+3] = 255;
        }
      }
    }
  }
  g.updatePixels();
}

function ds_drawTitle(g) {
  g.noStroke();
  g.textAlign(CENTER, TOP); g.textStyle(BOLD); g.textSize(24);
  g.fill(80, 40, 10, 200);
  g.text('밝고 찬란한 화면이, 끝내 태양을 삼켰습니다', DS_W / 2 + 3, 40 + 3);
  g.fill(240, 200, 120);
  g.text('밝고 찬란한 화면이, 끝내 태양을 삼켰습니다', DS_W / 2, 40);
}

function ds_drawPixelText(g) {
  ds_textAlpha += ds_fadeAmount;
  if (ds_textAlpha < 0 || ds_textAlpha > 255) ds_fadeAmount *= -1;
  ds_textAlpha = constrain(ds_textAlpha, 0, 255);
  g.noStroke(); g.textSize(18); g.textAlign(CENTER, CENTER); g.textStyle(BOLD);
  g.fill(80, 40, 10, ds_textAlpha * 0.6);
  g.text('PRESS ANY KEY OR CLICK TO CONTINUE', DS_W / 2 + 2, DS_H - 72 + 2);
  g.fill(240, 200, 120, ds_textAlpha);
  g.text('PRESS ANY KEY OR CLICK TO CONTINUE', DS_W / 2, DS_H - 72);
}