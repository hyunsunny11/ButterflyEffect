// 나비효과 게임 - 방 씬 (scenes/room.js)
// 순서 상태머신 + 1단계(첫 화면) 상호작용 + 물 차오름 페널티.
//
// 정답 순서: 싱크대(sink) → 분리수거(recycle) → 컴퓨터(computer)
//            → 텀블러(tumbler) → TV(tv) → 조명(light)
// solvedCount(0~6) = 진행 단계. 단계별 배경 이미지(room_bg .. room_bg5).
//   6: 조명까지 끔 → 코드로 암전 + 현관문만 빛남.
//
// === 이번 작업: 1단계(solvedCount===0) 첫 화면 ===
//   클릭 반응:
//     - 수도꼭지(sink): 물 멈추고 1단계 완료 (임시 통과; 추후 미니게임 연결)
//     - 분리수거(recycle): "아… 분리수거 좀 귀찮은데, 이건 조금 이따 하자!" 팝업
//     - 컴퓨터(computer): "조금 이따 게임하려고 켜둔 거야." 팝업
//     - TV(tv): "9시 뉴스 봐야 해!" 말풍선 (TV 위)
//     - 조명(light): 화면 암전 → 5초 후 "불은 나갈 때 끄도록 하자…" 팝업 후 복귀
//     - 현관문(door): 그 시점 단계 엔딩 (0단계=지구멸망)
//   물 페널티(1단계 한정):
//     - 진입 5초 후 물이 화면 하단부터 차오르기 시작
//     - 10초에 걸쳐 일정 속도로 차오름 → 다 차면 익사(바다생물 + 리스타트)
//     - 수도꼭지 클릭 시 물 멈춤
//
// 좌표는 게임 가상 해상도(GW=680, GH=480) 기준. 클릭 판정은 vmouseX()/vmouseY().

const ROOM_ORDER = ['sink', 'recycle', 'computer', 'tumbler', 'tv', 'light'];

// ── 방 전용 전역 변수 ──
let roomBgs = {};
let roomObjects = [];
let roomHoverId = null;
let roomEnding = null;
let roomDebugBoxes = false;

// 팝업 / 말풍선
let roomPopup = '';        // 화면 중단 팝업 텍스트
let roomPopupT = 0;        // 팝업 남은 프레임
let roomBubble = '';       // TV 위 말풍선 텍스트
let roomBubbleT = 0;

// 조명 임시 암전(1단계에서 조명 누름)
let lightDarkT = 0;        // >0이면 암전 중. 카운트다운.

// 물 페널티 상태
let roomEnterFrame = 0;    // 방 진입 시각(frameCount)
let waterStarted = false;  // 물이 차기 시작했나
let waterStartFrame = 0;   // 물 시작 시각
let waterLevel = 0;        // 0~1 (화면 하단부터 차오른 비율)
let drowned = false;       // 다 잠겼나
const WATER_DELAY = 300;   // 진입 후 5초(60fps*5)
const WATER_RISE = 600;    // 10초에 걸쳐 차오름

function buildRoomObjects() {
  return [
    { id: 'light',   label: '조명',     x: 562, y: 199, w: 12,  h: 20  },
    { id: 'tv',      label: 'TV',       x: 299, y: 225, w: 148, h: 99  },
    { id: 'sink',    label: '싱크대',   x: 102, y: 273, w: 170, h: 146 },
    { id: 'recycle', label: '분리수거', x: 107, y: 395, w: 147, h: 81  },
    { id: 'computer',label: '컴퓨터',   x: 491, y: 229, w: 70,  h: 47  },
    { id: 'tumbler', label: '텀블러',   x: 61,  y: 145, w: 23,  h: 40  },
    { id: 'door',    label: '현관문',   x: 623, y: 213, w: 86,  h: 230 },
  ];
}

function nextCorrectId() {
  return solvedCount < ROOM_ORDER.length ? ROOM_ORDER[solvedCount] : null;
}

