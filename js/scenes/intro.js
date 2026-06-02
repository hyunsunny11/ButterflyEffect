// 나비효과 게임 - 인트로 씬 (scenes/intro.js)
// 동작은 원본 인트로와 완전히 동일. 코드만 씬 패턴으로 캡슐화함.
//
// 씬 함수 세트:
//   enterIntro()         : 인트로 진입 시 전용 변수 초기화 (재진입/재시작 대비)
//   updateIntro()        : 매 프레임 로직 + 드로잉 (원본 draw() 내용물)
//   introMousePressed()  : 원본 mousePressed() 내용물
//   introKeyPressed()    : 원본 keyPressed() 내용물
//
// p5의 setup/draw/mousePressed/keyPressed는 main.js에만 있고,
// gameState === 'intro'일 때 위 함수들을 호출합니다.

// ── 상태 ──
// 'butterfly' : 나비 날갯짓
// 'wind'      : 바람이 퍼져나감
// 'tornado'   : 토네이도 형성
// 'message'   : 메시지 등장
// 'done'       : 페이드아웃 후 완료

// ── 인트로 전용 전역 변수 ──
let phase = 'butterfly';
let timer = 0;
let particles = [];
let tornadoParticles = [];
let fadeAlpha = 0;
let msgAlpha = 0;
let subAlpha = 0;
let blinkT = 0;
let started = false;

// 하늘 전환 계수 (0 = 맑은 하늘색 아침 → 1 = 잿빛 폭풍 하늘)
let skyT = 0;

// 나비 날개
let wingAngle = 0;
let wingDir = 1;
let wingFlaps = 0;

// 나비 위치/크기
let butterflyX = 130;
let butterflyY = 220;
let butterflyScale = 1.0;

// 토네이도 중심 (화면 정중앙)
let tornadoCX = 340;
let tornadoCY = 240;

// ── 인트로 진입(초기화) ──
// 원본은 변수 선언 초깃값에 의존했는데, 재진입/재시작을 위해
// 같은 초깃값을 여기서 명시적으로 되돌립니다. (값은 원본과 동일)
function enterIntro() {
  phase = 'butterfly';
  timer = 0;
  particles = [];
  tornadoParticles = [];
  fadeAlpha = 0;      // 원본과 동일 (이 값에선 페이드인이 사실상 즉시 끝남)
  msgAlpha = 0;
  subAlpha = 0;
  blinkT = 0;
  started = false;
  skyT = 0;
  wingAngle = 0;
  wingDir = 1;
  wingFlaps = 0;
  butterflyX = 130;
  butterflyY = 220;
  butterflyScale = 1.0;
}

// 파티클 (바람 흐름)
class WindParticle {
  constructor(x, y, vx, vy, col) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.col = col;
    this.life = 1.0;
    this.decay = random(0.008, 0.018);
    this.size = floor(random(1, 3)) * PS;
    this.trail = [];
  }
  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.99;
    this.vy *= 0.99;
    this.life -= this.decay;
  }
  draw() {
    noStroke();
    for (let i = 0; i < this.trail.length; i++) {
      let a = map(i, 0, this.trail.length, 0, this.life * 200);
      fill(red(this.col), green(this.col), blue(this.col), a);
      let s = map(i, 0, this.trail.length, this.size * 0.3, this.size);
      // 픽셀 느낌: 정수 좌표로 스냅
      let px = round(this.trail[i].x / PS) * PS;
      let py = round(this.trail[i].y / PS) * PS;
      rect(px, py, s, s);
    }
    fill(red(this.col), green(this.col), blue(this.col), this.life * 255);
    let px = round(this.x / PS) * PS;
    let py = round(this.y / PS) * PS;
    rect(px, py, this.size, this.size);
  }
  isDead() { return this.life <= 0 || this.x < -20 || this.x > 720 || this.y < -20 || this.y > 520; }
}

