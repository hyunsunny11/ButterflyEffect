// 나비효과 게임 — 엔딩: 거목이 쓰러짐 (scenes/endings/tree.js)
// 텀블러 단계(solvedCount===3)에서 현관문으로 나갈 때 엔딩.
// 팀원 제작 sketch.js(인스턴스 모드) → 전역 모드로 변환.
//   - new p5(function(p){...}) 제거, p.xxx → xxx
//   - W/H/BW/BH 등 변수에 tr_ 접두사 (전역 충돌 방지)
//   - createCanvas/noSmooth/pixelDensity 제거 (main.js에서 처리)
//   - 600×600 출력을 GH(480) 기준으로 스케일하여 중앙 배치
//     (sinkhole.js의 sg_scale/sg_offX 패턴과 동일)
//   - rectMode(CORNER) 명시 (main.js의 rectMode(CENTER) 충돌 방지)
//   - 키/클릭 → 방 처음부터 리스타트
//
// 씬 함수: enterTreeEnding() / updateTreeEnding()
//          treeEndingKeyPressed() / treeEndingMousePressed()

const TR_W = 600, TR_H = 600;
const TR_PIX = 4;

// treeBuffer 여유 공간
const TR_BW = 1400, TR_BH = 1400;

// 나무 치수
const TR_CX       = TR_W / 2;
const TR_GROUND_Y = 460;
const TR_STUMP_H  = 40;
const TR_TRUNK_H  = 300;
const TR_TRUNK_W  = 22;
const TR_CROWN_W  = 160;
const TR_CROWN_H  = 200;
const TR_UPPER_H  = TR_TRUNK_H - TR_STUMP_H;

// pivot = 밑둥 오른쪽 모서리 상단
const TR_PIVOT_X = TR_CX + TR_TRUNK_W;
const TR_PIVOT_Y = TR_GROUND_Y - TR_STUMP_H;

// 버퍼 내부에서 pivot에 매핑될 중심 좌표
const TR_B_PIVOT_X = 700, TR_B_PIVOT_Y = 900;

let tr_textAlpha = 0;
let tr_fadeAmount = 3;
let tr_sawdustParticles = [];
let tr_fallRatio = 0;
let tr_isFallen = false;

let tr_groundBuf   = null;
let tr_treeBuf     = null;
let tr_forestBuf   = null;

// 화면 배치
let tr_scale = 1, tr_offX = 0, tr_offY = 0;

/* ── 씬 진입 ── */
function enterTreeEnding() {
  // 600×600 → GH(480) 기준 스케일, 중앙 배치
  tr_scale = GH / TR_H;
  tr_offX  = (GW - TR_W * tr_scale) / 2;
  tr_offY  = 0;

  tr_textAlpha       = 0;
  tr_fadeAmount      = 3;
  tr_sawdustParticles = [];
  tr_fallRatio       = 0;
  tr_isFallen        = false;

  // 버퍼는 최초 1회만 생성
  if (!tr_groundBuf) {
    tr_groundBuf = createGraphics(TR_W, TR_H);
    tr_groundBuf.noSmooth();
    tr_groundBuf.noStroke();
    tr_preDrawGround(tr_groundBuf);
  }
  if (!tr_treeBuf) {
    tr_treeBuf = createGraphics(TR_BW, TR_BH);
    tr_treeBuf.noSmooth();
    tr_treeBuf.noStroke();
    tr_preDrawTree(tr_treeBuf);
  }
  if (!tr_forestBuf) {
    tr_forestBuf = createGraphics(TR_W, TR_H);
    tr_forestBuf.noSmooth();
    tr_forestBuf.noStroke();
    tr_preDrawForestBg(tr_forestBuf);
  }
}

