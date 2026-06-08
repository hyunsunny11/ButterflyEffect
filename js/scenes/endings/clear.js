// 엔딩: 6단계 (모든 단계 완료 → 클리어)
// 컷툰 종료 후 gameover 화면으로 이동
function enterClearEnding() {
  enterCutoon(
    ['assets/endings/e6_1.png','assets/endings/e6_2.png','assets/endings/e6_3.png',
     'assets/endings/e6_4.png','assets/endings/e6_5.png','assets/endings/e6_6.png'],
    -1  // -1 = gameover 화면으로 (방 복귀 아님)
  );
}
function updateClearEnding()       { updateCutoon(); }
function clearEndingKeyPressed()   { cutoonKeyPressed(); }
function clearEndingMousePressed() { cutoonMousePressed(); }