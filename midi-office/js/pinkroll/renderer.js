/**
 * MIDI OFFICE — Pinkroll / Renderer
 * Draws one 1080x1920 frame: piano roll, spectrum, scopes and beat ring.
 * Holds no playback state of its own — every frame is a pure function
 * of the time and scene pinkroll.js passes to draw().
 */
(() => {
  const { HOP, NB, M0, M1, NM, OVN } = window.TonePinkrollAnalysis;
  const W = 1080,
    H = 1920;
  const C = {
    bg: "#E9ECEC",
    line: "#C2C8CA",
    grid: "#D6DADB",
    faint: "#DDE1E2",
    text: "#879093",
    ink: "#232729",
    box: "#DFE3E4",
    bar: "#4B5154",
    waveIdle: "#A8AFB2",
    onAccent: "#FFFFFF",
  };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function createRenderer(canvas) {
    const g = canvas.getContext("2d");
    let an = null,
      A = {},
      media = null,
      zoomCuts = true,
      trackName = "";

    function rr(x, y, w, h, r) {
      g.beginPath();
      if (g.roundRect) g.roundRect(x, y, w, h, r);
      else g.rect(x, y, w, h);
    }
    function box(x, y, w, h) {
      rr(x + 0.75, y + 0.75, w - 1.5, h - 1.5, 5);
      g.strokeStyle = C.line;
      g.lineWidth = 1.5;
      g.stroke();
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
    function txt(s, x, y, size, color, weight = 400, align = "left", ls = 1.5) {
      g.font = `${weight} ${size}px "IBM Plex Mono", ui-monospace, monospace`;
      g.fillStyle = color;
      g.textAlign = align;
      g.textBaseline = "alphabetic";
      if ("letterSpacing" in g) g.letterSpacing = ls + "px";
      g.fillText(s, x, y);
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
    const scratch = new Float32Array(1024),
      scratch2 = new Float32Array(1024);
    function readS(ch, t, n, out) {
      const s = Math.floor(t * an.sr) - (n >> 1);
      for (let i = 0; i < n; i++) {
        const k = s + i;
        out[i] = k >= 0 && k < an.len ? ch[k] : 0;
      }
    }
    function onsetMax(t0, t1) {
      const a = Math.max(0, Math.floor(t0 * an.fps2)),
        b = Math.min(an.onN.length - 1, Math.ceil(t1 * an.fps2));
      let m = 0;
      for (let i = a; i <= b; i++) if (an.onN[i] > m) m = an.onN[i];
      return m;
    }

    /* ---------- Panels ---------- */
    /* Top row adapts to the media's aspect ratio: wide media drops the window panel and gives the image the width;
   tall media keeps all three panels. The piano roll absorbs whatever height the top row frees or takes. */
    function mediaAspect() {
      return media ? media.width / media.height : 0.76;
    }
    function layout() {
      const a = mediaAspect(),
        x0 = 60,
        x1 = 1020,
        y = 70,
        gap = 30;
      if (a >= 1.15) {
        const room = x1 - x0 - 210 - gap,
          ih = clamp(room / a, 300, 540),
          iw = Math.min(room, ih * a);
        return {
          rowH: ih,
          win: null,
          dots: { x: x0, y, w: x1 - x0 - gap - iw, h: ih },
          img: { x: x1 - iw, y, w: iw, h: ih },
        };
      }
      const ih = clamp(520 / a, 440, 560),
        iw = Math.min(520, ih * a),
        rem = x1 - x0 - iw - gap * 2,
        ww = Math.round(rem * 0.45);
      return {
        rowH: ih,
        win: { x: x0, y, w: ww, h: ih },
        dots: { x: x0 + ww + gap, y, w: rem - ww, h: ih },
        img: { x: x1 - iw, y, w: iw, h: ih },
      };
    }
    function pWindow(t, f, Rc) {
      const { x, y, w, h } = Rc;
      box(x, y, w, h);
      [A.main, A.soft, A.pale].forEach((c, i) => dot(x + 26 + i * 24, y + 26, 7, c));
      const bw = Math.max(20, w - 174);
      g.fillStyle = C.faint;
      rr(x + w - 24 - bw, y + 22, bw, 8, 4);
      g.fill();
      g.strokeStyle = C.line;
      g.lineWidth = 1.5;
      line(x, y + 52, x + w, y + 52);
      const cx = x + w / 2,
        cy = y + 52 + (h - 52) * 0.26,
        sp = (w - 30) / 44,
        hmax = (h - 52) * 0.2;
      for (let i = -22; i <= 22; i++) {
        if (!i) continue;
        const tt = t + i * 0.11;
        if (tt < 0 || tt > an.dur) continue;
        const v = an.rms[fAt(tt)] / an.rmsMax,
          hh = Math.max(2, v * hmax);
        g.fillStyle = i < 0 ? A.soft : A.pale;
        g.fillRect(cx + i * sp - sp * 0.3, cy - hh, Math.max(2, sp * 0.6), hh * 2);
      }
      const top = y + h * 0.58,
        rs = (h * 0.38) / 12,
        cs = (w - 30) / 21;
      for (let i = -10; i <= 10; i++) {
        const tt = t + i * 0.1;
        if (tt < 0 || tt > an.dur) continue;
        const m = an.pcMask[fAt(tt)];
        for (let p = 0; p < 12; p++) {
          if (!(m & (1 << p))) continue;
          g.fillStyle = i === 0 ? A.deep : i < 0 ? A.main : A.soft;
          g.fillRect(cx + i * cs - cs * 0.4, top + (11 - p) * rs, cs * 0.8, rs * 0.75);
        }
      }
      g.fillStyle = C.ink;
      g.fillRect(cx - 2, y + 70, 4, h - 88);
      g.fillStyle = A.main;
      for (let yy = y + 78; yy < y + h - 24; yy += 16) g.fillRect(cx - 2, yy, 4, 5);
    }
    function pDots(t, f, B, Rc) {
      const { x, y, w, h } = Rc,
        cols = clamp(Math.round(w / 34), 5, 10),
        rows = clamp(Math.round(h / 27.5), 14, 22),
        cw = w / cols,
        rh = h / rows,
        r = Math.min(cw, rh) * 0.43;
      const step = B.bl / 4,
        sf = (t - an.beat0) / step,
        cur = Math.floor(sf),
        sp = sf - cur;
      for (let c = 0; c < cols; c++) {
        const tt = an.beat0 + (cur - (cols - 1 - c) + 0.5) * step,
          valid = tt >= 0 && tt <= an.dur,
          ff = c === cols - 1 ? f : fAt(Math.max(0, tt));
        for (let ri = 0; ri < rows; ri++) {
          const b0 = Math.floor(2 + (rows - 1 - ri) * (56 / rows));
          let v = 0;
          if (valid)
            for (let k = 0; k < 3; k++) v = Math.max(v, bandV(ff, Math.min(NB - 1, b0 + k)));
          const px = x + cw * (c + 0.5),
            py = y + rh * (ri + 0.5),
            rad = r * (c === cols - 1 ? 1 + 0.12 * (1 - sp) : 1);
          if (v < 0.3) dot(px, py, rad * 0.9, C.faint);
          else if (v < 0.48) dot(px, py, rad, A.pale);
          else if (v < 0.64) dot(px, py, rad, A.soft);
          else if (v < 0.8) dot(px, py, rad, A.main);
          else {
            dot(px, py, rad, A.main);
            dot(px, py, rad * 0.55, C.bg);
            dot(px, py, rad * 0.27, A.main);
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
    function pImage(t, B, Rc) {
      const { x, y, w, h } = Rc;
      g.save();
      rr(x, y, w, h, 6);
      g.clip();
      if (media) {
        const src = media.source,
          sw = media.width,
          sh = media.height;
        let k = 0;
        if (
          zoomCuts &&
          B.bi >= 0 &&
          (B.inBar === 3 || (B.inBar === 1 && Math.floor(B.bi / 4) % 2 === 1))
        )
          k = 1 + (Math.floor(B.bi / 2) % (CROPS.length - 1));
        const cr = CROPS[k],
          z = cr.z * (1 + (zoomCuts ? 0.04 : 0) * Math.pow(1 - B.ph, 3)),
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
      const x = 60,
        y = 70 + LY.rowH + 30,
        w = 960,
        h = 1010 - y;
      box(x, y, w, h);
      const x0 = x + 62,
        x1 = x + w - 14,
        y0 = y + 42,
        y1 = y + h - 14,
        rh = (y1 - y0) / NM,
        yOf = (m) => y1 - (m - M0 + 1) * rh;
      g.fillStyle = C.faint;
      for (let m = M0; m <= M1; m++)
        if ([1, 3, 6, 8, 10].includes(m % 12)) g.fillRect(x0, yOf(m), x1 - x0, rh);
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      for (let m = M0; m <= M1; m += 12) {
        line(x0, yOf(m) + rh, x1, yOf(m) + rh);
        txt("C" + (m / 12 - 1), x + 18, yOf(m) + rh - 1, 17, C.text);
      }
      const span = clamp(16 * B.bl, 6, 14),
        xm = (x0 + x1) / 2,
        pxs = (x1 - x0) / span,
        tx = (tt) => xm + (tt - t) * pxs,
        tA = t - span / 2,
        tB = t + span / 2;
      g.save();
      g.beginPath();
      g.rect(x0, y + 6, x1 - x0, h - 12);
      g.clip();
      const b0 = Math.ceil((tA - an.beat0) / B.bl),
        b1 = Math.floor((tB - an.beat0) / B.bl);
      for (let bi = b0; bi <= b1; bi++) {
        const X = tx(an.beat0 + bi * B.bl),
          isBar = ((bi % 4) + 4) % 4 === 0;
        g.strokeStyle = isBar ? C.line : C.grid;
        g.lineWidth = isBar ? 1.5 : 1;
        line(X, y0, X, y1);
        if (isBar && bi >= 0) txt(String(bi / 4 + 1), X + 6, y + 30, 18, C.text);
      }
      for (const n of an.notes) {
        if (n.t0 > tB) break;
        if (n.t1 < tA) continue;
        const X0 = tx(n.t0),
          X1 = tx(n.t1),
          active = n.t0 <= t && n.t1 >= t;
        g.fillStyle = active ? A.deep : n.m >= 72 ? A.main : A.soft;
        g.globalAlpha = n.t1 < t ? 0.45 + 0.4 * n.v : 0.9;
        g.fillRect(X0, yOf(n.m) + 0.5, Math.max(3, X1 - X0), Math.max(2, rh - 1));
      }
      g.globalAlpha = 1;
      g.restore();
      g.fillStyle = C.ink;
      g.fillRect(xm - 1.5, y + 10, 3, h - 20);
    }
    function pWave(t) {
      const x = 60,
        y = 1040,
        w = 200,
        h = 165;
      box(x, y, w, h);
      txt("WAVEFORM", x + 12, y + 26, 16, C.text);
      txt("LOUD", x + w - 12, y + 26, 16, A.main, 500, "right");
      const ax = x + 12,
        aw = w - 24,
        cy = y + 100,
        amp = 46,
        bw = aw / OVN,
        prog = t / an.dur;
      for (let c = 0; c < OVN; c++) {
        const hh = Math.max(1, an.ovPeak[c] * amp);
        g.fillStyle = (c + 0.5) / OVN < prog ? C.ink : C.waveIdle;
        g.fillRect(ax + c * bw + 0.3, cy - hh, Math.max(1, bw - 1.1), hh * 2);
      }
      g.strokeStyle = A.main;
      g.lineWidth = 2.5;
      g.beginPath();
      for (let c = 0; c < OVN; c++) {
        const X = ax + (c + 0.5) * bw,
          Y = cy + amp * 0.35 - an.ovRms[c] * amp * 0.95;
        c ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
      g.stroke();
      g.lineWidth = 1.5;
      line(ax + prog * aw, y + 38, ax + prog * aw, y + h - 10);
    }
    function pScope(t) {
      const x = 60,
        y = 1220,
        w = 200,
        h = 165;
      box(x, y, w, h);
      txt("SCOPE", x + 12, y + 26, 16, C.text);
      const ax = x + 12,
        aw = w - 24,
        cy = y + 100,
        amp = 52 / an.peak;
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      for (let i = 1; i < 8; i++) line(ax + (i * aw) / 8, y + 42, ax + (i * aw) / 8, y + h - 12);
      line(ax, cy, ax + aw, cy);
      readS(an.L, t, 512, scratch);
      g.strokeStyle = A.main;
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i < 512; i++) {
        const X = ax + (i / 511) * aw,
          Y = clamp(cy - scratch[i] * amp, y + 40, y + h - 10);
        i ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
      g.stroke();
    }
    function pSpectrum(f) {
      const x = 60,
        y = 1400,
        w = 200,
        h = 165;
      box(x, y, w, h);
      txt("SPECTRUM", x + 12, y + 26, 16, C.text);
      const n = 24,
        ax = x + 12,
        aw = w - 24,
        bw = aw / n,
        base = y + h - 14;
      g.fillStyle = C.bar;
      for (let i = 0; i < n; i++) {
        const b = 2 + Math.floor((i * 60) / n);
        const v = (bandV(f, b) + bandV(f, Math.min(NB - 1, b + 1))) / 2;
        const hh = Math.max(2, v * 100);
        g.fillRect(ax + i * bw + 1, base - hh, bw - 2.5, hh);
      }
    }
    function pVector(t) {
      const x = 60,
        y = 1580,
        w = 200,
        h = 165;
      box(x, y, w, h);
      txt("VECTOR", x + 12, y + 26, 16, C.text);
      const cx = x + w / 2,
        cy = y + 98,
        k = 58 / an.peak;
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      line(cx - 52, cy - 52, cx + 52, cy + 52);
      line(cx - 52, cy + 52, cx + 52, cy - 52);
      readS(an.L, t, 600, scratch);
      readS(an.R, t, 600, scratch2);
      g.fillStyle = A.main;
      g.globalAlpha = 0.55;
      for (let i = 0; i < 600; i += 1) {
        const l = scratch[i],
          r = scratch2[i];
        const sd = (l - r) * 0.7071,
          md = (l + r) * 0.7071;
        g.fillRect(
          clamp(cx + sd * k * 1.8, x + 8, x + w - 10),
          clamp(cy - md * k, y + 40, y + h - 10),
          2,
          2,
        );
      }
      g.globalAlpha = 1;
      dot(cx, cy, 3, C.ink);
    }
    function pOrb(t, f, B) {
      const x = 280,
        y = 1040,
        w = 220,
        h = 380;
      g.fillStyle = C.box;
      rr(x, y, w, h, 6);
      g.fill();
      const cx = x + w / 2,
        cy = y + h / 2;
      let bass = 0,
        mid = 0;
      for (let b = 0; b < 10; b++) bass += bandV(f, b);
      bass /= 10;
      for (let b = 20; b < 40; b++) mid += bandV(f, b);
      mid /= 20;
      g.lineWidth = 1.3;
      for (let i = 0; i < 34; i++) {
        const s = i * 1.618;
        g.beginPath();
        for (let j = 0; j <= 56; j++) {
          const a = (j / 56) * Math.PI * 2.2 + s * 3 + t * (0.2 + 0.1 * (i % 3));
          let r =
            30 +
            68 * bass * (0.55 + 0.45 * Math.sin(s * 7.1)) +
            22 * Math.sin(a * 3 + s * 5 + t * 1.3) * (0.35 + mid) +
            9 * Math.sin(a * 8 + s * 11 - t * 2.7);
          r = clamp(r, 8, 100);
          const X = cx + Math.cos(a) * r,
            Y = cy + Math.sin(a) * r * 1.15;
          j ? g.lineTo(X, Y) : g.moveTo(X, Y);
        }
        g.strokeStyle = i % 5 === 0 ? C.ink : A.main;
        g.globalAlpha = i % 5 === 0 ? 0.5 : 0.22 + (0.5 * ((i * 37) % 10)) / 10;
        g.stroke();
      }
      g.globalAlpha = 1;
      const cr = 14 + 10 * bass + 5 * Math.pow(1 - B.ph, 3);
      dot(cx, cy, cr, C.ink);
      g.strokeStyle = C.ink;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, cr + 7, 0, Math.PI * 2);
      g.stroke();
    }
    function pTall(t, f) {
      const x = 280,
        y = 1435,
        w = 220,
        h = 310;
      box(x, y, w, h);
      txt("CH1", x + 12, y + 26, 16, A.main, 500);
      txt(String(f).padStart(5, "0"), x + 62, y + 26, 16, C.text);
      const ax = x + 10,
        aw = w - 20,
        cy = y + 172,
        amp = 118 / an.peak;
      g.strokeStyle = C.grid;
      g.lineWidth = 1;
      line(ax, cy, ax + aw, cy);
      readS(an.R, t, 360, scratch2);
      g.strokeStyle = A.soft;
      g.lineWidth = 1.5;
      g.beginPath();
      for (let i = 0; i < 360; i++) {
        const X = ax + (i / 359) * aw,
          Y = clamp(cy - scratch2[i] * amp * 0.7, y + 40, y + h - 10);
        i ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
      g.stroke();
      readS(an.L, t, 360, scratch);
      g.strokeStyle = A.main;
      g.lineWidth = 2.5;
      g.beginPath();
      for (let i = 0; i < 360; i++) {
        const X = ax + (i / 359) * aw,
          Y = clamp(cy - scratch[i] * amp, y + 40, y + h - 10);
        i ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
      g.stroke();
    }
    function pRing(t, B) {
      g.fillStyle = A.soft;
      g.fillRect(540, 1058, 14, 14);
      txt("PIANO", 562, 1071, 16, C.ink);
      g.fillStyle = A.main;
      g.fillRect(540, 1084, 14, 14);
      txt("LEAD", 562, 1097, 16, C.ink);
      const cx = 790,
        cy = 1240,
        R = 148;
      g.strokeStyle = C.line;
      g.lineWidth = 1.5;
      line(cx - R - 52, cy, cx - R - 14, cy);
      line(cx + R + 14, cy, cx + R + 52, cy);
      line(cx, cy - R - 52, cx, cy - R - 14);
      line(cx, cy + R + 14, cx, cy + R + 52);
      txt("1", cx + 12, cy - R - 28, 15, C.text);
      txt("2", cx + R + 30, cy - 10, 15, C.text);
      txt("3", cx + 12, cy + R + 42, 15, C.text);
      txt("4", cx - R - 38, cy - 10, 15, C.text);
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 12;
      g.lineCap = "butt";
      for (let k = 0; k < 4; k++) {
        const a0 = -Math.PI / 2 + (k * Math.PI) / 2 + 0.06,
          a1 = a0 + Math.PI / 2 - 0.12;
        g.strokeStyle = k < B.inBar ? A.main : C.faint;
        g.beginPath();
        g.arc(cx, cy, R - 18, a0, a1);
        g.stroke();
        if (k === B.inBar) {
          g.strokeStyle = A.main;
          g.beginPath();
          g.arc(cx, cy, R - 18, a0, a0 + (a1 - a0) * B.ph);
          g.stroke();
        }
      }
      g.lineWidth = 3;
      g.strokeStyle = A.soft;
      g.setLineDash([10, 14]);
      g.lineDashOffset = -t * 40;
      g.beginPath();
      g.arc(cx, cy, R - 42, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      if (B.bi >= 0) {
        g.globalAlpha = Math.pow(1 - B.ph, 2) * 0.7;
        g.strokeStyle = A.main;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, cy, R + 6 + B.ph * 18, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
      }
      const ang = -Math.PI / 2 + ((B.inBar + B.ph) / 4) * Math.PI * 2;
      g.strokeStyle = C.ink;
      g.lineWidth = 2.5;
      line(
        cx - Math.cos(ang) * 24,
        cy - Math.sin(ang) * 24,
        cx + Math.cos(ang) * (R + 12),
        cy + Math.sin(ang) * (R + 12),
      );
      dot(cx, cy, 60, C.bg);
      g.strokeStyle = C.line;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, 60, 0, Math.PI * 2);
      g.stroke();
      txt("BAR", cx, cy - 18, 15, C.text, 400, "center", 3);
      txt(String(B.bar), cx, cy + 28, 50, C.ink, 500, "center", 0);
    }
    function pScore(t, f, B) {
      const x = 520,
        y = 1440,
        w = 500,
        h = 170;
      box(x, y, w, h);
      txt(
        "SCORE " + String(Math.floor((an.cum[f] / an.rmsMax) * 137)).padStart(7, "0"),
        x + 16,
        y + 30,
        17,
        C.ink,
        500,
      );
      const barStart = an.beat0 + Math.floor(B.bi / 4) * 4 * B.bl;
      let chain = 0;
      for (const n of an.notes) {
        if (n.t0 > t) break;
        if (n.t0 >= barStart) chain++;
      }
      txt("CHAIN × " + chain, x + w - 56, y + 30, 17, A.main, 500, "right");
      const base = y + h - 18,
        left = x + 22,
        right = x + w - 72,
        n = 18,
        sw = (right - left) / n;
      g.strokeStyle = C.line;
      g.lineWidth = 1.2;
      line(left, base, right, base);
      for (let i = 0; i < n; i++) {
        const v = bandV(f, Math.floor(4 + i * (52 / n))),
          ax = left + sw * (i + 0.5),
          ay = Math.max(y + 46, base - v * 96);
        g.beginPath();
        g.moveTo(ax - sw * 1.4, base);
        g.lineTo(ax, ay);
        g.lineTo(ax + sw * 1.4, base);
        g.globalAlpha = 0.4;
        g.fillStyle = A.pale;
        g.fill();
        g.globalAlpha = 1;
        g.strokeStyle = A.main;
        g.lineWidth = 1.3;
        g.stroke();
      }
      const mx = x + w - 42,
        my = y + 48,
        mh = h - 66,
        lv = an.rms[f] / an.rmsMax;
      g.fillStyle = A.main;
      g.fillRect(mx, my + mh * (1 - lv), 18, mh * lv);
      g.strokeStyle = C.line;
      g.lineWidth = 1.2;
      g.strokeRect(mx, my, 18, mh);
    }
    function pSteps(t, B) {
      const x = 520,
        y = 1625,
        w = 500,
        h = 120,
        gap = 8,
        cw = (w - gap * 7) / 8,
        chh = (h - gap) / 2;
      const step = B.bl / 4,
        si = Math.floor((t - an.beat0) / step),
        s0 = Math.floor(si / 16) * 16,
        cur = si - s0;
      for (let s = 0; s < 16; s++) {
        const X = x + (s % 8) * (cw + gap),
          Y = y + (s >> 3) * (chh + gap),
          ts = an.beat0 + (s0 + s) * step;
        const hit = ts >= 0 && ts <= an.dur && onsetMax(ts - step * 0.4, ts + step * 0.4) > 1;
        rr(X, Y, cw, chh, 4);
        g.fillStyle = s === cur ? A.main : hit ? (s < cur ? A.soft : A.pale) : C.bg;
        g.fill();
        g.strokeStyle = C.line;
        g.lineWidth = 1.2;
        g.stroke();
        txt(String(s + 1).padStart(2, "0"), X + 8, Y + 20, 13, s === cur ? C.onAccent : C.text);
      }
    }
    function pFooter(t, B) {
      txt(trackName.toUpperCase().slice(0, 34), 60, 1812, 20, C.ink, 500);
      txt(Math.round(an.bpm) + " BPM · 4/4", 1020, 1812, 18, C.text, 400, "right");
      const py = 1848,
        prog = an.dur ? t / an.dur : 0;
      g.lineCap = "round";
      g.strokeStyle = C.line;
      g.lineWidth = 3;
      line(60, py, 1020, py);
      g.strokeStyle = A.main;
      line(60, py, 60 + 960 * prog, py);
      g.lineCap = "butt";
      dot(60 + 960 * prog, py, 8, C.ink);
      txt("BAR " + String(B.bar).padStart(3, "0"), 60, 1888, 17, C.text);
      txt(fmt(t) + " / " + fmt(an.dur), 1020, 1888, 17, C.text, 400, "right");
    }
    function draw(t, scene) {
      ({ an, accent: A, media, zoomCuts, trackName } = scene);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = C.bg;
      g.fillRect(0, 0, W, H);
      if (!an) {
        txt("LOADING", W / 2, H / 2, 22, C.text, 400, "center", 4);
        return;
      }
      const f = fAt(t),
        B = beatInfo(t);
      const LY = layout();
      if (LY.win) pWindow(t, f, LY.win);
      pDots(t, f, B, LY.dots);
      pImage(t, B, LY.img);
      pRoll(t, B, LY);
      pWave(t);
      pScope(t);
      pSpectrum(f);
      pVector(t);
      pOrb(t, f, B);
      pTall(t, f);
      pRing(t, B);
      pScore(t, f, B);
      pSteps(t, B);
      pFooter(t, B);
    }
    return { draw };
  }

  window.TonePinkrollRenderer = { createRenderer, formatTime: fmt, WIDTH: W, HEIGHT: H };
})();
