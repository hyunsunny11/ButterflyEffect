// 나비효과 게임 - 전역 상태 (shared)
// 모든 씬이 공유하는 상태만 여기 둡니다.
// 각 씬 전용 변수는 해당 씬 파일(intro.js, room.js)에 둡니다.

// 현재 화면: 'intro' | 'room' | (앞으로) 'minigame', 'ending' ...
// main.js의 draw/mousePressed/keyPressed가 이 값을 보고 해당 씬으로 분배합니다.
let gameState = 'intro';

// 방에서 해결한 오브젝트 수 (순서 상태머신에서 사용 예정)
let solvedCount = 0;