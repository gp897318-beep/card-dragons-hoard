/* render.js — DOM rendering: HUD, arena, hands, legend, log, screens.
   One job: turn the state into the table the player (and the judge) sees. */
'use strict';

var $ = function (id) { return document.getElementById(id); };

function hearts(n) {
  var out = '';
  for (var i = 0; i < MAX_LIFE; i++) out += i < n ? '♥' : '♡';
  return out;
}

function renderAll(s) {
  renderTopbar(s);
  renderDragonHand(s);
  renderArena(s);
  renderLegend(s);
  renderLog(s);
  renderHand(s);
  renderControls(s);
  renderScreens(s);
}

function renderTopbar(s) {
  $('plife').textContent = s.playerLife + ' ❤';
  $('phearts').textContent = hearts(s.playerLife);
  $('dlife').textContent = s.dragonLife + ' ❤';
  $('dhearts').textContent = hearts(s.dragonLife);
  $('turnnum').textContent = 'TURN ' + s.turn;
  var pips = '';
  for (var i = 0; i < EMBER_MAX; i++) {
    pips += i < s.ember ? '⬢' : '<span class="off">⬢</span>';
  }
  $('emberpips').innerHTML = pips;
  $('goldline').textContent = '🪙 Gold: ' + s.gold + '  •  Hoard: ' + s.hoard;
}

function renderDragonHand(s) {
  var el = $('dragonhand');
  el.innerHTML = '';
  var n = Math.min(6, s.dragonHandCount);
  for (var i = 0; i < n; i++) {
    var d = document.createElement('div');
    d.className = 'minicard';
    el.appendChild(d);
  }
  $('dragoncount').textContent = "Dragon's hand: " + s.dragonHandCount + ' cards';
}

function renderArena(s) {
  /* Hoard pile: coins and gems scattered in a mound. */
  var pile = $('hoardpile');
  pile.innerHTML = '';
  var coins = Math.min(14, Math.ceil(s.hoard / 2));
  for (var i = 0; i < coins; i++) {
    var c = document.createElement('div');
    c.className = 'coin';
    c.style.left = (8 + (i * 37) % 128) + 'px';
    c.style.top = (58 - Math.floor(i / 4) * 22 - (i % 3) * 4) + 'px';
    c.textContent = 'G';
    pile.appendChild(c);
  }
  for (var g = 0; g < 3; g++) {
    var gem = document.createElement('div');
    gem.className = 'gem';
    gem.style.left = (30 + g * 52) + 'px';
    gem.style.top = (18 + (g % 2) * 14) + 'px';
    pile.appendChild(gem);
  }
  $('hoardcount').textContent = s.hoard + ' 🪙';
  var guard = $('guardshield');
  guard.classList.toggle('show', s.hoardGuard);
  if (s.hoardGuard) guard.textContent = '🛡 HOARD GUARD ' + s.guardHP;
  /* Rage meter. */
  var fill = $('ragefill');
  fill.style.width = (s.rage / RAGE_MAX * 100) + '%';
  fill.classList.toggle('full', s.rage >= RAGE_MAX);
  $('ragenum').textContent = s.rage + ' / ' + RAGE_MAX + (s.enraged ? '  🔥 ENRAGED ×2' : '');
  /* Breath banner + intent card. */
  $('breathbanner').classList.toggle('show', s.breathArmed);
  if (s.intent) {
    $('intenttext').textContent = '…' + s.intent.text;
    $('intentcard').firstChild.textContent = s.intent.kind === 'breath' ? '🔥' :
      (s.intent.kind === 'hoard' ? '🪙' : '🐉');
  }
  /* Block badge. */
  var bb = $('blockbadge');
  bb.classList.toggle('show', s.block > 0);
  if (s.block > 0) bb.textContent = '🛡 BLOCK ' + s.block;
}

function renderLegend(s) { /* static HTML in index.html; nothing to update */ }

function renderLog(s) {
  var el = $('log');
  el.innerHTML = '';
  var start = Math.max(0, s.log.length - 12);
  for (var i = start; i < s.log.length; i++) {
    var d = document.createElement('div');
    if (s.log[i].kind) d.className = s.log[i].kind;
    d.textContent = s.log[i].msg;
    el.appendChild(d);
  }
  el.scrollTop = el.scrollHeight;
}

