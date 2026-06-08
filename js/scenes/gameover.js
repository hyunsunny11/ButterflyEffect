// 나비효과 게임 - 게임 오버(엔딩) 화면 (scenes/gameover.js)
// 클리어 엔딩 컷툰 이후 표시. 타이틀과 대칭 구조.
// 나비가 오른쪽으로 날아가며 퇴장 + 타이틀 텍스트.
// 아무 키/클릭 → 타이틀 화면으로 복귀.

let go_timer    = 0;
let go_blinkT   = 0;
let go_wingAngle = 0;
let go_wingDir   = 1;
let go_bx       = 130;   // 나비 x (오른쪽으로 이동)
let go_by       = 220;
let go_alpha    = 0;     // 페이드인

function enterGameOver() {
  go_timer     = 0;
  go_blinkT    = 0;
  go_wingAngle = 0;
  go_wingDir   = 1;
  go_bx        = 130;
  go_by        = 220;
  go_alpha     = 255;  // 검은 화면에서 페이드인
}

function updateGameOver() {
  // 하늘 (타이틀과 동일 - 맑은 아침 하늘)
  skyT = 0;
  drawSky();

  // 나비 오른쪽으로 날아가며 퇴장
  go_wingAngle += go_wingDir * 0.18;
  if (go_wingAngle > 0.9) go_wingDir = -1;
  if (go_wingAngle < -0.1) go_wingDir = 1;

  // 일정 시간 후 나비가 서서히 오른쪽으로 이동
  if (go_timer > 80) {
    go_bx += 0.8;
    go_by = 220 + sin(go_timer * 0.03) * 6;
  } else {
    go_by = 220 + sin(go_timer * 0.04) * 8;
  }

  // 나비 그리기 (인트로 공용 변수 임시 사용)
  wingAngle    = go_wingAngle;
  butterflyX   = go_bx;
  butterflyY   = go_by;
  butterflyScale = max(0, 1.0 - max(0, go_bx - 500) / 200); // 화면 밖으로 나가며 축소
  if (butterflyScale > 0) drawButterfly();

  // 타이틀 텍스트 페이드인
  if (go_timer > 40) {
    let titleAlpha = min(255, (go_timer - 40) * 4);
    push();
    noStroke(); textAlign(CENTER, CENTER);
    fill(255, 220, 50, titleAlpha);
    textSize(40); textStyle(BOLD);
    text('나비효과', GW / 2, GH / 2 - 20);
    textStyle(NORMAL);
    fill(180, 160, 80, titleAlpha);
    textSize(20);
    text('THE BUTTERFLY EFFECT', GW / 2, GH / 2 + 20);
    pop();
  }

  // 아무 키/클릭 안내 (점멸)
  if (go_timer > 100) {
    go_blinkT++;
    let a = map(abs(sin(go_blinkT * 0.04)), 0, 1, 80, 200);
    push();
    noStroke(); fill(30, 30, 35, a);
    textSize(13); textAlign(CENTER, CENTER); textStyle(NORMAL);
    text('PRESS ANY KEY OR CLICK TO RESTART', GW / 2, GH * 3 / 4);
    pop();
  }

  // 페이드인 (진입 시 검은 화면에서)
  if (go_alpha > 0) {
    go_alpha = max(0, go_alpha - 6);
    push();
    rectMode(CORNER); noStroke();
    fill(0, go_alpha);
    rect(0, 0, GW, GH);
    pop();
  }

  go_timer++;
}

function gameOverMousePressed() {
  if (go_timer < 60) return;
  gameState = 'title';
  enterTitle();
}

function gameOverKeyPressed() {
  if (go_timer < 60) return;
  gameState = 'title';
  enterTitle();
}