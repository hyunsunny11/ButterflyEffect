// 나비효과 게임 - 엔딩: 불타는 지구 (scenes/endings/earth.js)
// 0단계(아무것도 안 하고 현관문으로 나감) 엔딩.
// 팀원 제작 엔딩 sketch.js를 우리 구조에 맞게 변환.
//   - 인스턴스 모드(new p5) → 전역 모드
//   - loadPixels()로 화면 직접 조작하므로, 우리 draw()의 scale과 충돌.
//     → 600x600 그래픽 버퍼(eg)에 그리고, 그 버퍼를 게임 화면에 스케일해서 올림.
//   - 변수에 eg_ 접두사, 자체 createCanvas 제거.
//   - 키/클릭 → 방 처음부터 리스타트.
//
// 씬 함수: enterEarthEnding() / updateEarthEnding() / earthEndingKeyPressed() / earthEndingMousePressed()

const EG_W = 600, EG_H = 600;
const EG_CX = EG_W / 2, EG_CY = EG_H / 2;
const EG_R = 130;
const EG_PIX = 4;
const EG_GRID = 33;

let eg_buf = null;          // 600x600 오프스크린 버퍼
let eg_stars = [];
let eg_fire = [];
let eg_textAlpha = 0, eg_fadeAmount = 3;
let eg_glowPulse = 0;
let eg_earthPixels = [];
// 화면 배치 (게임 가상 해상도에 맞춤)
let eg_scale = 1, eg_offX = 0, eg_offY = 0;

function enterEarthEnding() {
  // 600 정사각을 GH(480)에 맞춰 중앙 배치
  eg_scale = GH / EG_H;
  eg_offX = (GW - EG_W * eg_scale) / 2;
  eg_offY = 0;

  if (!eg_buf) {
    eg_buf = createGraphics(EG_W, EG_H);
    eg_buf.noSmooth();
    eg_buf.pixelDensity(1);
    eg_buf.textFont('monospace');
  }
  eg_stars = [];
  for (let i = 0; i < 220; i++) {
    eg_stars.push({
      x: random(EG_W), y: random(EG_H),
      sz: random([1, 1, 1, 2, 2]),
      blink: random(255), speed: random(0.5, 2),
    });
  }
  eg_fire = [];
  eg_textAlpha = 0;
  eg_fadeAmount = 3;
  eg_buildEarth();
}

function eg_buildEarth() {
  eg_earthPixels = [];
  const land = new Set();
  eg_addBlob(land, -4, -8, 10, 14);
  eg_addBlob(land, -2, -18, 6, 8);
  eg_addBlob(land, -18, -12, 8, 22);
  eg_addBlob(land, -16, 10, 6, 10);
  eg_addBlob(land, 4, -16, 16, 12);
  eg_addBlob(land, 6, -4, 10, 8);
  eg_addBlob(land, 12, 8, 8, 6);
  eg_addBlob(land, -14, 22, 28, 6);
  for (let gx = -EG_GRID; gx <= EG_GRID; gx++) {
    for (let gy = -EG_GRID; gy <= EG_GRID; gy++) {
      const dist = sqrt(gx * gx + gy * gy);
      if (dist <= EG_R / EG_PIX - 0.5) {
        eg_earthPixels.push({ gx, gy, type: land.has(`${gx},${gy}`) ? 'land' : 'ocean' });
      }
    }
  }
}
function eg_addBlob(set, x0, y0, w, h) {
  for (let dx = 0; dx < w; dx++)
    for (let dy = 0; dy < h; dy++) {
      const nx = x0 + dx + floor(sin(dx * 0.9 + dy * 0.7) * 2);
      const ny = y0 + dy + floor(cos(dy * 0.8 + dx * 0.5) * 2);
      set.add(`${nx},${ny}`);
    }
}
function eg_spawnFire() {
  for (let i = 0; i < 10; i++) {
    const angle = random(TWO_PI);
    const spawnR = EG_R - random(0, 40);
    const fp = {
      x: EG_CX + cos(angle) * spawnR, y: EG_CY + sin(angle) * spawnR,
      vx: cos(angle) * random(0.5, 2.0),
      vy: sin(angle) * random(0.5, 2.0) - random(1.0, 3.0),
      life: random(25, 65), size: floor(random(2, 6)) * EG_PIX,
      hue: random(['fire1', 'fire2', 'fire3', 'lava', 'smoke']),
    };
    fp.maxLife = fp.life;
    eg_fire.push(fp);
  }
}

// 매 프레임: 버퍼에 그리고 → 화면에 스케일해 올림
function updateEarthEnding() {
  const g = eg_buf;
  g.background(4, 2, 2);
  eg_glowPulse = sin(frameCount * 0.05) * 0.4 + 0.8;

  eg_drawStars(g);
  eg_drawEarthGlow(g);
  eg_drawEarth(g);
  eg_spawnFire();
  eg_updateFire();
  eg_drawFire(g);
  eg_drawAtmosphere(g);
  eg_drawTitle(g);
  eg_drawPixelText(g);

  // 버퍼를 게임 화면에 스케일해서 배치
  push();
  imageMode(CORNER);
  image(g, eg_offX, eg_offY, EG_W * eg_scale, EG_H * eg_scale);
  pop();
}

