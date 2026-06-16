// 엔딩: 0단계 (싱크대 전 나감)
function enterEarthEnding() {
  enterCutoon(
    [
      'assets/endings/e0_0.png',
      'assets/endings/e0_1.png',
      'assets/endings/e0_2.png',
      'assets/endings/e0_3.png',
      'assets/endings/e0_4.png'
    ],
    0,
    [
      null,
      'assets/sounds/earth_2.wav',
      'assets/sounds/earth_3.wav',
      'assets/sounds/earth_4.wav',
      'assets/sounds/earth_5.wav'
      
    ]
  );
}
function updateEarthEnding()         { updateCutoon(); }
function earthEndingKeyPressed()     { cutoonKeyPressed(); }
function earthEndingMousePressed()   { cutoonMousePressed(); }