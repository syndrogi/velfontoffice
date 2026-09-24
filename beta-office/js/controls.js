/**
 * BETA OFFICE — Shared experiment-window control builders
 * Every js/experiments/*.js module needs the same handful of small UI
 * pieces (a labeled slider, a row of toggle buttons, a live readout,
 * a demo stage) — built here once against the .beta-field/.beta-toggle/
 * etc. classes in style.css, so 15 experiment files don't each redefine
 * the same DOM-building boilerplate. This file has no opinion on what
 * any experiment actually does — same spirit as window-manager.js
 * owning chrome while experiments own content.
 */
(function () {
  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function slider(container, opts) {
    var field = el("div", "beta-field");
    var label = el("div", "beta-field-label");
    var labelText = document.createTextNode(opts.label);
    var valueEl = el("span");
    valueEl.textContent = (opts.value != null ? opts.value : opts.min) + (opts.unit || "");
    label.appendChild(labelText);
    label.appendChild(valueEl);

    var input = document.createElement("input");
    input.type = "range";
    input.min = String(opts.min);
    input.max = String(opts.max);
    input.step = String(opts.step || 1);
    input.value = String(opts.value != null ? opts.value : opts.min);

    input.addEventListener("input", function () {
      var v = parseFloat(input.value);
      valueEl.textContent = v + (opts.unit || "");
      if (opts.onInput) opts.onInput(v);
    });

    field.appendChild(label);
    field.appendChild(input);
    container.appendChild(field);
    return input;
  }

  // Radio-style row — exactly one option active at a time.
  function toggles(container, opts) {
    var row = el("div", "beta-toggle-row");
    var buttons = [];
    opts.options.forEach(function (opt) {
      var btn = el("button", "beta-toggle");
      btn.type = "button";
      btn.textContent = opt.label;
      btn.classList.toggle("beta-is-active", opt.value === opts.value);
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("beta-is-active"); });
        btn.classList.add("beta-is-active");
        if (opts.onChange) opts.onChange(opt.value);
      });
      buttons.push(btn);
      row.appendChild(btn);
    });
    container.appendChild(row);
    return {
      setActive: function (value) {
        opts.options.forEach(function (opt, i) {
          buttons[i].classList.toggle("beta-is-active", opt.value === value);
        });
      },
    };
  }

  // Independent on/off toggle.
  function toggleButton(container, opts) {
    var row = el("div", "beta-toggle-row");
    var btn = el("button", "beta-toggle");
    btn.type = "button";
    btn.textContent = opts.label;
    btn.classList.toggle("beta-is-active", !!opts.active);
    btn.addEventListener("click", function () {
      var next = !btn.classList.contains("beta-is-active");
      btn.classList.toggle("beta-is-active", next);
      if (opts.onToggle) opts.onToggle(next);
    });
    row.appendChild(btn);
    container.appendChild(row);
    return btn;
  }

  function readout(container) {
    var box = el("div", "beta-readout");
    container.appendChild(box);
    return box;
  }

  function sampleText(container, text) {
    var box = el("div", "beta-sample-text");
    box.textContent = text;
    container.appendChild(box);
    return box;
  }

  function miniBtn(container, label, onClick) {
    var btn = el("button", "beta-mini-btn");
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    container.appendChild(btn);
    return btn;
  }

  function stage(container, withCanvas) {
    var box = el("div", "beta-stage");
    var canvas = null;
    if (withCanvas) {
      canvas = document.createElement("canvas");
      box.appendChild(canvas);
    }
    container.appendChild(box);
    return { el: box, canvas: canvas };
  }

  window.BetaControls = {
    slider: slider,
    toggles: toggles,
    toggleButton: toggleButton,
    readout: readout,
    sampleText: sampleText,
    miniBtn: miniBtn,
    stage: stage,
  };
})();
