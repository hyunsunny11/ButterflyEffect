// 나비효과 게임 - 방 씬 (scenes/room.js)
// 1단계: 6개 오브젝트 + 현관문 배치 / 마우스 오버 글로우 / 클릭 판정.
// (다음 단계) 순서 상태머신(solvedCount 순서 위반 감지) → 미니게임 연결 → 엔딩.
//
// 좌표는 모두 게임 가상 해상도(GW=680, GH=480) 기준입니다.
// 클릭/오버 판정은 mouseX 대신 반드시 vmouseX()/vmouseY()를 씁니다.
//
// 씬 함수 세트:
//   enterRoom()         : 방 진입 시 오브젝트 구성/초기화
//   updateRoom()        : 매 프레임 로직 + 드로잉
//   roomMousePressed()  : 클릭 판정
//   roomKeyPressed()    : 키 입력

// ── 방 전용 전역 변수 ──
let roomObjects = [];     // 클릭 가능한 오브젝트 목록
let roomHoverId = null;   // 현재 마우스가 올라간 오브젝트 id
let roomLastClicked = ''; // 마지막으로 클릭한 오브젝트 라벨 (확인용 표시)
let roomFlash = 0;        // 클릭 피드백 깜빡임 타이머

// 오브젝트 정의 (center x, y + w, h). rectMode(CENTER) 기준.
//   id      : 내부 식별자 (미니게임 연결 키로도 사용 예정)
//   label   : 화면 표시 이름
//   x,y,w,h : 위치/크기
//   col     : 기본 색
//   needSolved : 이 값(클리어 수) 이상이어야 활성화. 0이면 항상 활성.
//   alwaysOn   : true면 항상 클릭 가능 (현관문)
function buildRoomObjects() {
  return [
    { id: 'light',   label: '조명',     x: 340, y: 26,  w: 96,  h: 26,  col: [196, 180, 120], needSolved: 0 },
    { id: 'tv',      label: 'TV',       x: 340, y: 176, w: 260, h: 170, col: [70, 80, 100],   needSolved: 0 },
    { id: 'sink',    label: '싱크대',   x: 64,  y: 250, w: 128, h: 96,  col: [120, 140, 150], needSolved: 0 },
    { id: 'recycle', label: '분리수거', x: 112, y: 441, w: 96,  h: 78,  col: [90, 150, 110],  needSolved: 0 },
    { id: 'computer',label: '컴퓨터',   x: 540, y: 250, w: 128, h: 96,  col: [80, 110, 150],  needSolved: 0 },
    // 텀블러: 싱크대 위에 올림 (싱크대 윗면 y=202에 닿게). 3단계 클리어 전까지 비활성
    { id: 'tumbler', label: '텀블러',   x: 64,  y: 170, w: 40,  h: 64,  col: [150, 120, 90],  needSolved: 3 },
    // 현관문: 항상 클릭 가능. 가로 64, 최하단이 바닥 경계선(y=358)에 닿게, 우측 벽에 붙임.
    { id: 'door',    label: '현관문',   x: 648, y: 240, w: 64,  h: 236, col: [110, 84, 60],   needSolved: 0, alwaysOn: true },
  ];
}

// 오브젝트 활성화 여부 (solvedCount 기준)
function isObjEnabled(o) {
  if (o.alwaysOn) return true;
  return solvedCount >= (o.needSolved || 0);
}

// ── 방 진입(초기화) ──
function enterRoom() {
  roomObjects = buildRoomObjects();
  roomHoverId = null;
  roomLastClicked = '';
  roomFlash = 0;
}

// ── 매 프레임: 로직 + 드로잉 ──
function updateRoom() {
  // 1) 오버 판정 (활성 오브젝트만)
  roomHoverId = null;
  let mx = vmouseX(), my = vmouseY();
  for (let o of roomObjects) {
    if (!isObjEnabled(o)) continue;
    if (abs(mx - o.x) <= o.w / 2 && abs(my - o.y) <= o.h / 2) {
      roomHoverId = o.id;
    }
  }
  if (roomFlash > 0) roomFlash--;

  // 2) 드로잉
  drawRoomBackground();
  for (let o of roomObjects) drawRoomObject(o);
  drawRoomHud();
}

