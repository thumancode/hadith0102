/* scenes.js — timeline engine, background, subtitles, all scenes, and window.renderAt(t).
   Everything is a pure function of t (seconds): no timers, no CSS animation, no Math.random. */
'use strict';
(function () {
  const W = 1080;
  const H = 1920;
  const DURATION = VIDEO.duration;

  /* ---------- small utilities ---------- */
  const clamp = (x, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, x));
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  const $ = (id) => document.getElementById(id);
  function mk(parent, cls, css, html, tag) {
    const d = document.createElement(tag || 'div');
    if (cls) d.className = cls;
    if (css) d.style.cssText = css;
    if (html !== undefined && html !== null) d.innerHTML = html;
    parent.appendChild(d);
    return d;
  }
  function rng(seed) { // mulberry32: same numbers on every render
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- timeline engine ---------- */
  const TR = [];
  let CUR = null;
  const PRE = {
    fade: () => '',
    rise: (p) => 'translateY(' + ((1 - p) * 44).toFixed(2) + 'px)',
    drop: (p) => 'translateY(' + (-(1 - p) * 44).toFixed(2) + 'px)',
    pop: (p) => 'scale(' + (0.55 + 0.45 * p).toFixed(4) + ')',
    zoom: (p) => 'scale(' + (1.3 - 0.3 * p).toFixed(4) + ')',
    sl: (p) => 'translateX(' + (-(1 - p) * 90).toFixed(2) + 'px)',
    sr: (p) => 'translateX(' + ((1 - p) * 90).toFixed(2) + 'px)',
  };
  /* track(el, start, {e, a, i, o, fn, p0}) — element is shown from start to e.
     a: fade|rise|drop|pop|zoom|sl|sr   i: in-duration   o: out-duration   p0: initial progress (so frame 0 is not empty) */
  function T(el, s, o) {
    o = o || {};
    TR.push({
      el: el, s: s,
      e: o.e !== undefined ? o.e : (CUR ? CUR.e : 1e9),
      a: PRE[o.a] ? o.a : 'fade',
      i: o.i !== undefined ? o.i : 0.5,
      o: o.o !== undefined ? o.o : 0.4,
      fn: o.fn, p0: o.p0 || 0,
    });
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
    return el;
  }
  function renderTracks(t) {
    for (let k = 0; k < TR.length; k++) {
      const tr = TR[k];
      const vis = t >= tr.s && t < tr.e;
      const lt = t - tr.s;
      let op = 0;
      let tf = '';
      if (vis) {
        let u = tr.i > 0 ? clamp(lt / tr.i) : 1;
        u = tr.p0 + (1 - tr.p0) * u;
        const eu = tr.a === 'pop' ? easeBack(u) : easeOut(u);
        op = tr.a === 'pop' ? clamp(u * 2.2) : clamp(eu);
        tf = PRE[tr.a](eu);
        if (tr.o > 0 && t > tr.e - tr.o) op *= clamp((tr.e - t) / tr.o);
      }
      const vs = vis ? 'inherit' : 'hidden';
      if (tr.lvs !== vs) { tr.el.style.visibility = vs; tr.lvs = vs; }
      const os = op.toFixed(3);
      if (tr.lop !== os) { tr.el.style.opacity = os; tr.lop = os; }
      if (tr.ltf !== tf) { tr.el.style.transform = tf; tr.ltf = tf; }
      /* fn runs last: it may drive CHILD elements, or the transform of an element whose preset is 'fade' */
      if (vis && tr.fn) tr.fn(t, lt, tr.el);
    }
  }

  /* ---------- line timing helpers (subtitles and scene cues share these) ---------- */
  const lineAt = (i) => LINES[Math.min(Math.max(i, 0), LINES.length - 1)];
  const ls = (i) => lineAt(i).s;
  const le = (i) => lineAt(i).e;
  const schedCache = {};
  function sched(i) {
    if (schedCache[i]) return schedCache[i];
    const L = lineAt(i);
    const ws = L.text.split(/\s+/).filter(Boolean);
    const wt = ws.map((w) => w.length + 1);
    const tot = wt.reduce((a, b) => a + b, 0);
    const t0 = L.s + 0.1;
    const span = (L.e - L.s) * 0.86 - 0.1;
    let acc = 0;
    let pos = 0;
    const out = ws.map((w, k) => {
      const c0 = L.text.indexOf(w, pos);
      pos = c0 + w.length;
      const o = { w: w, ts: t0 + (span * acc) / tot, c0: c0, c1: pos };
      acc += wt[k];
      return o;
    });
    schedCache[i] = out;
    return out;
  }
  /* time at which the subtitle word that contains `needle` is revealed */
  function tw(i, needle) {
    const L = lineAt(i);
    const k = L.text.indexOf(needle);
    const sc = sched(i);
    if (k < 0) return L.s + 0.2 * (L.e - L.s);
    for (let n = 0; n < sc.length; n++) if (k >= sc[n].c0 && k < sc[n].c1) return sc[n].ts;
    return L.s;
  }

  /* reveal words one by one between s and e (weighted by character count) */
  function words(parent, text, cls, css, s, e, o) {
    o = o || {};
    const ws = text.split(/\s+/).filter(Boolean);
    const wt = ws.map((w) => w.length + 1);
    const tot = wt.reduce((a, b) => a + b, 0);
    let acc = 0;
    ws.forEach((w, k) => {
      const sp = mk(parent, 'w' + (cls ? ' ' + cls : ''), css || '', null, 'span');
      sp.textContent = w;
      if (o.hl && o.hl(w)) sp.classList.add('hl');
      if (k < ws.length - 1) parent.appendChild(document.createTextNode(' '));
      T(sp, s + ((e - s) * acc) / tot, { e: 1e9, a: 'rise', i: 0.28, o: 0 });
      acc += wt[k];
    });
  }

  /* ---------- emotion → accent colour ---------- */
  const ACC = {
    respectful: [227, 194, 107], informative: [64, 190, 170], solemn: [90, 110, 200], serious: [214, 110, 70],
    calm: [80, 190, 150], thoughtful: [150, 120, 220], warm: [240, 170, 80], compassionate: [226, 120, 150],
    optimistic: [250, 214, 110], friendly: [120, 210, 120], encouraging: [245, 150, 70], store: [227, 194, 107],
  };
  const accEvents = [];
  function buildAccent(extra) {
    LINES.forEach((L) => accEvents.push({ t: L.s, c: ACC[L.tag] || ACC.calm }));
    (extra || []).forEach((x) => accEvents.push(x));
    accEvents.sort((a, b) => a.t - b.t);
  }
  function accentAt(t) {
    let k = 0;
    for (let n = 0; n < accEvents.length; n++) if (accEvents[n].t <= t) k = n;
    const cur = accEvents[k].c;
    const prev = k > 0 ? accEvents[k - 1].c : cur;
    const u = clamp((t - accEvents[k].t) / 0.6);
    return [0, 1, 2].map((n) => Math.round(prev[n] + (cur[n] - prev[n]) * u));
  }

  /* ---------- background layers ---------- */
  const BGU = [];
  function buildBg() {
    const bg = $('bg');
    mk(bg, 'fill', 'background:linear-gradient(180deg,#04201b 0%,#0b3d33 45%,#145c4b 100%)');
    const pat = mk(bg, 'fill', 'opacity:.10;background-image:' + A.patternTile() + ';background-size:120px 120px');
    const med = mk(bg, 'abs', 'left:90px;top:300px;width:900px;height:900px;opacity:.11', A.medallion());
    const med2 = mk(bg, 'abs', 'left:240px;top:1120px;width:600px;height:600px;opacity:.07', A.medallion());
    const glow = mk(bg, 'fill', '');
    let lastGlow = '';
    /* particles */
    const R = rng(7);
    const parts = [];
    for (let k = 0; k < 46; k++) {
      const size = 6 + R() * 9;
      const el = mk(bg, 'abs', 'left:0;top:0;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:radial-gradient(circle,#fff3c4,rgba(227,194,107,0) 70%)');
      parts.push({ el: el, x: R() * W, y: R() * (H + 80), sp: 14 + R() * 26, amp: 10 + R() * 30, ph: R() * 6.28, tw: 0.8 + R() * 1.6 });
    }
    /* lanterns */
    const lanterns = [
      { x: 14, w: 84, h: 210, ph: 0.4 }, { x: 982, w: 84, h: 230, ph: 2.1 }, { x: 108, w: 58, h: 150, ph: 4.0 }, { x: 914, w: 58, h: 160, ph: 5.2 },
    ].map((d) => ({ d: d, el: mk(bg, 'abs', 'left:' + d.x + 'px;top:0;width:' + d.w + 'px;height:' + d.h + 'px;transform-origin:50% 0;opacity:.95', A.lantern()) }));
    mk(bg, 'abs', 'left:0;top:1700px;width:1080px;height:220px;opacity:.96', A.skyline());
    mk(bg, 'fill', 'background:radial-gradient(ellipse at 50% 46%,rgba(0,0,0,0) 52%,rgba(0,0,0,.62) 100%)');
    mk(bg, 'abs', 'left:60px;top:22px;width:960px;height:2px;background:linear-gradient(90deg,rgba(227,194,107,0),#e3c26b,rgba(227,194,107,0))');
    mk(bg, 'abs', 'left:60px;top:1894px;width:960px;height:2px;background:linear-gradient(90deg,rgba(227,194,107,0),#e3c26b,rgba(227,194,107,0))');
    mk(bg, 'abs', 'left:60px;top:1850px;width:960px;height:6px;border-radius:3px;background:rgba(255,255,255,.14)');
    const bar = mk(bg, 'abs', 'left:60px;top:1850px;width:960px;height:6px;border-radius:3px;background:linear-gradient(90deg,#a67c28,#f8e7ae);transform-origin:0 50%');
    const dot = mk(bg, 'abs', 'left:0;top:1842px;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#fff6dc,#e3c26b 60%,rgba(227,194,107,0) 72%)');

    BGU.push(function (t) {
      pat.style.backgroundPosition = (t * 6).toFixed(1) + 'px ' + (t * 4).toFixed(1) + 'px';
      med.style.transform = 'rotate(' + (t * 3).toFixed(2) + 'deg)';
      med2.style.transform = 'rotate(' + (-t * 2).toFixed(2) + 'deg)';
      const c = accentAt(t);
      const g = 'radial-gradient(circle at 50% 38%,rgba(' + c.join(',') + ',.40),rgba(' + c.join(',') + ',0) 62%)';
      if (g !== lastGlow) { glow.style.background = g; lastGlow = g; }
      const span = H + 80;
      parts.forEach((p) => {
        const y = (((p.y - t * p.sp) % span) + span) % span - 40;
        const x = p.x + Math.sin(t * 0.6 + p.ph) * p.amp;
        p.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        p.el.style.opacity = (0.25 + 0.75 * Math.abs(Math.sin(t * p.tw + p.ph))).toFixed(3);
      });
      lanterns.forEach((l) => { l.el.style.transform = 'rotate(' + (Math.sin(t * 0.9 + l.d.ph) * 4).toFixed(2) + 'deg)'; });
      const pr = clamp(t / DURATION);
      bar.style.transform = 'scaleX(' + pr.toFixed(4) + ')';
      dot.style.transform = 'translateX(' + (60 + pr * 960 - 11).toFixed(1) + 'px)';
    });
  }

  /* ---------- HUD: brand bar + subtitles ---------- */
  const KEY_STEMS = ['আল্লাহ', 'রাসূলুল্লাহ', 'ওহী', 'কোরআন', 'হাদিস', 'শেয়ার', 'আমানত', 'ফেরেশতা', 'নবীজ', 'রসূল', 'ভালোবাসুন', 'পাহাড়', 'ইনষ্টল', 'সহীহ', 'বুখারি'];
  const isKey = (w) => KEY_STEMS.some((k) => w.indexOf(k) >= 0);
  const subFit = [];
  function buildHud() {
    const hud = $('hud');
    const brand = mk(hud, 'brand', '');
    const logo = mk(brand, 'logo', '', '<img src="app-icon.jpg" alt="" style="position:absolute;left:-2%;top:-2%;width:104%;height:104%">');
    mk(brand, 'name bn', '', 'ইসলামী বিশ্বকোষ ও আল হাদিস S2');
    mk(brand, 'tag bn', '', 'আজকের হাদিস');
    T(brand, ls(1), { e: ls(LINES.length - 1), a: 'drop', i: 0.6, o: 0.5 });

    const panel = mk(hud, 'sub-panel', '');
    LINES.forEach((L, i) => {
      const box = mk(panel, 'sub-box', '');
      const p = mk(box, 'sub-text bn', '');
      const sc = sched(i);
      sc.forEach((w, k) => {
        const sp = mk(p, 'w' + (isKey(w.w) ? ' hl' : ''), '', null, 'span');
        sp.textContent = w.w;
        if (k < sc.length - 1) p.appendChild(document.createTextNode(' '));
        /* the very first word is already (almost) in place on frame 0, so the first frame is never empty */
        const first = i === 0 && k === 0;
        T(sp, first ? 0 : w.ts, { e: 1e9, a: 'rise', i: 0.28, o: 0, p0: first ? 0.9 : 0 });
      });
      T(box, L.s, { e: L.e, a: 'fade', i: 0.25, o: 0.25, p0: i === 0 ? 1 : 0 });
      subFit.push({ p: p, n: L.text.length });
    });
  }
  function fitSubs() {
    subFit.forEach((f) => {
      let px = f.n > 62 ? 52 : 60;
      f.p.style.fontSize = px + 'px';
      while (f.p.offsetHeight > 280 && px > 30) { px -= 2; f.p.style.fontSize = px + 'px'; }
    });
  }

  /* ---------- scene helpers ---------- */
  const stage = () => $('stage');
  function scene(s, e, i, o, p0) {
    const w = mk(stage(), 'fill', '');
    T(w, s, { e: e, a: 'fade', i: i === undefined ? 0.45 : i, o: o === undefined ? 0.45 : o, p0: p0 || 0 });
    CUR = { s: s, e: e, w: w };
    return w;
  }
  /* create an element inside the current scene and track it from time s */
  const E = (cls, css, html, s, o) => T(mk(CUR.w, cls, css, html), s, o);
  const box = (l, t, w, h) => 'left:' + l + 'px;top:' + t + 'px;width:' + w + 'px;height:' + h + 'px;';
  const arStyle = (size) => 'font-size:' + size + 'px;';

  /* framed Arabic card; words are revealed between ws and we */
  function arCard(l, t, w, h, text, size, s, ws, we, o) {
    o = o || {};
    const c = E('card', box(l, t, w, h), '', s, { a: o.a || 'pop', i: 0.5, e: o.e });
    const inner = mk(c, 'inner ar arT' + (o.cls ? ' ' + o.cls : ''), 'top:0;height:100%;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0 26px;' + arStyle(size));
    const p = mk(inner, '', 'text-align:center;width:100%');
    words(p, text, '', '', ws, we);
    return c;
  }
  /* centred pill with Bengali text */
  function chip(text, top, s, o) {
    o = o || {};
    return E('abs ctr bn', 'left:' + (o.l || 0) + 'px;top:' + top + 'px;width:' + (o.w || 1080) + 'px',
      '<span class="chip ' + (o.cls || '') + '" style="position:relative;display:inline-block;' + (o.css || '') + '">' + (o.pre || '') + text + '</span>',
      s, { a: o.a || 'rise', i: 0.45, e: o.e });
  }
  /* expanding (or contracting) rings around a point */
  function rings(cx, cy, d, s, e, o) {
    o = o || {};
    const n = o.n || 3;
    const per = o.per || 2.4;
    const grow = o.grow === undefined ? 1 : o.grow;
    const wr = mk(CUR.w, 'abs', box(cx - d / 2, cy - d / 2, d, d));
    const ch = [];
    for (let k = 0; k < n; k++) ch.push(mk(wr, 'ring', 'left:0;top:0;width:100%;height:100%;' + (o.col ? 'border-color:' + o.col : '')));
    T(wr, s, {
      e: e, a: 'fade', i: 0.4, o: 0.5,
      fn: function (t, lt) {
        ch.forEach((r, k) => {
          const u = ((lt / per) + k / n) % 1;
          if (o.inward) {
            r.style.transform = 'scale(' + (1 + grow * (1 - u)).toFixed(3) + ')';
            r.style.opacity = (Math.sin(u * Math.PI) * (o.op || 0.8)).toFixed(3);
          } else {
            r.style.transform = 'scale(' + (1 + u * grow).toFixed(3) + ')';
            r.style.opacity = ((1 - u) * (o.op || 0.8)).toFixed(3);
          }
        });
      },
    });
    return wr;
  }
  /* soft glowing disc behind an object, gently pulsing */
  function glowDisc(cx, cy, d, s, e, o) {
    o = o || {};
    const col = o.col || '255,243,196';
    const el = mk(CUR.w, 'abs', box(cx - d / 2, cy - d / 2, d, d) + 'border-radius:50%;background:radial-gradient(circle,rgba(' + col + ',.7),rgba(' + col + ',0) 68%)');
    return T(el, s, { e: e, a: 'fade', i: 0.6, o: 0.5, fn: function (t, lt, x) { x.style.transform = 'scale(' + (1 + 0.07 * Math.sin(lt * 3)).toFixed(3) + ')'; } });
  }

  /* >>> SCENES <<< */
  function buildScenes() {
    const END = DURATION;
    const tShare = tw(17, 'শেয়ার');
    const tCta = ls(17) + (le(17) - ls(17)) * 0.6;
    const rotate = (rate) => function (t, lt, el) { el.firstChild.style.transform = 'rotate(' + (lt * rate).toFixed(2) + 'deg)'; };
    const pulse = (amp, rate) => function (t, lt, el) { el.firstChild.style.transform = 'scale(' + (1 + amp * Math.sin(lt * rate)).toFixed(4) + ')'; };
    const checkIcon = '<span style="display:inline-block;width:42px;height:42px;vertical-align:-7px;margin-right:12px">' + A.check() + '</span>';
    const arCenter = (size) => 'left:0;top:0;width:1080px;text-align:center;line-height:1.3;font-size:' + size + 'px;';

    /* ===== 0 · greeting (0–5 s) ===== */
    {
      const tIc = 2.7;
      const e = le(0) + 0.35;
      scene(0, e, 0.01, 0.45, 1);
      rings(540, 255, 500, 0, tIc + 0.5, { n: 3, per: 2.4, grow: 0.8, op: 0.8 });
      E('iconbox', box(300, 60, 480, 389) + 'border-radius:64px;box-shadow:0 0 0 6px #e3c26b,0 0 60px rgba(227,194,107,.55)',
        '<img src="app-icon.jpg" alt="">', 0, { a: 'pop', i: 0.9, p0: 0.5, e: tIc + 0.6, o: 0.6 });
      E('abs ar arT', 'left:40px;top:560px;width:1000px;text-align:center;font-size:88px;line-height:1.5',
        'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ', 0, { a: 'rise', i: 0.7, p0: 0.85, e: tIc + 0.4, o: 0.5 });
      E('svgbox', box(340, 790, 400, 24), A.divider(), 0, { a: 'fade', i: 0.7, p0: 0.85, e: tIc + 0.4, o: 0.5 });

      const tA = Math.max(tw(0, 'আসমান'), tIc);
      const tBani = Math.max(tw(0, 'বাণী'), tA + 0.6);
      const tNeme = Math.max(tw(0, 'নেমে'), tA + 0.8);
      glowDisc(540, 960, 760, tA, e);
      E('abs', box(330, 0, 420, 760), '<div class="fill" style="transform-origin:50% 0;transform:scaleY(0)">' + A.beam() + '</div>', tA - 0.1,
        { a: 'fade', i: 0.3, fn: function (t, lt, el) { el.firstChild.style.transform = 'scaleY(' + clamp(lt / Math.max(0.8, tNeme - tA + 0.4)).toFixed(3) + ')'; } });
      E('abs ar arT', arCenter(84) + 'top:10px', 'السَّمَاءُ', tA, { a: 'drop' });
      E('svgbox', box(820, 30, 150, 150), A.crescent(), tA, { a: 'pop' });
      E('svgbox', box(270, 780, 540, 405), A.book(), tBani - 0.1, { a: 'pop' });
      E('abs ar arT', arCenter(88) + 'top:640px', 'كَلَامُ اللَّهِ', tBani, { a: 'rise' });
    }

    /* ===== 1 · chain of narration and the question (5–15 s) ===== */
    {
      const s = ls(1);
      const e = le(1) + 0.35;
      scene(s, e);
      const names = [
        { ar: 'عَبْدُ اللَّهِ بْنُ يُوسُفَ', hon: 'رَحِمَهُ اللَّهُ', key: 'আবদুল্লাহ' },
        { ar: 'عَائِشَةُ', hon: 'رَضِيَ اللَّهُ عَنْهَا', key: 'আয়েশা' },
        { ar: 'الْحَارِثُ بْنُ هِشَامٍ', hon: 'رَضِيَ اللَّهُ عَنْهُ', key: 'হারিস' },
      ];
      const tk = names.map((n) => Math.max(s + 0.1, tw(1, n.key)));
      const tRas = Math.max(tk[2] + 0.8, tw(1, 'রাসূলুল্লাহ'));
      const tQ = Math.max(tRas + 0.8, tw(1, 'ইয়া রাসূলুল্লাহ'));
      E('abs', box(87, 100, 6, 470), '<div class="fill" style="border-radius:3px;background:linear-gradient(180deg,#f8e7ae,#a67c28);transform-origin:50% 0;transform:scaleY(0)"></div>', tk[0],
        { a: 'fade', i: 0.2, fn: function (t, lt, el) { el.firstChild.style.transform = 'scaleY(' + clamp((t - tk[0]) / Math.max(0.5, tRas - tk[0])).toFixed(3) + ')'; } });
      names.forEach((n, k) => {
        const top = 20 + k * 185;
        E('svgbox', box(62, top + 54, 52, 52), A.star8(), tk[k], { a: 'pop', i: 0.4 });
        const c = E('card', box(130, top, 850, 160), '', tk[k], { a: 'sr', i: 0.5 });
        const col = mk(c, 'inner ar', 'top:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center');
        mk(col, 'arT', 'font-size:56px;line-height:1.4', n.ar);
        mk(col, 'arT hon', 'font-size:40px;line-height:1.4', n.hon);
      });
      E('abs', box(20, 500, 1040, 380) + 'background:radial-gradient(ellipse,rgba(255,243,196,.5),rgba(255,243,196,0) 68%)', '', tRas, { a: 'fade', i: 0.6 });
      const mc = E('card', box(90, 590, 900, 200), '', tRas, { a: 'pop' });
      mk(mc, 'svgbox', 'left:28px;top:22px;width:120px;height:144px', A.dome());
      const mt = mk(mc, 'ar', 'position:absolute;left:170px;top:0;width:700px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center');
      mk(mt, 'arT', 'font-size:68px;line-height:1.3', 'رَسُولُ اللَّهِ');
      mk(mt, 'arT hon', 'font-size:44px;line-height:1.35', 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ');
      E('abs ar', 'left:660px;top:790px;width:320px;font-size:330px;line-height:1;color:rgba(227,194,107,.12);text-align:center', '؟', tQ, { a: 'fade' });
      arCard(70, 830, 940, 250, 'يَا رَسُولَ اللَّهِ، كَيْفَ يَأْتِيكَ الْوَحْيُ؟', 62, tQ, tQ + 0.3, e - 0.7);
      chip('ওহী কিভাবে আসে?', 1110, Math.max(tQ + 0.5, tw(1, 'ওহী কিভাবে')));
    }

    /* ===== 2 · the bell (15–20 s) ===== */
    {
      const s = ls(2);
      const e = le(2) + 0.35;
      scene(s, e);
      glowDisc(540, 300, 600, s, e);
      rings(540, 300, 300, s + 0.3, e, { n: 3, per: 1.3, grow: 1.4, op: 0.7 });
      E('abs', box(340, 30, 400, 480), '<div class="fill" style="transform-origin:50% 4%">' + A.bell() + '</div>', s,
        { a: 'pop', i: 0.5, fn: function (t, lt, el) { el.firstChild.style.transform = 'rotate(' + (Math.sin(lt * 9) * 16 * Math.exp(-lt * 0.35)).toFixed(2) + 'deg)'; } });
      arCard(60, 560, 960, 270, 'أَحْيَانًا يَأْتِينِي مِثْلَ صَلْصَلَةِ الْجَرَسِ', 70, s + 0.1, s + 0.3, Math.max(s + 1.6, tw(2, 'তো') - 0.1));
      chip('ঘণ্টাধ্বনির ন্যায়', 900, tw(2, 'ঘণ্টাধ্বনির'), { cls: 'solid' });
    }

    /* ===== 3 · the hardest, then memorising (20–25 s) ===== */
    {
      const s = ls(3);
      const e = le(3) + 0.35;
      scene(s, e);
      const tSam = Math.max(s + 1, tw(3, 'সমাপ্ত'));
      rings(540, 230, 400, s, tSam + 0.2, { n: 3, per: 1.1, grow: 0.9, op: 0.8, inward: true, col: 'rgba(232,154,98,.9)' });
      E('abs', box(390, 40, 300, 360), '<div class="fill">' + A.bell() + '</div>', s,
        { a: 'fade', i: 0.3, e: tSam + 0.3, o: 0.4, fn: function (t, lt, el) { el.firstChild.style.transform = 'translateX(' + (Math.sin(lt * 53) * 5).toFixed(2) + 'px) rotate(' + (Math.sin(lt * 38) * 5).toFixed(2) + 'deg)'; } });
      glowDisc(540, 230, 520, tSam, e);
      E('svgbox', box(360, 90, 360, 270), A.book(), tSam, { a: 'pop', i: 0.5 });
      const R3 = rng(31);
      for (let k = 0; k < 6; k++) {
        const x0 = 60 + R3() * 960;
        const y0 = 20 + R3() * 380;
        E('svgbox', box(0, 0, 46, 46), A.sparkle(), tSam, {
          a: 'fade', i: 0.2,
          fn: function (t, lt, el) {
            const u = ((lt * 0.7) + k / 6) % 1;
            el.style.left = (x0 + (520 - x0) * u).toFixed(1) + 'px';
            el.style.top = (y0 + (205 - y0) * u).toFixed(1) + 'px';
            el.style.transform = 'scale(' + (1 - u * 0.6).toFixed(3) + ')';
          },
        });
      }
      arCard(60, 440, 960, 300, 'وَهُوَ أَشَدُّهُ عَلَيَّ، فَيُفْصَمُ عَنِّي وَقَدْ وَعَيْتُ عَنْهُ مَا قَالَ', 56, s + 0.1, s + 0.4, e - 0.7);
      chip('সবচাইতে কষ্টদায়ক', 800, tw(3, 'সবচাইতে'), { cls: 'warn' });
      chip('মুখস্ত করে নিই', 900, tw(3, 'মুখস্ত'), { cls: 'solid', pre: checkIcon });
    }

    /* ===== 4–5 · the angel in human form, memorising (25–32 s) ===== */
    {
      const s = ls(4);
      const s5 = ls(5);
      const e = le(5) + 0.35;
      scene(s, e);
      const tMan = Math.max(s + 0.8, tw(4, 'মানুষের'));
      const tKatha = Math.max(tMan + 0.4, tw(4, 'কথা'));
      glowDisc(540, 240, 560, s, e);
      E('svgbox', box(390, 20, 300, 450), A.arch(), s, { a: 'rise', i: 0.7 });
      const lab = 'left:390px;top:200px;width:300px;text-align:center;font-size:72px;line-height:1.3';
      E('abs ar arT', lab, 'الْمَلَكُ', s + 0.3, { a: 'pop', e: tMan + 0.3, o: 0.35 });
      E('abs ar arT', lab, 'رَجُلًا', tMan, { a: 'pop' });
      E('svgbox', box(710, 170, 120, 150), A.speak(), tKatha, {
        a: 'fade', i: 0.3,
        fn: function (t, lt, el) {
          el.querySelectorAll('path').forEach((p, k) => { p.style.opacity = (0.25 + 0.75 * Math.max(0, Math.sin(lt * 5 - k * 0.9))).toFixed(3); });
        },
      });
      E('svgbox', box(740, 300, 260, 195), A.book(), s5, { a: 'pop' });
      arCard(60, 520, 960, 250, 'وَأَحْيَانًا يَتَمَثَّلُ لِيَ الْمَلَكُ رَجُلًا فَيُكَلِّمُنِي', 60, s + 0.1, s + 0.4, le(4) - 0.4, { e: s5 + 0.25 });
      arCard(60, 520, 960, 250, 'فَأَعِي مَا يَقُولُ', 84, s5, s5 + 0.35, e - 0.8);
      chip('ফেরেশতা মানুষের আকৃতিতে', 820, tMan, { e: s5 + 0.2 });
      chip('মুখস্ত করে ফেলি', 820, Math.max(s5 + 0.3, tw(5, 'মুখস্ত')), { cls: 'solid', pre: checkIcon });
    }

    /* ===== 6–7 · Aisha, the cold day, the sweat (32–40 s) ===== */
    {
      const s = ls(6);
      const s7 = ls(7);
      const e = le(7) + 0.35;
      scene(s, e);
      const tCold = Math.max(s + 0.5, tw(6, 'প্রচণ্ড'));
      const aish = E('card', box(130, 10, 820, 150), '', Math.max(s + 0.1, tw(6, 'আয়েশা')), { a: 'drop' });
      const ai = mk(aish, 'inner ar', 'top:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center');
      mk(ai, 'arT', 'font-size:56px;line-height:1.4', 'قَالَتْ عَائِشَةُ');
      mk(ai, 'arT hon', 'font-size:40px;line-height:1.4', 'رَضِيَ اللَّهُ عَنْهَا');
      E('abs', box(190, 130, 700, 700) + 'border-radius:50%;background:radial-gradient(circle,rgba(110,175,255,.45),rgba(110,175,255,0) 68%)', '', tCold, { a: 'fade', e: s7 + 0.3 });
      E('abs', box(340, 220, 400, 400), '<div class="fill">' + A.crystal() + '</div>', tCold, { a: 'pop', e: s7 + 0.3, fn: rotate(18) });
      const R6 = rng(61);
      const snow = [];
      const snowWrap = E('abs', box(0, 0, 1080, 700), '', tCold, {
        a: 'fade', e: s7 + 0.3,
        fn: function (t, lt) {
          snow.forEach((q) => {
            const y = (q.y0 + lt * q.v) % 720;
            const x = q.x + Math.sin(lt * 1.3 + q.ph) * 24;
            q.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
          });
        },
      });
      for (let k = 0; k < 16; k++) {
        const sz = 8 + R6() * 12;
        snow.push({ el: mk(snowWrap, 'abs', 'left:0;top:0;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:rgba(235,246,255,.9)'), x: 60 + R6() * 960, y0: R6() * 720, v: 60 + R6() * 80, ph: R6() * 6.28 });
      }
      arCard(50, 680, 980, 280, 'وَلَقَدْ رَأَيْتُهُ يَنْزِلُ عَلَيْهِ الْوَحْيُ فِي الْيَوْمِ الشَّدِيدِ الْبَرْدِ', 54, s + 0.3, s + 0.6, s7 - 0.5, { e: s7 + 0.25 });
      chip('প্রচণ্ড শীতের দিন', 1010, Math.max(tCold, tw(6, 'শীতের')), { e: s7 + 0.25 });
      /* line 7: the sweat */
      E('abs', box(240, 40, 600, 600) + 'border-radius:50%;background:radial-gradient(circle,rgba(255,243,196,.5),rgba(255,243,196,0) 68%)', '', s7, { a: 'fade' });
      E('abs', box(440, 200, 200, 267), '<div class="fill">' + A.drop() + '</div>', s7, { a: 'pop', fn: pulse(0.06, 4) });
      const R7 = rng(77);
      const dr = [];
      const dw = E('abs', box(0, 0, 1080, 680), '', s7, {
        a: 'fade',
        fn: function (t, lt) {
          dr.forEach((q) => { q.el.style.transform = 'translate(' + q.x.toFixed(1) + 'px,' + (((q.y0 + lt * q.v) % 760) - 60).toFixed(1) + 'px)'; });
        },
      });
      for (let k = 0; k < 8; k++) {
        const sz = 36 + R7() * 30;
        dr.push({ el: mk(dw, 'abs', 'left:0;top:0;width:' + sz + 'px;height:' + (sz * 1.33).toFixed(1) + 'px', A.drop()), x: 80 + R7() * 880, y0: R7() * 760, v: 150 + R7() * 160 });
      }
      arCard(50, 680, 980, 280, 'فَيَفْصِمُ عَنْهُ وَإِنَّ جَبِينَهُ لَيَتَفَصَّدُ عَرَقًا', 54, s7, s7 + 0.3, e - 0.6);
      chip('ঘাম ঝরে পড়ত', 1010, Math.max(s7 + 0.3, tw(7, 'ঘাম')));
    }

    /* ===== 8 · the source (40–42 s) ===== */
    {
      const s = ls(8);
      const e = le(8) + 0.35;
      scene(s, e);
      const cv = E('card', box(230, 40, 620, 880) + 'background:linear-gradient(160deg,#0f6b3f,#06301f);border:6px solid #e3c26b;border-radius:30px;box-shadow:0 0 70px rgba(227,194,107,.4),inset 0 0 60px rgba(0,0,0,.35)', '', s, { a: 'pop', i: 0.5 });
      mk(cv, 'svgbox', 'left:14px;top:14px;width:90px;height:90px', A.corner());
      mk(cv, 'svgbox', 'left:504px;top:14px;width:90px;height:90px;transform:scaleX(-1)', A.corner());
      mk(cv, 'svgbox', 'left:14px;top:764px;width:90px;height:90px;transform:scaleY(-1)', A.corner());
      mk(cv, 'svgbox', 'left:504px;top:764px;width:90px;height:90px;transform:scale(-1,-1)', A.corner());
      mk(cv, 'svgbox', 'left:130px;top:100px;width:340px;height:340px;opacity:.95', A.medallion());
      mk(cv, 'svgbox', 'left:240px;top:210px;width:120px;height:120px', A.star8());
      mk(cv, 'abs ar arT', 'left:0;top:480px;width:100%;text-align:center;font-size:84px;line-height:1.3', 'صَحِيحُ الْبُخَارِيِّ');
      mk(cv, 'svgbox', 'left:100px;top:630px;width:400px;height:24px', A.divider());
      mk(cv, 'abs ar', 'left:50px;top:690px;width:500px;height:110px;border-radius:16px;background:linear-gradient(180deg,#f8e7ae,#e3c26b 60%,#a67c28);color:#2c2006;font-size:66px;display:flex;align-items:center;justify-content:center', 'حَدِيثٌ رَقْمُ ٢');
      chip('সহীহ বুখারি, হাদিস নং ২', 960, s + 0.4);
    }

    /* ===== 9–11 · reflection (42–54 s) ===== */
    {
      const s = ls(9);
      const s10 = ls(10);
      const s11 = ls(11);
      const e = le(11) + 0.35;
      scene(s, e);
      /* A — think: cold vs sweat */
      const eA = s10 + 0.3;
      glowDisc(540, 190, 480, s, eA);
      E('abs', box(400, 10, 280, 350), '<div class="fill">' + A.bulb() + '</div>', s + 0.15, { a: 'pop', e: eA, fn: pulse(0.04, 4) });
      const tCold = Math.max(s + 0.5, tw(9, 'প্রচণ্ড'));
      const tSweat = Math.max(tCold + 0.5, tw(9, 'ঘাম'));
      E('abs', box(110, 430, 300, 300), '<div class="fill">' + A.crystal() + '</div>', tCold, { a: 'pop', e: eA, fn: rotate(18) });
      E('svgbox', box(500, 540, 80, 80), A.sparkle(), tSweat, { a: 'pop', e: eA });
      E('abs', box(700, 440, 220, 293), '<div class="fill">' + A.drop() + '</div>', tSweat, { a: 'pop', e: eA });
      chip('প্রচণ্ড শীত', 790, tCold + 0.1, { l: 60, w: 440, e: eA });
      chip('ঘাম ঝরছে', 790, tSweat + 0.1, { l: 580, w: 440, e: eA, cls: 'warn' });
      /* B — how heavy */
      const eB = s11 + 0.3;
      rings(540, 400, 460, s10, eB, { n: 3, per: 1.0, grow: 0.8, op: 0.8, inward: true, col: 'rgba(232,154,98,.9)' });
      const wc = E('card', box(240, 250, 600, 300), '', s10 + 0.1, { a: 'pop', e: eB, fn: function (t, lt, el) { el.firstChild.style.transform = 'translateX(' + (Math.sin(lt * 45) * 4).toFixed(2) + 'px)'; } });
      mk(wc, 'inner ar arT', 'top:0;height:100%;display:flex;align-items:center;justify-content:center;font-size:120px', 'الْوَحْيُ');
      const chs = [];
      const cw = E('abs', box(490, 20, 100, 200), '', s10, {
        a: 'fade', e: eB,
        fn: function (t, lt) { chs.forEach((c, k) => { c.style.opacity = (0.15 + 0.85 * Math.max(0, Math.sin(lt * 6 - k * 0.9))).toFixed(3); }); },
      });
      for (let k = 0; k < 3; k++) chs.push(mk(cw, 'svgbox', box(0, k * 66, 100, 60), A.chevron()));
      chip('কতটা কষ্টের ছিল!', 640, Math.max(s10 + 0.4, tw(10, 'কতটা')), { cls: 'warn', e: eB });
      /* C — sky and earth */
      E('abs', box(20, 20, 1040, 120), A.sky(), s11, { a: 'drop' });
      E('abs ar arT', arCenter(62) + 'top:34px', 'السَّمَاءُ', s11 + 0.2, { a: 'drop' });
      E('abs', box(20, 1060, 1040, 120), A.dunes(), s11, { a: 'rise' });
      E('abs ar arT', arCenter(62) + 'top:1074px', 'الْأَرْضُ', s11 + 0.2, { a: 'rise' });
      const tIn = Math.max(s11 + 0.6, tw(11, 'ভেতরে'));
      E('abs', box(340, 140, 400, 920), '<div class="fill" style="transform-origin:50% 0">' + A.beam() + '</div>', tIn,
        { a: 'fade', i: 0.3, fn: function (t, lt, el) { el.firstChild.style.transform = 'scaleY(' + clamp(lt / 1.0).toFixed(3) + ')'; } });
      for (let k = 0; k < 6; k++) {
        E('svgbox', box(0, 0, 40, 40), A.sparkle(), tIn + 0.3, {
          a: 'fade', i: 0.2,
          fn: function (t, lt, el) {
            el.style.left = (430 + (k % 3) * 100 + Math.sin(lt * 2 + k) * 14).toFixed(1) + 'px';
            el.style.top = (150 + ((lt * 260 + k * 150) % 880)).toFixed(1) + 'px';
          },
        });
      }
      chip('বাইরে থেকে চুপ', 330, Math.max(s11 + 0.4, tw(11, 'চুপ')));
      chip('ভেতরে আসমান আর জমিনের সংযোগ', 720, Math.max(tIn + 0.2, tw(11, 'আসমান')), { cls: 'solid' });
    }

    /* ===== 12 · the Quran (54–58 s) ===== */
    {
      const s = ls(12);
      const e = le(12) + 0.35;
      scene(s, e);
      glowDisc(540, 490, 900, s, e);
      E('abs', box(90, 40, 900, 900), '<div class="fill">' + A.burst() + '</div>', s, { a: 'fade', i: 0.8, fn: rotate(8) });
      E('abs ar arT', arCenter(150) + 'top:10px', 'الْقُرْآنُ', s + 0.2, { a: 'rise' });
      E('svgbox', box(160, 205, 760, 570), A.book(), s + 0.1, { a: 'pop' });
      chip('আমরা কোরআন পেয়েছি', 860, Math.max(s + 0.6, tw(12, 'কোরআন')), { cls: 'solid' });
    }

    /* ===== 13 · the great trust (58–63 s) ===== */
    {
      const s = ls(13);
      const e = le(13) + 0.35;
      scene(s, e);
      const tAm = Math.max(s + 0.6, tw(13, 'আমানত'));
      const tMt = Math.max(tAm + 0.8, tw(13, 'পাহাড়ও'));
      glowDisc(540, 170, 520, s, e);
      E('svgbox', box(380, 40, 320, 240), A.book(), s, { a: 'pop' });
      arCard(240, 330, 600, 200, 'أَمَانَةٌ', 112, tAm, tAm + 0.1, tAm + 0.4);
      E('abs', box(90, 590, 900, 390), '<div class="fill">' + A.mountains() + '</div>', tMt - 0.2, {
        a: 'rise', i: 0.8,
        fn: function (t, lt, el) { el.firstChild.style.transform = 'translate(' + (Math.sin(lt * 38) * 4).toFixed(2) + 'px,' + (Math.sin(lt * 47) * 2).toFixed(2) + 'px)'; },
      });
      chip('পাহাড়ও ভয় পেত', 1030, Math.max(tMt + 0.3, tw(13, 'ভয়')), { cls: 'warn' });
    }

    /* ===== 14–16 · pause, think, love the Quran (63–76 s) ===== */
    {
      const s = ls(14);
      const s15 = ls(15);
      const s16 = ls(16);
      const e = le(16) + 0.35;
      scene(s, e);
      /* A — one second pause */
      const eA = s15 + 0.3;
      const tAy = Math.max(s + 0.4, tw(14, 'আয়াত'));
      const tSec = Math.max(tAy + 0.6, tw(14, 'এক সেকেন্ড'));
      E('svgbox', box(340, 20, 400, 300), A.book(), s, { a: 'pop', e: eA });
      arCard(390, 340, 300, 130, 'آيَةٌ', 80, tAy, tAy + 0.1, tAy + 0.4, { e: eA });
      E('abs', box(380, 520, 320, 373),
        '<div class="fill">' + A.stopwatch() + '</div><div class="fill"><svg viewBox="0 0 120 140" width="100%" height="100%"><circle cx="60" cy="78" r="40" fill="none" stroke="#f8e7ae" stroke-width="9" stroke-linecap="round" transform="rotate(-90 60 78)" stroke-dasharray="0 251.3"/></svg></div>',
        tSec - 0.1, {
          a: 'pop', e: eA,
          fn: function (t, lt, el) { el.lastChild.querySelector('circle').setAttribute('stroke-dasharray', (clamp((lt - 0.1) / 1.0) * 251.3).toFixed(1) + ' 251.3'); },
        });
      E('svgbox', box(480, 667, 120, 120), A.pause(), tSec + 1.1, { a: 'pop', e: eA });
      chip('এক সেকেন্ড থামুন', 940, tSec, { cls: 'solid', e: eA });
      /* B — think how hard it was */
      const eB = s16 + 0.3;
      E('abs', box(440, 10, 200, 250), '<div class="fill">' + A.bulb() + '</div>', s15, { a: 'pop', e: eB, fn: pulse(0.04, 4) });
      chip('ভাবুন', 290, s15 + 0.2, { cls: 'solid', e: eB });
      glowDisc(540, 590, 640, s15 + 0.3, eB);
      E('svgbox', box(290, 470, 500, 375), A.book(), s15 + 0.3, { a: 'pop', e: eB });
      const dwB = E('abs', box(0, 0, 1080, 800), '', s15 + 0.5, {
        a: 'fade', e: eB,
        fn: function (t, lt) {
          dwB.childNodes.forEach((d, k) => { d.style.transform = 'translate(' + (420 + k * 120) + 'px,' + (380 + ((lt * 130 + k * 70) % 190)).toFixed(1) + 'px)'; });
        },
      });
      for (let k = 0; k < 3; k++) mk(dwB, 'abs', 'left:0;top:0;width:50px;height:67px', A.drop());
      chip('রসূলকে কতটা কষ্ট সহ্য করতে হয়েছে', 880, Math.max(s15 + 0.6, tw(15, 'রসূলকে')), { e: eB });
      /* C — love the Quran */
      glowDisc(540, 190, 500, s16, e);
      E('abs', box(400, 60, 280, 252), '<div class="fill">' + A.heart() + '</div>', s16, { a: 'pop', fn: pulse(0.07, 5) });
      [[300, 80], [740, 100], [260, 240], [790, 250], [540, 10]].forEach((p, k) => {
        E('svgbox', box(p[0], p[1], 56, 56), A.sparkle(), s16 + 0.3 + k * 0.15, { a: 'pop' });
      });
      E('svgbox', box(290, 420, 500, 375), A.book(), s16 + 0.2, { a: 'pop' });
      E('abs ar arT', arCenter(100) + 'top:820px', 'الْقُرْآنُ', s16 + 0.4, { a: 'rise' });
      chip('এটা এমনি এমনি আসেনি', 1010, Math.max(s16 + 0.8, tw(16, 'এটা')));
    }

    /* ===== 17 · final call to action (76–91 s) ===== */
    {
      const s = ls(17);
      scene(s, END);
      rings(540, 218, 480, s, END, { n: 3, per: 2.4, grow: 0.8 });
      glowDisc(540, 218, 640, s, END);
      E('iconbox', box(320, 40, 440, 357) + 'border-radius:60px;box-shadow:0 0 0 6px #e3c26b,0 0 60px rgba(227,194,107,.55)', '<img src="app-icon.jpg" alt="">', s, { a: 'pop', i: 0.7 });
      E('abs ctr bn', 'left:60px;top:420px;width:960px;font-size:60px;line-height:1.3;color:#f8e7ae;text-shadow:0 2px 10px rgba(0,0,0,.6)', 'ইসলামী বিশ্বকোষ ও আল হাদিস S2', s + 0.3, { a: 'rise' });
      /* phase 1 — today's hadith */
      const p1e = Math.max(s + 2, tShare - 0.2);
      E('abs ctr bn', 'left:0;top:650px;width:1080px;font-size:84px;color:#fff6dc;text-shadow:0 2px 10px rgba(0,0,0,.6)', 'আজকের হাদিস', s + 0.5, { a: 'rise', e: p1e });
      E('svgbox', box(340, 780, 400, 24), A.divider(), s + 0.7, { e: p1e });
      chip('সহীহ বুখারি, হাদিস নং ২', 840, s + 0.9, { e: p1e });
      /* phase 2 — like, comment, share */
      const p2s = p1e;
      const p2e = Math.max(p2s + 1.5, tCta);
      [
        { ic: A.like(), lab: 'লাইক', l: 130, gold: false },
        { ic: A.comment(), lab: 'কমেন্ট', l: 445, gold: false },
        { ic: A.share('#3a2a08'), lab: 'শেয়ার', l: 760, gold: true },
      ].forEach((b, k) => {
        E('abs', box(b.l, 650, 190, 190) + 'border-radius:50%;box-sizing:border-box;border:5px solid #e3c26b;box-shadow:0 0 36px rgba(227,194,107,.4);background:' +
          (b.gold ? 'linear-gradient(180deg,#f8e7ae,#e3c26b 55%,#a67c28)' : 'rgba(4,32,27,.85)'),
        '<div class="svgbox" style="left:46px;top:46px;width:88px;height:88px">' + b.ic + '</div>', p2s + k * 0.25, { a: 'pop', e: p2e });
        E('abs ctr bn', box(b.l - 20, 860, 230, 60) + 'font-size:38px;color:#f8e7ae', b.lab, p2s + k * 0.25 + 0.1, { a: 'rise', e: p2e });
      });
      rings(855, 745, 190, p2s + 0.5, p2e, { n: 2, per: 1.2, grow: 0.5, op: 0.9 });
      chip('অন্যকে জানার সুযোগ করে দিন', 960, p2s + 0.5, { cls: 'solid', e: p2e });
      /* phase 3 — install */
      chip('আজই প্লে স্টোর থেকে ইনষ্টল করুন', 620, tCta, { cls: 'solid', css: 'font-size:46px;padding:14px 44px' });
      E('abs', box(490, 730, 100, 100), '<div class="fill">' + A.arrowDown() + '</div>', tCta + 0.3, {
        a: 'fade', fn: function (t, lt, el) { el.firstChild.style.transform = 'translateY(' + (Math.sin(lt * 5) * 10).toFixed(1) + 'px)'; },
      });
      E('abs', box(260, 850, 560, 161), '<div class="badge" style="left:0;top:0"><img src="google-play-badge.jpg" alt=""></div>', tCta + 0.5, { a: 'pop', fn: pulse(0.03, 4) });
    }

    buildAccent([{ t: tCta, c: ACC.store }]);
  }

  /* ---------- start-up ---------- */
  window.renderAt = function (t) {
    t = Math.max(0, t);
    for (let k = 0; k < BGU.length; k++) BGU[k](t);
    renderTracks(t);
  };

  (async function init() {
    document.body.insertAdjacentHTML('afterbegin', A.defs);
    buildBg();
    buildHud();
    buildScenes();
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
    try { await Promise.all(Array.from(document.images).map((im) => (im.decode ? im.decode().catch(() => {}) : null))); } catch (e) { /* ignore */ }
    fitSubs();
    window.renderAt(0);
    /* preview in a normal browser: open index.html?play and click once (never used by the renderer) */
    const sc = Math.min(window.innerWidth / W, window.innerHeight / H);
    if (Math.abs(sc - 1) > 0.001) $('video').style.transform = 'scale(' + sc + ')';
    if (/[?&]play/.test(location.search)) {
      document.body.addEventListener('click', function () {
        const au = new Audio('audio.mp3');
        au.play();
        (function loop() { window.renderAt(au.currentTime); requestAnimationFrame(loop); })();
      }, { once: true });
    }
    window.__ready = true;
  })();
})();
