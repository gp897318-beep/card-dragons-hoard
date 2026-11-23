/* state.js — game state, turn flow and rules for DRAGON'S HOARD.
   One job: hold the truth of the game and apply every card's effect. */
'use strict';

var MAX_LIFE = 30;
var HOARD_START = 24;
var RAGE_MAX = 100;
var BREATH_DAMAGE = 10;
var ENRAGE_LIFE = 20;
var GUARD_LIFE = 10;
var GUARD_HP = 6;
var EMBER_START = 4;
var EMBER_MAX = 10;
var DRAW_PER_TURN = 2;
var HAND_LIMIT = 7;

function newGame(seed) {
  var rng = makeRng(seed == null ? (Date.now() % 2147483647) : seed);
  var deck = shuffle(buildDeck(), rng);
  return {
    rng: rng,
    screen: 'title',          /* title | play | win | loss */
    turn: 1,
    playerLife: MAX_LIFE,
    dragonLife: MAX_LIFE,
    hoard: HOARD_START,
    gold: 0,
    ember: EMBER_START,
    rage: 0,
    breathArmed: false,
    enraged: false,
    hoardGuard: false,
    guardHP: 0,
    block: 0,
    deck: deck,
    hand: [],
    discard: [],
    dragonHandCount: 6,
    intent: null,             /* dragon's telegraphed next move */
    log: [],
    stats: { damageDealt: 0, cardsPlayed: 0, goldStolen: 0, turns: 0 },
    selected: null,           /* index into hand, or null */
    muted: false,
    over: false
  };
}

/* Draw n cards, reshuffling the discard pile when the deck runs out. */
function drawCards(s, n) {
  for (var i = 0; i < n; i++) {
    if (s.deck.length === 0) {
      if (s.discard.length === 0) return;
      s.deck = shuffle(s.discard.splice(0), s.rng);
      addLog(s, 'Deck reshuffled.', 'gold');
    }
    if (s.hand.length >= HAND_LIMIT) { s.discard.push(s.deck.pop()); continue; }
    s.hand.push(s.deck.pop());
  }
}

function addLog(s, msg, kind) {
  s.log.push({ msg: msg, kind: kind || '' });
  if (s.log.length > 40) s.log.shift();
}

function startGame(s) {
  s.screen = 'play';
  s.turn = 1;
  s.ember = EMBER_START;
  drawCards(s, 5);
  s.intent = pickDragonIntent(s, true);
  addLog(s, 'Vermathrax stirs on its hoard. Steal gold, upgrade, strike!', 'gold');
  addLog(s, 'The dragon will: ' + s.intent.text, 'bad');
}

function beginPlayerTurn(s) {
  s.stats.turns = s.turn;
  s.block = 0;
  s.ember = Math.min(EMBER_MAX, s.ember + 1);
  drawCards(s, DRAW_PER_TURN);
  s.selected = null;
}

function canPlay(s, card) {
  if (s.screen !== 'play' || s.over) return false;
  if (card.cost > s.ember) return false;
  if (card.type === 'pilfer' && s.hoardGuard) return false;
  if (card.type === 'pilfer' && s.hoard <= 0) return false;
  return true;
}

function rageGain(s, base) { return s.enraged ? base * 2 : base; }

function addRage(s, amount) {
  s.rage = Math.min(RAGE_MAX, s.rage + amount);
  if (s.rage >= RAGE_MAX && !s.breathArmed) {
    s.breathArmed = true;
    s.intent = { kind: 'breath', text: 'Unleash DRAGON BREATH for ' + BREATH_DAMAGE + ' damage!' };
    addLog(s, 'RAGE FULL! Dragon Breath is coming next turn — GUARD NOW!', 'bad');
    playSound('alarm');
  }
}

function dealDragonDamage(s, dmg, source) {
  var remaining = dmg;
  if (s.hoardGuard && s.guardHP > 0) {
    var absorbed = Math.min(s.guardHP, remaining);
    s.guardHP -= absorbed;
    remaining -= absorbed;
    addLog(s, 'Hoard Guard absorbs ' + absorbed + ' damage (' + s.guardHP + ' guard left).', 'gold');
    if (s.guardHP <= 0) {
      s.hoardGuard = false;
      addLog(s, '💥 HOARD GUARD SHATTERED! Pilfer is open again!', 'good');
      playSound('shatter');
    }
  }
  if (remaining > 0) {
    s.dragonLife = Math.max(0, s.dragonLife - remaining);
    s.stats.damageDealt += remaining;
    addLog(s, source + ' hits the dragon for ' + remaining + '!', 'good');
    floatDamage('dragon', remaining);
    checkPhases(s);
  }
  checkEnd(s);
}

function checkPhases(s) {
  if (!s.enraged && s.dragonLife <= ENRAGE_LIFE && s.dragonLife > 0) {
    s.enraged = true;
    addLog(s, '🔥 The dragon ENRAGES! Its rage fills twice as fast!', 'bad');
    showPhaseBanner('🔥 THE DRAGON ENRAGES! 🔥');
    playSound('alarm');
  }
  if (!s.hoardGuard && s.dragonLife <= GUARD_LIFE && s.dragonLife > 0) {
    s.hoardGuard = true;
    s.guardHP = GUARD_HP;
    addLog(s, '🛡 The dragon GUARDS ITS HOARD! Pilfer is blocked — break it with a big Strike!', 'bad');
    showPhaseBanner('🛡 HOARD GUARD UP! 🛡');
    playSound('guard');
  }
}

