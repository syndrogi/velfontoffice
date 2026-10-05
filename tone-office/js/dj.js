/**
 * TONE OFFICE — DJ Decks
 * Two independent decks, each loading its own audio file (nothing
 * uploads anywhere), looping once played, with its own speed control —
 * mixed together with a single crossfader. No beat-matching or
 * scratching — a straightforward two-deck mixer, not a full DJ app.
 * Keeps playing in the background if this window is closed (same as
 * the sequencer does) — only the deck's own stop button actually
 * stops it.
 */
(function () {
  function createDeck() {
    return { buffer: null, fileName: "", source: null, playing: false, speed: 1, gainNode: null };
  }
  var deckA = createDeck();
  var deckB = createDeck();

  function ensureGain(deck) {
    if (!deck.gainNode) {
      var ctx = window.ToneEngine.init();
      deck.gainNode = ctx.createGain();
      deck.gainNode.gain.value = 0.5;
      window.ToneEngine.connectDry(deck.gainNode);
    }
    return deck.gainNode;
  }

  function playDeck(deck) {
    if (!deck.buffer || deck.playing) return;
    var ctx = window.ToneEngine.init();
    var src = ctx.createBufferSource();
    src.buffer = deck.buffer;
    src.loop = true;
    src.playbackRate.value = deck.speed;
    src.connect(ensureGain(deck));
    src.start();
    deck.source = src;
    deck.playing = true;
  }

  function stopDeck(deck) {
    if (deck.source) {
      try {
        deck.source.stop();
      } catch (e) {
        /* already stopped */
      }
      deck.source.disconnect();
      deck.source = null;
    }
    deck.playing = false;
  }

  function setSpeed(deck, speed) {
    deck.speed = speed;
    if (deck.source) {
      deck.source.playbackRate.setTargetAtTime(speed, window.ToneEngine.context().currentTime, 0.01);
    }
  }

  function setCrossfade(x) {
    var ctx = window.ToneEngine.init();
    ensureGain(deckA).gain.setTargetAtTime(1 - x, ctx.currentTime, 0.01);
    ensureGain(deckB).gain.setTargetAtTime(x, ctx.currentTime, 0.01);
  }

  function buildDeckUI(deck, label) {
    var panel = document.createElement("div");
    panel.className = "tone-dj-deck";

    var title = document.createElement("h3");
    title.className = "tone-dj-deck-title";
    title.textContent = label;
    panel.appendChild(title);

    var loadRow = document.createElement("div");
    loadRow.className = "tone-sampler-load";
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*";
    fileInput.className = "tone-file-input";
    fileInput.id = "toneDj" + label;
    var status = document.createElement("span");
    status.className = "tone-sampler-status";
    status.textContent = "No file loaded";
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      window.ToneEngine.decodeFile(file).then(function (decoded) {
        stopDeck(deck);
        deck.buffer = decoded;
        deck.fileName = file.name;
        status.textContent = file.name;
        playBtn.disabled = false;
      });
    });
    var loadLabel = document.createElement("label");
    loadLabel.className = "tone-mini-btn tone-file-label";
    loadLabel.htmlFor = fileInput.id;
    loadLabel.textContent = "LOAD";
    loadRow.appendChild(fileInput);
    loadRow.appendChild(loadLabel);
    loadRow.appendChild(status);
    panel.appendChild(loadRow);

    var playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "tone-toggle-btn tone-dj-play";
    playBtn.textContent = "PLAY";
    playBtn.disabled = true;
    playBtn.addEventListener("click", function () {
      if (deck.playing) {
        stopDeck(deck);
        playBtn.textContent = "PLAY";
        playBtn.classList.remove("tone-is-active");
      } else {
        playDeck(deck);
        playBtn.textContent = "STOP";
        playBtn.classList.add("tone-is-active");
      }
    });
    panel.appendChild(playBtn);

    var speedField = document.createElement("div");
    speedField.className = "tone-field";
    var speedLabel = document.createElement("label");
    speedLabel.textContent = "SPEED";
    var speedInput = document.createElement("input");
    speedInput.type = "range";
    speedInput.min = "50";
    speedInput.max = "150";
    speedInput.value = "100";
    speedInput.addEventListener("input", function () {
      setSpeed(deck, Number(speedInput.value) / 100);
    });
    speedField.appendChild(speedLabel);
    speedField.appendChild(speedInput);
    panel.appendChild(speedField);

    if (deck.buffer) playBtn.disabled = false;

    return panel;
  }

  function buildWindow(container) {
    var decks = document.createElement("div");
    decks.className = "tone-dj-decks";
    decks.appendChild(buildDeckUI(deckA, "A"));
    decks.appendChild(buildDeckUI(deckB, "B"));
    container.appendChild(decks);

    var crossField = document.createElement("div");
    crossField.className = "tone-field tone-dj-crossfader";
    var crossLabel = document.createElement("label");
    crossLabel.textContent = "CROSSFADER — A / B";
    var crossInput = document.createElement("input");
    crossInput.type = "range";
    crossInput.min = "0";
    crossInput.max = "100";
    crossInput.value = "50";
    crossInput.addEventListener("input", function () {
      setCrossfade(Number(crossInput.value) / 100);
    });
    crossField.appendChild(crossLabel);
    crossField.appendChild(crossInput);
    container.appendChild(crossField);

    setCrossfade(0.5);
  }

  window.ToneDJ = { buildWindow: buildWindow };
})();