// 토네이도 파티클
class TornadoParticle {
  constructor(cx, cy, radius, angle, height, speed, col) {
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
    this.angle = angle;
    this.height = height; // y 오프셋
    this.speed = speed;
    this.col = col;
    this.size = floor(random(1, 3)) * PS;
    this.life = 1.0;
    this.decay = random(0.003, 0.008);
  }
  update() {
    this.angle += this.speed;
    this.height -= random(0.5, 2.0);       // 위로 올라감
    this.radius += random(-0.3, 0.8);       // 점점 퍼짐
    this.radius = constrain(this.radius, 5, 380); // 화면을 덮도록 최대 반경 확대
    this.life -= this.decay;
  }
  draw() {
    let x = this.cx + cos(this.angle) * this.radius;
    let y = this.cy + this.height;
    let px = round(x / PS) * PS;
    let py = round(y / PS) * PS;
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.life * 220);
    rect(px, py, this.size, this.size);
  }
  isDead() { return this.life <= 0 || this.height < -340; }
}

// ── 매 프레임: 로직 + 드로잉 (원본 draw() 내용물) ──
function updateIntro() {
  // 하늘 전환 계수 갱신
  if (phase === 'butterfly' || phase === 'wind') skyT = 0;
  else if (phase === 'tornado') skyT = constrain(timer / 160, 0, 1);
  else skyT = 1; // message, done

  // 배경: 하늘색 → 잿빛 그라데이션
  drawSky();

  // 별 (맑은 하늘엔 안 보이고, 잿빛 폭풍 하늘에서 옅은 티끌처럼만)
  drawStars();

  timer++;
  blinkT++;

  // ── 페이즈별 로직 ──
  if (phase === 'butterfly') {
    updateButterfly();
    drawButterfly();
    spawnWindFromWing();
    if (timer > 140) {
      phase = 'wind';
      timer = 0;
    }
  }

  if (phase === 'wind' || phase === 'tornado' || phase === 'message') {
    drawButterfly(); // 나비는 계속 보임 (점점 작아짐)
  }

  // 바람 파티클
  if (phase === 'wind') {
    spawnWindStream();
    if (timer > 90) {
      phase = 'tornado';
      timer = 0;
    }
  }

  // 토네이도
  if (phase === 'tornado') {
    spawnTornadoParticles();
    if (timer > 160) {
      phase = 'message';
      timer = 0;
    }
  }

  // 파티클 업데이트 & 드로잉
  updateAndDrawParticles();
  updateAndDrawTornado();

  // 메시지
  if (phase === 'message') {
    msgAlpha = min(255, msgAlpha + 4);
    drawMessage();
  }

  // 타이틀 깜빡이는 스킵 안내
  if (phase === 'message' && timer > 80) {
    drawSkipHint();
  }

  // 전체 시작 전 페이드인
  if (!started) {
    fadeAlpha = max(0, fadeAlpha - 8);
    fill(10, 8, 20, fadeAlpha);
    noStroke();
    rectMode(CORNER);
    rect(0, 0, 680, 480);
    rectMode(CENTER);
    if (fadeAlpha <= 0) started = true;
  } else {
    fadeAlpha = 0;
  }
}

// ── 하늘 그라데이션 (skyT: 0 맑은 하늘색 → 1 잿빛 폭풍) ──
function drawSky() {
  const TOP_ASH = [33, 42, 49];    // 하늘 위쪽 (짙은 청회색)
  const BOT_ASH = [179, 150, 113]; // 지평선 (주황 노을)
  // 위쪽 색: 맑은 하늘색 → 짙은 청회색
  let topR = lerp(118, TOP_ASH[0], skyT), topG = lerp(184, TOP_ASH[1], skyT), topB = lerp(234, TOP_ASH[2], skyT);
  // 아래쪽 색: 옅은 하늘색 → 주황 노을
  let botR = lerp(198, BOT_ASH[0], skyT), botG = lerp(224, BOT_ASH[1], skyT), botB = lerp(244, BOT_ASH[2], skyT);
  noStroke();
  rectMode(CORNER);
  for (let y = 0; y < 480; y += PS) {
    let t = y / 480;
    fill(lerp(topR, botR, t), lerp(topG, botG, t), lerp(topB, botB, t));
    rect(0, y, 680, PS + 2); // [수정] 띠를 2px 겹쳐 확대 시 생기는 가로 빈틈 제거
  }
  rectMode(CENTER);
}

