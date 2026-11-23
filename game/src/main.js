/* main.js — bootstrap.
   One job: start the game, wire input, and expose the test hooks
   (?shot= scenes, autopilot) the maker uses to playtest. */
'use strict';

window.__shotReady = false;
var booted = false;

function boot() {
  if (booted) return;
  booted = true;
  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot');
  if (shot) {
    setupShot(shot);
    return;
  }
  var s = newGame();
  window.__state = s;
  bindInput();
  renderAll(s);
}

/* Test hooks used by the maker's own playtest driver (never by players). */
window.__autoplay = function (style, maxTurns) {
  var s = window.__state;
  if (s.screen === 'title') { startGame(s); renderAll(s); }
  return autoplayGame(s, style, maxTurns);
};
window.__newGame = function (seed) {
  var s = newGame(seed);
  window.__state = s;
  renderAll(s);
  return s.screen;
};

document.addEventListener('DOMContentLoaded', boot);
if (document.readyState !== 'loading') boot();