function isObjEnabled(o) {
  if (o.id === 'door') return true;
  let idx = ROOM_ORDER.indexOf(o.id);
  if (idx < solvedCount) return false;          // 이미 처리됨
  if (solvedCount >= ROOM_ORDER.length) return false; // 암전
  // 텀블러: 자기 차례(=3단계)가 오기 전엔 순수 장식. 호버/클릭/페널티 모두 없음.
  if (o.id === 'tumbler' && solvedCount !== ROOM_ORDER.indexOf('tumbler')) return false;
  return true;
}

function isBlackout() { return solvedCount >= ROOM_ORDER.length; }

function enterRoom(startStage) {
  if (!roomBgs[0]) {
    roomBgs[0] = loadImage('assets/room_bg.png');
    roomBgs[1] = loadImage('assets/room_bg1.png');
    roomBgs[2] = loadImage('assets/room_bg2.png');
    roomBgs[3] = loadImage('assets/room_bg3.png');
    roomBgs[4] = loadImage('assets/room_bg4.png');
    roomBgs[5] = loadImage('assets/room_bg5.png');
  }
  roomObjects = buildRoomObjects();
  roomHoverId = null;
  roomEnding = null;
  roomPopup = ''; roomPopupT = 0;
  roomBubble = ''; roomBubbleT = 0;
  lightDarkT = 0;
  solvedCount = (startStage !== undefined) ? startStage : 0;
  // 물 페널티 초기화
  roomEnterFrame = frameCount;
  waterStarted = false;
  waterStartFrame = 0;
  waterLevel = 0;
  drowned = false;
}

// 1단계에서만 물 페널티 작동
function waterActive() { return solvedCount === 0 && !roomEnding; }

// 미니게임 클리어 후 방으로 복귀 (solvedCount는 그대로 유지)
function roomReenterAfterMinigame() {
  roomObjects = buildRoomObjects();
  roomHoverId = null;
  roomEnding = null;
  roomPopup = ''; roomPopupT = 0;
  roomBubble = ''; roomBubbleT = 0;
  lightDarkT = 0;
  // 물 페널티는 1단계(solvedCount===0)에서만 작동하므로, 단계가 올라갔으면 자동으로 꺼짐
  roomEnterFrame = frameCount;
  waterStarted = false;
  waterStartFrame = 0;
  waterLevel = 0;
  drowned = false;
}

function updateRoom() {
  if (roomEnding) { drawEnding(); return; }

  // ── 익사 상태: 물 가득 + 바다생물 + 리스타트 ──
  if (drowned) { drawDrowned(); return; }

  // ── 물 타이머 갱신 (1단계 한정) ──
  if (waterActive()) {
    let elapsed = frameCount - roomEnterFrame;
    if (!waterStarted && elapsed >= WATER_DELAY) {
      waterStarted = true;
      waterStartFrame = frameCount;
    }
    if (waterStarted) {
      let we = frameCount - waterStartFrame;
      waterLevel = constrain(we / WATER_RISE, 0, 1);
      if (waterLevel >= 1) { drowned = true; }
    }
  }

  // 타이머 감소
  if (roomPopupT > 0) roomPopupT--;
  if (roomBubbleT > 0) roomBubbleT--;
  if (lightDarkT > 0) {
    lightDarkT--;
    // 암전 끝나는 순간 팝업
    if (lightDarkT === 0) {
      roomPopup = '불은 나갈 때 끄도록 하자…';
      roomPopupT = 180;
    }
  }

  // 오버 판정
  roomHoverId = null;
  let mx = vmouseX(), my = vmouseY();
  for (let o of roomObjects) {
    if (abs(mx - o.x) <= o.w / 2 && abs(my - o.y) <= o.h / 2) {
      if (isBlackout() && o.id !== 'door') continue;
      if (!isBlackout() && !isObjEnabled(o)) continue;
      roomHoverId = o.id;
    }
  }

  // ── 드로잉 ──
  drawStageBackground();

  // 조명 임시 암전 중이면 화면 덮기 (물/오브젝트보다 위)
  if (lightDarkT > 0) {
    push(); rectMode(CORNER); noStroke(); fill(0); rect(0, 0, GW, GH); pop();
    drawRoomHud();
    return;
  }

  for (let o of roomObjects) drawRoomObject(o);

  // 물 차오름
  if (waterStarted) drawWater();

  // TV 말풍선
  if (roomBubbleT > 0) drawBubble();

  drawRoomHud();
}

