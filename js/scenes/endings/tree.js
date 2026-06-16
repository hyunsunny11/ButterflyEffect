// 엔딩: 3단계 (컴퓨터 완료 후 나감)
function enterTreeEnding() {
  enterCutoon(
    [
      'assets/endings/e3_1.png',
      'assets/endings/e3_2.png',
      'assets/endings/e3_3.png',
      'assets/endings/e3_4.png'
    ],
    3,
    [
      'assets/sounds/tree_1.wav',
      'assets/sounds/tree_2.wav',
      'assets/sounds/tree_3.wav',
      'assets/sounds/tree_4.wav'
    ]
  );
}
function updateTreeEnding()        { updateCutoon(); }
function treeEndingKeyPressed()    { cutoonKeyPressed(); }
function treeEndingMousePressed()  { cutoonMousePressed(); }