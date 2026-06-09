// 나비효과 게임 — 공용 컷툰 엔딩 씬 (scenes/endings/cutoon.js)
//
// 사용법:
//   enterCutoon(imageList, returnStage)
//     imageList  : 이미지 경로 배열 (장수 제한 없음)
//     returnStage: 방으로 복귀 시 복원할 solvedCount
//
// 각 엔딩의 enterXxxEnding() 에서 이 함수를 호출하기만 하면 됨.
// 키/클릭 → 다음 컷으로, 마지막 컷 이후 → 방으로 복귀.

let ct_images     = [];   // p5 Image 객체 배열
let ct_paths      = [];   // 경로 배열 (로딩용)
let ct_page       = 0;    // 현재 페이지 (0-based)
let ct_retStage   = 0;    // 복귀 시 solvedCount
let ct_loaded     = [];   // 각 이미지 로드 완료 여부
let ct_inputLock  = false; // 빠른 연속 입력 방지

/* ── 씬 진입 ── */
function enterCutoon(imageList, returnStage) {
  ct_paths    = imageList;
  ct_page     = 0;
  ct_retStage = returnStage;
  ct_images   = [];
  ct_loaded   = [];
  ct_inputLock = false;

  for (let i = 0; i < ct_paths.length; i++) {
    ct_loaded.push(false);
    const idx = i;
    loadImage(
      ct_paths[idx],
      img => { ct_images[idx] = img; ct_loaded[idx] = true; },
      ()  => { ct_loaded[idx] = true; }  // 로드 실패해도 진행
    );
  }
}

/* ── 매 프레임 ── */
function updateCutoon() {
  push();
  rectMode(CORNER);
  background(0);

  // 현재 페이지 이미지
  if (ct_loaded[ct_page] && ct_images[ct_page]) {
    const img = ct_images[ct_page];
    // 화면 비율에 맞춰 letterbox로 꽉 채우기
    const scale = min(GW / img.width, GH / img.height);
    const dw = img.width  * scale;
    const dh = img.height * scale;
    const dx = (GW - dw) / 2;
    const dy = (GH - dh) / 2;
    imageMode(CORNER);
    image(img, dx, dy, dw, dh);
  } else {
    // 로딩 중 표시
    fill(255); textAlign(CENTER, CENTER); textSize(18); textFont('monospace');
    text('로딩 중...', GW / 2, GH / 2);
  }

  // 다음/종료 안내 — 상단 바 (그림 멘트박스와 겹치지 않음)
  const isLast = (ct_page === ct_paths.length - 1);
  const alpha  = 140 + sin(frameCount * 0.07) * 100;
  noStroke();
  fill(0, 160); rect(0, 0, GW, 28);
  // 페이지 표시 (좌측)
  fill(255, 180); textAlign(LEFT, CENTER); textSize(13); textFont('monospace');
  text((ct_page + 1) + ' / ' + ct_paths.length, 14, 14);
  // 안내 문구 (우측)
  fill(255, alpha); textAlign(RIGHT, CENTER); textSize(13);
  text(isLast ? 'PRESS ANY KEY OR CLICK TO FINISH ▶' : 'PRESS ANY KEY OR CLICK TO CONTINUE ▶', GW - 14, 14);

  pop();
}

/* ── 입력 ── */
function cutoonAdvance() {
  if (ct_inputLock) return;
  // 현재 페이지 이미지가 아직 로딩 중이면 무시
  if (!ct_loaded[ct_page]) return;

  if (ct_page < ct_paths.length - 1) {
    ct_page++;
    ct_inputLock = true;
    setTimeout(() => { ct_inputLock = false; }, 300);
  } else {
    // 마지막 컷 → 복귀
    if (ct_retStage === -1) {
      // 클리어 엔딩 → 게임 오버(엔딩) 화면
      gameState = 'gameover';
      enterGameOver();
    } else {
      solvedCount = ct_retStage;
      gameState   = 'room';
      enterRoom(ct_retStage);
    }
  }
}

function cutoonKeyPressed()   { cutoonAdvance(); }
function cutoonMousePressed() { cutoonAdvance(); } 