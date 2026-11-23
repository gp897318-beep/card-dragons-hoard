/* cards.js — deck + card definitions for DRAGON'S HOARD.
   One job: know every card in the game. Types are told apart by
   colour AND shape (icon): Strike red sword, Pilfer gold coin,
   Guard blue shield, Mend green leaf, Trick purple star. */
'use strict';

var TYPE_INFO = {
  strike: { icon: '⚔️', label: 'STRIKE', color: '#d92b2b', shape: 'sword' },
  pilfer: { icon: '🪙', label: 'PILFER', color: '#f5c542', shape: 'coin' },
  guard:  { icon: '🛡️', label: 'GUARD',  color: '#2f7fe0', shape: 'shield' },
  mend:   { icon: '🍃', label: 'MEND',   color: '#2fae5f', shape: 'leaf' },
  trick:  { icon: '⭐', label: 'TRICK',  color: '#9b4de0', shape: 'star' }
};

/* value = the card's main number (damage / gold stolen / block / heal).
   trick cards carry an `effect` key; `value` is their display number. */
var CARD_DEFS = [
  // Strikes — red sword (8)
  { name: 'Slash',      type: 'strike', cost: 1, value: 4, rule: 'Deal 4 damage.' },
  { name: 'Slash',      type: 'strike', cost: 1, value: 4, rule: 'Deal 4 damage.' },
  { name: 'Cleave',     type: 'strike', cost: 1, value: 5, rule: 'Deal 5 damage.' },
  { name: 'Cleave',     type: 'strike', cost: 1, value: 5, rule: 'Deal 5 damage.' },
  { name: 'Heavy Blow', type: 'strike', cost: 2, value: 6, rule: 'Deal 6 damage.' },
  { name: 'Heavy Blow', type: 'strike', cost: 2, value: 6, rule: 'Deal 6 damage.' },
  { name: 'Dragonbite', type: 'strike', cost: 2, value: 7, rule: 'Deal 7 damage.' },
  { name: 'Dragonslayer',type: 'strike', cost: 2, value: 8, rule: 'Deal 8 damage. Breaks Hoard Guard.' },
  // Pilfers — gold coin (6)
  { name: 'Quick Fingers', type: 'pilfer', cost: 1, value: 2, rule: 'Steal 2 gold from the Hoard.' },
  { name: 'Quick Fingers', type: 'pilfer', cost: 1, value: 2, rule: 'Steal 2 gold from the Hoard.' },
  { name: 'Coin Snatch',   type: 'pilfer', cost: 1, value: 3, rule: 'Steal 3 gold from the Hoard.' },
  { name: 'Coin Snatch',   type: 'pilfer', cost: 1, value: 3, rule: 'Steal 3 gold from the Hoard.' },
  { name: 'Gem Grab',      type: 'pilfer', cost: 1, value: 4, rule: 'Steal 4 gold from the Hoard.' },
  { name: 'Gem Grab',      type: 'pilfer', cost: 2, value: 4, rule: 'Steal 4 gold from the Hoard.' },
  // Guards — blue shield (6)
  { name: 'Buckler',     type: 'guard', cost: 1, value: 5, rule: 'Block 5 damage.' },
  { name: 'Buckler',     type: 'guard', cost: 1, value: 5, rule: 'Block 5 damage.' },
  { name: 'Tower Shield',type: 'guard', cost: 1, value: 6, rule: 'Block 6 damage.' },
  { name: 'Tower Shield',type: 'guard', cost: 1, value: 6, rule: 'Block 6 damage.' },
  { name: 'Dragonhide',  type: 'guard', cost: 1, value: 7, rule: 'Block 7 damage.' },
  { name: 'Aegis Wall',  type: 'guard', cost: 2, value: 8, rule: 'Block 8 damage.' },
  // Mends — green leaf (5)
  { name: 'Herb Poultice', type: 'mend', cost: 1, value: 4, rule: 'Heal 4 Life.' },
  { name: 'Herb Poultice', type: 'mend', cost: 1, value: 4, rule: 'Heal 4 Life.' },
  { name: 'Spring Water',  type: 'mend', cost: 1, value: 5, rule: 'Heal 5 Life.' },
  { name: 'Spring Water',  type: 'mend', cost: 1, value: 5, rule: 'Heal 5 Life.' },
  { name: 'Phoenix Draught',type: 'mend', cost: 2, value: 6, rule: 'Heal 6 Life.' },
  // Tricks — purple star (5)
  { name: 'Soothe',      type: 'trick', cost: 1, value: 25, effect: 'soothe', rule: 'Calm the dragon: −25 Rage.' },
  { name: 'Soothe',      type: 'trick', cost: 1, value: 25, effect: 'soothe', rule: 'Calm the dragon: −25 Rage.' },
  { name: 'Cunning Feint',type: 'trick', cost: 2, value: 4, effect: 'feint', rule: 'Deal 4 damage and steal 1 gold.' },
  { name: 'Cunning Feint',type: 'trick', cost: 2, value: 4, effect: 'feint', rule: 'Deal 4 damage and steal 1 gold.' },
  { name: 'Kindle',      type: 'trick', cost: 0, value: 2, effect: 'kindle', rule: 'Gain 2 Ember and draw 1 card.' }
];

var UPGRADE_COST = 2;      /* gold to upgrade one card in hand */
var UPGRADE_BONUS = 2;     /* +value on upgrade (Pilfer: +1 gold) */

/* Build a fresh 30-card deck. Each card gets a unique id. */
function buildDeck() {
  var deck = [];
  for (var i = 0; i < CARD_DEFS.length; i++) {
    var d = CARD_DEFS[i];
    deck.push({ id: 'c' + i, name: d.name, type: d.type, cost: d.cost,
      value: d.value, effect: d.effect || null, rule: d.rule, upgraded: false });
  }
  return deck;
}

/* Seeded RNG (mulberry32) so ?shot= scenes are deterministic. */
function makeRng(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(deck, rng) {
  for (var i = deck.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }
  return deck;
}

function typeInfo(type) { return TYPE_INFO[type]; }
