/**
 * BETA OFFICE — Help
 * A searchable reference explaining concretely how to use every
 * registered experiment — controls, goal, keys. Reads the live registry
 * at open-time (same approach as experiments-index.js and the command
 * palette), so newly added experiments show up automatically; only
 * HELP_TEXT below needs a matching entry. Falls back to the
 * experiment's own tile description if no entry exists yet, so a
 * missing one degrades instead of breaking. Clicking an entry opens
 * that experiment directly.
 */
(function () {
  var btn = document.getElementById("betaHelpBtn");
  var panel = document.getElementById("betaHelpPanel");
  var search = document.getElementById("betaHelpSearch");
  var closeBtn = document.getElementById("betaHelpClose");
  var list = document.getElementById("betaHelpList");
  if (!btn || !panel || !search || !closeBtn || !list) return;

  var HELP_TEXT = {
    // --- Original set ---
    typography: "Drag the Font size, Letter spacing, and Line height sliders to restyle the sample line live. Toggle Scramble to rapidly swap each letter for a symbol; toggle it off to restore the original text.",
    motion: "Pick a mode: Spring pulls the dot back to center, Attract/Repel pull or push it toward your pointer inside the stage, Float drifts it on its own. Move your mouse over the stage to see Attract/Repel react.",
    cursor: "Choose a pointer style: Crosshair replaces the cursor with full-screen crosshair lines, Circle follows your pointer with a solid dot, Coords shows a live x/y readout next to the pointer, Trailing eases a dot toward your pointer with a lag. Default returns to normal.",
    grid: "Toggle Show grid to overlay Column, Baseline, or Pixel guide lines across the whole page, not just this window — pick which with the row of buttons below. Also bound to the global G key.",
    color: "Pick a Background and Foreground color — both rewrite the whole page's colors live, not just a preview. Invert page flips the page to a photo-negative; Monochrome desaturates everything. Both toggles combine with your color picks.",
    dom: "Outline everything draws a thin outline around every element on the page. Show bounds + names additionally labels up to 80 elements with their tag/class, updating as you scroll. A live count of every element in the document updates twice a second.",
    browser: "A live read-only readout, no controls. Move your mouse or scroll the page and watch the viewport size, device pixel ratio, scroll position, mouse coordinates, FPS, and user agent update in real time.",
    system: "A live read-only readout, no controls. Shows how many experiment categories and experiments are registered, how many windows are currently open, and when the page loaded.",
    debug: "A live read-only readout, no controls. Dumps the full experiment registry: every registered id and whether it's currently open, refreshing automatically.",
    image: "Click the dashed box (or drag a file onto it) to load an image from your computer — nothing uploads anywhere. Once loaded, toggle Grayscale / Invert / Blur — they combine, not radio-style.",
    sound: "Set Frequency and Volume with the sliders, then click Test tone to hear a short beep at those settings. Turn on Beep on hover to also hear a quieter version whenever your pointer enters the button.",
    canvas: "Click and drag inside the box to draw freehand. Adjust Brush size with the slider. Clear wipes the canvas.",
    physics: "A gravity-and-bounce ball pit runs on its own. Gravity and Bounciness sliders change the physics live. Add ball drops in one more.",
    distortion: "Skew and Perspective tilt sliders warp the whole page's main content (not this window) live. Shake triggers a repeating page shake; Shake intensity controls how hard.",

    // --- Games/toys, first wave ---
    snake: "Use the arrow keys to steer. Eat the hollow square to grow and score; hitting a wall or your own tail ends the run. Restart starts over.",
    reflex: "Click the box to arm it, then wait — when it flips solid black, click again as fast as you can. Clicking before the flip counts as a false start, shown in red. Your best and last time are tracked in milliseconds.",
    confetti: "Click anywhere on the canvas (or press Burst) to fire a shower of colored squares under gravity. Pieces and Gravity sliders change how big and how heavy each burst feels.",
    pong: "Move your mouse left/right over the canvas to slide the paddle — the ball bounces off the walls and paddle automatically. Missing the ball ends the round; your streak and best score are tracked. Restart to try again.",
    memory: "Click any two cards to flip them. A matching pair stays face-up; a mismatch flips back after a beat. Clear all 6 pairs in as few moves as possible. New game deals a fresh shuffle.",
    whack: "Click Start to begin a 30-second round. A single cell lights up at a time on the 3x3 grid — click it before it moves to the next cell to score.",
    fortune: "Click Ask for a random one-line fortune from a fixed pool of VELFONT-flavored quips.",
    dice: "Click Roll — the die flickers through faces before settling on a result. Your last few rolls are logged below.",
    piano: "Click any of the 8 keys, or use the A S D F H J K L keys on your keyboard, to play a note.",
    simon: "Watch the pads flash in sequence, then click them back in the same order. Each successful round adds one more step. One wrong tap ends the run — click New game to try again.",
    tictactoe: "Local two-player, no computer opponent — click a cell to place the current player's mark (X goes first), alternating turns. Three in a row, column, or diagonal wins. New game clears the board.",

    // --- Games/puzzles, second wave ---
    minesweeper: "Left-click a cell to reveal it — revealing an empty (0-neighbor) cell auto-reveals its neighbors. The number shown is how many of the 8 surrounding cells are mines. Right-click to flag a suspected mine. Click a mine and the round ends, revealing every mine.",
    "2048": "Use the arrow keys to slide every tile in that direction — tiles with the same number merge into one, doubling its value, when they collide. A new 2 or 4 tile appears after each valid move. The round ends when no more moves are possible.",
    connectfour: "Local two-player — click anywhere in a column to drop the current player's disc (Red goes first) into the lowest open slot. Four in a row, horizontal, vertical, or diagonal, wins.",
    breakout: "Move your mouse left/right over the canvas to slide the paddle. The ball bounces off walls and the paddle automatically — clear every brick to win, or miss the ball and the round ends. Restart to try again.",
    hangman: "Click letters on the on-screen keyboard to guess the hidden word, one letter at a time. Six wrong guesses ends the round. New word deals a fresh word from the list.",
    lightsout: "Click a cell to toggle it and its up/down/left/right neighbors on or off. The goal is to turn every light off — every puzzle is scrambled from the solved state, so it's always solvable. New puzzle scrambles a fresh board.",
    maze: "Use the arrow keys to walk the dot from the top-left start to the red exit square in the bottom-right. Your solve time is tracked live. New maze generates a fresh layout.",
    slots: "Click Spin — all three reels flicker independently and settle in sequence. Match all three symbols for a jackpot.",
    wheel: "Click Spin — the wheel spins down through several rotations before easing to a stop on one of the six options, announced below.",
    hilo: "A card rank (A, 2-10, J, Q, K) is shown. Click Higher or Lower to guess whether the next card will rank higher or lower. A correct guess extends your streak; a wrong guess, or a tie, resets it.",
    bingo: "A random 5x5 card is dealt (center square is a free space, already marked). Click numbers as you're called them — filling any full row, column, or diagonal wins. New card deals a fresh board.",
    rockpaperscissors: "Click Rock, Paper, or Scissors to play a round against a random computer pick. Win/loss/tie tallies keep running across rounds.",
    guessnumber: "The computer picks a number from 1-100. Type a guess and click Guess (or press Enter) — you'll be told Higher or Lower after each try. New number starts over with a fresh target.",
    scramble: "A word from a fixed list is shown scrambled. Type your answer and click Check (or press Enter) to see if you're right — a correct guess deals a new word after a short pause and extends your streak. Skip deals a new word immediately.",
    trivia: "Click one of the four answer buttons for each multiple-choice question. Right or wrong, a new question loads automatically after a moment. Score tracks correct answers across the whole shuffled set.",
    math: "Click Start for a 30-second round of quick arithmetic. Type the answer to the shown problem and press Enter — each correct answer scores a point and loads a new problem immediately.",
    emojiguess: "An emoji combo represents a movie or phrase — type your guess and click Check (or press Enter). A correct guess scores a point and loads a new puzzle after a pause. Skip moves on immediately.",
    cps: "Click the box once to start a 5-second timer, then click as many times as you can before it ends. Your clicks-per-second for that run, and your best run, are shown after.",
    typerace: "A sentence is shown — start typing it into the box below. The timer starts on your first keystroke; once your typed text matches exactly, your words-per-minute is calculated. New sentence picks a different one to type.",
    fireworks: "Runs on its own — rockets launch from the bottom on a random cadence, rise, and burst into fading sparks. Toggle Running off to pause new launches (existing sparks finish playing out) without closing the window.",

    // --- Visual/generative toys ---
    starfield: "Runs on its own — stars fly outward from the center like warp speed. The Speed slider controls how fast.",
    matrixrain: "Runs on its own — glyph columns fall and fade continuously, digital-rain style. The Speed slider controls how fast new characters drop.",
    gameoflife: "Click cells to toggle them alive/dead while paused, then click Play to run Conway's Game of Life rules (a live cell with 2-3 neighbors survives, a dead cell with exactly 3 neighbors is born). Random seeds a scattered pattern; Clear wipes the board. The edges wrap around.",
    fractaltree: "A recursive branching tree renders instantly. The Angle slider changes how wide each branch fork spreads; Depth changes how many levels of branching are drawn.",
    kaleidoscope: "Click and drag anywhere on the canvas — your stroke is mirrored and rotated into an 8-way symmetric pattern around the center. Clear wipes the canvas.",
    lavalamp: "Runs on its own, no controls — soft blurred blobs drift up and down the canvas ambiently.",
    spirograph: "A classic Spirograph curve (a hypotrochoid) is drawn instantly from the R, r, and d slider values — adjust any of them to redraw the curve live.",
    gravitywells: "Click anywhere on the canvas to drop a red attractor point (up to 4 at once, oldest removed first) — the field of small particles bends its motion toward every active attractor, producing orbits and swirls. Clear wells removes them all.",
    constellation: "Click anywhere on the canvas to place a star — each new star automatically draws a line to whichever existing star is closest, building up a random constellation over time. Clear wipes the canvas.",
    textblast: "Click anywhere on the canvas to scatter the lettering into particles that fly outward, then ease back into place a moment later. Click again anytime, including mid-reform.",

    // --- Sound / utility / generators ---
    banner: "Type in the text box to see it rendered huge below. Cycle style switches between plain, outlined, and strikethrough display.",
    palette: "Click Generate for a random 5-color swatch of related hues. Click any swatch to copy its exact color value to your clipboard.",
    bubblewrap: "Click any bubble to pop it — purely satisfying, no scoring. Reset sheet restores every bubble.",
    balloons: "Balloons drift upward from the bottom — click one before it floats off the top of the canvas to score. Missing 3 balloons ends the round. New game starts over.",
    drums: "Click cells in the 3x8 grid to turn steps on/off for Kick, Snare, and Hat. Click Play to loop through all 8 steps, triggering every active cell in that column. The Tempo slider changes playback speed.",
    metronome: "Set the BPM slider, then click Play — a dot pulses and a short click sound plays on every beat. Adjust BPM live while it's running.",
    soundboard: "Click any of the 8 labeled buttons to instantly play its preset tone — each has a distinct pitch and timbre.",
    timer: "Type a number of seconds and click Start to begin a countdown — three beeps sound when it hits zero. Pause holds the current time; Reset returns to the number in the box.",
    stopwatch: "Click Start to begin timing, Stop to pause it. Lap records the current time into a running list of your last 5 laps without stopping the clock. Reset zeroes everything.",
    coinflip: "Click Flip — the coin flickers between heads and tails before settling on a result. Heads/tails counts tally across every flip.",
    textmirror: "Type text into the box to see it echoed live below. Cycle mode switches the echo between reversed (letters backwards), upside-down (rotated 180°), and mirror (flipped horizontally).",
    pixelpaint: "Pick a color swatch, then click or click-and-drag across the 16x16 grid to paint pixels. Clear wipes the canvas.",
    stickynotes: "Click Add note to drop a new pastel sticky note onto the board — drag its body to reposition it, click inside to edit its text, or click the × in its corner to delete it.",
    buzzword: "Click Generate for a random corporate-jargon sentence, assembled from a verb + adjective + noun word bank.",
    startupname: "Click Generate for a random fake startup name, combining a random prefix and suffix.",
    stroop: "A color name is shown rendered in a mismatched ink color. Click the button matching the ink color it's actually drawn in, not the word itself. A correct click extends your streak; a wrong one resets it.",
    flock: "A flock of dots moves on its own, each reacting to its nearby neighbors: Cohesion pulls each one toward the local group's average position, Separation pushes it away from whichever neighbors get too close. Adjust either slider to change how tightly the flock holds together.",
    moodring: "Click Read mood for a random mood name plus a matching color swatch.",
    rubberduck: "Type whatever you're stuck on into the box and click Explain — the duck replies with one of a handful of generic rubber-duck-debugging prompts. It doesn't actually read your text.",
    wordcloud: "Paste or type text into the box, then click Generate — the most frequent words are rendered on the canvas below, sized by how often they appear (common filler words like \"the\"/\"and\" are ignored).",

    // --- 76-100 ---
    stacker: "A red marker sweeps left-right along the top — click to drop a block into whichever column it's over. Blocks stack upward; overflow a column's height and the run ends. New game resets the board.",
    airhockey: "Move your mouse left/right over the canvas to slide your paddle (bottom) — a simple AI controls the top paddle. First to 5 goals wins. Restart to play again.",
    battleship: "A 3/2/2-ship fleet is hidden on a 6x6 grid. Click cells to fire — hits turn red, misses turn gray. Sink every ship to win. New fleet hides a fresh layout.",
    fishtank: "Ambient swimming fish drift back and forth with a gentle bob. Click anywhere on the canvas to add more, up to 30.",
    snow: "Ambient falling snow, swaying side to side as it drifts down and loops back to the top. No controls.",
    colorpicker: "Click anywhere on the gradient to sample the exact pixel color under your pointer — its hex code is shown and copied to your clipboard. New gradient generates a different one.",
    dotsandboxes: "Local two-player on a grid of dots. Click a line between two dots to claim it (alternating turns) — completing a box's 4th side scores it for whoever drew that side. Most boxes when the board fills up wins.",
    wordle: "Type any letter keys to fill the current row, Backspace to correct, Enter to submit. Green-style (filled black) means right letter/right spot, red means right letter/wrong spot, gray means not in the word. Six guesses to get the 5-letter word.",
    blackjack: "Click Hit to take another card, Stand to let the dealer play out their hand. Get closer to 21 than the dealer without going over. New hand deals again.",
    audioreflex: "Click Arm, then wait silently — the instant you hear the beep, press the Space bar as fast as you can. Pressing Space during the silent wait counts as a false start. Your best and last reaction time are tracked in milliseconds.",
    pendulum: "Click and drag the dark bob to set its starting angle, then release — gravity takes over and it swings, slowly losing momentum to damping. No scoring, just physics.",
    bigclock: "A live local-time clock rendered oversized. No controls — it just ticks.",
    breathe: "Watch the circle expand and contract on a slow 4-2-4-2 second cycle, labeled Breathe in / Hold / Breathe out / Hold. No controls — just breathe along with it.",
    plinko: "Click Drop ball to release one ball from the top — it bounces randomly left or right off each row of pegs before landing in a numbered slot at the bottom, adding that many points to your total.",
    target: "A red circle appears and shrinks over about 2 seconds — click it before it's gone to score and spawn the next one. Missing it (or clicking too late) resets your streak to zero.",
    slidepuzzle: "The classic 15-puzzle. Click any tile adjacent to the blank space to slide it into the gap. Arrange all 15 numbered tiles in order. Shuffle deals a fresh, always-solvable layout.",
    hanoi: "Click a peg to pick up its top disk (it gets outlined), then click another peg to place it there — you can only place a disk on an empty peg or on top of a larger one. Move the whole stack from the first peg to the third to win.",
    worddrop: "Words fall from the top of the canvas — type one exactly into the box below to destroy it and score before it reaches the bottom. Missing 3 words ends the round.",
    tonguetwister: "Click Generate for a random tongue twister — try saying it three times fast.",
    riddle: "Click New riddle for a random riddle, then click Reveal answer when you're ready to check your guess.",
    wouldyourather: "Click either option button to \"pick\" it (just shows your choice back to you, nothing is saved) — click Next for a new dilemma.",
    spinner: "Click and drag in a circular motion around the center to flick the spinner — release and it keeps spinning, slowly losing speed to friction. No scoring, just fidgeting.",
    etchasketch: "Drag the X knob and Y knob sliders — together they move a pen around the canvas, drawing a continuous line as you go, just like the real toy's two dials. Shake to clear wipes the canvas.",
    "experiments-index": "A flat, numbered list of every other experiment, #1 through #98. Click any entry to open that experiment's window directly — the same shortcut this Help panel itself offers.",
  };

  function render() {
    var query = search.value.trim().toLowerCase();
    var specs = window.BetaExperiments ? window.BetaExperiments.getAll() : [];
    var items = specs
      .map(function (spec) {
        return { spec: spec, text: HELP_TEXT[spec.id] || spec.description || "" };
      })
      .filter(function (item) {
        if (!query) return true;
        return (
          item.spec.name.toLowerCase().indexOf(query) !== -1 ||
          item.spec.category.toLowerCase().indexOf(query) !== -1 ||
          item.text.toLowerCase().indexOf(query) !== -1
        );
      })
      .sort(function (a, b) { return (a.spec.number || 0) - (b.spec.number || 0); });

    list.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("div");
      empty.className = "beta-help-empty";
      empty.textContent = 'No experiments match "' + search.value.trim() + '".';
      list.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      var entry = document.createElement("button");
      entry.type = "button";
      entry.className = "beta-help-item";

      var head = document.createElement("div");
      var name = document.createElement("span");
      name.className = "beta-help-name";
      name.textContent = (item.spec.number != null ? "#" + item.spec.number + " " : "") + item.spec.name;
      var category = document.createElement("span");
      category.className = "beta-help-category";
      category.textContent = item.spec.category;
      head.appendChild(name);
      head.appendChild(category);

      var desc = document.createElement("div");
      desc.className = "beta-help-desc";
      desc.textContent = item.text;

      entry.appendChild(head);
      entry.appendChild(desc);
      entry.addEventListener("click", function () {
        close();
        window.BetaWM && window.BetaWM.openExperiment(item.spec.id);
      });
      list.appendChild(entry);
    });
  }

  function open() {
    panel.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    search.value = "";
    render();
    search.focus();
  }

  function close() {
    panel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }

  function isOpen() {
    return !panel.hidden;
  }

  btn.addEventListener("click", function () {
    isOpen() ? close() : open();
  });
  closeBtn.addEventListener("click", close);
  search.addEventListener("input", render);

  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
  });
  document.addEventListener("pointerdown", function (e) {
    if (!isOpen()) return;
    if (e.target === btn || panel.contains(e.target)) return;
    close();
  });

  window.BetaHelp = { open: open, close: close, isOpen: isOpen };
})();
