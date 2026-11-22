/**
 * MIDI OFFICE — SV-16 / Renderer
 * Draws one 1080x1920 frame: sequencer pixels, image, piano roll,
 * scopes, polar spectrum, beat frame, score and steps. Holds no playback
 * state of its own: every frame is a pure function of the time and the
 * scene sv16.js passes to draw(). All colours come from the scene's
 * palette (see palette.js), so ACC / INK / PAP restyle every panel.
 */
(() => {
  const { HOP, NB, M0, M1, NM, OVN } = window.ToneSv16Analysis;
  const W = 1080,
    H = 1920;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function createRenderer(canvas) {
    const g = canvas.getContext("2d");
    // Scene for the frame being drawn, set by draw() before any panel runs.
    let an = null,
      C = {},
      A = {},
      onA = "#000",
      media = null,
      zoomCuts = true,
      trackName = "";

    /* ---------- Drawing helpers ---------- */
    function rr(x, y, w, h) {
      g.beginPath();
      g.rect(x, y, w, h);
    }
    function box(x, y, w, h) {
      rr(x + 0.5, y + 0.5, w - 1, h - 1);
      g.strokeStyle = C.line;
      g.lineWidth = 1;
      g.stroke();
    }
    function sq(x, y, s, col) {
      g.fillStyle = col;
      g.fillRect(x - s, y - s, s * 2, s * 2);
    }
    function sqLine(x, y, s, w, col) {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.strokeRect(x - s + w / 2, y - s + w / 2, s * 2 - w, s * 2 - w);
    }
    function line(a, b, c, d) {
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(c, d);
      g.stroke();
    }
    function dot(x, y, r, col) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    function ring(x, y, r, w, col) {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
    }
    function txt(s, x, y, size, color, weight = 400, align = "left", ls = 1.6) {
      g.font = `${weight} ${size}px "IBM Plex Mono", ui-monospace, monospace`;
      g.fillStyle = color;
      g.textAlign = align;
      g.textBaseline = "alphabetic";
      if ("letterSpacing" in g) g.letterSpacing = ls + "px";
      g.fillText(s, x, y);
    }
    function head(x, y, w, label, right, rc) {
      txt(label, x + 12, y + 24, 14, C.text);
      if (right) txt(right, x + w - 12, y + 24, 14, rc || C.text, 400, "right");
    }
    const fAt = (t) => clamp(Math.round((t * an.sr) / HOP), 0, an.nF - 1);
    const bandV = (f, b) => an.bands[f * NB + b];
    function beatInfo(t) {
      const bl = 60 / an.bpm,
        bf = (t - an.beat0) / bl,
        bi = Math.floor(bf);
      return {
        bl,
        bi,
        ph: bf - bi,
        inBar: ((bi % 4) + 4) % 4,
        bar: Math.max(1, Math.floor(bi / 4) + 1),
      };
    }
    const sA = new Float32Array(1024),
      sB = new Float32Array(1024);
    function readS(ch, t, n, out) {
      const s = Math.floor(t * an.sr) - (n >> 1);
      for (let i = 0; i < n; i++) {
        const k = s + i;
        out[i] = k >= 0 && k < an.len ? ch[k] : 0;
      }
    }
    function localPeak(n) {
      let p = 0;
      for (let i = 0; i < n; i++) {
        const v = Math.abs(sA[i]);
        if (v > p) p = v;
      }
      return Math.max(p, an.peak * 0.06);
    }
    function onsetMax(t0, t1) {
      const a = Math.max(0, Math.floor(t0 * an.fps2)),
        b = Math.min(an.onN.length - 1, Math.ceil(t1 * an.fps2));
      let m = 0;
      for (let i = a; i <= b; i++) if (an.onN[i] > m) m = an.onN[i];
      return m;
    }
    function noteRange(f, lo, hi) {
      let m = 0;
      for (let n = Math.max(0, lo); n <= Math.min(NM - 1, hi); n++) {
        const v = an.noteN[f * NM + n];
        if (v > m) m = v;
      }
      return m;
    }
    const dbStr = (v) => {
      const d = 20 * Math.log10(Math.max(1e-4, v));
      return (d < 0 ? "-" : "+") + Math.abs(d).toFixed(1) + "dB";
    };

    /* ---------- Layout ---------- */
    const X0 = 40,
      X1 = 1040,
      GAP = 14,
      TOP = 40;
    const mediaAspect = () =>
      media && media.width && media.height ? media.width / media.height : 0.76;
    function layout() {
      const a = mediaAspect();
      if (a >= 1.15) {
        const room = X1 - X0 - 230 - GAP,
          ih = clamp(room / a, 300, 560),
          iw = Math.min(room, ih * a);
        return {
          rowH: ih,
          win: null,
          dots: { x: X0, y: TOP, w: X1 - X0 - GAP - iw, h: ih },
          img: { x: X1 - iw, y: TOP, w: iw, h: ih },
        };
      }
      const ih = clamp(540 / a, 460, 580),
        iw = Math.min(540, ih * a),
        rem = X1 - X0 - iw - GAP * 2,
        ww = Math.round(rem * 0.44);
      return {
        rowH: ih,
        win: { x: X0, y: TOP, w: ww, h: ih },
        dots: { x: X0 + ww + GAP, y: TOP, w: rem - ww, h: ih },
        img: { x: X1 - iw, y: TOP, w: iw, h: ih },
      };
    }

    /* ---------- Panels ---------- */
    function pWindow(t, f, { x, y, w, h }) {
      box(x, y, w, h);
      [A.main, C.ink, C.ghost].forEach((c, i) => sq(x + 19 + i * 16, y + 20, 5, c));
      txt("SEQ", x + w - 14, y + 25, 13, C.text, 400, "right");
      g.strokeStyle = C.line;
      g.lineWidth = 1;
      line(x, y + 40, x + w, y + 40);
      const cx = x + w / 2,
        cy = y + 40 + (h - 40) * 0.27,
        n = Math.floor((w - 28) / 6 / 2),
        sp = 6,
        hmax = (h - 40) * 0.2;
      for (let i = -n; i <= n; i++) {
        if (!i) continue;
        const tt = t + i * 0.09;
        if (tt < 0 || tt > an.dur) continue;
        const v = an.rms[fAt(tt)] / an.rmsMax,
          hh = Math.max(1.5, v * hmax);
        g.fillStyle = i < 0 ? A.soft : A.pale;
        g.fillRect(cx + i * sp - 1, cy - hh, 2, hh * 2);
      }
      const top = y + 40 + (h - 40) * 0.56,
        rs = ((h - 40) * 0.38) / 24,
        cn = Math.floor((w - 28) / 8 / 2),
        cs = 8;
      for (let i = -cn; i <= cn; i++) {
        const tt = t + i * 0.08;
        if (tt < 0 || tt > an.dur) continue;
        const ff = fAt(tt),
          m = an.pcMask[ff];
        for (let r = 0; r < 24; r++) {
          const p = r % 12,
            oct = r < 12 ? 1 : 0,
            lo = p + 12 * (oct + 1) - M0,
            v = Math.max(noteRange(ff, lo, lo), noteRange(ff, lo + 24, lo + 24));
          const X = cx + i * cs - 3,
            Y = top + (23 - r) * rs;
          if (m & (1 << p) && v > 0.25) {
            g.fillStyle = i === 0 ? A.deep : i < 0 ? A.main : A.soft;
            g.fillRect(X, Y, 6, rs - 1.5);
          } else if (v > 0.12) {
            g.fillStyle = v > 0.3 ? C.ghost : C.faint;
            g.fillRect(X, Y, 6, rs - 1.5);
          }
        }
      }
      g.fillStyle = C.ink;
      g.fillRect(cx - 1.5, y + 56, 3, h - 72);
      g.fillStyle = A.main;
      for (let yy = y + 60; yy < y + h - 20; yy += 9) g.fillRect(cx - 1.5, yy, 3, 3);
    }
    function pDots(t, f, B, { x, y, w, h }) {
      const cols = clamp(Math.round(w / 30), 5, 11),
        rows = clamp(Math.round(h / 30), 14, 22),
        cw = w / cols,
        rh = h / rows,
        r = Math.min(cw, rh) * 0.42;
      const step = B.bl / 4,
        sf = (t - an.beat0) / step,
        cur = Math.floor(sf),
        sp = sf - cur;
      for (let c = 0; c < cols; c++) {
        const tt = an.beat0 + (cur - (cols - 1 - c) + 0.5) * step,
          valid = tt >= 0 && tt <= an.dur,
          ff = c === cols - 1 ? f : fAt(Math.max(0, tt));
        const hit = valid && onsetMax(tt - step * 0.5, tt + step * 0.5) > 1;
        for (let ri = 0; ri < rows; ri++) {
          const k = (rows - 1 - ri) / rows,
            n0 = Math.floor(k * NM),
            n1 = Math.floor((k + 1 / rows) * NM),
            b0 = Math.floor(3 + k * 56);
          let v = 0;
          if (valid) {
            v = Math.max(
              noteRange(ff, n0, n1) * 1.1,
              (bandV(ff, b0) + bandV(ff, Math.min(NB - 1, b0 + 2))) * 0.42,
            );
          }
          const px = x + cw * (c + 0.5),
            py = y + rh * (ri + 0.5),
            rad = r * 0.95 * (c === cols - 1 ? 1 + 0.08 * (1 - sp) : 1);
          if (v < 0.14) sq(px, py, rad, C.faint);
          else if (v < 0.26) {
            sq(px, py, rad, C.faint);
            sq(px, py, rad * 0.24, C.ink);
          } else if (v < 0.4) sq(px, py, rad, A.pale);
          else if (v < 0.54) sq(px, py, rad, A.soft);
          else if (v < 0.68) {
            sq(px, py, rad, A.main);
            sq(px, py, rad * 0.55, C.bg);
            sq(px, py, rad * 0.25, A.main);
          } else if (v < 0.82) sq(px, py, rad, A.main);
          else {
            sq(px, py, rad, C.ink);
            if (hit) sq(px, py, rad * 0.3, A.main);
          }
        }
      }
    }
    const CROPS = [
      { z: 1, cx: 0.5, cy: 0.5 },
      { z: 1.9, cx: 0.5, cy: 0.36 },
      { z: 2.4, cx: 0.64, cy: 0.45 },
      { z: 1.6, cx: 0.38, cy: 0.6 },
      { z: 2.8, cx: 0.5, cy: 0.48 },
    ];
    function pImage(t, B, { x, y, w, h }) {
      g.save();
      rr(x, y, w, h, 4);
      g.clip();
      const src = media && media.source,
        sw = media ? media.width : 0,
        sh = media ? media.height : 0;
      if (src) {
        let k = 0;
        if (
          zoomCuts &&
          B.bi >= 0 &&
          (B.inBar === 3 || (B.inBar === 1 && Math.floor(B.bi / 4) % 2 === 1))
        )
          k = 1 + (Math.floor(B.bi / 2) % (CROPS.length - 1));
        const cr = CROPS[k],
          z = cr.z * (1 + (zoomCuts ? 0.035 : 0) * Math.pow(1 - B.ph, 3)),
          a = w / h;
        let cw, ch;
        if (sw / sh > a) {
          ch = sh;
          cw = ch * a;
        } else {
          cw = sw;
          ch = cw / a;
        }
        cw /= z;
        ch /= z;
        const sx = clamp(cr.cx * sw - cw / 2, 0, sw - cw),
          sy = clamp(cr.cy * sh - ch / 2, 0, sh - ch);
        try {
          g.drawImage(src, sx, sy, cw, ch, x, y, w, h);
        } catch (e) {
          g.fillStyle = C.box;
          g.fillRect(x, y, w, h);
        }
      } else {
        g.fillStyle = C.box;
        g.fillRect(x, y, w, h);
      }
      g.restore();
    }
    function pRoll(t, B, LY) {
      const x = X0,
        y = TOP + LY.rowH + GAP,
        w = X1 - X0,
        h = 1040 - y;
      box(x, y, w, h);
      const x0 = x + 54,
        x1 = x + w - 10,
        y0 = y + 36,
        y1 = y + h - 10,
        rh = (y1 - y0) / NM,
        yOf = (m) => y1 - (m - M0 + 1) * rh;
      for (let m = M0; m <= M1; m++) {
        g.fillStyle = [1, 3, 6, 8, 10].includes(m % 12) ? C.faint : C.stripe;
        g.fillRect(x0, yOf(m) + 0.5, x1 - x0, rh - 1);
      }
      g.strokeStyle = C.line;
      g.lineWidth = 1;
      for (let m = M0; m <= M1; m += 12) {
        line(x0, yOf(m) + rh, x1, yOf(m) + rh);
        txt("C" + (m / 12 - 1), x + 14, yOf(m) + rh - 2, 14, C.text);
      }
      const span = clamp(16 * B.bl, 6, 14),
        xm = x0 + (x1 - x0) * 0.5,
        pxs = (x1 - x0) / span,
        tx = (tt) => xm + (tt - t) * pxs,
        tA = t - span / 2,
        tB = t + span / 2;
      g.save();
      g.beginPath();
      g.rect(x0, y + 4, x1 - x0, h - 8);
      g.clip();
      const b0 = Math.ceil((tA - an.beat0) / B.bl),
        b1 = Math.floor((tB - an.beat0) / B.bl);
      for (let bi = b0; bi <= b1; bi++) {
        const X = tx(an.beat0 + bi * B.bl),
          isBar = ((bi % 4) + 4) % 4 === 0;
        g.strokeStyle = isBar ? C.line : C.grid;
        g.lineWidth = 1;
        line(X, isBar ? y + 8 : y0, X, y1);
        if (isBar && bi >= 0) txt(String(bi / 4 + 1), X + 7, y + 26, 15, C.text);
      }
      for (const n of an.notes) {
        if (n.t0 > tB) break;
        if (n.t1 < tA) continue;
        const X0n = tx(n.t0),
          X1n = tx(n.t1),
          active = n.t0 <= t && n.t1 >= t;
        g.fillStyle = active ? A.deep : n.m >= 72 ? A.main : A.soft;
        g.globalAlpha = n.t1 < t ? 0.35 + 0.4 * n.v : 0.95;
        g.fillRect(X0n, yOf(n.m) + 0.75, Math.max(3, X1n - X0n - 1), Math.max(2, rh - 1.5));
        if (active) {
          g.globalAlpha = 1;
          g.fillStyle = A.deep;
          g.fillRect(xm - 7, yOf(n.m) - 1, 14, rh + 2);
        }
      }
      g.globalAlpha = 1;
      g.restore();
      g.fillStyle = C.ink;
      g.fillRect(xm - 1, y + 6, 2, h - 12);
    }
    function pWave(t, { x, y, w, h }) {
      box(x, y, w, h);
      head(x, y, w, "A1 WAVE", "LOUD", A.main);
      const ax = x + 12,
        aw = w - 24,
        cy = y + h * 0.6,
        amp = h * 0.26,
        bw = aw / OVN,
        prog = t / an.dur;
      for (let c = 0; c < OVN; c++) {
        const hh = Math.max(1, an.ovPeak[c] * amp);
        g.fillStyle = (c + 0.5) / OVN < prog ? C.ink : C.ghost;
        g.fillRect(ax + c * bw, cy - hh, Math.max(1, bw - 0.9), hh * 2);
      }
      g.strokeStyle = A.main;
      g.lineWidth = 2;
      g.beginPath();
      for (let c = 0; c < OVN; c++) {
        const X = ax + (c + 0.5) * bw,
          Y = cy + amp * 0.4 - an.ovRms[c] * amp * 1.05;
        c ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
      g.stroke();
      g.lineWidth = 1.25;
      line(ax + prog * aw, y + 34, ax + prog * aw, y + h - 8);
    }
    function pScope(t, f, { x, y, w, h }) {
      box(x, y, w, h);
      head(x, y, w, "A2 SCOPE", dbStr((an.rms[f] / an.peak) * 1.41));
      const ax = x + 12,
        aw = w - 24,
        cy = y + h * 0.6;
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      for (let i = 1; i < 10; i++) line(ax + (i * aw) / 10, y + 36, ax + (i * aw) / 10, y + h - 8);
      line(ax, cy, ax + aw, cy);
      readS(an.L, t, 512, sA);
      const amp = (h * 0.3) / localPeak(512);
      g.strokeStyle = A.main;
      g.lineWidth = 1.75;
      g.beginPath();
      for (let i = 0; i < 512; i++) {
        const X = ax + (i / 511) * aw,
          Y = clamp(cy - sA[i] * amp, y + 34, y + h - 6);
        i ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
      g.stroke();
    }
    function pSpectrum(f, { x, y, w, h }) {
      box(x, y, w, h);
      head(x, y, w, "A3 SPECTRUM", "16K");
      const n = 30,
        ax = x + 12,
        aw = w - 24,
        bw = aw / n,
        base = y + h - 10,
        mh = h - 50;
      for (let i = 0; i < n; i++) {
        const b = Math.floor(2 + i * (60 / n)),
          v = (bandV(f, b) + bandV(f, Math.min(NB - 1, b + 1))) / 2,
          hh = Math.max(1.5, v * mh);
        let pk = 0;
        for (let k = Math.max(0, f - 12); k <= f; k++) pk = Math.max(pk, an.bands[k * NB + b]);
        g.fillStyle = C.bar;
        g.fillRect(ax + i * bw + 0.5, base - hh, bw - 2, hh);
        g.fillStyle = A.main;
        g.fillRect(ax + i * bw + 0.5, base - pk * mh - 3, bw - 2, 2);
      }
    }
    function pVector(t, { x, y, w, h }) {
      box(x, y, w, h);
      head(x, y, w, "A4 VECTOR", "L/R");
      const cx = x + w / 2,
        cy = y + h * 0.58,
        s = h * 0.3;
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      line(cx - s, cy - s, cx + s, cy + s);
      line(cx - s, cy + s, cx + s, cy - s);
      g.strokeRect(cx - s * 0.7, cy - s * 0.7, s * 1.4, s * 1.4);
      readS(an.L, t, 700, sA);
      readS(an.R, t, 700, sB);
      const k = s / localPeak(700);
      g.fillStyle = A.main;
      g.globalAlpha = 0.5;
      for (let i = 0; i < 700; i++) {
        const l = sA[i],
          r = sB[i],
          sd = (l - r) * 0.7071,
          md = (l + r) * 0.7071;
        g.fillRect(
          clamp(cx + sd * k * 1.6, x + 6, x + w - 8),
          clamp(cy - md * k, y + 34, y + h - 8),
          1.8,
          1.8,
        );
      }
      g.globalAlpha = 1;
      sq(cx, cy, 2.5, C.ink);
    }
    /* B1 POLAR: 64 spokes, each one band; straight lines only */
    function pOrb(t, f, B, { x, y, w, h }) {
      g.fillStyle = C.box;
      g.fillRect(x, y, w, h);
      txt("B1 POLAR", x + 12, y + 24, 14, C.text);
      txt("64 BND", x + w - 12, y + 24, 14, C.text, 400, "right");
      const cx = x + w / 2,
        cy = y + h * 0.54,
        R = Math.min(w, h) * 0.44,
        r0 = R * 0.2,
        rot = t * 0.15;
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      line(cx - R, cy, cx + R, cy);
      line(cx, cy - R, cx, cy + R);
      g.strokeRect(cx - R, cy - R, R * 2, R * 2);
      for (let i = 0; i < 128; i++) {
        const b = i < 64 ? i : 127 - i,
          v = bandV(f, b),
          a = (i / 128) * Math.PI * 2 + rot,
          len = r0 + (R - r0) * v;
        g.strokeStyle = v > 0.72 ? A.main : v > 0.45 ? C.ink : C.ghost;
        g.lineWidth = v > 0.72 ? 2 : 1;
        line(
          cx + Math.cos(a) * r0,
          cy + Math.sin(a) * r0,
          cx + Math.cos(a) * len,
          cy + Math.sin(a) * len,
        );
        if (v > 0.6) sq(cx + Math.cos(a) * len, cy + Math.sin(a) * len, 2, A.main);
      }
      const cr = r0 * 0.6 + 5 * Math.pow(1 - B.ph, 3);
      sq(cx, cy, cr, C.ink);
      sqLine(cx, cy, cr + 7, 1, C.ink);
    }
    function pTall(t, f, { x, y, w, h }) {
      box(x, y, w, h);
      txt("B2 CH1", x + 12, y + 24, 14, A.main, 500);
      txt(String(f).padStart(5, "0"), x + w / 2 + 6, y + 24, 14, C.text, 400, "center");
      txt(Math.round(an.sr / 100) / 10 + "K", x + w - 12, y + 24, 14, C.text, 400, "right");
      const ax = x + 10,
        aw = w - 20,
        lines = 11,
        top = y + 56,
        stepY = (h - 80) / (lines - 1);
      readS(an.L, t, 320, sA);
      const amp = (stepY * 1.6) / localPeak(320);
      for (let k = lines - 1; k >= 0; k--) {
        readS(k % 2 ? an.R : an.L, t - k * 0.045, 320, sA);
        const cy = top + k * stepY;
        g.strokeStyle = k === 0 ? A.main : k < 4 ? A.soft : C.line;
        g.lineWidth = k === 0 ? 2 : 1;
        g.beginPath();
        for (let i = 0; i < 320; i++) {
          const X = ax + (i / 319) * aw,
            Y = clamp(cy - sA[i] * amp * (k === 0 ? 1 : 0.7), y + 34, y + h - 6);
          i ? g.lineTo(X, Y) : g.moveTo(X, Y);
        }
        g.stroke();
      }
    }
    function pRing(t, B, { x, y, w, h }) {
      g.fillStyle = A.soft;
      g.fillRect(x + 4, y + 10, 12, 12);
      txt("PIANO", x + 24, y + 21, 14, C.ink);
      g.fillStyle = A.main;
      g.fillRect(x + 4, y + 32, 12, 12);
      txt("LEAD", x + 24, y + 43, 14, C.ink);
      txt("♩=" + Math.round(an.bpm), x + w - 4, y + 21, 14, C.text, 400, "right");
      /* a square frame: the perimeter is one bar, each side one beat, filled clockwise from the top-left corner */
      const cx = x + w / 2,
        cy = y + h * 0.55,
        S = Math.min(w, h) * 0.33,
        L = S * 2,
        T = 10;
      const pt = (u) => {
        u = ((u % 4) + 4) % 4;
        const s = Math.floor(u),
          k = u - s;
        return s === 0
          ? [cx - S + L * k, cy - S]
          : s === 1
            ? [cx + S, cy - S + L * k]
            : s === 2
              ? [cx + S - L * k, cy + S]
              : [cx - S, cy + S - L * k];
      };
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      for (let i = 0; i < 64; i++) {
        const u = i / 16,
          [px, py] = pt(u),
          s = Math.floor(u % 4),
          l = i % 16 === 0 ? 18 : i % 4 === 0 ? 10 : 5,
          o = T + 6;
        const dx = s === 1 ? 1 : s === 3 ? -1 : 0,
          dy = s === 0 ? -1 : s === 2 ? 1 : 0;
        line(px + dx * o, py + dy * o, px + dx * (o + l), py + dy * (o + l));
      }
      g.strokeStyle = C.line;
      line(cx - S - T - 70, cy, cx - S - T - 40, cy);
      line(cx + S + T + 40, cy, cx + S + T + 70, cy);
      txt("01", cx - S - 6, cy - S - T - 30, 13, C.text);
      txt("02", cx + S + T + 34, cy - S + 14, 13, C.text);
      txt("03", cx + S - 14, cy + S + T + 42, 13, C.text, 400, "right");
      txt("04", cx - S - T - 34, cy + S, 13, C.text, 400, "right");
      g.fillStyle = C.faint;
      g.fillRect(cx - S - T / 2, cy - S - T / 2, L + T, T);
      g.fillRect(cx + S - T / 2, cy - S - T / 2, T, L + T);
      g.fillRect(cx - S - T / 2, cy + S - T / 2, L + T, T);
      g.fillRect(cx - S - T / 2, cy - S - T / 2, T, L + T);
      const prog = B.bi < 0 ? 0 : B.inBar + B.ph;
      g.fillStyle = A.main;
      for (let s = 0; s < 4; s++) {
        const a = Math.min(1, Math.max(0, prog - s));
        if (a <= 0) continue;
        if (s === 0) g.fillRect(cx - S - T / 2, cy - S - T / 2, (L + T) * a, T);
        else if (s === 1) g.fillRect(cx + S - T / 2, cy - S - T / 2, T, (L + T) * a);
        else if (s === 2) g.fillRect(cx + S + T / 2 - (L + T) * a, cy + S - T / 2, (L + T) * a, T);
        else g.fillRect(cx - S - T / 2, cy + S + T / 2 - (L + T) * a, T, (L + T) * a);
      }
      const [mx, my] = pt(prog);
      sq(mx, my, T, C.ink);
      if (B.bi >= 0) {
        g.globalAlpha = Math.pow(1 - B.ph, 2) * 0.8;
        const e = S + T + 4 + B.ph * 20;
        g.strokeStyle = A.main;
        g.lineWidth = 1.5;
        g.strokeRect(cx - e, cy - e, e * 2, e * 2);
        g.globalAlpha = 1;
      }
      g.strokeStyle = C.line;
      g.lineWidth = 1;
      const ii = S - 30;
      g.strokeRect(cx - ii, cy - ii, ii * 2, ii * 2);
      g.strokeStyle = A.soft;
      g.setLineDash([6, 8]);
      g.lineDashOffset = -t * 30;
      g.strokeRect(cx - ii + 10, cy - ii + 10, ii * 2 - 20, ii * 2 - 20);
      g.setLineDash([]);
      txt("BAR", cx, cy - S * 0.22, 13, C.text, 400, "center", 3);
      txt(
        String(B.bar).padStart(2, "0"),
        cx,
        cy + S * 0.24,
        Math.round(S * 0.5),
        C.ink,
        500,
        "center",
        0,
      );
      txt("BEAT " + (B.inBar + 1) + "/4", cx, cy + S * 0.5, 13, C.text, 400, "center", 2);
    }
    function pScore(t, f, B, { x, y, w, h }) {
      box(x, y, w, h);
      txt(
        "C2 SCORE " + String(Math.floor((an.cum[f] / an.rmsMax) * 137)).padStart(7, "0"),
        x + 14,
        y + 26,
        15,
        C.ink,
        500,
      );
      const barStart = an.beat0 + Math.floor(B.bi / 4) * 4 * B.bl;
      let chain = 0;
      for (const n of an.notes) {
        if (n.t0 > t) break;
        if (n.t0 >= barStart) chain++;
      }
      txt(
        "CHAIN × " + String(chain).padStart(2, "0"),
        x + w - 52,
        y + 26,
        15,
        A.main,
        500,
        "right",
      );
      const base = y + h - 14,
        left = x + 18,
        right = x + w - 64,
        n = 22,
        sw = (right - left) / n;
      g.strokeStyle = C.line;
      g.lineWidth = 1;
      line(left, base, right, base);
      g.save();
      g.beginPath();
      g.rect(x + 2, y + 34, right - x + 6, h - 36);
      g.clip();
      for (let i = 0; i < n; i++) {
        const v = bandV(f, Math.floor(3 + i * (56 / n))),
          ax = left + sw * (i + 0.5),
          ay = Math.max(y + 40, base - v * (h - 56));
        g.beginPath();
        g.moveTo(ax - sw * 1.6, base);
        g.lineTo(ax, ay);
        g.lineTo(ax + sw * 1.6, base);
        g.globalAlpha = 0.35;
        g.fillStyle = A.pale;
        g.fill();
        g.globalAlpha = 1;
        g.strokeStyle = v > 0.7 ? A.deep : A.main;
        g.lineWidth = 1;
        g.stroke();
      }
      g.restore();
      const mx = x + w - 40,
        my = y + 42,
        mh = h - 56,
        lv = an.rms[f] / an.rmsMax;
      for (let i = 0; i < 14; i++) {
        const yy = my + mh - ((i + 1) * mh) / 14;
        g.fillStyle = (i + 0.5) / 14 <= lv ? (i > 11 ? A.deep : A.main) : C.faint;
        g.fillRect(mx, yy + 1, 20, mh / 14 - 2.5);
      }
    }
    function pSteps(t, B, { x, y, w, h }) {
      const gap = 8,
        cw = (w - gap * 7) / 8,
        chh = (h - gap) / 2,
        step = B.bl / 4,
        si = Math.floor((t - an.beat0) / step),
        s0 = Math.floor(si / 16) * 16,
        cur = si - s0;
      for (let s = 0; s < 16; s++) {
        const X = x + (s % 8) * (cw + gap),
          Y = y + (s >> 3) * (chh + gap),
          ts = an.beat0 + (s0 + s) * step;
        const hit = ts >= 0 && ts <= an.dur && onsetMax(ts - step * 0.4, ts + step * 0.4) > 1;
        rr(X + 0.5, Y + 0.5, cw - 1, chh - 1, 3);
        g.fillStyle = s === cur ? A.main : hit ? (s < cur ? A.soft : A.pale) : C.bg;
        g.fill();
        g.strokeStyle = C.line;
        g.lineWidth = 1;
        g.stroke();
        txt(String(s + 1).padStart(2, "0"), X + 8, Y + 19, 12, s === cur ? onA : C.text);
        if (hit) {
          sq(X + cw - 12, Y + chh - 12, 3, s === cur ? onA : C.ink);
        }
      }
    }
    function pFooter(t, B) {
      txt(trackName.toUpperCase().slice(0, 34), X0, 1856, 17, C.ink, 500);
      txt(
        Math.round(an.bpm) + " BPM  4/4  " + (an.sr / 1000).toFixed(1) + "KHZ",
        X1,
        1856,
        14,
        C.text,
        400,
        "right",
      );
      const py = 1876,
        prog = an.dur ? t / an.dur : 0;
      g.strokeStyle = C.line;
      g.lineWidth = 2;
      line(X0, py, X1, py);
      for (let i = 0; i <= 40; i++) {
        const X = X0 + (i * (X1 - X0)) / 40;
        g.lineWidth = 1;
        line(X, py + 5, X, py + (i % 10 ? 8 : 12));
      }
      g.strokeStyle = A.main;
      g.lineWidth = 2;
      line(X0, py, X0 + (X1 - X0) * prog, py);
      g.fillStyle = C.ink;
      g.fillRect(X0 + (X1 - X0) * prog - 3, py - 9, 6, 18);
      txt(
        "BAR " + String(B.bar).padStart(3, "0") + "  BEAT " + (B.inBar + 1),
        X0,
        1904,
        13,
        C.text,
      );
      txt("SV-16", (X0 + X1) / 2, 1904, 13, C.ink, 700, "center", 3);
      txt(fmt(t) + " / " + fmt(an.dur), X1, 1904, 13, C.text, 400, "right");
    }
    function frame(t) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = C.bg;
      g.fillRect(0, 0, W, H);
      if (!an) {
        txt("LOADING", W / 2, H / 2, 20, C.text, 400, "center", 4);
        return;
      }
      const f = fAt(t),
        B = beatInfo(t),
        LY = layout();
      if (LY.win) pWindow(t, f, LY.win);
      pDots(t, f, B, LY.dots);
      pImage(t, B, LY.img);
      pRoll(t, B, LY);
      const y0 = 1054,
        lh = 1820 - y0,
        c1 = { x: X0, w: 220 },
        c2 = { x: X0 + 220 + GAP, w: 240 },
        c3 = { x: X0 + 474 + GAP * 2 - 14, w: X1 - (X0 + 474 + GAP * 2 - 14) };
      const sh = (lh - GAP * 3) / 4;
      pWave(t, { x: c1.x, y: y0, w: c1.w, h: sh });
      pScope(t, f, { x: c1.x, y: y0 + (sh + GAP), w: c1.w, h: sh });
      pSpectrum(f, { x: c1.x, y: y0 + 2 * (sh + GAP), w: c1.w, h: sh });
      pVector(t, { x: c1.x, y: y0 + 3 * (sh + GAP), w: c1.w, h: sh });
      pOrb(t, f, B, { x: c2.x, y: y0, w: c2.w, h: 400 });
      pTall(t, f, { x: c2.x, y: y0 + 400 + GAP, w: c2.w, h: lh - 400 - GAP });
      pRing(t, B, { x: c3.x, y: y0, w: c3.w, h: 400 });
      pScore(t, f, B, { x: c3.x, y: y0 + 400 + GAP, w: c3.w, h: 190 });
      pSteps(t, B, {
        x: c3.x,
        y: y0 + 400 + GAP + 190 + GAP,
        w: c3.w,
        h: lh - 400 - 190 - GAP * 2,
      });
      pFooter(t, B);
    }

    function draw(time, scene) {
      an = scene.an;
      C = scene.colors.C;
      A = scene.colors.A;
      onA = scene.colors.onA;
      media = scene.media;
      zoomCuts = scene.zoomCuts;
      trackName = scene.trackName;
      frame(time);
    }

    return { draw };
  }

  window.ToneSv16Renderer = { createRenderer, formatTime: fmt, WIDTH: W, HEIGHT: H };
})();