/* ── 매 프레임 ── */
function updateTreeEnding() {
  push();
  rectMode(CORNER);   // ★ main.js의 rectMode(CENTER) 충돌 방지
  textFont('monospace');

  background(95, 115, 140);

  if (!tr_isFallen) {
    tr_fallRatio = min(1, tr_fallRatio + 0.008);
    if (tr_fallRatio >= 1) tr_isFallen = true;
    if (tr_fallRatio < 0.3 && frameCount % 4 === 0) tr_spawnSawdust();
  }

  // 스케일/오프셋 적용
  push();
  translate(tr_offX, tr_offY);
  scale(tr_scale);

  // 고정 배경 버퍼
  imageMode(CORNER);
  image(tr_forestBuf, 0, 0);
  image(tr_groundBuf, 0, 0);
  tr_drawGrass();

  // 쓰러지는 나무 → 밑둥 순서로 렌더링
  if (!tr_isFallen) tr_drawFallingTree();
  tr_drawStump();

  tr_updateSawdust();
  tr_drawSawdust();
  tr_drawTitle();
  tr_drawPixelText();

  pop();
  pop();
}

/* ── 입력 ── */
function treeEndingKeyPressed()   { tr_restart(); }
function treeEndingMousePressed() { tr_restart(); }

function tr_restart() {
  // 버퍼 유지(재진입 시 재사용), 애니메이션만 리셋
  tr_fallRatio       = 0;
  tr_isFallen        = false;
  tr_sawdustParticles = [];
  tr_textAlpha       = 0;
  solvedCount = 3;
  gameState = 'room';
  enterRoom(3);
}

// ─────────────── 버퍼 사전 렌더링 ───────────────

function tr_preDrawGround(g) {
  for (let x = 0; x < TR_W; x += TR_PIX) {
    for (let y = 460; y < TR_H; y += TR_PIX) {
      const shade = noise(x * 0.03, y * 0.03);
      g.fill(
        floor(lerp(110, 140, shade)),
        floor(lerp(85,  110, shade)),
        floor(lerp(30,  55,  shade))
      );
      g.rect(x, y, TR_PIX, TR_PIX);
    }
  }
}

function tr_preDrawTree(g) {
  const trunkOffX = -(TR_TRUNK_W * 2);
  for (let gx = trunkOffX; gx <= 0; gx += TR_PIX) {
    for (let gy = 0; gy < TR_UPPER_H; gy += TR_PIX) {
      const localX   = gx + TR_TRUNK_W;
      const edgeDark = abs(localX) / TR_TRUNK_W;
      const shade    = noise(localX * 0.1, gy * 0.06 + 10);
      g.fill(
        floor(lerp(150, 100, edgeDark) * lerp(1.0, 0.85, shade)),
        floor(lerp(95,  60,  edgeDark) * lerp(1.0, 0.85, shade)),
        floor(lerp(42,  22,  edgeDark) * lerp(1.0, 0.85, shade))
      );
      g.rect(
        floor((TR_B_PIVOT_X + gx) / TR_PIX) * TR_PIX,
        floor((TR_B_PIVOT_Y - gy) / TR_PIX) * TR_PIX,
        TR_PIX, TR_PIX
      );
    }
  }

  const crownCenterX = -TR_TRUNK_W;
  const crownLayers  = 3;
  for (let cl = 0; cl < crownLayers; cl++) {
    const layerRatio  = cl / crownLayers;
    const cw          = floor(TR_CROWN_W * (1 - layerRatio * 0.3));
    const ch          = floor(TR_CROWN_H * 0.45 * (1 - layerRatio * 0.2));
    const crownLocalY = -(TR_UPPER_H + floor(TR_CROWN_H * 0.28 * cl) + ch * 0.5);
    let rBase, gBase, bBase;
    if      (cl === 0) { rBase = 35; gBase = 100; bBase = 30; }
    else if (cl === 1) { rBase = 50; gBase = 130; bBase = 42; }
    else               { rBase = 65; gBase = 155; bBase = 52; }

    for (let gx = -cw; gx <= cw; gx += TR_PIX) {
      for (let gy = -ch; gy <= ch; gy += TR_PIX) {
        if ((gx*gx)/(cw*cw) + (gy*gy)/(ch*ch) <= 1.0) {
          const shade    = noise(gx * 0.04, gy * 0.04 + cl * 10);
          const edgeDark = sqrt((gx*gx)/(cw*cw) + (gy*gy)/(ch*ch));
          g.fill(
            floor(rBase + shade * 35 - edgeDark * 15),
            floor(gBase + shade * 40 - edgeDark * 20),
            floor(bBase + shade * 22 - edgeDark * 10)
          );
          g.rect(
            floor((TR_B_PIVOT_X + crownCenterX + gx) / TR_PIX) * TR_PIX,
            floor((TR_B_PIVOT_Y + crownLocalY  + gy) / TR_PIX) * TR_PIX,
            TR_PIX, TR_PIX
          );
        }
      }
    }
  }
}

