/**
 * VELFONT OFFICE — Labs / Roulette
 * Re-spins the hero title through its other-language renderings — the
 * same slot-machine reel as the first-paint spin (see spinHeroTitleRoulette
 * in main.js) — and lands on a random language other than whatever's
 * currently shown. One-shot action, not a persistent toggle.
 */
(function () {
  if (typeof registerLab !== "function") return;

  registerLab({
    id: "roulette",
    title: "roulette",
    action: function () {
      if (typeof window.spinHeroTitleRoulette === "function") {
        window.spinHeroTitleRoulette();
      }
    },
  });
})();
