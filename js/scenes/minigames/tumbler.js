// 나비효과 게임 - 텀블러 카드 맞추기 미니게임 (scenes/minigames/tumbler.js)
//
// ▣ 목표: 4x4(16장) 카드를 뒤집어 같은 디자인의 텀블러 짝(8종 x 2장)을 모두 찾기.
//    - 같은 디자인 두 장을 연속으로 뒤집으면 그 카드는 사라짐(매칭 완료).
//    - 다른 디자인이면 잠깐 보여준 뒤 다시 뒤집힌 채로 남음.
//    - 제한 시간/제한 시도 없음 — 전부 매칭하면 클리어.
//
// ▣ 프레임워크 연결: room.js의 launchMinigameFor()에서
//      case 'tumbler': gameState = 'minigame_tumbler'; enterTumblerGame(); break;
//   main.js draw/mousePressed/keyPressed 분배기에 'minigame_tumbler' 케이스 추가.
//
// 모든 좌표는 가상 해상도(GW=680, GH=480) 기준. 클릭 판정은 vmouseX()/vmouseY().

const TM_COLS = 4, TM_ROWS = 4;
const TM_CARD_W = 94, TM_CARD_H = 94, TM_GAP = 10;
const TM_BOARD_W = TM_COLS * TM_CARD_W + (TM_COLS - 1) * TM_GAP;
const TM_BOARD_H = TM_ROWS * TM_CARD_H + (TM_ROWS - 1) * TM_GAP;
const TM_BOARD_X = (GW - TM_BOARD_W) / 2;
const TM_BOARD_Y = 60;

// 텀블러 디자인 8종: 몸통색 + 무늬색 + 무늬 종류로 구분
const TM_DESIGNS = [
  { body: [235, 90,  90 ], pattern: [255, 255, 255], kind: 'dot'    }, // 빨강 + 물방울무늬
  { body: [90,  170, 235], pattern: [255, 255, 255], kind: 'stripe' }, // 파랑 + 줄무늬
  { body: [255, 200, 70 ], pattern: [120, 80,  20 ], kind: 'dot'    }, // 노랑 + 물방울무늬
  { body: [110, 200, 120], pattern: [255, 255, 255], kind: 'stripe' }, // 초록 + 줄무늬
  { body: [180, 130, 230], pattern: [255, 255, 255], kind: 'star'   }, // 보라 + 별무늬
  { body: [255, 150, 190], pattern: [220, 60,  110], kind: 'heart'  }, // 핑크 + 하트무늬
  { body: [80,  80,  95 ], pattern: [220, 220, 230], kind: 'star'   }, // 차콜 + 별무늬
  { body: [245, 245, 240], pattern: [90,  170, 235], kind: 'heart'  }, // 화이트 + 하트무늬
];

// ── 상태 ──
let tm_state;          // 'tutorial' | 'play' | 'clear'
let tm_cards = [];      // { designId, revealed, matched, x, y, flipT }
let tm_firstPick = null; // 첫 번째로 뒤집은 카드의 인덱스
let tm_lockInput = false; // 두 장 비교 중엔 입력 잠금
let tm_compareUntil = 0;  // 불일치 카드 다시 덮는 시각(ms)
let tm_matchedCount = 0;  // 매칭 완료된 쌍 수
let tm_clearAlpha = 0, tm_clearFadeAmt = 3;
let tm_tutFlash = 0;

/* ── 씬 진입: 튜토리얼부터 ── */
function enterTumblerGame() {
  tm_state = 'tutorial';
  tm_tutFlash = 0;
  tm_clearAlpha = 0; tm_clearFadeAmt = 3;
  tm_buildBoard(); // 튜토리얼 배경에도 카드가 깔려 보이도록 미리 구성
}

