// 나비효과 게임 — 엔딩: 북극곰 침수 (scenes/endings/polarbear.js)
// 조명 단계(solvedCount===5)에서 현관문으로 나갈 때 엔딩.
// 팀원 제작 sketch.js(인스턴스 모드) → 전역 모드로 변환.
//   - new p5(function(p){...}) 제거, p.xxx → xxx
//   - W/H 변수에 pb_ 접두사 (전역 충돌 방지)
//   - createCanvas/noSmooth/pixelDensity 제거 (main.js에서 처리)
//   - ★ loadPixels/updatePixels 두 곳(drawWater, drawBear) 모두
//     600×600 오프스크린 버퍼(pb_buf)에서 실행 (earth.js/desert.js 패턴 동일).
//     drawBear의 알파블렌딩(pb_buf.pixels 읽기+쓰기)도 같은 버퍼 안에서
//     처리하므로 drawWater가 pb_buf에 쓴 물 색상을 올바르게 읽어 블렌딩함.
//   - drawPixelEllipseAlpha/drawPixelLimbAlpha 에 버퍼 g 인자 추가
//   - moonBuffer(200×200) → pb_moonBuf 로 이름 변경
//   - rectMode(CORNER) 명시 (main.js의 rectMode(CENTER) 충돌 방지)
//   - keyPressed 원본에 없음 → 추가 (방 리스타트)
//   - 키/클릭 → 방 처음부터 리스타트
//
// 씬 함수: enterPolarbearEnding() / updatePolarbearEnding()
//          polarbearEndingKeyPressed() / polarbearEndingMousePressed()

const PB_W = 600, PB_H = 600;
const PB_PIX = 4;

let pb_stars          = [];
let pb_bubbleParticles = [];
let pb_splashParticles = [];
let pb_textAlpha      = 0;
let pb_fadeAmount     = 3;
let pb_waveOffset     = 0;

let pb_sinkY     = 0;
let pb_sinkSpeed = 0.15;
let pb_sunk      = false;

let pb_moonBuf = null;   // 200×200 달 버퍼
let pb_buf     = null;   // 600×600 메인 버퍼 (loadPixels 용)
let pb_scale   = 1, pb_offX = 0, pb_offY = 0;

/* ── 씬 진입 ── */
function enterPolarbearEnding() {
  pb_scale = GH / PB_H;
  pb_offX  = (GW - PB_W * pb_scale) / 2;
  pb_offY  = 0;

  pb_stars           = [];
  pb_bubbleParticles = [];
  pb_splashParticles = [];
  pb_textAlpha       = 0;
  pb_fadeAmount      = 3;
  pb_waveOffset      = 0;
  pb_sinkY           = 0;
  pb_sinkSpeed       = 0.15;
  pb_sunk            = false;

  for (let i = 0; i < 180; i++) {
    pb_stars.push({
      x: random(PB_W), y: random(100, 220),
      sz: random([1, 1, 2]),
      blink: random(255),
      speed: random(0.5, 1.5)
    });
  }

  // 버퍼 최초 1회만 생성
  if (!pb_moonBuf) {
    pb_moonBuf = createGraphics(200, 200);
    pb_moonBuf.noSmooth();
    pb_moonBuf.noStroke();
    pb_createMoonBuffer();
  }
  if (!pb_buf) {
    pb_buf = createGraphics(PB_W, PB_H);
    pb_buf.noSmooth();
    pb_buf.pixelDensity(1);
    pb_buf.textFont('monospace');
  }
}

/* ── 매 프레임 ── */
function updatePolarbearEnding() {
  push();
  rectMode(CORNER);   // ★ main.js의 rectMode(CENTER) 충돌 방지

  pb_waveOffset += 1.2;
  if (!pb_sunk) {
    pb_sinkY     += pb_sinkSpeed;
    pb_sinkSpeed += 0.004;
    if (pb_sinkY > 300) pb_sunk = true;
  }

  const g = pb_buf;
  g.background(4, 8, 20);
  g.noStroke();

  pb_drawStars(g);
  pb_drawMoon(g);
  pb_drawWater(g);        // ★ g.loadPixels() 사용
  pb_drawBear(g);         // ★ g.loadPixels() + 알파블렌딩 g.pixels 읽기
  pb_spawnBubbles();
  pb_updateParticles();
  pb_drawBubbles(g);
  pb_drawSplashes(g);
  pb_drawTitle(g);
  pb_drawPixelText(g);

  // 버퍼를 게임 화면에 스케일해서 배치
  push();
  imageMode(CORNER);
  image(g, pb_offX, pb_offY, PB_W * pb_scale, PB_H * pb_scale);
  pop();

  pop();
}

/* ── 입력 ── */
function polarbearEndingKeyPressed()   { pb_restart(); }
function polarbearEndingMousePressed() { pb_restart(); }