function stealGold(s, amount, source) {
  var taken = Math.min(amount, s.hoard);
  if (taken <= 0) { addLog(s, 'The Hoard is empty — nothing left to steal.', 'gold'); return 0; }
  s.hoard -= taken;
  s.gold += taken;
  s.stats.goldStolen += taken;
  /* Stolen gold kindles your fire: +1 Ember per theft. */
  s.ember = Math.min(EMBER_MAX, s.ember + 1);
  addLog(s, source + ' steals ' + taken + ' gold from the Hoard!', 'gold');
  floatDamage('hoard', taken, 'gold');
  addRage(s, rageGain(s, taken * 4 + 6));
  playSound('coin');
  return taken;
}

function playCard(s, handIndex) {
  var card = s.hand[handIndex];
  if (!card || !canPlay(s, card)) return false;
  s.ember -= card.cost;
  s.hand.splice(handIndex, 1);
  s.discard.push(card);
  s.stats.cardsPlayed++;
  s.selected = null;
  if (card.type === 'strike') {
    dealDragonDamage(s, card.value, card.name);
    playSound('hit');
  } else if (card.type === 'pilfer') {
    stealGold(s, card.value, card.name);
  } else if (card.type === 'guard') {
    s.block += card.value;
    addLog(s, card.name + ': you raise ' + card.value + ' Block.', 'good');
    playSound('guard');
  } else if (card.type === 'mend') {
    var healed = Math.min(MAX_LIFE - s.playerLife, card.value);
    s.playerLife += healed;
    addLog(s, card.name + ': you heal ' + healed + ' Life.', 'good');
    floatDamage('player', healed, 'heal');
    playSound('heal');
  } else if (card.type === 'trick') {
    if (card.effect === 'soothe') {
      s.rage = Math.max(0, s.rage - card.value);
      addLog(s, 'Soothe: the dragon calms. Rage −' + card.value + '.', 'good');
      playSound('heal');
    } else if (card.effect === 'feint') {
      dealDragonDamage(s, card.value, card.name);
      stealGold(s, 1, card.name);
      playSound('hit');
    } else if (card.effect === 'kindle') {
      s.ember = Math.min(EMBER_MAX, s.ember + card.value);
      drawCards(s, 1);
      addLog(s, 'Kindle: +' + card.value + ' Ember, draw 1 card.', 'good');
      playSound('coin');
    }
  }
  checkEnd(s);
  return true;
}

/* Spend gold to upgrade the selected card in hand (+2 value, Pilfer +1). */
function upgradeSelected(s) {
  var card = s.selected == null ? null : s.hand[s.selected];
  if (!card || card.upgraded) return false;
  if (s.gold < UPGRADE_COST) return false;
  s.gold -= UPGRADE_COST;
  card.upgraded = true;
  var bonus = card.type === 'pilfer' ? 1 : UPGRADE_BONUS;
  if (card.type === 'trick' && card.effect === 'soothe') bonus = 10;
  card.value += bonus;
  card.rule = card.rule.replace(/(\d+)/, function (m) { return String(Number(m) + bonus); });
  addLog(s, card.name + ' upgraded to ' + card.value + '! (−' + UPGRADE_COST + ' gold)', 'gold');
  playSound('upgrade');
  return true;
}

function endTurn(s) {
  if (s.screen !== 'play' || s.over) return;
  resolveDragonTurn(s);
  if (s.over) return;
  s.turn++;
  beginPlayerTurn(s);
  s.intent = pickDragonIntent(s, false);
  addLog(s, 'The dragon will: ' + s.intent.text, 'bad');
}

function resolveDragonTurn(s) {
  var intent = s.intent;
  if (!intent) intent = { kind: 'attack', text: 'Swipe at you.' };
  if (intent.kind === 'breath') {
    var dmg = Math.max(0, BREATH_DAMAGE - s.block);
    s.block = Math.max(0, s.block - BREATH_DAMAGE);
    s.playerLife = Math.max(0, s.playerLife - dmg);
    addLog(s, '🔥 DRAGON BREATH scorches you for ' + dmg + '!', 'bad');
    floatDamage('player', dmg);
    s.rage = 30;
    s.breathArmed = false;
    playSound('breath');
  } else if (intent.kind === 'attack') {
    var atk = (s.enraged ? 5 : 3) + (intent.bonus || 0);
    var hit = Math.max(0, atk - s.block);
    s.block = Math.max(0, s.block - atk);
    s.playerLife = Math.max(0, s.playerLife - hit);
    addLog(s, 'The dragon swipes for ' + atk + ' — you take ' + hit + '.', 'bad');
    floatDamage('player', hit);
    playSound('hit');
  } else if (intent.kind === 'hoard') {
    s.hoard += 4;
    addLog(s, 'The dragon adds 4 gold to its Hoard.', 'gold');
    playSound('coin');
  }
  s.dragonHandCount = 5 + Math.floor(s.rng() * 3);
  checkEnd(s);
}

function checkEnd(s) {
  if (s.dragonLife <= 0 && !s.over) {
    s.over = true; s.screen = 'win';
    addLog(s, '🏆 VICTORY! The hoard is yours!', 'good');
    playSound('win');
  } else if (s.playerLife <= 0 && !s.over) {
    s.over = true; s.screen = 'loss';
    addLog(s, '💀 The dragon claims another hero.', 'bad');
    playSound('lose');
  }
}

function statsText(s) {
  return 'Turns: <b>' + s.stats.turns + '</b> &nbsp;•&nbsp; Damage dealt: <b>' +
    s.stats.damageDealt + '</b> &nbsp;•&nbsp; Cards played: <b>' + s.stats.cardsPlayed +
    '</b> &nbsp;•&nbsp; Gold stolen: <b>' + s.stats.goldStolen + '</b>';
}
