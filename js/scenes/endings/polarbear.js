// 엔딩: 5단계 (TV 완료 후 나감)
function enterPolarbearEnding() {
  enterCutoon(
    [
      'assets/endings/e5_1.png',
      'assets/endings/e5_2.png',
      'assets/endings/e5_3.png',
      'assets/endings/e5_4.png'
    ],
    5,
    [
      'assets/sounds/bird_1.wav',
      'assets/sounds/bird_2.wav',
      'assets/sounds/bird_3.wav',
      'assets/sounds/bird_4.wav'
    ]
  );
}
function updatePolarbearEnding()       { updateCutoon(); }
function polarbearEndingKeyPressed()   { cutoonKeyPressed(); }
function polarbearEndingMousePressed() { cutoonMousePressed(); }