function pb_restart() {
  pb_sinkY     = 0;
  pb_sinkSpeed = 0.15;
  pb_sunk      = false;
  pb_bubbleParticles = [];
  pb_splashParticles = [];
  pb_textAlpha = 0;
  gameState = 'room';
  enterRoom();
}

// ─────────────── 달 버퍼 생성 (1회) ───────────────

function pb_createMoonBuffer() {
  const mb = pb_moonBuf;
  const mr = 36, cx = 100, cy = 100;
  for (let i = 4; i > 0; i--) {
    mb.fill(180, 200, 255, i * 8);
    mb.ellipse(cx, cy, (mr + i*12)*2, (mr + i*12)*2);
  }
  for (let gx = -mr; gx <= mr; gx += PB_PIX) {
    for (let gy = -mr; gy <= mr; gy += PB_PIX) {
      const d = sqrt(gx*gx + gy*gy);
      if (d <= mr) {
        const shade  = noise((gx+mr)*0.08, (gy+mr)*0.08);
        const bright = floor(200 + shade * 55);
        mb.fill(bright, bright, floor(bright * 0.95));
        mb.rect(cx + gx, cy + gy, PB_PIX, PB_PIX);
      }
    }
  }
}

// ─────────────── 그리기 함수 (모두 버퍼 g 에 그림) ───────────────

function pb_drawStars(g) {
  g.noStroke();
  for (let s of pb_stars) {
    s.blink += s.speed;
    const alpha = 130 + sin(s.blink * 0.05) * 100;
    g.fill(200, 220, 255, alpha);
    g.rect(floor(s.x/PB_PIX)*PB_PIX, floor(s.y/PB_PIX)*PB_PIX, s.sz, s.sz);
  }
}

function pb_drawMoon(g) {
  // 달 버퍼를 메인 버퍼에 합성
  g.image(pb_moonBuf, 416, 96);
}

function pb_getWaterLine(x) {
  return 340 + sin((x + pb_waveOffset) * 0.04) * 6
             + sin((x + pb_waveOffset) * 0.09) * 3;
}

function pb_drawWater(g) {
  // ★ g.loadPixels() — 버퍼에서 픽셀 직접 조작
  g.loadPixels();
  for (let x = 0; x < PB_W; x += PB_PIX) {
    for (let y = 340; y < PB_H; y += PB_PIX) {
      const wl = pb_getWaterLine(x);
      if (y >= wl) {
        const depth = (y - wl) / (PB_H - wl);
        const wave  = noise(x * 0.02 + pb_waveOffset * 0.01, y * 0.02);
        const r     = floor(10 + wave * 20);
        const gr    = floor(40 + wave * 40);
        const b     = floor(100 + (1 - depth) * 80 + wave * 30);
        for (let dy = 0; dy < PB_PIX; dy++) {
          if (y + dy >= PB_H) break;
          for (let dx = 0; dx < PB_PIX; dx++) {
            if (x + dx >= PB_W) break;
            let idx = ((y + dy) * PB_W + (x + dx)) * 4;
            g.pixels[idx]   = r;
            g.pixels[idx+1] = gr;
            g.pixels[idx+2] = b;
            g.pixels[idx+3] = 255;
          }
        }
      }
    }
  }
  g.updatePixels();

  // 파도 폼 레이어 (rect 유지 — 렉에 영향 없음)
  g.noStroke();
  for (let x = 0; x < PB_W; x += PB_PIX) {
    const wl   = pb_getWaterLine(x);
    const foam = noise(x * 0.05 + pb_waveOffset * 0.02) > 0.6;
    g.fill(foam ? 180 : 120, foam ? 210 : 170, 255, foam ? 200 : 140);
    g.rect(x, floor(wl/PB_PIX)*PB_PIX, PB_PIX, PB_PIX);
    g.fill(100, 150, 220, 80);
    g.rect(x, floor(wl/PB_PIX)*PB_PIX + PB_PIX, PB_PIX, PB_PIX);
  }
}

