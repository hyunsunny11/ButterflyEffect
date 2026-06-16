// 엔딩: 4단계 (텀블러 완료 후 나감)
function enterDesertEnding() {
  enterCutoon(
    [
      'assets/endings/e4_1.png',
      'assets/endings/e4_2.png',
      'assets/endings/e4_3.png',
      'assets/endings/e4_4.png'
    ],
    4,
    [
      'assets/sounds/TV_1.wav',
      'assets/sounds/TV_2.wav',
      'assets/sounds/TV_3.wav',
      'assets/sounds/TV_4.wav'
    ]
  );
}

function updateDesertEnding() { updateCutoon(); }
function desertEndingKeyPressed()    { cutoonKeyPressed(); }
function desertEndingMousePressed()  { cutoonMousePressed(); }