// ── 별 ──
function drawStars() {
  if (skyT <= 0.02) return; // 맑은 하늘색일 땐 별을 그리지 않음
  noStroke();
  randomSeed(42);
  for (let i = 0; i < 60; i++) {
    let sx = random(680);
    let sy = random(480);
    let ss = random(1) > 0.8 ? PS : PS * 0.6;
    let sa = random(120, 220);
    // 일부 별 깜빡임
    if (i % 7 === 0) sa = map(sin(blinkT * 0.03 + i), -1, 1, 80, 220);
    // 잿빛 하늘에서만 옅은 티끌처럼 보이도록 skyT로 감쇠
    fill(210, 212, 222, sa * skyT * 0.5);
    rect(round(sx / PS) * PS, round(sy / PS) * PS, ss, ss);
  }
}

// ── 나비 ──
function updateButterfly() {
  wingAngle += wingDir * 0.18;
  if (wingAngle > 0.9) { wingDir = -1; wingFlaps++; }
  if (wingAngle < -0.1) wingDir = 1;

  // 살짝 위아래 떠다님
  butterflyY = 220 + sin(timer * 0.04) * 8;
}

function drawButterfly() {
  // 페이즈가 진행되면 나비 점점 작아짐
  if (phase === 'wind') butterflyScale = max(0.4, butterflyScale - 0.004);
  if (phase === 'tornado') butterflyScale = max(0.2, butterflyScale - 0.003);
  if (phase === 'message') butterflyScale = max(0.1, butterflyScale - 0.005);

  push();
  translate(butterflyX, butterflyY);
  scale(butterflyScale);

  let wOpen = abs(sin(wingAngle)) * 28;

  // 날개 색: 모나크 주황 / 좌우 날개를 몸통 기준 대칭으로
  // 왼쪽 날개 (위)
  drawPixelWing(-8, -10, wOpen + 8, 18, color(250, 158, 52), color(196, 96, 24));
  // 오른쪽 날개 (위)
  drawPixelWing(8, -10, wOpen + 8, 18, color(250, 158, 52), color(196, 96, 24));
  // 왼쪽 날개 (아래)
  drawPixelWing(-4, 6, wOpen * 0.7 + 4, 12, color(238, 130, 42), color(176, 80, 20));
  // 오른쪽 날개 (아래)
  drawPixelWing(4, 6, wOpen * 0.7 + 4, 12, color(238, 130, 42), color(176, 80, 20));

  // 날개 무늬 - 모나크 특유의 흰 점
  fill(255, 248, 230, 215);
  noStroke();
  rect(-wOpen - 2, -6, 8, 8);
  rect(wOpen + 2, -6, 8, 8);

  // 몸통 - 어두운 갈색/검정 (주황 날개와 대비)
  fill(48, 32, 26);
  noStroke();
  rect(0, -8, PS, 24);
  rect(0, -14, PS * 0.6, PS * 0.6); // 머리
  // 더듬이 (하늘에서도 보이도록 따뜻한 밝은 톤 유지)
  stroke(214, 184, 150);
  strokeWeight(1.5);
  line(0, -14, -8, -24);
  line(0, -14, 8, -24);
  noStroke();
  fill(224, 196, 160);
  rect(-9, -25, 4, 4);
  rect(9, -25, 4, 4);

  pop();
}

function drawPixelWing(x, y, w, h, c1, c2) {
  // 픽셀 느낌의 날개: 여러 픽셀 블록
  noStroke();
  let cols = ceil(w / PS);
  let rows = ceil(h / PS);
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      let t = (col * rows + row) / (cols * rows);
      let c = lerpColor(c1, c2, t);
      let alpha = map(col, 0, cols, 200, 80);
      fill(red(c), green(c), blue(c), alpha);
      rect(x + col * PS * (x < 0 ? -1 : 1), y + row * PS, PS, PS);
    }
  }
}

// ── 날갯짓에서 바람 생성 ──
function spawnWindFromWing() {
  if (timer % 4 === 0) {
    let speed = random(1.5, 3.0);
    particles.push(new WindParticle(
      butterflyX + random(-15, 15),
      butterflyY + random(-10, 10),
      speed + random(-0.5, 0.5),
      random(-0.8, 0.8),
      windColor()
    ));
  }
}