function eg_drawStars(g) {
  g.noStroke();
  for (let s of eg_stars) {
    s.blink += s.speed;
    g.fill(255, 220, 180, 150 + sin(s.blink * 0.05) * 105);
    g.rect(floor(s.x), floor(s.y), s.sz, s.sz);
  }
}
function eg_drawEarthGlow(g) {
  g.noStroke();
  for (let i = 8; i > 0; i--) {
    g.fill(240, 60, 0, (9 - i) * 14 * eg_glowPulse);
    g.ellipse(EG_CX, EG_CY, (EG_R + 6 + i * 14) * 2, (EG_R + 6 + i * 14) * 2);
  }
  for (let i = 4; i > 0; i--) {
    g.fill(255, 140, 0, (5 - i) * 20 * eg_glowPulse);
    g.ellipse(EG_CX, EG_CY, (EG_R + i * 5) * 2, (EG_R + i * 5) * 2);
  }
}
function eg_drawEarth(g) {
  g.loadPixels();
  const t = frameCount * 0.012;
  for (let ep of eg_earthPixels) {
    const px = EG_CX + ep.gx * EG_PIX, py = EG_CY + ep.gy * EG_PIX;
    let r, gg, b;
    if (ep.type === 'ocean') {
      const heat = noise(ep.gx * 0.18 + t, ep.gy * 0.18) * 255;
      if (heat > 180) { r = 255; gg = 80; b = 0; }
      else if (heat > 130) { r = 180; gg = 40; b = 0; }
      else if (heat > 80) { r = 80; gg = 15; b = 0; }
      else { r = 25; gg = 8; b = 0; }
    } else {
      const crack = noise(ep.gx * 0.22 + t * 0.8, ep.gy * 0.22 + 100);
      const flare = noise(ep.gx * 0.35 + t * 1.5, ep.gy * 0.35 + 200);
      if (flare > 0.75) { r = 255; gg = 255; b = 100; }
      else if (crack > 0.72) { r = 255; gg = 120; b = 0; }
      else if (crack > 0.58) { r = 180; gg = 50; b = 0; }
      else if (crack > 0.42) { r = 80; gg = 20; b = 0; }
      else { r = 35; gg = 10; b = 5; }
    }
    for (let dy = 0; dy < EG_PIX; dy++) {
      const yC = py + dy; if (yC < 0 || yC >= EG_H) continue;
      for (let dx = 0; dx < EG_PIX; dx++) {
        const xC = px + dx; if (xC < 0 || xC >= EG_W) continue;
        let idx = (yC * EG_W + xC) * 4;
        g.pixels[idx] = r; g.pixels[idx + 1] = gg; g.pixels[idx + 2] = b; g.pixels[idx + 3] = 255;
      }
    }
  }
  g.updatePixels();
}
function eg_updateFire() {
  for (let i = eg_fire.length - 1; i >= 0; i--) {
    const fp = eg_fire[i];
    fp.x += fp.vx; fp.y += fp.vy; fp.vy -= 0.06; fp.vx *= 0.98; fp.life--;
    if (fp.life <= 0) eg_fire.splice(i, 1);
  }
}
function eg_drawFire(g) {
  g.noStroke();
  for (let fp of eg_fire) {
    const ratio = fp.life / fp.maxLife;
    const pxSz = max(EG_PIX, floor(fp.size * ratio / EG_PIX) * EG_PIX);
    let r, gg, b, a;
    if (fp.hue === 'fire1') { r = 255; gg = floor(200 * ratio); b = 0; a = ratio * 240; }
    else if (fp.hue === 'fire2') { r = 255; gg = floor(80 * ratio); b = 0; a = ratio * 220; }
    else if (fp.hue === 'fire3') { r = 220; gg = floor(30 * ratio); b = 0; a = ratio * 200; }
    else if (fp.hue === 'lava') { r = 255; gg = floor(160 * ratio); b = 20; a = ratio * 255; }
    else { r = 60; gg = 40; b = 40; a = ratio * 130; }
    g.fill(r, gg, b, a);
    g.rect(floor(fp.x / EG_PIX) * EG_PIX, floor(fp.y / EG_PIX) * EG_PIX, pxSz, pxSz);
  }
}
function eg_drawAtmosphere(g) {
  g.noStroke();
  for (let a = 0; a < TWO_PI; a += 0.04) {
    const flicker = noise(a * 4, frameCount * 0.05) * 18;
    const ar = EG_R + 4 + flicker;
    const ax = EG_CX + cos(a) * ar, ay = EG_CY + sin(a) * ar;
    g.fill(255, 80 + flicker * 3, 0, 80 + sin(a * 9 + frameCount * 0.15) * 50);
    g.rect(floor(ax / EG_PIX) * EG_PIX, floor(ay / EG_PIX) * EG_PIX, EG_PIX, EG_PIX);
  }
}
function eg_drawTitle(g) {
  g.noStroke(); g.textAlign(CENTER, TOP); g.textStyle(BOLD); g.textSize(36);
  g.fill(120, 20, 0, 200); g.text('지구는 멸망했습니다', EG_W / 2 + 3, 43);
  g.fill(255, 80, 30); g.text('지구는 멸망했습니다', EG_W / 2, 40);
}
function eg_drawPixelText(g) {
  eg_textAlpha += eg_fadeAmount;
  if (eg_textAlpha < 0 || eg_textAlpha > 255) eg_fadeAmount *= -1;
  eg_textAlpha = constrain(eg_textAlpha, 0, 255);
  g.noStroke(); g.textSize(18); g.textAlign(CENTER, CENTER); g.textStyle(BOLD);
  g.fill(80, 20, 0, eg_textAlpha * 0.6); g.text('PRESS ANY KEY OR CLICK TO CONTINUE', EG_W / 2 + 2, EG_H - 70);
  g.fill(255, 100, 50, eg_textAlpha); g.text('PRESS ANY KEY OR CLICK TO CONTINUE', EG_W / 2, EG_H - 72);
}

// ── 입력: 키/클릭 → 방 처음부터 리스타트 ──
function earthEndingKeyPressed() { eg_restart(); }
function earthEndingMousePressed() { eg_restart(); }
function eg_restart() {
  gameState = 'room';
  enterRoom();   // solvedCount=0으로 방 처음부터
}