/**
 * BETA OFFICE experiment — Blackjack
 * Simplified single-hand blackjack vs a dealer that must hit on 16 and
 * stand on 17 (the standard fixed dealer rule). Aces count as 11 and
 * soften to 1 automatically whenever a hand would otherwise bust.
 */
(function () {
  if (!window.BetaExperiments) return;

  var SUITS = ["♠", "♥", "♦", "♣"];
  var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  function draw() {
    return {
      rank: RANKS[(Math.random() * RANKS.length) | 0],
      suit: SUITS[(Math.random() * SUITS.length) | 0],
    };
  }

  function value(card) {
    if (card.rank === "A") return 11;
    if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return 10;
    return parseInt(card.rank, 10);
  }

  function handValue(hand) {
    var total = hand.reduce(function (sum, c) { return sum + value(c); }, 0);
    var aces = hand.filter(function (c) { return c.rank === "A"; }).length;
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function label(hand) {
    return hand.map(function (c) { return c.rank + c.suit; }).join(" ");
  }

  window.BetaExperiments.registerExperiment({
    id: "blackjack",
    name: "Blackjack",
    category: "BLACKJACK",
    number: 84,
    description: "Hit or stand against the dealer, beat 21",
    launch: function (container) {
      var handsBox = window.BetaControls.sampleText(container, "");
      handsBox.classList.add("beta-blackjack-hands");

      var readout = window.BetaControls.readout(container);
      var state = { player: [], dealer: [], over: false };

      function render(revealDealer) {
        var dealerLabel = revealDealer || state.over
          ? label(state.dealer) + " (" + handValue(state.dealer) + ")"
          : label([state.dealer[0]]) + " ?";
        handsBox.innerHTML =
          "You: " + label(state.player) + " (" + handValue(state.player) + ")<br>" +
          "Dealer: " + dealerLabel;
      }

      function finish() {
        state.over = true;
        var p = handValue(state.player);
        var d = handValue(state.dealer);
        while (d < 17) {
          state.dealer.push(draw());
          d = handValue(state.dealer);
        }
        render(true);
        var text;
        if (p > 21) text = "Bust — dealer wins";
        else if (d > 21) text = "Dealer busts — you win";
        else if (p > d) text = "You win";
        else if (p < d) text = "Dealer wins";
        else text = "Push";
        readout.innerHTML = "<strong>" + text + "</strong>";
      }

      function hit() {
        if (state.over) return;
        state.player.push(draw());
        if (handValue(state.player) > 21) finish();
        else render(false);
      }

      function stand() {
        if (state.over) return;
        finish();
      }

      function build() {
        state.player = [draw(), draw()];
        state.dealer = [draw(), draw()];
        state.over = false;
        render(false);
        readout.textContent = "Hit or Stand?";
      }
      // Exposed so reset() (registered outside this closure) can deal a
      // fresh hand without reaching into loose local variables.
      state.restart = build;

      window.BetaControls.miniBtn(container, "Hit", hit);
      window.BetaControls.miniBtn(container, "Stand", stand);
      window.BetaControls.miniBtn(container, "New hand", build);

      build();

      container._betaState = state;
      return function cleanup() {};
    },
    reset: function (container) {
      var s = container._betaState;
      if (!s) return;
      s.restart();
    },
  });
})();