/* 카드 배치: 8종 x 2장을 섞어서 4x4에 배치 */
function tm_buildBoard() {
  let deck = [];
  for (let i = 0; i < TM_DESIGNS.length; i++) { deck.push(i); deck.push(i); }
  deck = shuffle(deck);

  tm_cards = [];
  for (let r = 0; r < TM_ROWS; r++) {
    for (let c = 0; c < TM_COLS; c++) {
      const idx = r * TM_COLS + c;
      tm_cards.push({
        designId: deck[idx],
        revealed: false,
        matched: false,
        x: TM_BOARD_X + c * (TM_CARD_W + TM_GAP),
        y: TM_BOARD_Y + r * (TM_CARD_H + TM_GAP),
        flipT: 0, // 0~1 뒤집힘 애니메이션
      });
    }
  }
  tm_firstPick = null;
  tm_lockInput = false;
  tm_compareUntil = 0;
  tm_matchedCount = 0;
}

/* 실제 게임 시작 */
function startActualTumblerGame() {
  tm_state = 'play';
  tm_buildBoard();
}

function updateTumblerGame() {
  push();
  textFont("monospace");
  textStyle(BOLD);
  rectMode(CORNER); noStroke();
  fill(26, 24, 34);
  rect(0, 0, GW, GH);
  stroke(255, 8);
  for (let y = 0; y < GH; y += 12) line(0, y, GW, y);
  noStroke();
  pop();

  // 대기 중인 불일치 카드 자동으로 다시 덮기
  if (tm_lockInput && tm_compareUntil > 0 && millis() >= tm_compareUntil) {
    tm_resolveMismatch();
  }

  // 카드 애니메이션(뒤집힘 보간) 갱신
  for (let card of tm_cards) {
    const target = (card.revealed || card.matched) ? 1 : 0;
    card.flipT += (target - card.flipT) * 0.25;
  }

  tm_drawTitle();
  tm_drawBoard();

  if (tm_state === 'tutorial') tm_drawTutorial();
  if (tm_state === 'clear')    tm_drawClearScreen();
}

function tm_drawTitle() {
  push();
  fill(235, 235, 245); textAlign(CENTER, TOP); textSize(20); textStyle(BOLD);
  text('텀블러 짝 찾기', GW / 2, 20);
  fill(180, 180, 195); textSize(13); textStyle(NORMAL);
  text('맞춘 짝: ' + tm_matchedCount + ' / ' + TM_DESIGNS.length, GW / 2, 44);
  pop();
}

function tm_drawBoard() {
  for (let card of tm_cards) tm_drawCard(card);
}

function tm_drawCard(card) {
  if (card.matched && card.flipT > 0.98 && card.matchedFadeStarted === undefined) {
    // 매칭 완료 카드는 살짝 페이드 후 자리만 비워둠 (완전히 지우면 격자 흐트러짐 방지)
  }
  push();
  translate(card.x + TM_CARD_W / 2, card.y + TM_CARD_H / 2);

  // flipT: 0=뒷면, 1=앞면. 가운데 지점에서 가로폭이 0이 되는 카드 뒤집기 느낌.
  const t = card.flipT;
  const squash = Math.abs(Math.cos(t * PI)); // 1→0→1 로 좁아졌다 넓어짐
  scale(squash, 1);

  rectMode(CENTER); noStroke();

  if (t < 0.5) {
    // 뒷면(카드백)
    fill(60, 64, 84);
    rect(0, 0, TM_CARD_W, TM_CARD_H, 10);
    fill(80, 86, 110);
    rect(0, 0, TM_CARD_W - 14, TM_CARD_H - 14, 8);
    fill(140, 150, 180); textAlign(CENTER, CENTER); textSize(28); textStyle(BOLD);
    text('?', 0, 2);
  } else {
    // 앞면(텀블러 디자인)
    fill(245, 245, 240);
    rect(0, 0, TM_CARD_W, TM_CARD_H, 10);
    if (card.matched) {
      fill(60, 200, 120, 40);
      rect(0, 0, TM_CARD_W, TM_CARD_H, 10);
    }
    tm_drawTumblerIcon(0, 4, card.designId, 0.9);
  }
  pop();
}

