/* shots.js — deterministic ?shot= scene setups for the screenshots.
   One job: put the game in the exact frame each screenshot needs, with a
   fixed seed and no randomness, then raise window.__shotReady. */
'use strict';

function handFromNames(s, names) {
  s.hand = [];
  var pool = buildDeck();
  for (var i = 0; i < names.length; i++) {
    for (var j = 0; j < pool.length; j++) {
      if (pool[j].name === names[i] && s.hand.indexOf(pool[j]) < 0) {
        s.hand.push(pool[j]);
        pool.splice(j, 1);
        break;
      }
    }
  }
  s.deck = pool;
}

/* Shared mid-game table state for the cover: a dramatic moment. */
function coverScene(s) {
  s.screen = 'play';
  s.turn = 7;
  s.playerLife = 22;
  s.dragonLife = 11;
  s.hoard = 17;
  s.gold = 6;
  s.ember = 5;
  s.rage = 85;
  s.breathArmed = false;
  s.enraged = true;
  s.hoardGuard = true;
  s.guardHP = 4;
  s.block = 0;
  s.deck = buildDeck().slice(0, 12);
  s.discard = buildDeck().slice(12, 16);
  handFromNames(s, ['Gem Grab', 'Dragonslayer', 'Tower Shield', 'Cunning Feint', 'Soothe', 'Spring Water']);
  s.hand[0].upgraded = true; s.hand[0].value = 5; /* upgraded Pilfer, mid-flight */
  s.selected = 0;
  s.intent = { kind: 'attack', text: 'Swipe at you for 6 damage.' };
  s.log = [
    { msg: 'Gem Grab steals 4 gold from the Hoard!', kind: 'gold' },
    { msg: 'RAGE climbs — the dragon is furious!', kind: 'bad' },
    { msg: 'The dragon ENRAGES! Its rage fills twice as fast!', kind: 'bad' },
    { msg: 'Hoard Guard is up! Pilfer is blocked — break it with a big Strike!', kind: 'bad' },
    { msg: 'Tower Shield: you raise 6 Block.', kind: 'good' },
    { msg: 'The dragon will: Swipe at you for 6 damage.', kind: 'bad' }
  ];
  s.stats = { damageDealt: 19, cardsPlayed: 14, goldStolen: 11, turns: 7 };
  renderAll(s);
  /* Rage nearly full + a Pilfer card mid-flight snatching a gem. */
  s.rage = 92;
  renderAll(s);
  showCallouts(true);
  var pilfer = document.querySelector('.card.type-pilfer');
  if (pilfer) {
    pilfer.style.transform = 'translateY(-70px) rotate(-10deg) scale(1.12)';
    pilfer.style.boxShadow = '0 0 0 4px #f5c542, 0 0 30px #ffd75e';
  }
  /* Arm the breath telegraph for the banner, without firing it. */
  s.breathArmed = true;
  s.intent = { kind: 'breath', text: 'Unleash DRAGON BREATH for 12 damage!' };
  renderAll(s);
  showCallouts(true);
  window.__shotReady = true;
}

function titleScene(s) {
  s.screen = 'title';
  renderAll(s);
  window.__shotReady = true;
}

function winScene(s) {
  s.screen = 'play';
  s.turn = 9;
  s.playerLife = 14;
  s.dragonLife = 3;
  s.hoard = 6;
  s.gold = 9;
  s.ember = 4;
  s.rage = 40;
  handFromNames(s, ['Dragonslayer', 'Coin Snatch', 'Aegis Wall', 'Phoenix Draught']);
  s.intent = { kind: 'attack', text: 'Swipe at you for 6 damage.' };
  s.log = [
    { msg: 'Dragonslayer hits the dragon for 8!', kind: 'good' },
    { msg: 'Hoard Guard absorbs 4 damage (0 guard left).', kind: 'gold' },
    { msg: 'HOARD GUARD SHATTERED! Pilfer is open again!', kind: 'good' }
  ];
  renderAll(s);
  /* Land the killing blow through the real rules. */
  s.dragonLife = 3;
  s.hand = [{ id: 'kill', name: 'Dragonslayer', type: 'strike', cost: 2, value: 8,
    effect: null, rule: 'Deal 8 damage. Breaks Hoard Guard.', upgraded: true }];
  s.ember = 10;
  playCard(s, 0);
  renderAll(s);
  window.__shotReady = true;
}

function lossScene(s) {
  s.screen = 'play';
  s.turn = 8;
  s.playerLife = 9;
  s.dragonLife = 18;
  s.hoard = 20;
  s.gold = 1;
  s.ember = 3;
  s.rage = 100;
  s.breathArmed = true;
  s.enraged = true;
  handFromNames(s, ['Slash', 'Quick Fingers', 'Buckler', 'Herb Poultice']);
  s.intent = { kind: 'breath', text: 'Unleash DRAGON BREATH for 12 damage!' };
  s.log = [
    { msg: 'RAGE FULL! Dragon Breath is coming next turn — GUARD NOW!', kind: 'bad' },
    { msg: 'You have no Guard in hand…', kind: 'bad' },
    { msg: 'The dragon will: Unleash DRAGON BREATH for 12 damage!', kind: 'bad' }
  ];
  renderAll(s);
  /* Take the breath through the real rules. */
  s.block = 0;
  resolveDragonTurn(s);
  renderAll(s);
  window.__shotReady = true;
}

function setupShot(kind) {
  var s = newGame(1337);
  s.muted = true;
  window.__state = s;
  if (kind === 'cover') coverScene(s);
  else if (kind === 'title') titleScene(s);
  else if (kind === 'win') winScene(s);
  else if (kind === 'loss') lossScene(s);
  else { startGame(s); renderAll(s); window.__shotReady = true; }
}
