// 나비효과 게임 — 엔딩: 싱크홀 (scenes/endings/sinkhole.js)
// 싱크대 + 분리수거(solvedCount===2)를 마치고 현관문으로 나갈 때 엔딩.
// 팀원 제작 sketch.js(인스턴스 모드) → 전역 모드로 변환.
//   - new p5(function(p){...}) 제거, p.xxx → xxx
//   - 600×600 버퍼(sg_bg)에 배경을 캐싱, 게임 화면(GW×GH)에 스케일해서 올림
//     (earth.js의 eg_buf / eg_scale 패턴과 동일)
//   - rectMode(CORNER) 명시 (main.js의 rectMode(CENTER) 충돌 방지)
//   - W/H/PIX 등 변수에 sg_ 접두사 (전역 충돌 방지)
//   - 키/클릭 → 방 처음부터 리스타트
//
// 씬 함수: enterSinkholeEnding() / updateSinkholeEnding()
//          sinkholeEndingKeyPressed() / sinkholeEndingMousePressed()

const SG_W = 600, SG_H = 600;
const SG_PIX = 4;

// 싱크홀 설정
const SG_SHX = 310, SG_SHY = 438;
const SG_SH_RW = 155, SG_SH_RH = 72;

let sg_textAlpha = 0, sg_fadeAmount = 3;
let sg_debrisParticles = [];
let sg_carX = -140;
let sg_carState = 'driving';
let sg_sinkProgress = 0, sg_sinkAmt = 0;

let sg_bg = null;          // 600×600 정적 배경 버퍼
let sg_scale = 1;
let sg_offX = 0, sg_offY = 0;

/* ── 씬 진입 ── */
function enterSinkholeEnding() {
  // 600×600 버퍼를 GH(480)에 맞춰 중앙 배치 (earth.js 패턴과 동일)
  sg_scale = GH / SG_H;
  sg_offX  = (GW - SG_W * sg_scale) / 2;
  sg_offY  = 0;

  sg_textAlpha     = 0;
  sg_fadeAmount    = 3;
  sg_debrisParticles = [];
  sg_carX          = -140;
  sg_carState      = 'driving';
  sg_sinkProgress  = 0;
  sg_sinkAmt       = 0;

  // 정적 배경 버퍼가 없을 때만 생성
  if (!sg_bg) {
    sg_bg = createGraphics(SG_W, SG_H);
    sg_bg.noSmooth();
    sg_bg.noStroke();
    sg_createBackground();
  }
}

/* ── 매 프레임 ── */
function updateSinkholeEnding() {
  push();
  rectMode(CORNER);   // ★ main.js의 rectMode(CENTER) 충돌 방지

  // 자동차 상태 업데이트
  if (sg_carState === 'driving') {
    sg_carX += 1.8;
    if (sg_carX > 248) { sg_carState = 'sinking'; sg_sinkProgress = 0; sg_sinkAmt = 0; }
  }
  if (sg_carState === 'sinking') {
    sg_sinkProgress = min(1, sg_sinkProgress + 0.17);
    sg_sinkAmt += 16;
    sg_spawnDebris(sg_carX, SG_SHY);
    if (sg_sinkAmt > 92) sg_carState = 'gone';
  }

  // 1. 캐싱된 정적 배경
  push();
  imageMode(CORNER);
  image(sg_bg, sg_offX, sg_offY, SG_W * sg_scale, SG_H * sg_scale);
  pop();

  // 2. 동적 요소 (싱크홀, 자동차, 파편, 텍스트) — 버퍼가 아닌 게임 화면에 직접
  // 스케일/오프셋 적용 후 그림
  push();
  translate(sg_offX, sg_offY);
  scale(sg_scale);

  sg_drawSinkhole();
  if (sg_carState !== 'gone') sg_drawCar();
  sg_updateDebris();
  sg_drawDebris();
  sg_drawTitle();
  sg_drawPixelText();

  pop();
  pop();
}

/* ── 입력 ── */
function sinkholeEndingKeyPressed()    { sg_restart(); }
function sinkholeEndingMousePressed()  { sg_restart(); }