// 바람/토네이도 공용 색: 파랑 ~ 회색 ~ 흰색 (배경 하늘색과 대비)
function windColor() {
  let t = random();
  if (t < 0.4) return color(70, 110, 200, random(150, 220));   // 진한 파랑
  else if (t < 0.7) return color(150, 160, 180, random(140, 210)); // 회색
  else return color(235, 240, 250, random(150, 220));          // 흰색
}

// ── 바람 퍼져나가기 ──
function spawnWindStream() {
  if (timer % 2 === 0) {
    let n = floor(map(timer, 0, 90, 1, 5));
    for (let i = 0; i < n; i++) {
      let angle = random(-0.3, 0.3);
      let speed = random(2.5, 5.0);
      let col = windColor();
      particles.push(new WindParticle(
        butterflyX + random(-20, 20),
        butterflyY + random(-20, 20),
        cos(angle) * speed,
        sin(angle) * speed + random(-1, 1),
        col
      ));
    }
  }
}

// ── 토네이도 파티클 생성 ──
function spawnTornadoParticles() {
  if (timer % 1 === 0) {
    // 후반부에 더 많이 생성해 화면을 덮음
    let n = floor(map(timer, 0, 160, 3, 20));
    for (let i = 0; i < n; i++) {
      // 반경이 화면 가로 끝까지 퍼지도록
      let radius = random(5, map(timer, 0, 160, 30, 360));
      let angle = random(TWO_PI);
      // 세로로도 화면 전체를 덮도록 위/아래 모두 분포
      let hRange = map(timer, 0, 160, 60, 280);
      let height = random(-hRange, hRange);
      let speed = random(0.08, 0.18) * (random() > 0.5 ? 1 : -1);

      // 색상: 파랑~회색~흰색
      let t = random();
      let col;
      if (t < 0.4) col = color(100, 150, 220, random(150, 220));
      else if (t < 0.7) col = color(160, 180, 210, random(130, 200));
      else col = color(220, 230, 255, random(100, 180));

      tornadoParticles.push(new TornadoParticle(
        tornadoCX, tornadoCY, radius, angle, height, speed, col
      ));
    }
  }
  // 바람 파티클도 토네이도 방향으로 끌려가는 효과
  if (timer % 3 === 0) {
    let angle = random(-0.5, 0.5);
    let speed = random(1.5, 3.5);
    let endX = tornadoCX + random(-60, 60);
    let endY = tornadoCY + random(-40, 40);
    let vx = (endX - butterflyX) / 80 + cos(angle) * speed * 0.3;
    let vy = (endY - butterflyY) / 80 + sin(angle) * speed * 0.3;
    particles.push(new WindParticle(
      butterflyX + random(-15, 15),
      butterflyY + random(-10, 10),
      vx, vy,
      windColor()
    ));
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].isDead()) particles.splice(i, 1);
  }
}

function updateAndDrawTornado() {
  for (let i = tornadoParticles.length - 1; i >= 0; i--) {
    tornadoParticles[i].update();
    tornadoParticles[i].draw();
    if (tornadoParticles[i].isDead()) tornadoParticles.splice(i, 1);
  }
}

// ── 메시지 ──
function drawMessage() {
  noStroke();
  textAlign(CENTER);
  textStyle(NORMAL);

  // 나비효과 제목 - 화면 높이의 1/3 지점(상단 중앙)
  if (timer > 80) {
    let titleAlpha = min(255, (timer - 80) * 5);
    // 타이틀
    fill(255, 220, 50, titleAlpha);
    textSize(40);
    textStyle(BOLD);
    text('나비효과', 340, 162);
    textStyle(NORMAL);
    fill(180, 160, 80, titleAlpha);
    textSize(20);
    text('THE BUTTERFLY EFFECT', 340, 202);
  }
}

function drawSkipHint() {
  let a = map(abs(sin(blinkT * 0.04)), 0, 1, 80, 200);
  fill(30, 30, 35, a);
  textSize(11);
  textAlign(CENTER);
  textStyle(NORMAL);
  text('PRESS ANY KEY OR CLICK TO START', 340, 440);
}

// ── 입력 ──
function introMousePressed() {
  if (phase === 'message' && timer > 80) {
    // 다음 씬(ROOM)으로 전환
    gameState = 'room';
    enterRoom();
  }
}

function introKeyPressed() {
  if (phase === 'message' && timer > 80) {
    gameState = 'room';
    enterRoom();
  }
}