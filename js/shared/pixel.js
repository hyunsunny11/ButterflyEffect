// 나비효과 게임 - 공통 픽셀 헬퍼 (shared)
// 인트로와 방 화면 모두 동일한 픽셀 격자를 쓰도록 여기서 한 번만 정의합니다.

// 픽셀 크기 (모든 화면 공용)
const PS = 5;

// 좌표를 픽셀 격자에 맞춰 스냅 (필요할 때 각 씬에서 사용)
function snap(v) {
  return Math.round(v / PS) * PS;
}

// ── 화면 맞춤(풀스크린 스케일) ──
// 게임은 항상 GW×GH 가상 해상도(680×480) 위에 그립니다.
// 실제 캔버스는 창 크기에 맞추고, draw()에서 이 비율로 통째로 확대/중앙정렬합니다.
// 덕분에 각 씬의 좌표(340, 680 등)는 하나도 바꿀 필요가 없습니다.
const GW = 680; // 게임 가상 너비
const GH = 480; // 게임 가상 높이

let viewScale = 1;  // 확대 배율
let viewOffX = 0;   // 가로 중앙정렬 오프셋(레터박스 여백)
let viewOffY = 0;   // 세로 중앙정렬 오프셋

// 창 크기에 맞춰 배율/오프셋 재계산 (setup, windowResized에서 호출)
function updateView() {
  viewScale = Math.min(width / GW, height / GH); // 비율 유지하며 들어가는 최대 배율
  viewOffX = (width - GW * viewScale) / 2;
  viewOffY = (height - GH * viewScale) / 2;
}

// 실제 마우스 좌표 → 게임 좌표(0..GW, 0..GH)로 변환.
// 클릭 판정은 mouseX/mouseY 대신 반드시 이 함수를 쓰세요.
function vmouseX() { return (mouseX - viewOffX) / viewScale; }
function vmouseY() { return (mouseY - viewOffY) / viewScale; }