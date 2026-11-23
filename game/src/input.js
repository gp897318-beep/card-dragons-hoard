/* input.js — mouse + keyboard input.
   One job: turn clicks and keys into game actions. Handlers always read
   window.__state, so restarting the game (which swaps the state object)
   never leaves stale closures behind. */
'use strict';

function cur() { return window.__state; }

function bindInput() {
  var zone = $('handzone');
  zone.addEventListener('click', function (ev) {
    var s = cur();
    var cardEl = ev.target.closest('.card');
    if (!cardEl || s.screen !== 'play') return;
    var idx = Number(cardEl.dataset.index);
    var card = s.hand[idx];
    if (!card) return;
    if (s.selected === idx) {
      /* Second click on the selected card plays it. */
      playCardWithFlight(s, idx, cardEl);
    } else {
      s.selected = idx;
      playSound('click');
      renderAll(s);
    }
  });

  $('btnend').addEventListener('click', function () {
    var s = cur();
    if (s.screen !== 'play') return;
    playSound('click');
    endTurn(s);
    renderAll(s);
  });

  $('btnupgrade').addEventListener('click', function () {
    var s = cur();
    if (upgradeSelected(s)) renderAll(s);
  });

  $('btnrestart').addEventListener('click', function () { restartGame(); });
  $('btnstart').addEventListener('click', function () {
    var s = cur();
    playSound('click');
    startGame(s);
    renderAll(s);
  });
  $('btnagain').addEventListener('click', function () { restartGame(); });
  $('btnretry').addEventListener('click', function () { restartGame(); });
  $('btnmute').addEventListener('click', function () {
    var s = cur();
    s.muted = !s.muted;
    $('btnmute').textContent = s.muted ? '🔇 MUTED (M)' : '🔊 SOUND (M)';
    renderAll(s);
  });

  document.addEventListener('keydown', function (ev) {
    var s = cur();
    if (ev.key >= '1' && ev.key <= '7') {
      var idx = Number(ev.key) - 1;
      var card = s.hand[idx];
      if (card && s.screen === 'play') {
        playCardWithFlight(s, idx, zone.children[idx]);
      }
    } else if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      if (s.screen === 'title') { startGame(s); renderAll(s); }
      else if (s.screen === 'play') { endTurn(s); renderAll(s); }
      else { restartGame(); }
    } else if (ev.key === 'u' || ev.key === 'U') {
      if (upgradeSelected(s)) renderAll(s);
    } else if (ev.key === 'r' || ev.key === 'R') {
      restartGame();
    } else if (ev.key === 'm' || ev.key === 'M') {
      s.muted = !s.muted;
      $('btnmute').textContent = s.muted ? '🔇 MUTED (M)' : '🔊 SOUND (M)';
      renderAll(s);
    } else if (ev.key === 'Escape') {
      s.selected = null;
      renderAll(s);
    }
  });
}

/* Play a card with a little fly-up flourish before it resolves. */
function playCardWithFlight(s, idx, el) {
  var card = s.hand[idx];
  if (!card || !canPlay(s, card)) {
    playSound('click');
    renderAll(s);
    return;
  }
  if (el) {
    el.classList.add('flying');
    setTimeout(function () { playCard(s, idx); renderAll(s); }, 180);
  } else {
    playCard(s, idx);
    renderAll(s);
  }
}

function restartGame() {
  var fresh = newGame();
  fresh.muted = window.__state ? window.__state.muted : false;
  window.__state = fresh;
  startGame(fresh);
  renderAll(fresh);
}