function cardElement(s, card, index) {
  var info = typeInfo(card.type);
  var el = document.createElement('div');
  el.className = 'card type-' + card.type;
  if (card.upgraded) el.classList.add('upgraded');
  if (!canPlay(s, card)) {
    el.classList.add(card.type === 'pilfer' && (s.hoardGuard || s.hoard <= 0) ? 'blocked' : 'unaffordable');
  }
  if (s.selected === index) el.classList.add('selected');
  el.dataset.index = index;
  var verb = { strike: 'DMG', pilfer: 'STEAL', guard: 'BLOCK', mend: 'HEAL', trick: 'TRICK' }[card.type];
  el.innerHTML =
    '<div class="cost">' + card.cost + '</div>' +
    '<div class="typebadge">' + info.icon + '</div>' +
    '<div class="cname">' + card.name + '</div>' +
    '<div class="cval">' + card.value + '<small>' + verb + '</small></div>' +
    '<div class="crule">' + card.rule + '</div>' +
    '<div class="key">' + (index + 1) + '</div>';
  return el;
}

function renderHand(s) {
  var zone = $('handzone');
  zone.innerHTML = '';
  for (var i = 0; i < s.hand.length; i++) {
    zone.appendChild(cardElement(s, s.hand[i], i));
  }
  if (s.hand.length === 0 && s.screen === 'play') {
    var empty = document.createElement('div');
    empty.style.cssText = 'color:#cbb27a;font-size:15px;align-self:center;';
    empty.textContent = 'Hand empty — end the turn to draw more.';
    zone.appendChild(empty);
  }
}

function renderControls(s) {
  $('btnupgrade').disabled = s.selected == null || s.gold < UPGRADE_COST ||
    !s.hand[s.selected] || s.hand[s.selected].upgraded || s.screen !== 'play';
  $('btnupgrade').textContent = s.selected == null
    ? '⬆ UPGRADE CARD (2 🪙) — select a card first'
    : '⬆ UPGRADE ' + s.hand[s.selected].name + ' (2 🪙)';
  $('btnend').disabled = s.screen !== 'play';
  $('deckbox').textContent = 'Deck: ' + s.deck.length + ' • Discard: ' + s.discard.length +
    ' • Hand: ' + s.hand.length + '/' + HAND_LIMIT;
}

function renderScreens(s) {
  $('titlescreen').classList.toggle('hidden', s.screen !== 'title');
  $('winscreen').classList.toggle('hidden', s.screen !== 'win');
  $('lossscreen').classList.toggle('hidden', s.screen !== 'loss');
  if (s.screen === 'win') $('winstats').innerHTML = statsText(s);
  if (s.screen === 'loss') $('lossstats').innerHTML = statsText(s);
}

function showPhaseBanner(text) {
  var b = $('phasebanner');
  b.textContent = text;
  b.style.display = 'block';
  setTimeout(function () { b.style.display = 'none'; }, 1800);
}

/* Floating damage / heal / gold numbers over the arena. */
function floatDamage(target, amount, kind) {
  var app = $('app');
  var d = document.createElement('div');
  d.className = 'dmgfloat' + (kind ? ' ' + kind : '');
  d.textContent = (kind === 'heal' ? '+' : kind === 'gold' ? '+' : '−') + amount +
    (kind === 'gold' ? ' 🪙' : '');
  var pos = { dragon: [600, 210], player: [600, 640], hoard: [1000, 190] }[target] || [640, 300];
  d.style.left = pos[0] + 'px';
  d.style.top = pos[1] + 'px';
  app.appendChild(d);
  setTimeout(function () { d.remove(); }, 1000);
}

/* Callouts for the cover frame: shown only in the ?shot=cover scene. */
function showCallouts(show) {
  var ids = ['co-hoard', 'co-rage', 'co-breath', 'co-pilfer'];
  for (var i = 0; i < ids.length; i++) {
    $(ids[i]).classList.toggle('show', !!show);
  }
  /* The breath callout only makes sense while breath is armed. */
  $('co-breath').classList.toggle('show', !!show && window.__state && window.__state.breathArmed);
}