function pb_drawBear(g) {
  if (pb_sunk) return;

  g.noStroke();
  const t         = frameCount * 0.03;
  const sway      = sin(t) * 3;
  const struggle  = max(0, 1 - pb_sinkY / 200);
  const bobY      = sin(t * 0.7) * 4 * struggle;

  const bearCX = 300;
  const bearCY = 310 + bobY + pb_sinkY;

  const wl           = pb_getWaterLine(bearCX);
  const submergeRatio = constrain((bearCY - wl) / 120, 0, 1);
  const bearAlpha     = floor(255 * (1 - submergeRatio * 0.85));

  pb_drawEllipse(g, bearCX + sway, bearCY + 30, 52, 28, [200, 200, 195], bearAlpha);

  const kickL = sin(t * 1.3) * 12 * struggle;
  const kickR = sin(t * 1.3 + PI) * 12 * struggle;
  pb_drawLimb(g, bearCX - 20 + sway, bearCY + 48, 10, 22 + kickL, [170, 170, 165], bearAlpha);
  pb_drawLimb(g, bearCX + 20 + sway, bearCY + 48, 10, 22 + kickR, [170, 170, 165], bearAlpha);

  const armSwingL = sin(t * 1.1) * 15 * struggle;
  const armSwingR = sin(t * 1.1 + PI) * 15 * struggle;
  pb_drawEllipse(g, bearCX - 38 + sway, bearCY + 10 + armSwingL, 12, 28, [190, 190, 185], bearAlpha);
  pb_drawEllipse(g, bearCX + 38 + sway, bearCY + 10 + armSwingR, 12, 28, [190, 190, 185], bearAlpha);

  pb_drawEllipse(g, bearCX + sway, bearCY - 10, 44, 38, [210, 210, 205], bearAlpha);

  pb_drawEllipse(g, bearCX - 18 + sway, bearCY - 28, 12, 10, [200, 200, 195], bearAlpha);
  pb_drawEllipse(g, bearCX + 18 + sway, bearCY - 28, 12, 10, [200, 200, 195], bearAlpha);
  pb_drawEllipse(g, bearCX - 18 + sway, bearCY - 28,  6,  5, [180, 160, 155], bearAlpha);
  pb_drawEllipse(g, bearCX + 18 + sway, bearCY - 28,  6,  5, [180, 160, 155], bearAlpha);

  pb_drawEllipse(g, bearCX + sway, bearCY + 4,  22, 14, [190, 185, 178], bearAlpha);
  pb_drawEllipse(g, bearCX + sway, bearCY - 2,  10,  7, [30,  25,  25],  bearAlpha);

  pb_drawEllipse(g, bearCX - 12 + sway, bearCY - 14, 10, 9, [240, 240, 240], bearAlpha);
  pb_drawEllipse(g, bearCX + 12 + sway, bearCY - 14, 10, 9, [240, 240, 240], bearAlpha);

  g.fill(20, 20, 20, bearAlpha);
  g.rect(bearCX - 14 + sway, bearCY - 17, PB_PIX, PB_PIX*2);
  g.rect(bearCX + 10 + sway, bearCY - 17, PB_PIX, PB_PIX*2);
  g.fill(150, 200, 255, floor(180 * (1 - submergeRatio)));
  g.rect(bearCX - 14 + sway, bearCY - 10, PB_PIX, PB_PIX);
  g.rect(bearCX + 10 + sway, bearCY - 10, PB_PIX, PB_PIX);

  const mouthOpen = floor(abs(sin(t * 1.2)) * 3 * struggle) * PB_PIX;
  g.fill(80, 30, 30, bearAlpha);
  g.rect(bearCX - 6 + sway, bearCY + 8, 12, mouthOpen + PB_PIX);

  // ★ 수중 오버레이 알파블렌딩 — g.loadPixels()로 버퍼 내에서 처리
  // drawWater에서 g에 이미 물 색상을 써뒀으므로 g.pixels 읽기가 올바르게 동작함
  g.loadPixels();
  for (let x = bearCX - 80; x < bearCX + 80; x += PB_PIX) {
    if (x < 0 || x >= PB_W) continue;
    const wlx   = pb_getWaterLine(x);
    let startY  = floor(wlx/PB_PIX)*PB_PIX + PB_PIX;
    for (let y = startY; y < bearCY + 70; y += PB_PIX) {
      if (y < 0 || y >= PB_H) continue;
      const depth = (y - wlx) / (PB_H - wlx);
      const wave  = noise(x * 0.02 + pb_waveOffset * 0.01, y * 0.02);
      const r     = floor(10 + wave * 20);
      const gr    = floor(40 + wave * 40);
      const b     = floor(100 + (1 - depth) * 80 + wave * 30);
      for (let dy = 0; dy < PB_PIX; dy++) {
        if (y + dy >= PB_H) break;
        for (let dx = 0; dx < PB_PIX; dx++) {
          if (x + dx >= PB_W) break;
          let idx = ((y + dy) * PB_W + (x + dx)) * 4;
          g.pixels[idx]   = floor(r  * 0.8627 + g.pixels[idx]   * 0.1373);
          g.pixels[idx+1] = floor(gr * 0.8627 + g.pixels[idx+1] * 0.1373);
          g.pixels[idx+2] = floor(b  * 0.8627 + g.pixels[idx+2] * 0.1373);
        }
      }
    }
  }
  g.updatePixels();
}