// 방 배경: 벽 + 바닥
function drawRoomBackground() {
  noStroke();
  rectMode(CORNER);
  // 벽
  fill(54, 52, 64);
  rect(0, 0, GW, 360);
  // 바닥
  fill(40, 36, 44);
  rect(0, 360, GW, GH - 360);
  // 바닥 경계선
  fill(28, 26, 32);
  rect(0, 358, GW, 4);
  rectMode(CENTER);
}

// 오브젝트 하나 그리기 (도형 + 라벨 + 오버 글로우)
function drawRoomObject(o) {
  let enabled = isObjEnabled(o);
  let hovered = (roomHoverId === o.id);

  // 글로우 (오버 + 활성일 때만)
  if (hovered && enabled) {
    noFill();
    for (let g = 3; g >= 1; g--) {
      stroke(255, 240, 140, 60 / g);
      strokeWeight(g * 4);
      rect(o.x, o.y, o.w + g * 6, o.h + g * 6, 6);
    }
  }

  // 본체
  noStroke();
  if (enabled) {
    // 오버 시 살짝 밝게
    let b = hovered ? 35 : 0;
    fill(o.col[0] + b, o.col[1] + b, o.col[2] + b);
  } else {
    // 비활성: 어둡게
    fill(o.col[0] * 0.4, o.col[1] * 0.4, o.col[2] * 0.4);
  }
  rect(o.x, o.y, o.w, o.h, 6);

  // 테두리
  stroke(enabled ? 200 : 90, enabled ? 200 : 90, enabled ? 210 : 100, 120);
  strokeWeight(1.5);
  noFill();
  rect(o.x, o.y, o.w, o.h, 6);
  noStroke();

  // 라벨
  fill(enabled ? 245 : 130);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(13);
  text(o.label, o.x, o.y);
  textStyle(NORMAL);

  // 비활성 안내 (텀블러 등)
  if (!enabled) {
    fill(220, 200, 120, 200);
    textSize(9);
    text('잠김 (' + o.needSolved + '개 클리어 후)', o.x, o.y + o.h / 2 + 10);
  }
}

// 상단 HUD + 클릭 피드백
function drawRoomHud() {
  // 진행도
  noStroke();
  fill(235, 235, 245);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(14);
  text('해결: ' + solvedCount + ' / 5', 14, 12);
  textStyle(NORMAL);

  // 클릭 확인 피드백 (임시 — 미니게임 연결 전까지 동작 확인용)
  if (roomFlash > 0 && roomLastClicked) {
    let a = map(roomFlash, 0, 30, 0, 255);
    fill(255, 240, 140, a);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('클릭: ' + roomLastClicked, GW / 2, GH - 30);
  }
}

// ── 입력 ──
function roomMousePressed() {
  let mx = vmouseX(), my = vmouseY();
  for (let o of roomObjects) {
    if (abs(mx - o.x) <= o.w / 2 && abs(my - o.y) <= o.h / 2) {
      if (!isObjEnabled(o)) {
        // 비활성 오브젝트 클릭: 잠김 표시
        roomLastClicked = o.label + ' (잠김)';
        roomFlash = 30;
        return;
      }
      // 활성 오브젝트 클릭
      roomLastClicked = o.label;
      roomFlash = 30;
      console.log('[room] 클릭:', o.id);
      // TODO(다음 단계): 순서 판정 → 맞으면 해당 미니게임 진입, 틀리면 페널티/엔딩
      //   예) gameState = 'minigame_' + o.id; enterXxx();
      return;
    }
  }
}

function roomKeyPressed() {
  // (다음 단계) 필요 시 키 입력
}