function drawStageBackground() {
  if (isBlackout()) {
    background(0);
    push(); rectMode(CENTER); noStroke();
    let door = roomObjects.find(o => o.id === 'door');
    if (door) {
      for (let g = 5; g >= 1; g--) { fill(255, 235, 170, 10); rect(door.x, door.y, door.w + g * 8, door.h + g * 4, 6); }
      fill(20, 16, 10); rect(door.x, door.y, door.w, door.h);
    }
    pop();
    return;
  }
  let img = roomBgs[solvedCount] || roomBgs[0];
  if (img && img.width > 1) {
    push(); imageMode(CORNER); image(img, 0, 0, GW, GH); pop();
  } else {
    push(); rectMode(CORNER); noStroke(); fill(40, 38, 48); rect(0, 0, GW, GH);
    fill(180); textAlign(CENTER, CENTER); textSize(12); text('배경 불러오는 중...', GW / 2, GH / 2); pop();
  }
}

function drawRoomObject(o) {
  let hovered = (roomHoverId === o.id);
  if (!hovered) { if (roomDebugBoxes) drawDebugBox(o); return; }
  push(); rectMode(CENTER); noFill();
  let warm = (isBlackout() && o.id === 'door');
  for (let g = 4; g >= 1; g--) {
    if (warm) stroke(255, 220, 120, 70 / g); else stroke(255, 240, 150, 50 / g);
    strokeWeight(g * 4);
    rect(o.x, o.y, o.w + g * 5, o.h + g * 5, 8);
  }
  noStroke(); fill(255, 245, 180, warm ? 40 : 22); rect(o.x, o.y, o.w, o.h, 6);
  pop();
  if (roomDebugBoxes) drawDebugBox(o);
}

function drawDebugBox(o) {
  push(); rectMode(CENTER); noFill();
  stroke(isObjEnabled(o) ? color(120, 220, 160) : color(220, 120, 120));
  strokeWeight(1); rect(o.x, o.y, o.w, o.h);
  noStroke(); fill(255); textAlign(CENTER, CENTER); textSize(9); text(o.label, o.x, o.y); pop();
}

// ── 물 차오름 이펙트 ──
function drawWater() {
  let topY = GH * (1 - waterLevel); // 수면 y
  push();
  rectMode(CORNER);
  noStroke();
  // 물 본체 (반투명 파랑, 위로 갈수록 옅게)
  for (let y = topY; y < GH; y += 4) {
    let d = (y - topY) / (GH - topY + 1);
    fill(40, 110, 170, 90 + d * 70);
    rect(0, y, GW, 4);
  }
  // 수면 물결 (사인파)
  fill(180, 220, 240, 150);
  for (let x = 0; x < GW; x += 6) {
    let wy = topY + sin((x * 0.05) + frameCount * 0.15) * 3;
    rect(x, wy, 6, 3);
  }
  // 기포 몇 개
  fill(220, 240, 250, 120);
  for (let i = 0; i < 8; i++) {
    let bx = (i * 97 + frameCount * 1.3) % GW;
    let by = topY + ((i * 53 + frameCount * 2) % (GH - topY + 1));
    rect(bx, by, 3, 3);
  }
  pop();
}