/* 텀블러 아이콘: 몸통(둥근 직사각형) + 뚜껑 + 무늬 */
function tm_drawTumblerIcon(cx, cy, designId, s) {
  const d = TM_DESIGNS[designId];
  push();
  translate(cx, cy);
  scale(s);
  rectMode(CENTER); noStroke();

  // 그림자
  fill(0, 30); rect(0, 34, 36, 8);

  // 뚜껑
  fill(d.body[0] * 0.7, d.body[1] * 0.7, d.body[2] * 0.7);
  rect(0, -34, 26, 10, 3);
  // 손잡이 고리
  fill(d.body[0] * 0.6, d.body[1] * 0.6, d.body[2] * 0.6);
  rect(0, -42, 12, 8, 3);

  // 몸통
  fill(d.body[0], d.body[1], d.body[2]);
  rect(0, 0, 34, 56, 8);

  // 무늬
  tm_drawPattern(d);

  // 몸통 하이라이트(왼쪽 밝은 줄)
  fill(255, 255, 255, 40);
  rect(-10, 0, 6, 48, 3);

  pop();
}

function tm_drawPattern(d) {
  push();
  noStroke();
  fill(d.pattern[0], d.pattern[1], d.pattern[2]);
  if (d.kind === 'dot') {
    const offsets = [[-8, -14], [7, -6], [-6, 6], [8, 16]];
    for (let o of offsets) ellipse(o[0], o[1], 7, 7);
  } else if (d.kind === 'stripe') {
    for (let i = -2; i <= 2; i++) rect(0, i * 11, 30, 4);
  } else if (d.kind === 'star') {
    tm_drawStar(0, -8, 7);
    tm_drawStar(-6, 10, 5);
    tm_drawStar(7, 12, 5);
  } else if (d.kind === 'heart') {
    tm_drawHeart(0, -2, 16);
  }
  pop();
}

function tm_drawStar(x, y, r) {
  push(); translate(x, y); noStroke();
  beginShape();
  for (let i = 0; i < 10; i++) {
    const a = -HALF_PI + i * PI / 5;
    const rad = (i % 2 === 0) ? r : r * 0.45;
    vertex(cos(a) * rad, sin(a) * rad);
  }
  endShape(CLOSE);
  pop();
}

function tm_drawHeart(x, y, size) {
  push(); translate(x, y); noStroke();
  beginShape();
  for (let a = 0; a < TWO_PI; a += 0.1) {
    const r = size * (1 - sin(a)) * 0.5 + size * 0.18;
    vertex(sin(a) * r * 0.9, -cos(a) * r * 0.7);
  }
  endShape(CLOSE);
  pop();
}

/* ── 튜토리얼 화면 ── */
function tm_drawTutorial() {
  push();
  rectMode(CORNER); // main.js 전역 기본값(CENTER)과 무관하게 이 함수 안에서는 항상 CORNER로 그림

  tm_tutFlash = (tm_tutFlash + 1) % 70;

  const pw = 460, ph = 190;
  const px = GW / 2 - pw / 2, py = GH - ph - 16;

  noStroke(); fill(0, 110); rect(px + 5, py + 6, pw, ph, 8);
  fill(22, 28, 40); rect(px, py, pw, ph, 8);
  fill(30, 38, 52); rect(px + 2, py + 2, pw - 4, ph - 4, 7);

  fill(20, 100, 60); rect(px + 3, py + 3, pw - 6, 28, 5);
  fill(255); textAlign(LEFT, CENTER); textSize(14); textStyle(BOLD);
  text('📖  게임 방법', px + 12, py + 17);

  fill(200, 240, 215); textAlign(CENTER, TOP); textSize(15);
  text('카드를 뒤집어 같은 디자인의 텀블러 짝을 찾으세요!', GW / 2, py + 38);
  text('같은 디자인 2장 → 매칭 완료(사라짐)',              GW / 2, py + 60);
  text('다른 디자인 → 잠깐 보여준 뒤 다시 뒤집힘',          GW / 2, py + 82);
  text('8쌍을 모두 맞추면 성공! (시간 제한 없음)',          GW / 2, py + 104);

  const { bx, by, bw, bh } = tm_tutBtnRect();
  const btnHot = tm_inRect(vmouseX(), vmouseY(), bx, by, bw, bh);
  fill(btnHot ? color(60, 210, 120) : color(30, 150, 80));
  noStroke(); rect(bx, by, bw, bh, 5);
  fill(255); textAlign(CENTER, CENTER); textSize(14); textStyle(BOLD);
  text('시작하기! 🚀', bx + bw / 2, by + bh / 2);

  pop();
}

