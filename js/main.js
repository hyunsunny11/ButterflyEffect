// 나비효과 게임 - 메인 (js/main.js)
// 여기에는 p5의 "예약 함수"만 둡니다: setup / draw / mousePressed / keyPressed.
// 이 네 함수는 프로젝트 전체에서 딱 하나씩만 존재할 수 있으므로,
// 실제 로직은 각 씬 파일에 두고 여기서는 gameState를 보고 분배(교통정리)만 합니다.
let doomSound;
let waterSound;
let underTheSeaSound;
let prevRoomHoverId = null;
let mouseoverSound;
let newsSound;

function preload() {
  introSound           = loadSound('assets/sounds/intro.mp3');
  minigameSuccessSound = loadSound('assets/sounds/minigame_s.mp3');
  minigameFailSound    = loadSound('assets/sounds/minigame_f.mp3');
  errorSound           = loadSound('assets/sounds/error.mp3');
  wasteSound           = loadSound('assets/sounds/waste.mp3');
  sink_waterSound      = loadSound('assets/sounds/sink.mp3');
  doomSound            = loadSound('assets/sounds/doom.mp3');
  waterSound           = loadSound('assets/sounds/water.mp3');
  underTheSeaSound     = loadSound('assets/sounds/underthesea.mp3');
  mouseoverSound       = loadSound('assets/sounds/mouseover.mp3');
  newsSound            = loadSound('assets/sounds/news.wav');
  recycleCorrectSound  = loadSound('assets/sounds/recycle_correct.mp3');
  recycleWrongSound    = loadSound('assets/sounds/recycle_wrong.mp3');
}

// ─────────────────────────────────────────────
// [개발용 스위치] 인트로 스킵
//   DEV_SKIP_INTRO = true  → 인트로를 건너뛰고 바로 방에서 시작
//   DEV_START_STAGE        → 방에서 시작할 단계(solvedCount). 0=처음, 3=텀블러 차례 등
//   ⚠ 배포(제출) 전에는 반드시 DEV_SKIP_INTRO = false 로 되돌리세요!
const DEV_SKIP_INTRO = false;
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
    gameState = 'title';
    enterTitle();
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
    case 'title':
      updateTitle();
      break;
    case 'gameover':
      updateGameOver();
      break;
    case 'intro':
      updateIntro();
      break;
    case 'room':
      updateRoom();
      break;
    case 'minigame_sink':
      updateSinkGame();
      break;
    case 'minigame_recycle':
      updateRecycleGame();
      break;
    case 'minigame_computer':
      updateComputer();
      break;
    case 'minigame_tv':
      updateTV();
      break;
    case 'minigame_tumbler':
      updateTumblerGame();
      break;
    case 'ending_earth':
      updateEarthEnding();
      break;
    case 'ending_penguin':
      updatePenguinEnding();
      break;
    case 'ending_sinkhole':
      updateSinkholeEnding();
      break;
    case 'ending_tree':
      updateTreeEnding();
      break;
    case 'ending_desert':
      updateDesertEnding();
      break;
    case 'ending_polarbear':
      updatePolarbearEnding();
      break;
    case 'ending_clear':
      updateClearEnding();
      break;
    // 앞으로: 다른 미니게임, 'ending' ...
  }

  pop();
}

function mousePressed() {
  switch (gameState) {
    case 'title':
      titleMousePressed();
      break;
    case 'gameover':
      gameOverMousePressed();
      break;
    case 'intro':
      introMousePressed();
      break;
    case 'room':
      roomMousePressed();
      break;
    case 'minigame_sink':
      sinkMousePressed();
      break;
    case 'minigame_recycle':
      recycleMousePressed();
      break;
    case 'minigame_computer':
      computerMousePressed();
      break;
    case 'minigame_tv':
      tvMousePressed();
      break;
    case 'minigame_tumbler':
      tumblerMousePressed();
      break;
    case 'ending_earth':
      earthEndingMousePressed();
      break;
    case 'ending_penguin':
      penguinEndingMousePressed();
      break;
    case 'ending_sinkhole':
      sinkholeEndingMousePressed();
      break;
    case 'ending_tree':
      treeEndingMousePressed();
      break;
    case 'ending_desert':
      desertEndingMousePressed();
      break;
    case 'ending_polarbear':
      polarbearEndingMousePressed();
      break;
    case 'ending_clear':
      clearEndingMousePressed();
      break;
  }
}

function keyPressed() {
  // R키: 언제든 타이틀로 리셋
  if (key === 'r' || key === 'R' || key === 'ㄱ') {
    if (typeof introSound !== 'undefined' && introSound && introSound.isPlaying()) {
      introSound.stop();
    }
    gameState = 'title';
    enterTitle();
    return;
  }

  switch (gameState) {
    case 'title':
      titleKeyPressed();
      break;
    case 'gameover':
      gameOverKeyPressed();
      break;
    case 'intro':
      introKeyPressed();
      break;
    case 'room':
      roomKeyPressed();
      break;
    case 'minigame_sink':
      sinkKeyPressed();
      break;
    case 'minigame_recycle':
      recycleKeyPressed();
      break;
    case 'minigame_computer':
      computerKeyPressed();
      break;
    case 'minigame_tv':
      tvKeyPressed();
      break;
    case 'minigame_tumbler':
      tumblerKeyPressed();
      break;
    case 'ending_earth':
      earthEndingKeyPressed();
      break;
    case 'ending_penguin':
      penguinEndingKeyPressed();
      break;
    case 'ending_sinkhole':
      sinkholeEndingKeyPressed();
      break;
    case 'ending_tree':
      treeEndingKeyPressed();
      break;
    case 'ending_desert':
      desertEndingKeyPressed();
      break;
    case 'ending_polarbear':
      polarbearEndingKeyPressed();
      break;
    case 'ending_clear':
      clearEndingKeyPressed();
      break;
  }
}

// ★ TV 미니게임은 드래그가 필요하므로 p5 예약 함수 추가
function mouseDragged() {
  if (gameState === 'minigame_tv') tvMouseDragged();
}

function mouseReleased() {
  if (gameState === 'minigame_tv') tvMouseReleased();
}