function drawRoomHud() {
  push(); noStroke();
  fill(isBlackout() ? color(120, 110, 90) : color(235, 235, 245));
  textAlign(LEFT, TOP); textStyle(BOLD); textSize(14);
  text('해결: ' + solvedCount + ' / 6', 14, 12);
  textStyle(NORMAL);

  // TV 위 ~ 전등 사이 단계별 메시지 (solvedCount 0~5, 6은 암전이라 표시 안 함)
  const STAGE_MSGS = [
    '문을 열고 나가세요!',
    '이제 문을 열고 나가세요!',
    '이젠 진짜에요. 문을 열고 나가세요!',
    '문은 화면 오른쪽에 있습니다. 알고 계시죠?',
    '집돌이, 집순이신가요? 좀 나갑시다…',
    '이젠 저도 모르겠습니다. 알아서 하세요.',
  ];
  if (!isBlackout() && solvedCount < STAGE_MSGS.length) {
    const msg = STAGE_MSGS[solvedCount];
    // TV 오른쪽 끝(373)과 전등(562) 사이 중앙, TV 상단(175) 근처
    const mx = 330, my = 80;
    rectMode(CENTER); textSize(12); textAlign(CENTER, CENTER);
    const tw = max(140, textWidth(msg) + 24);
    fill(20, 20, 26, 180);
    rect(mx, my, tw, 28, 6);
    fill(255, 240, 180);
    text(msg, mx, my);
  }

  // 중단부 팝업
  if (roomPopupT > 0) {
    let a = min(255, roomPopupT * 4);
    rectMode(CENTER); noStroke();
    fill(0, 0, 0, a * 0.7);
    let w = textWidth ? 0 : 0; // placeholder
    textSize(16); textAlign(CENTER, CENTER);
    let tw = max(260, textWidth(roomPopup) + 40);
    fill(20, 20, 26, a * 0.85);
    rect(GW / 2, GH / 2, tw, 46, 8);
    fill(255, 240, 180, a);
    text(roomPopup, GW / 2, GH / 2);
  }
  pop();
}