function tm_tutBtnRect() {
  const pw = 460, ph = 190;
  const px = GW / 2 - pw / 2, py = GH - ph - 16;
  const bw = 130, bh = 32;
  const bx = GW / 2 - bw / 2, by = py + ph - bh - 14;
  return { bx, by, bw, bh };
}

function tm_drawClearScreen() {
  push();
  fill(0, 180); rectMode(CORNER); rect(0, 0, GW, GH);
  fill(255); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(40);
  text('텀블러 짝 맞추기 성공!', GW / 2, GH / 2 - 40);
  tm_clearAlpha += tm_clearFadeAmt;
  if (tm_clearAlpha <= 0 || tm_clearAlpha >= 255) tm_clearFadeAmt *= -1;
  tm_clearAlpha = constrain(tm_clearAlpha, 0, 255);
  fill(255, tm_clearAlpha); textSize(18);
  text('PRESS ANY KEY OR CLICK TO CONTINUE', GW / 2, GH / 2 + 40);
  pop();
}

/* ── 입력 ── */
function tumblerMousePressed() {
  if (tm_state === 'tutorial') {
    const { bx, by, bw, bh } = tm_tutBtnRect();
    if (tm_inRect(vmouseX(), vmouseY(), bx, by, bw, bh)) startActualTumblerGame();
    return;
  }
  if (tm_state === 'clear') { tumblerComplete(); return; }
  if (tm_state !== 'play' || tm_lockInput) return;

  const mx = vmouseX(), my = vmouseY();
  for (let i = 0; i < tm_cards.length; i++) {
    const card = tm_cards[i];
    if (card.matched || card.revealed) continue;
    if (!tm_inRect(mx, my, card.x, card.y, TM_CARD_W, TM_CARD_H)) continue;

    card.revealed = true;
    if (wasteSound) wasteSound.play(); // 카드 뒤집는 소리(텀블러 전용 사운드 없어 공용 사용)

    if (tm_firstPick === null) {
      tm_firstPick = i;
    } else {
      tm_lockInput = true;
      const first = tm_cards[tm_firstPick];
      if (first.designId === card.designId) {
        // 매칭 성공
        first.matched = true;
        card.matched = true;
        tm_matchedCount++;
        tm_firstPick = null;
        tm_lockInput = false;
        if (minigameSuccessSound) minigameSuccessSound.play();
        if (tm_matchedCount >= TM_DESIGNS.length) {
          tm_state = 'clear';
        }
      } else {
        // 불일치 → 잠깐 보여준 뒤 다시 덮기
        tm_compareUntil = millis() + 650;
      }
    }
    return;
  }
}

function tm_resolveMismatch() {
  if (tm_firstPick !== null) tm_cards[tm_firstPick].revealed = false;
  // 방금 뒤집은 두 번째 카드도 찾아서 덮기: revealed && !matched 인 것 중 firstPick 아닌 것
  for (let card of tm_cards) {
    if (!card.matched && card.revealed && card !== tm_cards[tm_firstPick]) {
      card.revealed = false;
    }
  }
  tm_firstPick = null;
  tm_lockInput = false;
  tm_compareUntil = 0;
}

function tumblerKeyPressed() {
  if (tm_state === 'tutorial') { startActualTumblerGame(); return; }
  if (tm_state === 'clear')    { tumblerComplete(); return; }
}

function tumblerComplete() {
  solvedCount = 4;
  gameState = 'room';
  roomReenterAfterMinigame();
}

function tm_inRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}