function tr_preDrawForestBg(g) {
  const bgTrees = [
    { x: 80,  trunkH: 140, crownH: 90,  crownW: 50, colorSeed: 10 },
    { x: 170, trunkH: 120, crownH: 80,  crownW: 44, colorSeed: 25 },
    { x: 450, trunkH: 130, crownH: 85,  crownW: 48, colorSeed: 40 },
    { x: 540, trunkH: 110, crownH: 75,  crownW: 42, colorSeed: 55 },
    { x: 30,  trunkH: 100, crownH: 70,  crownW: 38, colorSeed: 70 },
  ];
  for (let bt of bgTrees) {
    const tw = floor(bt.crownW * 0.13);
    for (let gx = -tw; gx <= tw; gx += TR_PIX) {
      for (let gy = 0; gy < bt.trunkH; gy += TR_PIX) {
        const edgeDark = abs(gx) / tw;
        const shade    = noise((bt.x + gx) * 0.1, gy * 0.08 + bt.colorSeed);
        g.fill(
          floor(lerp(120, 80, edgeDark) * lerp(1.0, 0.85, shade)),
          floor(lerp(78,  50, edgeDark) * lerp(1.0, 0.85, shade)),
          floor(lerp(35,  18, edgeDark) * lerp(1.0, 0.85, shade)),
          200
        );
        g.rect(
          floor((bt.x + gx) / TR_PIX) * TR_PIX,
          floor((TR_GROUND_Y - gy) / TR_PIX) * TR_PIX,
          TR_PIX, TR_PIX
        );
      }
    }
    const crownLayers = 3;
    for (let cl = 0; cl < crownLayers; cl++) {
      const lr = cl / crownLayers;
      const cw = floor(bt.crownW * (1 - lr * 0.3));
      const ch = floor(bt.crownH * 0.45 * (1 - lr * 0.2));
      const cy = TR_GROUND_Y - bt.trunkH - floor(bt.crownH * 0.28 * cl);
      for (let gx = -cw; gx <= cw; gx += TR_PIX) {
        for (let gy = -ch; gy <= ch; gy += TR_PIX) {
          if ((gx*gx)/(cw*cw) + (gy*gy)/(ch*ch) <= 1.0) {
            const shade    = noise((bt.x + gx) * 0.05 + bt.colorSeed, (cy + gy) * 0.05);
            const edgeDark = sqrt((gx*gx)/(cw*cw) + (gy*gy)/(ch*ch));
            let rBase, gBase, bBase;
            if      (cl === 0) { rBase = 35; gBase = 95;  bBase = 28; }
            else if (cl === 1) { rBase = 48; gBase = 125; bBase = 40; }
            else               { rBase = 62; gBase = 148; bBase = 50; }
            g.fill(
              floor(rBase + shade * 30 - edgeDark * 12),
              floor(gBase + shade * 35 - edgeDark * 18),
              floor(bBase + shade * 18 - edgeDark * 8),
              200
            );
            g.rect(
              floor((bt.x + gx) / TR_PIX) * TR_PIX,
              floor((cy + gy)    / TR_PIX) * TR_PIX,
              TR_PIX, TR_PIX
            );
          }
        }
      }
    }
  }
}

// ─────────────── 동적 요소 ───────────────

