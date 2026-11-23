/**
 * MIDI OFFICE — SV-16 / Demo
 * The track and picture SV-16 opens with: an 8-bar, 100 BPM loop
 * (piano, pad, lead, drums) synthesized in code with its notes known
 * exactly, and a placeholder image drawn in the current palette.
 */
(() => {
  const { M0, M1 } = window.ToneSv16Analysis;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function makeDemo() {
    const sr = 44100,
      bpm = 100,
      bl = 60 / bpm,
      bars = 8,
      dur = bars * 4 * bl + 2,
      len = Math.ceil(dur * sr);
    const L = new Float32Array(len),
      R = new Float32Array(len),
      notes = [];
    let seed = 23;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    function tone(m, t0, d, vel, pan, kind) {
      const f = 440 * Math.pow(2, (m - 69) / 12),
        s0 = Math.floor(t0 * sr),
        rel = kind === "pad" ? 0.6 : 0.7,
        n = Math.floor((d + rel) * sr);
      const gl = Math.cos(((pan + 1) * Math.PI) / 4),
        gr = Math.sin(((pan + 1) * Math.PI) / 4),
        w = (2 * Math.PI * f) / sr,
        dec = kind === "pad" ? 0.15 : 2 + (m - 48) * 0.04;
      for (let i = 0; i < n; i++) {
        const k = s0 + i;
        if (k >= len) break;
        const tt = i / sr;
        let env =
          kind === "pad" ? Math.min(1, tt / 0.35) : Math.min(1, tt / 0.004) * Math.exp(-tt * dec);
        if (tt > d) env *= Math.exp(-(tt - d) * (kind === "pad" ? 6 : 10));
        const ph = w * i;
        let v;
        if (kind === "pad")
          v = (Math.sin(ph) + 0.5 * Math.sin(ph * 1.003 + 1) + 0.25 * Math.sin(2 * ph)) * 0.05;
        else if (kind === "lead")
          v =
            (Math.sin(ph) +
              0.45 * Math.sin(2 * ph) +
              0.3 * Math.sin(3 * ph) * Math.exp(-tt * 2) +
              0.15 * Math.sin(5 * ph) * Math.exp(-tt * 4)) *
            0.13;
        else
          v =
            (Math.sin(ph) +
              Math.sin(2 * ph) * 0.33 * Math.exp(-tt * 1.5) +
              Math.sin(3 * ph) * 0.17 * Math.exp(-tt * 3) +
              Math.sin(4 * ph) * 0.08 * Math.exp(-tt * 4)) *
            0.15;
        v *= env * vel;
        L[k] += v * gl;
        R[k] += v * gr;
      }
      if (kind !== "pad") notes.push({ m, t0, t1: t0 + d, v: vel });
    }
    const chords = [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [55, 59, 62, 65],
    ];
    const arp = [0, 1, 2, 3, 2, 1, 2, 3],
      scale = [72, 74, 76, 79, 81, 84, 86, 88];
    for (let b = 0; b < bars; b++) {
      const c = chords[b % 4],
        t = b * 4 * bl;
      tone(c[0] - 12, t, bl * 1.8, 0.95, -0.1, "piano");
      tone(c[0] - 12, t + bl * 2.5, bl * 1.3, 0.8, -0.1, "piano");
      for (const m of c) tone(m + 12, t, bl * 4, 0.9, m % 2 ? -0.6 : 0.6, "pad");
      for (let e = 0; e < 8; e++)
        tone(
          c[arp[e]] + (e >= 4 ? 12 : 0),
          t + (e * bl) / 2,
          bl * 0.85,
          e % 2 ? 0.5 : 0.62,
          -0.45,
          "piano",
        );
      if (b >= 2) {
        const sixteenth = b >= 5;
        let idx = Math.floor(rnd() * 4) + 2;
        for (let s = 0; s < 16; s += sixteenth ? 1 : 2) {
          if (rnd() < (sixteenth ? 0.35 : 0.25)) continue;
          idx = clamp(idx + Math.floor(rnd() * 3) - 1, 0, scale.length - 1);
          tone(scale[idx], t + (s * bl) / 4, bl * (sixteenth ? 0.22 : 0.45), 0.7, 0.45, "lead");
        }
      }
      for (let q = 0; q < 4; q++) {
        const s0 = Math.floor((t + q * bl) * sr);
        if (q % 2 === 0) {
          let ph = 0;
          for (let i = 0; i < 0.38 * sr; i++) {
            const k = s0 + i;
            if (k >= len) break;
            const tt = i / sr;
            ph += (2 * Math.PI * (48 + 95 * Math.exp(-tt * 28))) / sr;
            const v = Math.sin(ph) * Math.exp(-tt * 8) * 0.42;
            L[k] += v;
            R[k] += v;
          }
        } else {
          let p = 0;
          for (let i = 0; i < 0.2 * sr; i++) {
            const k = s0 + i;
            if (k >= len) break;
            const tt = i / sr,
              nz = rnd() * 2 - 1,
              hp = nz - p;
            p = nz;
            const v = (hp * 0.6 + Math.sin(2 * Math.PI * 190 * tt)) * Math.exp(-tt * 22) * 0.12;
            L[k] += v;
            R[k] += v;
          }
        }
      }
      for (let s = 0; s < 16; s++) {
        const s0 = Math.floor((t + (s * bl) / 4) * sr),
          acc = s % 2 ? 0.035 : 0.06;
        let p = 0;
        for (let i = 0; i < 0.045 * sr; i++) {
          const k = s0 + i;
          if (k >= len) break;
          const nz = rnd() * 2 - 1,
            hp = nz - p;
          p = nz;
          const v = hp * Math.exp((-i / sr) * 80) * acc;
          L[k] += v * 0.6;
          R[k] += v;
        }
      }
    }
    let pk = 1e-6;
    for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    const k = 0.9 / pk;
    for (let i = 0; i < len; i++) {
      L[i] *= k;
      R[i] *= k;
    }
    const buf = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: sr });
    buf.copyToChannel(L, 0);
    buf.copyToChannel(R, 1);
    return {
      buffer: buf,
      known: { bpm, beat0: 0, notes: notes.filter((n) => n.m >= M0 && n.m <= M1) },
    };
  }
  function makeDemoImage(colors) {
    const { A, C } = colors;
    const c = document.createElement("canvas");
    c.width = 760;
    c.height = 1000;
    const x = c.getContext("2d");
    x.fillStyle = A.pale;
    x.fillRect(0, 0, 760, 1000);
    x.fillStyle = A.soft;
    x.fillRect(0, 600, 760, 400);
    for (let i = 0; i < 9; i++) {
      const e = 70 + i * 34;
      x.strokeStyle = i % 3 === 0 ? C.ink : "rgba(255,255,255,.75)";
      x.lineWidth = i % 3 === 0 ? 1.5 : 2;
      x.strokeRect(380 - e, 420 - e, e * 2, e * 2);
    }
    x.fillStyle = A.main;
    x.fillRect(270, 310, 220, 220);
    x.fillStyle = C.ink;
    x.fillRect(370, 410, 20, 20);
    for (let r = 0; r < 20; r++)
      for (let q = 0; q < 19; q++) {
        const px = 20 + q * 40,
          py = 640 + r * 18,
          d = Math.hypot(px - 380, py - 420) / 640,
          s2 = Math.max(0, 4.4 * (1 - d) + (r / 20) * 3);
        if (s2 > 0.8) {
          x.fillStyle = A.deep;
          x.fillRect(px - s2, py - s2, s2 * 2, s2 * 2);
        }
      }
    x.fillStyle = C.ink;
    x.font = '500 22px "IBM Plex Mono", monospace';
    x.fillText("IMG-01", 28, 52);
    x.font = '400 18px "IBM Plex Mono", monospace';
    x.fillText("IMAGE / VIDEO IN", 28, 80);
    return c;
  }

  window.ToneSv16Demo = { makeDemo, makeDemoImage };
})();
