/**
 * BETA OFFICE experiment — Sticky Notes
 * Add draggable, editable pastel notes to a small board. Each note owns
 * its own drag handling (a lighter version of makeElementDraggable-style
 * pointer capture) and a delete button.
 */
(function () {
  if (!window.BetaExperiments) return;

  var COLORS = ["#fff59d", "#ffccbc", "#c8e6c9", "#bbdefb", "#e1bee7"];

  window.BetaExperiments.registerExperiment({
    id: "stickynotes",
    name: "Sticky Notes",
    category: "STICKYNOTES",
    description: "Add draggable sticky notes, edit inline",
    launch: function (container) {
      var board = document.createElement("div");
      board.className = "beta-sticky-board";
      container.appendChild(board);

      function makeDraggable(note) {
        var dragging = false;
        var startX = 0;
        var startY = 0;
        var baseLeft = 0;
        var baseTop = 0;

        note.addEventListener("pointerdown", function (e) {
          if (e.target.classList.contains("beta-sticky-delete") || e.target.classList.contains("beta-sticky-text")) return;
          dragging = true;
          startX = e.clientX;
          startY = e.clientY;
          baseLeft = note.offsetLeft;
          baseTop = note.offsetTop;
          note.setPointerCapture(e.pointerId);
        });
        note.addEventListener("pointermove", function (e) {
          if (!dragging) return;
          note.style.left = baseLeft + (e.clientX - startX) + "px";
          note.style.top = baseTop + (e.clientY - startY) + "px";
        });
        function release() { dragging = false; }
        note.addEventListener("pointerup", release);
        note.addEventListener("pointercancel", release);
      }

      function addNote() {
        var note = document.createElement("div");
        note.className = "beta-sticky-note";
        note.style.backgroundColor = COLORS[(Math.random() * COLORS.length) | 0];
        note.style.left = 10 + Math.random() * 100 + "px";
        note.style.top = 10 + Math.random() * 60 + "px";

        var text = document.createElement("div");
        text.className = "beta-sticky-text";
        text.contentEditable = "true";
        text.textContent = "Note";
        note.appendChild(text);

        var del = document.createElement("button");
        del.type = "button";
        del.className = "beta-sticky-delete";
        del.textContent = "×";
        del.addEventListener("click", function () { note.remove(); });
        note.appendChild(del);

        makeDraggable(note);
        board.appendChild(note);
      }

      window.BetaControls.miniBtn(container, "Add note", addNote);
      addNote();

      return function cleanup() {};
    },
  });
})();
