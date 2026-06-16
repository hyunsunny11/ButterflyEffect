// 엔딩: 2단계 (분리수거 완료 후 나감)
function enterSinkholeEnding() {
  enterCutoon(
    [
      'assets/endings/e2_1.png',
      'assets/endings/e2_2.png',
      'assets/endings/e2_3.png',
      'assets/endings/e2_4.png'
    ],
    2,
    [
      'assets/sounds/sinkhole_1.wav',
      'assets/sounds/sinkhole_2.wav',
      'assets/sounds/sinkhole_3.wav',
      'assets/sounds/sinkhole_4.wav'
    ]
  );
}
function updateSinkholeEnding()        { updateCutoon(); }
function sinkholeEndingKeyPressed()    { cutoonKeyPressed(); }
function sinkholeEndingMousePressed()  { cutoonMousePressed(); }