// ── 익사 화면 ──
function drawDrowned() {
  push();
  // 전체 물
  background(20, 70, 120);
  rectMode(CORNER); noStroke();
  for (let y = 0; y < GH; y += 4) {
    fill(30, 90 + (y / GH) * 40, 150 + (y / GH) * 40, 60);
    rect(0, y, GW, 4);
  }
  // 바다생물 (코드 픽셀아트)
  drawSeaCreatures();
  // 안내
  fill(255, 255, 255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(26);
  text('집이 물에 잠겼습니다', GW / 2, GH / 2 - 20);
  textStyle(NORMAL); textSize(13); fill(220, 235, 245);
  text('지구가 멸망하기 전에, 집이 먼저 잠겼습니다.', GW / 2, GH / 2 + 12);
  let blink = map(abs(sin(frameCount * 0.05)), 0, 1, 110, 230);
  fill(255, 255, 255, blink); textSize(14);
  text('Press any key or click to restart', GW / 2, GH - 40);
  pop();
}

// 고래 + 물고기 + 불가사리 픽셀아트 (떠다님)
function drawSeaCreatures() {
  push(); noStroke();
  // 고래 (왼쪽에서 천천히 이동)
  let wx = (frameCount * 0.4) % (GW + 200) - 100;
  let wy = GH * 0.35 + sin(frameCount * 0.02) * 12;
  drawWhale(wx, wy);
  // 물고기 떼 (오른쪽→왼쪽)
  for (let i = 0; i < 5; i++) {
    let fx = GW - ((frameCount * (1.0 + i * 0.3) + i * 130) % (GW + 120)) + 60;
    let fy = GH * 0.2 + i * 55 + sin(frameCount * 0.04 + i) * 8;
    drawFish(fx, fy, i % 2 === 0 ? color(255, 180, 80) : color(120, 200, 220));
  }
  // 불가사리 (바닥에 고정)
  drawStarfish(GW * 0.2, GH - 30, color(255, 140, 90));
  drawStarfish(GW * 0.7, GH - 22, color(255, 170, 110));
  pop();
}

function drawWhale(x, y) {
  push(); translate(x, y); noStroke();
  fill(90, 120, 160);
  rect(0, 0, 90, 40, 18);          // 몸통
  triangle(85, 20, 110, 5, 110, 35); // 꼬리
  fill(150, 175, 200);
  rect(8, 22, 70, 16, 8);          // 배 (밝은색)
  fill(20, 30, 45);
  ellipse(22, 14, 6, 6);           // 눈
  // 물줄기
  fill(180, 220, 240, 160);
  rect(30, -16, 4, 14); rect(36, -22, 4, 20); rect(42, -16, 4, 14);
  pop();
}

function drawFish(x, y, c) {
  push(); translate(x, y); noStroke();
  fill(c);
  ellipse(0, 0, 26, 16);           // 몸
  triangle(10, 0, 22, -8, 22, 8);  // 꼬리
  fill(255); ellipse(-7, -2, 5, 5);
  fill(0); ellipse(-7, -2, 2, 2);  // 눈
  pop();
}

function drawStarfish(x, y, c) {
  push(); translate(x, y); fill(c); noStroke();
  for (let i = 0; i < 5; i++) {
    let a = (TWO_PI / 5) * i - HALF_PI;
    let px = cos(a) * 14, py = sin(a) * 14;
    triangle(0, 0, cos(a - 0.4) * 6, sin(a - 0.4) * 6, px, py);
    triangle(0, 0, cos(a + 0.4) * 6, sin(a + 0.4) * 6, px, py);
  }
  fill(255, 255, 255, 120); ellipse(0, 0, 6, 6);
  pop();
}

// ── 입력 ──
function roomMousePressed() {
  if (roomEnding) { enterRoom(); return; }
  if (drowned) { enterRoom(); return; }
  if (lightDarkT > 0) return; // 암전 중엔 입력 무시

  let mx = vmouseX(), my = vmouseY();
  for (let o of roomObjects) {
    if (!(abs(mx - o.x) <= o.w / 2 && abs(my - o.y) <= o.h / 2)) continue;

    if (o.id === 'door') { showEnding(solvedCount); return; }
    if (isBlackout()) return;
    if (!isObjEnabled(o)) { return; }

    // ── 1단계(첫 화면) 전용 반응 ──
    if (solvedCount === 0) {
      handleStage1Click(o);
      return;
    }

    // ── 2단계 이후: 정답 순서 판정 ──
    if (o.id === nextCorrectId()) {
      // 해당 오브젝트의 미니게임으로 진입 (있으면). 없으면 임시로 단계만 올림.
      launchMinigameFor(o.id);
    } else {
      // 조명은 순서와 무관하게 클릭하면 항상 암전 효과
      if (o.id === 'light') {
        lightDarkT = 300;
        return;
      }
      roomPopup = '아직 순서가 아니에요! (먼저 ' + labelOf(nextCorrectId()) + ')';
      roomPopupT = 120;
    }
    return;
  }
}

// 오브젝트 → 미니게임 진입. 아직 미니게임이 없는 건 임시로 단계만 올림.
function launchMinigameFor(id) {
  switch (id) {
    case 'recycle':
      gameState = 'minigame_recycle';
      enterRecycleGame();
      break;
    case 'computer':
      gameState = 'minigame_computer';
      enterComputer();
      break;
    case 'tv':
      gameState = 'minigame_tv';
      enterTV();
      break;
    // (다음) case 'computer': gameState='minigame_computer'; enterComputerGame(); break;
    //        case 'tumbler': ... / case 'light': ...
    default:
      // 미니게임 미연결 오브젝트: 임시 통과 (단계만 +1)
      solvedCount++;
      break;
  }
}

// 1단계 클릭 반응
function handleStage1Click(o) {
  switch (o.id) {
    case 'sink':
      // 수도꼭지 미니게임으로 이동 (물 페널티 멈춤). 클리어 시 sinkComplete()가 1단계 완료 처리.
      waterStarted = false; waterLevel = 0; drowned = false;
      gameState = 'minigame_sink';
      enterSinkGame();
      break;
    case 'recycle':
      roomPopup = "'아… 분리수거 좀 귀찮은데, 이건 조금 이따 하자!'";
      roomPopupT = 120;
      break;
    case 'computer':
      roomPopup = "'조금 이따 게임하려고 켜둔 거야.'";
      roomPopupT = 120;
      break;
    case 'tv':
      roomPopup = "'9시 뉴스 봐야 해!'";
      roomPopupT = 120;
      break;
    case 'light':
      // 화면 암전 5초 후 팝업
      lightDarkT = 300;
      break;
  }
}

function labelOf(id) {
  let o = roomObjects.find(x => x.id === id);
  return o ? o.label : id;
}

function roomKeyPressed() {
  if (roomEnding) { enterRoom(); return; }
  if (drowned) { enterRoom(); return; }
}

// ── 엔딩 ──
const ENDINGS = [
  { stage: 0, title: '지구가 멸망했습니다', desc: '아무것도 하지 않은 채 떠난 당신. 불바다가 된 지구.' },
  { stage: 1, title: '펭귄들은 단결했습니다', desc: '쓰레기가 범람하자, 펭귄들이 들고일어났습니다.' },
  { stage: 2, title: '땅이 꺼졌습니다 — 싱크홀', desc: '끝없는 채굴 끝에 땅이 무너져 내렸습니다.' },
  { stage: 3, title: '거목이 쓰러졌습니다', desc: '당신이 목을 축이는 동안, 숲의 거목이 쓰러졌습니다.' },
  { stage: 4, title: '태양이 삼켜졌습니다 — 사막', desc: '밝고 찬란한 화면이, 끝내 태양을 삼켰습니다.' },
  { stage: 5, title: '그는 어둠에 빠졌습니다', desc: '당신의 불빛이 북극곰을 영원한 어둠에 빠뜨렸습니다.' },
  { stage: 6, title: '따스한 햇살이 들어옵니다', desc: '모든 것을 끄고 떠난 당신. 현관문 아래로 햇살이.', happy: true },
];

function showEnding(stage) {
  // 0단계 → 불타는 지구 엔딩 씬
  if (stage === 0) {
    gameState = 'ending_earth';
    enterEarthEnding();
    return;
  }
  // 1단계 → 펭귄 단결 엔딩 씬
  if (stage === 1) {
    gameState = 'ending_penguin';
    enterPenguinEnding();
    return;
  }
  // 2단계 → 싱크홀 엔딩 씬 (싱크대+분리수거 후 나감)
  if (stage === 2) {
    gameState = 'ending_sinkhole';
    enterSinkholeEnding();
    return;
  }
  // 3단계 → 거목 엔딩 씬 (텀블러 미완료 후 나감)
  if (stage === 3) {
    gameState = 'ending_tree';
    enterTreeEnding();
    return;
  }
  // 4단계 → 사막 엔딩 씬 (TV 미완료 후 나감)
  if (stage === 4) {
    gameState = 'ending_desert';
    enterDesertEnding();
    return;
  }
  // 5단계 → 북극곰 침수 엔딩 씬 (조명 미완료 후 나감)
  if (stage === 5) {
    gameState = 'ending_polarbear';
    enterPolarbearEnding();
    return;
  }
  // 6단계 → 최종 클리어 엔딩 씬 (모든 단계 완료)
  if (stage === 6) {
    gameState = 'ending_clear';
    enterClearEnding();
    return;
  }
  // 그 외 단계 → 기존 텍스트 엔딩
  roomEnding = ENDINGS[constrain(stage, 0, 6)];
}

function drawEnding() {
  push();
  let happy = roomEnding.happy;
  background(happy ? color(40, 36, 28) : color(12, 10, 14));
  rectMode(CENTER); noStroke();
  fill(happy ? color(255, 224, 130) : color(230, 90, 70));
  textAlign(CENTER, CENTER); textStyle(BOLD); textSize(30);
  text(roomEnding.title, GW / 2, GH / 2 - 30);
  fill(220, 215, 220); textStyle(NORMAL); textSize(14);
  text(roomEnding.desc, GW / 2, GH / 2 + 14);
  fill(150, 150, 165); textSize(11);
  text('(나간 시점: ' + roomEnding.stage + '/6 단계)', GW / 2, GH / 2 + 46);
  let blink = map(abs(sin(frameCount * 0.05)), 0, 1, 100, 220);
  fill(200, 200, 210, blink); textSize(14);
  text('Press any key or click to restart', GW / 2, GH - 40);
  pop();
}