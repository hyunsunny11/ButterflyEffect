function enterPenguinEnding() {
  enterCutoon(
    [
      'assets/endings/e1_1.png',
      'assets/endings/e1_2.png',
      'assets/endings/e1_3.png',
      'assets/endings/e1_4.png'
    ],
    1,
    [
      'assets/sounds/penguin_1.wav',
      'assets/sounds/penguin_2.wav',
      'assets/sounds/penguin_3.wav',
      'assets/sounds/penguin_4.wav'
    ]
  );
}

function updatePenguinEnding()       { updateCutoon(); }
function penguinEndingKeyPressed()   { cutoonKeyPressed(); }
function penguinEndingMousePressed() { cutoonMousePressed(); }