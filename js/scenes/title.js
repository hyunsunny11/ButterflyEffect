// 나비효과 게임 - 타이틀 화면 (scenes/title.js)

let tl_timer = 0;
let tl_blinkT = 0;
let tl_wingAngle = 0;
let tl_wingDir = 1;
let tl_butterflyY = 220;

function enterTitle() {
  tl_timer    = 0;
  tl_blinkT   = 0;
  tl_wingAngle = 0;
  tl_wingDir   = 1;
  tl_butterflyY = 220;
}

function updateTitle() {
  // 하늘 (인트로와 동일 - 맑은 아침 하늘)
  skyT = 0;
  drawSky();

  // 나비 날갯짓 (인트로 변수 대신 tl_ 전용 변수 사용)
  tl_wingAngle += tl_wingDir * 0.18;
  if (tl_wingAngle > 0.9) tl_wingDir = -1;
  if (tl_wingAngle < -0.1) tl_wingDir = 1;
  tl_butterflyY = 220 + sin(tl_timer * 0.04) * 8;

  // wingAngle/butterflyY를 인트로 공용 변수에 임시 반영해서 drawButterfly() 재사용
  wingAngle    = tl_wingAngle;
  butterflyY   = tl_butterflyY;
  butterflyX   = 130;
  butterflyScale = 1.0;
  drawButterfly();

  // "시작하려면 나비를 누르세요" — 화면 세로 3/4 지점
  tl_blinkT++;
  let a = map(abs(sin(tl_blinkT * 0.04)), 0, 1, 120, 240);
  push();
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
  textSize(15);
  fill(30, 30, 35, a);
  text('시작하려면 나비를 누르세요', GW / 2, GH * 3 / 4);
  pop();

  tl_timer++;
}

function titleMousePressed() {
  if (tl_timer < 20) return;
  let mx = vmouseX(), my = vmouseY();
  let hw = 50, hh = 50;
  if (mx >= 130 - hw && mx <= 130 + hw && my >= tl_butterflyY - hh && my <= tl_butterflyY + hh) {
    gameState = 'intro';
    enterIntro();
  }
}

function titleKeyPressed() {
  // 타이틀에서는 키 입력 무시
}