function sg_restart() {
  sg_bg = null;           // 다음 진입 시 배경 재생성
  gameState = 'room';
  enterRoom();            // solvedCount=0으로 방 처음부터
}

// ─────────────── 정적 배경 생성 (버퍼에 1회만) ───────────────
function sg_createBackground() {
  const g = sg_bg;

  // 1. 하늘 그라데이션
  for (let y = 0; y < 300; y += SG_PIX) {
    const ratio = y / 300;
    g.fill(
      floor(lerp(45, 70,  ratio)),
      floor(lerp(50, 78,  ratio)),
      floor(lerp(65, 92,  ratio))
    );
    g.rect(0, y, SG_W, SG_PIX);
  }

  // 2. 구름
  const clouds = [
    { x: 80,  y: 75,  w: 110, h: 38 },
    { x: 290, y: 55,  w: 140, h: 45 },
    { x: 490, y: 88,  w: 95,  h: 32 },
    { x: 185, y: 128, w: 115, h: 40 },
    { x: 440, y: 138, w: 100, h: 34 },
  ];
  for (let c of clouds) {
    for (let gx = -c.w; gx <= c.w; gx += SG_PIX) {
      for (let gy = -c.h; gy <= c.h; gy += SG_PIX) {
        if ((gx*gx)/(c.w*c.w) + (gy*gy)/(c.h*c.h) <= 1.0) {
          const edge  = 1 - sqrt((gx*gx)/(c.w*c.w) + (gy*gy)/(c.h*c.h));
          const shade = noise(gx*0.04, gy*0.04 + c.x*0.01);
          g.fill(
            floor(lerp(42, 72, shade)),
            floor(lerp(45, 78, shade)),
            floor(lerp(55, 92, shade)),
            floor(edge * 200)
          );
          g.rect(floor((c.x+gx)/SG_PIX)*SG_PIX, floor((c.y+gy)/SG_PIX)*SG_PIX, SG_PIX, SG_PIX);
        }
      }
    }
  }

  // 3. 건물
  const buildings = [
    { x: 10,  w: 80,  h: 180, col: [105,112,130] },
    { x: 100, w: 60,  h: 140, col: [115,118,138] },
    { x: 170, w: 90,  h: 205, col: [98, 108,125] },
    { x: 390, w: 85,  h: 168, col: [110,115,132] },
    { x: 485, w: 70,  h: 190, col: [102,110,128] },
  ];
  for (let b of buildings) {
    for (let gx = 0; gx < b.w; gx += SG_PIX) {
      for (let gy = 0; gy < b.h; gy += SG_PIX) {
        const shade = noise(gx*0.08, gy*0.08 + b.x*0.04);
        g.fill(
          floor(b.col[0]+shade*18-9),
          floor(b.col[1]+shade*18-9),
          floor(b.col[2]+shade*18-9)
        );
        g.rect(floor((b.x+gx)/SG_PIX)*SG_PIX, floor((300-b.h+gy)/SG_PIX)*SG_PIX, SG_PIX, SG_PIX);
      }
    }
    for (let wx = 8; wx < b.w-8; wx += 18) {
      for (let wy = 12; wy < b.h-12; wy += 22) {
        const lit = noise(b.x+wx*0.3, wy*0.3) > 0.45;
        g.fill(lit ? 210 : 50, lit ? 190 : 52, lit ? 110 : 62, lit ? 210 : 160);
        g.rect(floor((b.x+wx)/SG_PIX)*SG_PIX, floor((300-b.h+wy)/SG_PIX)*SG_PIX, SG_PIX*3, SG_PIX*4);
      }
    }
    g.fill(130, 138, 158);
    for (let gx = 0; gx < b.w; gx += SG_PIX)
      g.rect(floor((b.x+gx)/SG_PIX)*SG_PIX, floor((300-b.h)/SG_PIX)*SG_PIX, SG_PIX, SG_PIX*2);
    for (let gy = 0; gy < b.h; gy += SG_PIX) {
      g.rect(floor(b.x/SG_PIX)*SG_PIX,           floor((300-b.h+gy)/SG_PIX)*SG_PIX, SG_PIX*2, SG_PIX);
      g.rect(floor((b.x+b.w-SG_PIX*2)/SG_PIX)*SG_PIX, floor((300-b.h+gy)/SG_PIX)*SG_PIX, SG_PIX*2, SG_PIX);
    }
  }

  // 4. 도로
  for (let x = 0; x < SG_W; x += SG_PIX) {
    for (let y = 300; y < 345; y += SG_PIX) {
      const shade = noise(x*0.04, y*0.04);
      g.fill(floor(105+shade*14), floor(102+shade*13), floor(96+shade*12));
      g.rect(x, y, SG_PIX, SG_PIX);
    }
  }
  for (let x = 0; x < SG_W; x += SG_PIX) {
    for (let y = 345; y < SG_H; y += SG_PIX) {
      const shade = noise(x*0.03, y*0.03);
      g.fill(floor(44+shade*10), floor(44+shade*10), floor(46+shade*10));
      g.rect(x, y, SG_PIX, SG_PIX);
    }
  }
  for (let x = 0; x < SG_W; x += SG_PIX*14) {
    g.fill(185, 172, 35);
    g.rect(x, floor(435/SG_PIX)*SG_PIX, SG_PIX*9, SG_PIX*2);
  }
  g.fill(165, 165, 160);
  for (let x = 0; x < SG_W; x += SG_PIX) {
    g.rect(x, floor(348/SG_PIX)*SG_PIX, SG_PIX, SG_PIX*2);
    g.rect(x, floor(510/SG_PIX)*SG_PIX, SG_PIX, SG_PIX*2);
  }
}

