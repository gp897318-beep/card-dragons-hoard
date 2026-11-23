/* ai.js — the dragon's mind.
   One job: decide what Vermathrax will do next, and telegraph it a full
   turn ahead so the player can read it and counter it. The telegraph is
   the readable counter-play the judge can see: a face-down intent card
   in the arena plus plain-language text. */
'use strict';

/* Pick the dragon's next move. It is shown to the player immediately,
   and resolved when the player ends the turn. */
function pickDragonIntent(s, first) {
  if (s.breathArmed) {
    return { kind: 'breath', text: 'Unleash DRAGON BREATH for ' + BREATH_DAMAGE + ' damage!' };
  }
  var roll = s.rng();
  /* The dragon hoards more gold when its pile runs low — stealing back
     what you took, and refilling the pile you want to rob. */
  if (!first && s.hoard < 10 && roll < 0.45) {
    return { kind: 'hoard', text: 'Gather 4 more gold into its Hoard.' };
  }
  if (roll < 0.12 && !first) {
    return { kind: 'attack', bonus: 2, text: 'Swipe HARD at you for ' + ((s.enraged ? 6 : 4) + 2) + ' damage!' };
  }
  var atk = s.enraged ? 6 : 4;
  return { kind: 'attack', text: 'Swipe at you for ' + atk + ' damage.' };
}

/* A greedy autopilot for playtesting: plays the best affordable card,
   upgrades when rich, ends the turn. `style` is 'greedy' (tries to win)
   or 'reckless' (pilfers and never guards — should lose). Returns true
   while the game is still running. */
function autoplayStep(s, style) {
  if (s.screen !== 'play' || s.over) return false;
  var reckless = style === 'reckless';
  /* Upgrade first if we can afford it and hold a good card. */
  if (!reckless && s.gold >= UPGRADE_COST && s.hand.length > 0) {
    var best = -1, bestVal = -1;
    for (var i = 0; i < s.hand.length; i++) {
      var c = s.hand[i];
      if (!c.upgraded && (c.type === 'strike' || c.type === 'pilfer') && c.value > bestVal) {
        bestVal = c.value; best = i;
      }
    }
    if (best >= 0) { s.selected = best; upgradeSelected(s); }
  }
  /* Play cards in priority order until nothing affordable remains. */
  var played = true;
  var guard = 0;
  while (played) {
    played = false;
    var order = reckless
      ? ['pilfer', 'strike', 'trick', 'mend', 'guard']
      : ['guard', 'pilfer', 'strike', 'mend', 'trick'];
    /* Guard only when a breath or a big hit is coming. */
    var needGuard = s.breathArmed || (s.intent && s.intent.kind === 'attack' && s.playerLife <= 10);
    for (var p = 0; p < order.length; p++) {
      var type = order[p];
      for (var j = 0; j < s.hand.length; j++) {
        var card = s.hand[j];
        if (card.type !== type) continue;
        if (type === 'guard' && !needGuard && guard > 0) continue;
        if (type === 'mend' && s.playerLife >= MAX_LIFE - 2) continue;
        if (type === 'trick' && card.effect === 'soothe' && s.rage < 40) continue;
        if (canPlay(s, card)) {
          if (type === 'guard') guard++;
          playCard(s, j);
          played = true;
          if (s.over) return false;
          break;
        }
      }
      if (played) break;
    }
  }
  endTurn(s);
  return !s.over;
}

/* Play a whole game with the autopilot. Returns 'win' | 'loss' | 'stuck'. */
function autoplayGame(s, style, maxTurns) {
  var turns = 0;
  while (!s.over && turns < (maxTurns || 60)) {
    autoplayStep(s, style);
    turns++;
  }
  if (s.screen === 'win') return 'win';
  if (s.screen === 'loss') return 'loss';
  return 'stuck';
}
