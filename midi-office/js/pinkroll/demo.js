/**
 * MIDI OFFICE — Pinkroll / Demo
 * The synthesized track and placeholder artwork a fresh Pinkroll window
 * opens with, so it shows something moving before any file is loaded.
 */
(() => {
  const { M0, M1 } = window.TonePinkrollAnalysis;

  function makeDemo() {
    const sr = 44100,
      bpm = 96,
      bl = 60 / bpm,
      bars = 8,
      dur = bars * 4 * bl + 1.8,
      len = Math.ceil(dur * sr);
    const L = new Float32Array(len),
      R = new Float32Array(len),
      notes = [];
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    function tone(m, t0, d, vel, pan) {
      const f = 440 * Math.pow(2, (m - 69) / 12),
        s0 = Math.floor(t0 * sr),
        n = Math.floor((d + 0.8) * sr);
      const gl = Math.cos(((pan + 1) * Math.PI) / 4),
        gr = Math.sin(((pan + 1) * Math.PI) / 4),
        w = (2 * Math.PI * f) / sr,
        dec = 2 + (m - 48) * 0.04;
      for (let i = 0; i < n; i++) {
        const k = s0 + i;
        if (k >= len) break;
        const tt = i / sr;
        let env = Math.min(1, tt / 0.004) * Math.exp(-tt * dec);
        if (tt > d) env *= Math.exp(-(tt - d) * 10);
        const ph = w * i;
        const v =
          (Math.sin(ph) +
            Math.sin(2 * ph) * 0.33 * Math.exp(-tt * 1.5) +
            Math.sin(3 * ph) * 0.17 * Math.exp(-tt * 3) +
            Math.sin(4 * ph) * 0.08 * Math.exp(-tt * 4)) *
          env *
          vel *
          0.16;
        L[k] += v * gl;
        R[k] += v * gr;
      }
      notes.push({ m, t0, t1: t0 + d, v: vel });
    }
    const chords = [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
    ];
    const arp = [0, 1, 2, 3, 2, 1, 2, 3],
      scale = [72, 74, 76, 79, 81, 84, 86];
    const rhythms = [
      [0, 3, 4, 6],
      [0, 2, 5, 7],
      [1, 3, 4, 7],
      [0, 2, 4, 6],
    ];
    for (let b = 0; b < bars; b++) {
      const c = chords[b % 4],
        t = b * 4 * bl;
      tone(c[0] - 12, t, bl * 3.6, 0.95, -0.1);
      for (let e = 0; e < 8; e++)
        tone(c[arp[e]] + (e >= 4 ? 12 : 0), t + (e * bl) / 2, bl * 0.85, e % 2 ? 0.5 : 0.62, -0.45);
      if (b >= 2)
        for (const p of rhythms[b % 4])
          tone(
            scale[Math.floor(rnd() * scale.length)],
            t + (p * bl) / 2,
            bl * (p % 2 ? 0.45 : 0.85),
            0.72,
            0.45,
          );
      for (const q of [0, 2]) {
        const s0 = Math.floor((t + q * bl) * sr);
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
      }
      for (let e = 1; e < 8; e += 2) {
        const s0 = Math.floor((t + (e * bl) / 2) * sr);
        let prev = 0;
        for (let i = 0; i < 0.06 * sr; i++) {
          const k = s0 + i;
          if (k >= len) break;
          const nz = rnd() * 2 - 1,
            hp = nz - prev;
          prev = nz;
          const v = hp * Math.exp((-i / sr) * 70) * 0.05;
          L[k] += v * 0.7;
          R[k] += v;
        }
      }
    }
    let pk = 1e-6;
    for (let i = 0; i < len; i++) {
      pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    }
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
  function makeDemoImage(A) {
    const c = document.createElement("canvas");
    c.width = 760;
    c.height = 1000;
    const x = c.getContext("2d");
    const gr = x.createLinearGradient(0, 0, 0, 1000);
    gr.addColorStop(0, A.pale);
    gr.addColorStop(1, A.soft);
    x.fillStyle = gr;
    x.fillRect(0, 0, 760, 1000);
    const rg = x.createRadialGradient(470, 380, 10, 470, 380, 330);
    rg.addColorStop(0, "rgba(255,255,255,.95)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = rg;
    x.fillRect(0, 0, 760, 1000);
    x.fillStyle = A.main;
    x.beginPath();
    x.arc(470, 380, 170, 0, 7);
    x.fill();
    x.fillStyle = A.deep;
    for (let r = 0; r < 26; r++)
      for (let q = 0; q < 20; q++) {
        const px = 20 + q * 38,
          py = 560 + r * 17;
        const d = Math.hypot(px - 470, py - 380) / 600;
        const rad = Math.max(0, 4.2 * (1 - d) + (r / 26) * 2.4);
        if (rad > 0.6) {
          x.beginPath();
          x.arc(px, py, rad, 0, 7);
          x.fill();
        }
      }
    x.strokeStyle = "rgba(255,255,255,.7)";
    x.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.moveTo(0, 250 + i * 34);
      x.lineTo(760, 210 + i * 34);
      x.stroke();
    }
    x.fillStyle = "rgba(35,39,41,.85)";
    x.font = '500 26px "IBM Plex Mono", monospace';
    x.fillText("IMAGE / VIDEO", 36, 64);
    x.font = '400 20px "IBM Plex Mono", monospace';
    x.fillText("LOAD AN IMAGE TO REPLACE THIS", 36, 98);
    return c;
  }

  window.TonePinkrollDemo = { makeDemo, makeDemoImage };
})();