// ─────────────── 동적 요소 ───────────────

function sg_spawnDebris(x, y) {
  for (let i = 0; i < 10; i++) {
    const d = {
      x: x + random(-60, 60), y,
      vx: random(-3.2, 3.2), vy: random(-5.5, -0.8),
      life: random(35, 85),
      sz: floor(random(1, 4)) * SG_PIX,
      col: random() > 0.5 ? [75,72,68] : [152,137,96]
    };
    d.maxLife = d.life;
    sg_debrisParticles.push(d);
  }
}

function sg_drawSinkhole() {
  noStroke();
  const hx = SG_SHX, hy = SG_SHY;
  const maxRW = SG_SH_RW, maxRH = SG_SH_RH;
  const sp = sg_carState === 'driving' ? 0 : min(1, sg_sinkProgress * 1.6);
  const rw = max(4, floor(maxRW * sp));
  const rh = max(2, floor(maxRH * sp));
  if (rw < 4) return;

  for (let a = 0; a < TWO_PI; a += 0.065) {
    const crackR = rw + noise(a*4, frameCount*0.008) * 36;
    const crackH = rh + noise(a*3, frameCount*0.006) * 14;
    for (let r = rw - 10; r < crackR; r += SG_PIX) {
      const cx = hx + cos(a) * r;
      const cy = hy + sin(a) * crackH / maxRW * r;
      fill(22, 16, 10, floor(map(r, rw-10, crackR, 215, 20)));
      rect(floor(cx/SG_PIX)*SG_PIX, floor(cy/SG_PIX)*SG_PIX, SG_PIX, SG_PIX);
    }
  }
  for (let gx = -rw; gx <= rw; gx += SG_PIX) {
    for (let gy = -rh; gy <= rh; gy += SG_PIX) {
      if ((gx*gx)/(rw*rw) + (gy*gy)/(rh*rh) <= 1.0) {
        const depth = sqrt((gx*gx)/(rw*rw) + (gy*gy)/(rh*rh));
        const shade = noise(gx*0.07, gy*0.07 + 100);
        fill(
          floor(lerp(5,  18, depth) + shade*6),
          floor(lerp(3,  11, depth) + shade*3),
          floor(lerp(2,  7,  depth) + shade*2)
        );
        rect(floor((hx+gx)/SG_PIX)*SG_PIX, floor((hy+gy)/SG_PIX)*SG_PIX, SG_PIX, SG_PIX);
      }
    }
  }
  for (let a = 0; a < TWO_PI; a += 0.05) {
    const er = rw - SG_PIX + noise(a*6, frameCount*0.004) * 22;
    const eh = (rh - SG_PIX + noise(a*5, frameCount*0.005) * 9) * (rh / maxRW);
    for (let dr = 0; dr < 22; dr += SG_PIX) {
      const ex = hx + cos(a) * (er + dr);
      const ey = hy + sin(a) * (eh + dr * 0.4);
      fill(62, 57, 52, floor(map(dr, 0, 22, 245, 30)));
      rect(floor(ex/SG_PIX)*SG_PIX, floor(ey/SG_PIX)*SG_PIX, SG_PIX*2, SG_PIX);
    }
  }
}