function tr_drawGrass() {
  noStroke();
  for (let x = 0; x < TR_W; x += TR_PIX) {
    const surf = 460 + floor(noise(x * 0.04) * 8);
    fill(60, 150, 50);
    rect(x, surf, TR_PIX, TR_PIX * 3);
    if (noise(x * 0.3) > 0.5) {
      const bladeH = floor(noise(x * 0.2 + 50) * 4 + 2) * TR_PIX;
      for (let by = 0; by < bladeH; by += TR_PIX) {
        fill(55, 160, 48);
        rect(x, surf - by, TR_PIX, TR_PIX);
      }
    }
  }
}

function tr_spawnSawdust() {
  for (let i = 0; i < 5; i++) {
    const sp = {
      x:       TR_PIVOT_X + random(-30, 10),
      y:       TR_PIVOT_Y,
      vx:      random(-1.0, 3.0),
      vy:      random(-3.0, -1.0),
      life:    random(30, 70),
      sz:      TR_PIX
    };
    sp.maxLife = sp.life;
    tr_sawdustParticles.push(sp);
  }
}

function tr_drawFallingTree() {
  const angle = tr_fallRatio * PI * 0.5;
  push();
  translate(TR_PIVOT_X, TR_PIVOT_Y);
  rotate(angle);
  imageMode(CORNER);
  image(tr_treeBuf, -TR_B_PIVOT_X, -TR_B_PIVOT_Y);
  pop();
}

function tr_drawStump() {
  noStroke();
  for (let gx = -TR_TRUNK_W; gx <= TR_TRUNK_W; gx += TR_PIX) {
    for (let gy = 0; gy < TR_STUMP_H; gy += TR_PIX) {
      const edgeDark = abs(gx) / TR_TRUNK_W;
      const shade    = noise(gx * 0.1, gy * 0.08);
      fill(
        floor(lerp(150, 100, edgeDark) * lerp(1.0, 0.85, shade)),
        floor(lerp(95,  60,  edgeDark) * lerp(1.0, 0.85, shade)),
        floor(lerp(42,  22,  edgeDark) * lerp(1.0, 0.85, shade))
      );
      rect(
        floor((TR_CX + gx) / TR_PIX) * TR_PIX,
        floor((TR_GROUND_Y - gy) / TR_PIX) * TR_PIX,
        TR_PIX, TR_PIX
      );
    }
  }
}

function tr_updateSawdust() {
  for (let i = tr_sawdustParticles.length - 1; i >= 0; i--) {
    const s = tr_sawdustParticles[i];
    s.x  += s.vx;
    s.y  += s.vy;
    s.vy += 0.1;
    s.life--;
    if (s.life <= 0) tr_sawdustParticles.splice(i, 1);
  }
}

function tr_drawSawdust() {
  noStroke();
  for (let s of tr_sawdustParticles) {
    const ratio = s.life / s.maxLife;
    fill(180, 130, 60, ratio * 220);
    rect(floor(s.x / TR_PIX) * TR_PIX, floor(s.y / TR_PIX) * TR_PIX, s.sz, s.sz);
  }
}

function tr_drawTitle() {
  noStroke();
  textAlign(CENTER, TOP); textStyle(BOLD); textSize(23);
  fill(40, 20, 10, 200);
  text('당신이 목을 축이는 동안, 거목은 쓰러졌습니다', TR_W / 2 + 2, 40 + 2);
  fill(220, 200, 150);
  text('당신이 목을 축이는 동안, 거목은 쓰러졌습니다', TR_W / 2, 40);
}

function tr_drawPixelText() {
  tr_textAlpha += tr_fadeAmount;
  if (tr_textAlpha < 0 || tr_textAlpha > 255) tr_fadeAmount *= -1;
  tr_textAlpha = constrain(tr_textAlpha, 0, 255);
  noStroke(); textSize(18); textAlign(CENTER, CENTER); textStyle(BOLD);
  fill(40, 20, 10, tr_textAlpha * 0.6);
  text('PRESS ANY KEY OR CLICK TO CONTINUE', TR_W / 2 + 2, TR_H - 72 + 2);
  fill(220, 200, 150, tr_textAlpha);
  text('PRESS ANY KEY OR CLICK TO CONTINUE', TR_W / 2, TR_H - 72);
}