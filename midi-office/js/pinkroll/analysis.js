/**
 * MIDI OFFICE — Pinkroll / Analysis
 * Turns a decoded AudioBuffer into everything the renderer reads:
 * spectrum bands, loudness, an estimated tempo and beat offset, and
 * detected piano-roll notes. Runs entirely in the browser, yielding to
 * the event loop as it goes so a long file doesn't freeze the page.
 */
(() => {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const tick = () => new Promise((r) => setTimeout(r, 0));

  /* ---------- FFT ---------- */
  function makeFFT(N) {
    const cos = new Float32Array(N / 2),
      sin = new Float32Array(N / 2);
    for (let i = 0; i < N / 2; i++) {
      cos[i] = Math.cos((2 * Math.PI * i) / N);
      sin[i] = Math.sin((2 * Math.PI * i) / N);
    }
    const bits = Math.log2(N),
      rev = new Uint32Array(N);
    for (let i = 0; i < N; i++) {
      let r = 0,
        x = i;
      for (let b = 0; b < bits; b++) {
        r = (r << 1) | (x & 1);
        x >>= 1;
      }
      rev[i] = r;
    }
    return (re, im) => {
      for (let i = 0; i < N; i++) {
        const j = rev[i];
        if (j > i) {
          let t = re[i];
          re[i] = re[j];
          re[j] = t;
          t = im[i];
          im[i] = im[j];
          im[j] = t;
        }
      }
      for (let size = 2; size <= N; size *= 2) {
        const half = size / 2,
          step = N / size;
        for (let i = 0; i < N; i += size) {
          for (let j = i, k = 0; j < i + half; j++, k += step) {
            const l = j + half,
              c = cos[k],
              s = sin[k];
            const tr = re[l] * c + im[l] * s,
              ti = -re[l] * s + im[l] * c;
            re[l] = re[j] - tr;
            im[l] = im[j] - ti;
            re[j] += tr;
            im[j] += ti;
          }
        }
      }
    };
  }
  const FFTN = 4096,
    HOP = 2048,
    NB = 64,
    M0 = 36,
    M1 = 96,
    NM = M1 - M0 + 1,
    OVN = 60,
    H2 = 512;
  const fft = makeFFT(FFTN);

  /* ---------- Analysis ---------- */
  async function analyze(buf, prog, known) {
    const sr = buf.sampleRate,
      len = buf.length;
    const L = buf.getChannelData(0),
      R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    const mono = new Float32Array(len);
    let peak = 1e-6;
    for (let i = 0; i < len; i++) {
      const l = L[i],
        r = R[i];
      mono[i] = (l + r) * 0.5;
      const a = l < 0 ? -l : l,
        b = r < 0 ? -r : r;
      if (a > peak) peak = a;
      if (b > peak) peak = b;
    }
    const nF = Math.max(1, Math.ceil(len / HOP)),
      half = FFTN / 2,
      binHz = sr / FFTN;
    const hann = new Float32Array(FFTN);
    for (let i = 0; i < FFTN; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFTN - 1));
    const fmax = Math.min(16000, (sr / 2) * 0.95);
    const bEdge = new Int32Array(NB + 1);
    for (let b = 0; b <= NB; b++)
      bEdge[b] = Math.max(1, Math.round((40 * Math.pow(fmax / 40, b / NB)) / binHz));
    for (let b = 1; b <= NB; b++) if (bEdge[b] <= bEdge[b - 1]) bEdge[b] = bEdge[b - 1] + 1;
    const nLo = new Int32Array(NM),
      nHi = new Int32Array(NM);
    for (let n = 0; n < NM; n++) {
      const f = 440 * Math.pow(2, (M0 + n - 69) / 12);
      nLo[n] = Math.floor((f * Math.pow(2, -0.5 / 12)) / binHz);
      nHi[n] = Math.max(nLo[n], Math.ceil((f * Math.pow(2, 0.5 / 12)) / binHz));
    }
    const bandsDb = new Float32Array(nF * NB),
      rms = new Float32Array(nF),
      noteE = new Float32Array(nF * NM);
    const re = new Float32Array(FFTN),
      im = new Float32Array(FFTN),
      mag = new Float32Array(half);
    let maxDb = -200;
    for (let f = 0; f < nF; f++) {
      const s0 = f * HOP - half;
      let ss = 0;
      for (let i = 0; i < FFTN; i++) {
        const k = s0 + i;
        const v = k >= 0 && k < len ? mono[k] : 0;
        re[i] = v * hann[i];
        im[i] = 0;
        ss += v * v;
      }
      rms[f] = Math.sqrt(ss / FFTN);
      fft(re, im);
      for (let k = 0; k < half; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      for (let b = 0; b < NB; b++) {
        let s = 0;
        const a = bEdge[b],
          z = Math.min(half, bEdge[b + 1]);
        for (let k = a; k < z; k++) s += mag[k];
        const d = 20 * Math.log10(s / Math.max(1, z - a) + 1e-9);
        bandsDb[f * NB + b] = d;
        if (d > maxDb) maxDb = d;
      }
      for (let n = 0; n < NM; n++) {
        let mx = 0;
        for (let k = nLo[n]; k <= nHi[n] && k < half; k++) if (mag[k] > mx) mx = mag[k];
        noteE[f * NM + n] = mx;
      }
      if ((f & 127) === 127) {
        prog((f / nF) * 0.85);
        await tick();
      }
    }
    const bands = new Float32Array(nF * NB),
      floor = maxDb - 52;
    for (let i = 0; i < bands.length; i++) bands[i] = clamp((bandsDb[i] - floor) / 52, 0, 1);
    let rmsMax = 1e-6;
    for (let f = 0; f < nF; f++) if (rms[f] > rmsMax) rmsMax = rms[f];
    const cum = new Float32Array(nF);
    for (let f = 0; f < nF; f++) cum[f] = (f ? cum[f - 1] : 0) + rms[f];

    /* onset envelope (fine hop) */
    const n2 = Math.max(2, Math.floor(len / H2)),
      fps2 = sr / H2;
    const en = new Float32Array(n2);
    for (let i = 0; i < n2; i++) {
      let s = 0;
      const o = i * H2;
      for (let j = 0; j < H2; j++) {
        const v = mono[o + j] || 0;
        s += v * v;
      }
      en[i] = Math.log(1e-6 + s / H2);
    }
    const on = new Float32Array(n2);
    for (let i = 1; i < n2; i++) on[i] = Math.max(0, en[i] - en[i - 1]);
    const on2 = new Float32Array(n2);
    {
      let acc = 0;
      const w = 8;
      const pre = [];
      for (let i = 0; i < n2; i++) {
        acc += on[i];
        pre.push(acc);
      }
      for (let i = 0; i < n2; i++) {
        const a = Math.max(0, i - w),
          b = Math.min(n2 - 1, i + w);
        const m = (pre[b] - (a ? pre[a - 1] : 0)) / (b - a + 1);
        on2[i] = Math.max(0, on[i] - m);
      }
    }
    let mean = 0,
      sq = 0;
    for (let i = 0; i < n2; i++) {
      mean += on2[i];
    }
    mean /= n2;
    for (let i = 0; i < n2; i++) sq += (on2[i] - mean) ** 2;
    const thr = mean + 2 * Math.sqrt(sq / n2) + 1e-6;
    const onN = new Float32Array(n2);
    for (let i = 0; i < n2; i++) onN[i] = on2[i] / thr;
    prog(0.9);
    await tick();

    let bpm = 120,
      beat0 = 0;
    if (known) {
      bpm = known.bpm;
      beat0 = known.beat0;
    } else {
      const lo = Math.floor((fps2 * 60) / 180),
        hi = Math.ceil((fps2 * 60) / 65);
      const ac = new Float32Array(hi + 2);
      for (let lag = Math.max(1, lo - 1); lag <= hi + 1 && lag < n2; lag++) {
        let s = 0;
        for (let i = 0; i + lag < n2; i++) s += on2[i] * on2[i + lag];
        ac[lag] = s / (n2 - lag);
      }
      let best = -1,
        bl = 0;
      for (let lag = lo; lag <= hi && lag < n2; lag++) {
        const b = (60 * fps2) / lag;
        const w = Math.exp(-0.5 * Math.pow(Math.log2(b / 118) / 0.5, 2));
        const sc = ac[lag] * w;
        if (sc > best) {
          best = sc;
          bl = lag;
        }
      }
      if (bl > 1) {
        const a = ac[bl - 1],
          b = ac[bl],
          c = ac[bl + 1];
        const den = a - 2 * b + c;
        const d = den !== 0 ? clamp((0.5 * (a - c)) / den, -0.5, 0.5) : 0;
        const lagF = bl + d;
        bpm = (60 * fps2) / lagF;
        let bp = -1,
          bo = 0;
        for (let o = 0; o < lagF; o += 0.5) {
          let s = 0;
          for (let x = o; x < n2; x += lagF) s += on2[Math.round(x)] || 0;
          if (s > bp) {
            bp = s;
            bo = o;
          }
        }
        beat0 = bo / fps2;
      }
      if (!isFinite(bpm) || bpm <= 0) {
        bpm = 120;
        beat0 = 0;
      }
    }

    /* notes */
    let notes;
    if (known) notes = known.notes.slice();
    else {
      const samp = [];
      for (let i = 0; i < noteE.length; i += 5) samp.push(noteE[i]);
      samp.sort((a, b) => a - b);
      const ref = samp[Math.floor(samp.length * 0.995)] || 1,
        gate = rmsMax * 0.06;
      const e = new Float32Array(NM),
        sal = new Float32Array(NM),
        open = new Map();
      notes = [];
      const close = (n, o) => {
        if (o.end - o.start >= 1)
          notes.push({
            m: M0 + n,
            t0: Math.max(0, ((o.start - 0.5) * HOP) / sr),
            t1: ((o.end + 0.5) * HOP) / sr,
            v: Math.min(1, o.sum / o.cnt),
          });
        open.delete(n);
      };
      for (let f = 0; f < nF; f++) {
        let cands = [];
        if (rms[f] >= gate) {
          for (let n = 0; n < NM; n++) e[n] = Math.min(1.5, noteE[f * NM + n] / ref);
          let fm = 0;
          for (let n = 0; n < NM; n++) {
            const s =
              e[n] +
              (n + 12 < NM ? 0.5 * e[n + 12] : 0) +
              (n + 19 < NM ? 0.33 * e[n + 19] : 0) +
              (n + 24 < NM ? 0.25 * e[n + 24] : 0);
            sal[n] = s;
            if (s > fm) fm = s;
          }
          for (let n = 0; n < NM; n++)
            if (
              sal[n] >= fm * 0.45 &&
              e[n] > 0.18 &&
              (n === 0 || sal[n] >= sal[n - 1]) &&
              (n === NM - 1 || sal[n] >= sal[n + 1])
            )
              cands.push(n);
          cands.sort((a, b) => sal[b] - sal[a]);
          if (cands.length > 4) cands.length = 4;
        }
        const cur = new Set(cands);
        for (const [n, o] of open) {
          if (cur.has(n)) {
            o.end = f;
            o.sum += e[n];
            o.cnt++;
          } else if (f - o.end > 1) close(n, o);
        }
        for (const n of cands)
          if (!open.has(n)) open.set(n, { start: f, end: f, sum: e[n], cnt: 1 });
        if ((f & 1023) === 1023) await tick();
      }
      for (const [n, o] of open) close(n, o);
    }
    notes.sort((a, b) => a.t0 - b.t0);
    const pcMask = new Uint16Array(nF);
    for (const n of notes) {
      const a = Math.max(0, Math.round((n.t0 * sr) / HOP)),
        b = Math.min(nF - 1, Math.round((n.t1 * sr) / HOP));
      for (let f = a; f <= b; f++) pcMask[f] |= 1 << n.m % 12;
    }

    const ovPeak = new Float32Array(OVN),
      ovRms = new Float32Array(OVN);
    let ovMax = 1e-6;
    for (let c = 0; c < OVN; c++) {
      const a = Math.floor((c * len) / OVN),
        b = Math.floor(((c + 1) * len) / OVN);
      let p = 0,
        s = 0;
      for (let i = a; i < b; i++) {
        const v = mono[i];
        const av = v < 0 ? -v : v;
        if (av > p) p = av;
        s += v * v;
      }
      ovPeak[c] = p / peak;
      ovRms[c] = Math.sqrt(s / Math.max(1, b - a));
      if (ovRms[c] > ovMax) ovMax = ovRms[c];
    }
    for (let c = 0; c < OVN; c++) ovRms[c] /= ovMax;
    prog(1);
    return {
      sr,
      len,
      dur: len / sr,
      L,
      R,
      peak,
      nF,
      bands,
      rms,
      rmsMax,
      cum,
      notes,
      pcMask,
      bpm,
      beat0,
      onN,
      fps2,
      ovPeak,
      ovRms,
    };
  }

  window.TonePinkrollAnalysis = { analyze, HOP, NB, M0, M1, NM, OVN };
})();