function sg_drawCar() {
  noStroke();
  const cx = floor(sg_carX);
  const sp = sg_carState === 'sinking' ? min(1, sg_sinkProgress * 1.6) : 0;
  const rw = max(4, SG_SH_RW * sp);
  const rh = max(2, SG_SH_RH * sp);

  function clip(wx, wy) {
    if (rw < 4) return false;
    return (wx-SG_SHX)*(wx-SG_SHX)/(rw*rw) + (wy-SG_SHY)*(wy-SG_SHY)/(rh*rh) <= 1.0;
  }
  const gndY = SG_SHY + 14;
  function wY(lx, ly) {
    const tilt = sg_carState === 'sinking' ? lx * sg_sinkProgress * 0.32 : 0;
    return gndY + ly + sg_sinkAmt + tilt;
  }
  function dot(lx, ly, r, g, b, a) {
    const wx  = floor((cx + lx) / SG_PIX) * SG_PIX;
    const wy_ = floor(wY(lx, ly) / SG_PIX) * SG_PIX;
    if (clip(wx, wy_)) return;
    if (a !== undefined) fill(r, g, b, a);
    else fill(r, g, b);
    rect(wx, wy_, SG_PIX, SG_PIX);
  }

  const BR = 178, BG = 42, BB = 42;
  const RR = 140, RG = 26, RB = 26;
  const WR = 115, WG = 168, WB = 210;

  // 바퀴
  for (const [wlx, wly] of [[38,-14],[-38,-14]]) {
    const R = 14;
    for (let dx = -R; dx <= R; dx += SG_PIX) {
      for (let dy = -R; dy <= R; dy += SG_PIX) {
        const d2 = dx*dx + dy*dy;
        if (d2 > R*R) continue;
        if (d2 <= 5*5) {
          const sh = noise(dx*0.18+wlx*0.01, dy*0.18);
          dot(wlx+dx, wly+dy, floor(92+sh*22), floor(92+sh*22), floor(104+sh*22));
        } else if (d2 <= 7*7) {
          dot(wlx+dx, wly+dy, 52, 52, 58);
        } else {
          const sh = noise(dx*0.12+wlx*0.01, dy*0.12);
          dot(wlx+dx, wly+dy, floor(14+sh*18), floor(14+sh*18), floor(16+sh*18));
        }
      }
    }
    for (let s = 0; s < 4; s++) {
      const ang = s * HALF_PI + frameCount * 0.02 * (sg_carState === 'driving' ? 1 : 0);
      for (let r = 7; r <= 13; r += SG_PIX) {
        const dx = floor(cos(ang) * r / SG_PIX) * SG_PIX;
        const dy = floor(sin(ang) * r / SG_PIX) * SG_PIX;
        dot(wlx+dx, wly+dy, 68, 68, 78);
      }
    }
  }

  // 차체 하단
  for (let lx = -52; lx <= 52; lx += SG_PIX) {
    for (let ly = -28; ly <= -2; ly += SG_PIX) {
      const fd = (lx-38)*(lx-38) + (ly+14)*(ly+14);
      const rd = (lx+38)*(lx+38) + (ly+14)*(ly+14);
      if (fd < 17*17 || rd < 17*17) continue;
      const sh = noise(lx*0.05, ly*0.05);
      dot(lx, ly, floor(BR+sh*14-7), floor(BG+sh*9-4), floor(BB+sh*9-4));
    }
  }
  for (let lx = -50; lx <= 50; lx += SG_PIX) dot(lx, -2, 92, 14, 14);

  // 보닛 (오른쪽)
  for (let lx = 28; lx <= 54; lx += SG_PIX) {
    const topLY = floor(map(lx, 28, 54, -44, -28));
    for (let ly = topLY; ly <= -28; ly += SG_PIX) {
      const sh = noise(lx*0.05, ly*0.05+10);
      const reflect = ly <= topLY + SG_PIX ? 18 : 0;
      dot(lx, ly, floor(BR+10+sh*12+reflect), floor(BG+sh*7), floor(BB+sh*7));
    }
  }
  // 트렁크 (왼쪽)
  for (let lx = -54; lx <= -28; lx += SG_PIX) {
    const topLY = floor(map(lx, -54, -28, -28, -38));
    for (let ly = topLY; ly <= -28; ly += SG_PIX) {
      const sh = noise(lx*0.05, ly*0.05+10);
      dot(lx, ly, floor(BR-12+sh*12), floor(BG+sh*7), floor(BB+sh*7));
    }
  }

  // 루프
  for (let lx = -28; lx <= 28; lx += SG_PIX) {
    for (let ly = -70; ly <= -28; ly += SG_PIX) {
      const isFW  = lx >= 4  && lx <= 22  && ly >= -66 && ly <= -34;
      const isRW  = lx >= -22 && lx <= -4  && ly >= -66 && ly <= -34;
      const isWS  = lx >= 24 && ly >= -66 && ly <= -34;
      const isRG  = lx <= -24 && ly >= -66 && ly <= -34;
      if (isFW || isRW || isWS || isRG) continue;
      const sh = noise(lx*0.07, ly*0.07+45);
      const isTop = ly <= -66;
      const baseR = isTop ? RR+12 : RR;
      const baseG = isTop ? RG+6  : RG;
      const baseB = isTop ? RB+6  : RB;
      dot(lx, ly, floor(baseR+sh*12-6), floor(baseG+sh*7-3), floor(baseB+sh*7-3));
    }
  }

  // 유리창
  for (let lx = 24; lx <= 28; lx += SG_PIX) {
    const glassTop = floor(map(lx, 28, 24, -34, -66));
    for (let ly = glassTop; ly <= -34; ly += SG_PIX) {
      const sh = noise(lx*0.06, ly*0.06+88);
      dot(lx, ly, floor(WR+sh*18+15), floor(WG+sh*12), floor(WB+sh*8), 215);
    }
  }
  for (let lx = 4; lx <= 22; lx += SG_PIX) {
    for (let ly = -66; ly <= -34; ly += SG_PIX) {
      const sh = noise(lx*0.05, ly*0.05+82);
      dot(lx, ly, floor(WR+sh*16), floor(WG+sh*12), floor(WB+sh*9), 205);
    }
  }
  for (let lx = -22; lx <= -4; lx += SG_PIX) {
    for (let ly = -66; ly <= -34; ly += SG_PIX) {
      const sh = noise(lx*0.05, ly*0.05+82);
      dot(lx, ly, floor(WR-8+sh*14), floor(WG-10+sh*11), floor(WB-5+sh*8), 192);
    }
  }
  for (let lx = -28; lx <= -24; lx += SG_PIX) {
    const glassTop = floor(map(lx, -24, -28, -34, -66));
    for (let ly = glassTop; ly <= -34; ly += SG_PIX) {
      const sh = noise(lx*0.06, ly*0.06+88);
      dot(lx, ly, floor(WR+sh*14), floor(WG+sh*10), floor(WB+sh*7), 200);
    }
  }

  // B필러
  for (let ly = -66; ly <= -34; ly += SG_PIX) {
    dot(-4, ly, RR-8, RG, RB);
    dot( 0, ly, RR-6, RG, RB);
    dot( 4, ly, RR-8, RG, RB);
  }
  // 루프 하단 라인
  for (let lx = -24; lx <= 24; lx += SG_PIX)
    dot(lx, -34, floor(RR+20+noise(lx*0.12)*10), RG+8, RB+8);
  for (let lx = -50; lx <= 50; lx += SG_PIX) {
    const sh = noise(lx*0.08);
    dot(lx, -32, floor(BR-22+sh*8), BG, BB);
  }

  // 전조등
  for (let lx = 46; lx <= 56; lx += SG_PIX) {
    for (let ly = -32; ly <= -20; ly += SG_PIX) dot(lx, ly, 255, 250, 202, 250);
  }
  for (let lx = 44; lx <= 56; lx += SG_PIX) dot(lx, -18, 255, 240, 170, 200);
  for (let lx = 44; lx <= 58; lx += SG_PIX) dot(lx, -34, 50, 10, 10);

  // 후미등
  for (let lx = -56; lx <= -46; lx += SG_PIX) {
    for (let ly = -32; ly <= -20; ly += SG_PIX) dot(lx, ly, 220, 18, 18, 245);
  }
  for (let lx = -58; lx <= -46; lx += SG_PIX) dot(lx, -34, 50, 10, 10);

  // 앞 범퍼
  for (let lx = 52; lx <= 60; lx += SG_PIX) {
    for (let ly = -20; ly <= -6; ly += SG_PIX) {
      const sh = noise(lx*0.06, ly*0.06+20);
      dot(lx, ly, floor(152+sh*16), floor(155+sh*16), floor(164+sh*16));
    }
  }
  for (let ly = -26; ly <= -20; ly += SG_PIX) {
    dot(54, ly, 28, 8, 8); dot(50, ly, 28, 8, 8); dot(46, ly, 28, 8, 8);
  }

  // 뒤 범퍼
  for (let lx = -60; lx <= -52; lx += SG_PIX) {
    for (let ly = -20; ly <= -6; ly += SG_PIX) {
      const sh = noise(lx*0.06, ly*0.06+20);
      dot(lx, ly, floor(142+sh*14), floor(145+sh*14), floor(154+sh*14));
    }
  }
  for (let lx = 42; lx <= 54; lx += SG_PIX) {
    dot(lx, -10, 228, 228, 215);
    dot(lx, -6,  228, 228, 215);
  }

  // 미러
  dot( 14, -44, 200, 36, 36); dot( 18, -44, 195, 34, 34);
  dot(-14, -44, 192, 32, 32); dot(-10, -44, 192, 32, 32);

  // 그림자 (주행 중에만)
  if (sg_carState === 'driving') {
    for (let lx = -52; lx <= 52; lx += SG_PIX) {
      const sw = floor(map(abs(lx), 0, 52, 80, 10));
      dot(lx, 2, 0, 0, 0, sw);
      dot(lx, 4, 0, 0, 0, sw/2);
    }
  }
}

