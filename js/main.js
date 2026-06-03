// 나비효과 게임 - 메인 (js/main.js)
// 여기에는 p5의 "예약 함수"만 둡니다: setup / draw / mousePressed / keyPressed.
// 이 네 함수는 프로젝트 전체에서 딱 하나씩만 존재할 수 있으므로,
// 실제 로직은 각 씬 파일에 두고 여기서는 gameState를 보고 분배(교통정리)만 합니다.

// ─────────────────────────────────────────────
// [개발용 스위치] 인트로 스킵
//   DEV_SKIP_INTRO = true  → 인트로를 건너뛰고 바로 방에서 시작
//   DEV_START_STAGE        → 방에서 시작할 단계(solvedCount). 0=처음, 3=텀블러 차례 등
//   ⚠ 배포(제출) 전에는 반드시 DEV_SKIP_INTRO = false 로 되돌리세요!
const DEV_SKIP_INTRO = true;
const DEV_START_STAGE = 0;
// ─────────────────────────────────────────────

function setup() {
  // 캔버스를 창 전체 크기로 (풀스크린). 게임은 GW×GH 가상 좌표 위에 그리고
  // draw()에서 통째로 확대/중앙정렬합니다.
  createCanvas(windowWidth, windowHeight);
  noSmooth();          // 픽셀 느낌
  rectMode(CENTER);
  textFont('Courier New');

  updateView();        // 배율/오프셋 계산

  // 첫 씬 진입
  if (DEV_SKIP_INTRO) {
    // 인트로 건너뛰고 방에서 시작 (개발용)
    gameState = 'room';
    enterRoom();
    solvedCount = DEV_START_STAGE; // 원하는 단계부터 테스트
  } else {
    enterIntro();
  }
}

// 창 크기가 바뀌면 캔버스도 따라 키우고 배율 재계산
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateView();
}

function draw() {
  // 레터박스 여백 색 (게임 영역 바깥). 어두운 톤으로 깔아 여백이 거슬리지 않게.
  background(15, 14, 20);

  // 여기서부터 게임 가상 좌표(0..GW, 0..GH) 공간. 통째로 확대/중앙정렬.
  push();
  translate(viewOffX, viewOffY);
  scale(viewScale);

  // gameState에 따라 해당 씬의 매 프레임 함수 호출
  switch (gameState) {
    case 'intro':
      updateIntro();
      break;
    case 'room':
      updateRoom();
      break;
    case 'minigame_sink':
      updateSinkGame();
      break;
    // 앞으로: 다른 미니게임, 'ending' ...
  }

  pop();
}

function mousePressed() {
  switch (gameState) {
    case 'intro':
      introMousePressed();
      break;
    case 'room':
      roomMousePressed();
      break;
    case 'minigame_sink':
      sinkMousePressed();
      break;
  }
}

function keyPressed() {
  switch (gameState) {
    case 'intro':
      introKeyPressed();
      break;
    case 'room':
      roomKeyPressed();
      break;
    case 'minigame_sink':
      sinkKeyPressed();
      break;
  }
}