/* 헬퍼: 타원·사지 그리기 (버퍼 g 인자) */
function pb_drawEllipse(g, cx, cy, rw, rh, col, alpha) {
  g.fill(col[0], col[1], col[2], alpha);
  for (let gx = -rw; gx <= rw; gx += PB_PIX) {
    for (let gy = -rh; gy <= rh; gy += PB_PIX) {
      if ((gx*gx)/(rw*rw) + (gy*gy)/(rh*rh) <= 1.0) {
        g.rect(floor((cx+gx)/PB_PIX)*PB_PIX, floor((cy+gy)/PB_PIX)*PB_PIX, PB_PIX, PB_PIX);
      }
    }
  }
}

function pb_drawLimb(g, cx, cy, w, h, col, alpha) {
  g.fill(col[0], col[1], col[2], alpha);
  for (let gx = -w/2; gx <= w/2; gx += PB_PIX) {
    for (let gy = 0; gy <= h; gy += PB_PIX) {
      g.rect(floor((cx+gx)/PB_PIX)*PB_PIX, floor((cy+gy)/PB_PIX)*PB_PIX, PB_PIX, PB_PIX);
    }
  }
}

function pb_spawnBubbles() {
  if (pb_sunk) return;
  const rate = max(2, floor(8 - pb_sinkY * 0.04));
  if (frameCount % rate === 0) {
    for (let i = 0; i < floor(1 + pb_sinkY * 0.03); i++) {
      const bp = {
        x: random(240, 360), y: random(320, 360) + pb_sinkY,
        vx: random(-0.6, 0.6), vy: random(-1.2, -2.0),
        life: random(40, 90), sz: floor(random(1, 3)) * PB_PIX
      };
      bp.maxLife = bp.life;
      pb_bubbleParticles.push(bp);
    }
  }
  if (frameCount % 15 === 0) {
    for (let i = 0; i < 3; i++) {
      const sx = random(160, 440);
      const sp = {
        x: sx, y: pb_getWaterLine(sx),
        vx: random(-1.5, 1.5), vy: random(-2.0, -0.5),
        life: random(20, 45), sz: PB_PIX
      };
      sp.maxLife = sp.life;
      pb_splashParticles.push(sp);
    }
  }
}

function pb_updateParticles() {
  for (let i = pb_bubbleParticles.length - 1; i >= 0; i--) {
    const b = pb_bubbleParticles[i];
    b.x += b.vx; b.y += b.vy; b.life--;
    if (b.life <= 0) pb_bubbleParticles.splice(i, 1);
  }
  for (let i = pb_splashParticles.length - 1; i >= 0; i--) {
    const s = pb_splashParticles[i];
    s.x += s.vx; s.y += s.vy; s.vy += 0.1; s.life--;
    if (s.life <= 0) pb_splashParticles.splice(i, 1);
  }
}

function pb_drawBubbles(g) {
  g.noStroke();
  for (let b of pb_bubbleParticles) {
    const ratio = b.life / b.maxLife;
    g.fill(180, 220, 255, ratio * 160);
    g.rect(floor(b.x/PB_PIX)*PB_PIX, floor(b.y/PB_PIX)*PB_PIX, b.sz, b.sz);
  }
}

function pb_drawSplashes(g) {
  g.noStroke();
  for (let s of pb_splashParticles) {
    const ratio = s.life / s.maxLife;
    g.fill(180, 210, 255, ratio * 200);
    g.rect(floor(s.x/PB_PIX)*PB_PIX, floor(s.y/PB_PIX)*PB_PIX, PB_PIX, PB_PIX);
  }
}

function pb_drawTitle(g) {
  g.noStroke();
  g.textAlign(CENTER, TOP); g.textStyle(BOLD); g.textSize(22);
  g.fill(10, 40, 90, 200);
  g.text('당신의 불빛이, 그를 영원한 어둠에 빠뜨렸습니다', PB_W / 2 + 3, 40 + 3);
  g.fill(180, 220, 255);
  g.text('당신의 불빛이, 그를 영원한 어둠에 빠뜨렸습니다', PB_W / 2, 40);
}

function pb_drawPixelText(g) {
  pb_textAlpha += pb_fadeAmount;
  if (pb_textAlpha < 0 || pb_textAlpha > 255) pb_fadeAmount *= -1;
  pb_textAlpha = constrain(pb_textAlpha, 0, 255);
  g.noStroke(); g.textSize(18); g.textAlign(CENTER, CENTER); g.textStyle(BOLD);
  g.fill(10, 40, 90, pb_textAlpha * 0.6);
  g.text('PRESS ANY KEY OR CLICK TO CONTINUE', PB_W / 2 + 2, PB_H - 72 + 2);
  g.fill(180, 220, 255, pb_textAlpha);
  g.text('PRESS ANY KEY OR CLICK TO CONTINUE', PB_W / 2, PB_H - 72);
}