function sg_updateDebris() {
  for (let i = sg_debrisParticles.length - 1; i >= 0; i--) {
    const d = sg_debrisParticles[i];
    d.x += d.vx; d.y += d.vy; d.vy += 0.14; d.life--;
    if (d.life <= 0) sg_debrisParticles.splice(i, 1);
  }
}

function sg_drawDebris() {
  noStroke();
  for (let d of sg_debrisParticles) {
    const ratio = d.life / d.maxLife;
    fill(d.col[0], d.col[1], d.col[2], ratio * 225);
    rect(floor(d.x/SG_PIX)*SG_PIX, floor(d.y/SG_PIX)*SG_PIX, d.sz, d.sz);
  }
}

function sg_drawTitle() {
  noStroke();
  textAlign(CENTER, TOP); textStyle(BOLD); textSize(22);
  fill(8, 8, 15, 200);
  text('끝없는 채굴 끝에, 땅이 먼저 꺼졌습니다', SG_W/2+2, 46);
  fill(195, 212, 235);
  text('끝없는 채굴 끝에, 땅이 먼저 꺼졌습니다', SG_W/2, 44);
}

function sg_drawPixelText() {
  sg_textAlpha += sg_fadeAmount;
  if (sg_textAlpha < 0 || sg_textAlpha > 255) sg_fadeAmount *= -1;
  sg_textAlpha = constrain(sg_textAlpha, 0, 255);
  noStroke(); textSize(18); textAlign(CENTER, CENTER); textStyle(BOLD);
  fill(8, 8, 15, sg_textAlpha * 0.6);
  text('PRESS ANY KEY TO CONTINUE', SG_W/2+2, SG_H-70);
  fill(185, 208, 232, sg_textAlpha);
  text('PRESS ANY KEY TO CONTINUE', SG_W/2, SG_H-72);
}