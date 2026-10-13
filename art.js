/* art.js — all vector art is drawn here as inline SVG strings (no external images except the icon and badge). */
'use strict';
const A = (function () {
  const GOLD = '#e3c26b', GOLDL = '#f8e7ae', GOLDD = '#a67c28', CREAM = '#fff6dc';
  const svg = (vb, inner, extra) =>
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="100%" height="100%" ' + (extra || '') + '>' + inner + '</svg>';

  function starPts(cx, cy, R, r, n, rot) {
    const p = [];
    const a0 = rot === undefined ? -Math.PI / 2 : rot;
    for (let i = 0; i < n * 2; i++) {
      const a = a0 + (i * Math.PI) / n;
      const rr = i % 2 ? r : R;
      p.push((cx + Math.cos(a) * rr).toFixed(2) + ',' + (cy + Math.sin(a) * rr).toFixed(2));
    }
    return p.join(' ');
  }

  /* shared gradients: injected once into the page */
  const defs =
    '<svg width="0" height="0" style="position:absolute"><defs>' +
    '<linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8e7ae"/><stop offset=".5" stop-color="#e3c26b"/><stop offset="1" stop-color="#a67c28"/></linearGradient>' +
    '<linearGradient id="gGoldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a67c28"/><stop offset=".5" stop-color="#f8e7ae"/><stop offset="1" stop-color="#a67c28"/></linearGradient>' +
    '<linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ee8ab"/><stop offset=".55" stop-color="#22a360"/><stop offset="1" stop-color="#0d5a35"/></linearGradient>' +
    '<linearGradient id="gPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dc"/><stop offset="1" stop-color="#ecd79b"/></linearGradient>' +
    '<linearGradient id="gIce" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9fd8ff"/></linearGradient>' +
    '<linearGradient id="gDrop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#7fc7e8"/></linearGradient>' +
    '<linearGradient id="gRose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8aa0"/><stop offset="1" stop-color="#a6213f"/></linearGradient>' +
    '<linearGradient id="gStone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a6d63"/><stop offset="1" stop-color="#10302a"/></linearGradient>' +
    '<linearGradient id="gStone2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5148"/><stop offset="1" stop-color="#0a221d"/></linearGradient>' +
    '<linearGradient id="gBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6dc" stop-opacity=".95"/><stop offset=".55" stop-color="#f8e7ae" stop-opacity=".38"/><stop offset="1" stop-color="#f8e7ae" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1f3d"/><stop offset="1" stop-color="#145c4b"/></linearGradient>' +
    '<linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9a45a"/><stop offset="1" stop-color="#6e5222"/></linearGradient>' +
    '<radialGradient id="rGlow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".95"/><stop offset=".45" stop-color="#f8e7ae" stop-opacity=".35"/><stop offset="1" stop-color="#f8e7ae" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="rLamp"><stop offset="0" stop-color="#fff3c4"/><stop offset=".6" stop-color="#ffc857"/><stop offset="1" stop-color="#b9772a"/></radialGradient>' +
    '<mask id="mCres"><rect width="100" height="100" fill="#fff"/><circle cx="64" cy="40" r="36" fill="#000"/></mask>' +
    '</defs></svg>';

  const A = { defs, starPts, GOLD, GOLDL, GOLDD, CREAM };

  /* 8-point star (rub-el-hizb: two squares) */
  A.star8 = (fill, stroke) =>
    svg('0 0 100 100', '<polygon points="' + starPts(50, 50, 48, 36.7, 8) + '" fill="' + (fill || 'url(#gGold)') + '" stroke="' + (stroke || 'none') + '" stroke-width="1.5" stroke-linejoin="round"/>');

  /* large star medallion (rotated by the page) */
  A.medallion = () => {
    let g = '';
    g += '<circle cx="50" cy="50" r="49" /><circle cx="50" cy="50" r="46" />';
    g += '<polygon points="' + starPts(50, 50, 45, 34.4, 8) + '"/>';
    g += '<polygon points="' + starPts(50, 50, 45, 34.4, 8, -Math.PI / 2 + Math.PI / 8) + '"/>';
    g += '<circle cx="50" cy="50" r="30" />';
    g += '<polygon points="' + starPts(50, 50, 30, 23, 8) + '"/>';
    g += '<polygon points="' + starPts(50, 50, 22, 12, 16) + '"/>';
    g += '<circle cx="50" cy="50" r="9" />';
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8;
      g += '<line x1="' + (50 + Math.cos(a) * 46).toFixed(1) + '" y1="' + (50 + Math.sin(a) * 46).toFixed(1) + '" x2="' + (50 + Math.cos(a) * 49).toFixed(1) + '" y2="' + (50 + Math.sin(a) * 49).toFixed(1) + '"/>';
    }
    return svg('0 0 100 100', '<g fill="none" stroke="' + GOLD + '" stroke-width=".55">' + g + '</g>');
  };

  /* repeating star pattern tile as a CSS url() value */
  A.patternTile = () => {
    const tile =
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><g fill="none" stroke="' + GOLD + '" stroke-width="1.1">' +
      '<polygon points="' + starPts(60, 60, 34, 26, 8) + '"/>' +
      '<circle cx="60" cy="60" r="13"/>' +
      '<polygon points="' + starPts(0, 0, 34, 26, 8) + '"/><polygon points="' + starPts(120, 0, 34, 26, 8) + '"/>' +
      '<polygon points="' + starPts(0, 120, 34, 26, 8) + '"/><polygon points="' + starPts(120, 120, 34, 26, 8) + '"/>' +
      '<path d="M60 0 L66 6 L60 12 L54 6Z M60 108 L66 114 L60 120 L54 114Z M0 60 L6 54 L12 60 L6 66Z M108 60 L114 54 L120 60 L114 66Z"/>' +
      '</g></svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(tile) + '")';
  };

  A.crescent = () => svg('0 0 100 100', '<circle cx="50" cy="50" r="40" fill="url(#gGold)" mask="url(#mCres)"/>');

  /* hanging lantern (fanous); thread starts at the top edge */
  A.lantern = () =>
    svg('0 0 80 200',
      '<line x1="40" y1="0" x2="40" y2="34" stroke="' + GOLD + '" stroke-width="2"/>' +
      '<circle cx="40" cy="36" r="5" fill="none" stroke="' + GOLD + '" stroke-width="2.5"/>' +
      '<path d="M22 62 L28 44 H52 L58 62Z" fill="url(#gGold)"/>' +
      '<path d="M14 62 H66 L60 70 H20Z" fill="' + GOLDD + '"/>' +
      '<path d="M20 70 H60 C66 96 62 118 52 134 H28 C18 118 14 96 20 70Z" fill="url(#rLamp)" stroke="' + GOLD + '" stroke-width="2.5"/>' +
      '<path d="M40 70 V134 M30 70 C27 96 28 118 33 134 M50 70 C53 96 52 118 47 134" stroke="' + GOLDD + '" stroke-width="2" fill="none"/>' +
      '<path d="M26 134 H54 L50 144 H30Z" fill="url(#gGold)"/>' +
      '<path d="M40 144 L36 168 H44Z" fill="' + GOLD + '"/><circle cx="40" cy="172" r="5" fill="' + GOLD + '"/>');

  /* mosque skyline silhouette (domes and minarets) */
  A.skyline = () => {
    const col = '#031a14';
    let s = '';
    const minaret = (x, w, h) => {
      const top = 200 - h;
      return '<rect x="' + (x - w / 2) + '" y="' + top + '" width="' + w + '" height="' + h + '" fill="' + col + '"/>' +
        '<rect x="' + (x - w * 0.9) + '" y="' + (top + h * 0.28) + '" width="' + w * 1.8 + '" height="7" rx="3" fill="' + col + '"/>' +
        '<path d="M' + (x - w * 0.65) + ' ' + top + ' Q' + x + ' ' + (top - 40) + ' ' + (x + w * 0.65) + ' ' + top + 'Z" fill="' + col + '"/>' +
        '<line x1="' + x + '" y1="' + (top - 30) + '" x2="' + x + '" y2="' + (top - 48) + '" stroke="' + col + '" stroke-width="2.5"/>' +
        '<circle cx="' + x + '" cy="' + (top - 50) + '" r="3.5" fill="' + col + '"/>';
    };
    const dome = (cx, w, h, base) =>
      '<path d="M' + (cx - w / 2) + ' ' + base + ' C' + (cx - w / 2) + ' ' + (base - h * 1.15) + ' ' + (cx - w * 0.2) + ' ' + (base - h) + ' ' + cx + ' ' + (base - h) +
      ' C' + (cx + w * 0.2) + ' ' + (base - h) + ' ' + (cx + w / 2) + ' ' + (base - h * 1.15) + ' ' + (cx + w / 2) + ' ' + base + 'Z" fill="' + col + '"/>' +
      '<line x1="' + cx + '" y1="' + (base - h) + '" x2="' + cx + '" y2="' + (base - h - 22) + '" stroke="' + col + '" stroke-width="3"/>' +
      '<circle cx="' + cx + '" cy="' + (base - h - 24) + '" r="4" fill="' + col + '"/>';
    s += '<rect x="0" y="150" width="1080" height="50" fill="' + col + '"/>';
    s += dome(540, 300, 92, 150) + dome(380, 130, 52, 150) + dome(700, 130, 52, 150);
    s += dome(250, 90, 38, 150) + dome(830, 90, 38, 150);
    s += '<rect x="400" y="130" width="280" height="22" fill="' + col + '"/>';
    s += minaret(90, 20, 150) + minaret(160, 16, 112) + minaret(920, 16, 112) + minaret(990, 20, 150);
    s += '<rect x="30" y="170" width="1020" height="30" fill="' + col + '"/>';
    return svg('0 0 1080 200', s, 'preserveAspectRatio="none"');
  };

  /* green dome with finial */
  A.dome = () =>
    svg('0 0 100 120',
      '<rect x="22" y="76" width="56" height="30" fill="#e8d49a" stroke="' + GOLDD + '" stroke-width="2"/>' +
      '<path d="M34 106 V92 Q34 84 41 84 Q48 84 48 92 V106Z M52 106 V92 Q52 84 59 84 Q66 84 66 92 V106Z" fill="#7a5d20"/>' +
      '<path d="M18 78 C18 44 36 30 50 30 C64 30 82 44 82 78Z" fill="url(#gGreen)" stroke="' + GOLDD + '" stroke-width="2"/>' +
      '<path d="M50 30 V78 M42 32 C36 44 34 60 33 78 M58 32 C64 44 66 60 67 78 M34 38 C26 50 24 64 24 78 M66 38 C74 50 76 64 76 78" stroke="#0d5a35" stroke-width="1.3" fill="none" opacity=".7"/>' +
      '<line x1="50" y1="30" x2="50" y2="12" stroke="' + GOLD + '" stroke-width="3"/>' +
      '<circle cx="50" cy="10" r="4.5" fill="url(#gGold)"/>');

  /* open book */
  A.book = () => {
    let lines = '';
    for (let i = 0; i < 5; i++) {
      const y = 46 + i * 14;
      lines += '<path d="M20 ' + y + ' Q30 ' + (y - 4) + ' 40 ' + y + ' T60 ' + y + ' T82 ' + y + '" />';
      lines += '<path d="M118 ' + y + ' Q128 ' + (y - 4) + ' 138 ' + y + ' T158 ' + y + ' T180 ' + y + '" />';
    }
    return svg('0 0 200 150',
      '<path d="M4 124 C40 114 80 116 100 130 C120 116 160 114 196 124 L196 134 C160 124 120 126 100 140 C80 126 40 124 4 134Z" fill="' + GOLDD + '"/>' +
      '<path d="M100 30 C80 18 40 16 8 26 L8 120 C40 110 80 112 100 126Z" fill="url(#gPaper)" stroke="' + GOLDD + '" stroke-width="2"/>' +
      '<path d="M100 30 C120 18 160 16 192 26 L192 120 C160 110 120 112 100 126Z" fill="url(#gPaper)" stroke="' + GOLDD + '" stroke-width="2"/>' +
      '<path d="M100 30 V126" stroke="' + GOLDD + '" stroke-width="2.5"/>' +
      '<g fill="none" stroke="' + GOLDD + '" stroke-width="2" opacity=".55" stroke-linecap="round">' + lines + '</g>');
  };

  /* bell (al-jaras) */
  A.bell = () =>
    svg('0 0 100 120',
      '<circle cx="50" cy="12" r="7" fill="none" stroke="' + GOLD + '" stroke-width="4"/>' +
      '<path d="M50 18 C34 18 28 34 26 56 C25 70 20 82 12 92 L88 92 C80 82 75 70 74 56 C72 34 66 18 50 18Z" fill="url(#gGold)" stroke="' + GOLDD + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M36 30 C32 44 32 60 30 74" stroke="#fff6dc" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>' +
      '<path d="M16 86 H84" stroke="' + GOLDD + '" stroke-width="3"/>' +
      '<circle cx="50" cy="99" r="9" fill="url(#gGold)" stroke="' + GOLDD + '" stroke-width="2"/>');

  /* ice crystal (cold) */
  A.crystal = () => {
    let g = '';
    for (let k = 0; k < 6; k++) {
      g += '<g transform="rotate(' + k * 60 + ' 50 50)"><path d="M50 50 V6 M50 22 L38 10 M50 22 L62 10 M50 34 L41 26 M50 34 L59 26"/></g>';
    }
    return svg('0 0 100 100',
      '<circle cx="50" cy="50" r="46" fill="url(#rGlow)" opacity=".45"/>' +
      '<g stroke="url(#gIce)" stroke-width="3.4" stroke-linecap="round" fill="none">' + g + '</g>' +
      '<polygon points="' + starPts(50, 50, 11, 11, 6, 0) + '" fill="#e8f6ff" stroke="#9fd8ff" stroke-width="1.5"/>');
  };

  /* sweat drop */
  A.drop = () =>
    svg('0 0 60 80',
      '<path d="M30 4 C30 4 8 34 8 52 C8 66 18 76 30 76 C42 76 52 66 52 52 C52 34 30 4 30 4Z" fill="url(#gDrop)" stroke="#bfe6f7" stroke-width="2"/>' +
      '<ellipse cx="22" cy="52" rx="5" ry="10" fill="#fff" opacity=".6" transform="rotate(14 22 52)"/>');

  /* light bulb (think) */
  A.bulb = () => {
    let rays = '';
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI + (k * Math.PI) / 8;
      rays += '<line x1="' + (50 + Math.cos(a) * 44).toFixed(1) + '" y1="' + (46 + Math.sin(a) * 44).toFixed(1) + '" x2="' + (50 + Math.cos(a) * 54).toFixed(1) + '" y2="' + (46 + Math.sin(a) * 54).toFixed(1) + '"/>';
    }
    return svg('-10 -12 120 150',
      '<circle cx="50" cy="46" r="50" fill="url(#rGlow)"/>' +
      '<g stroke="' + GOLDL + '" stroke-width="4" stroke-linecap="round">' + rays + '</g>' +
      '<path d="M50 8 C27 8 14 26 14 44 C14 58 22 66 28 76 C31 81 31 86 31 92 L69 92 C69 86 69 81 72 76 C78 66 86 58 86 44 C86 26 73 8 50 8Z" fill="#fff3c4" fill-opacity=".55" stroke="' + GOLD + '" stroke-width="4"/>' +
      '<path d="M41 92 V64 Q41 52 50 52 Q59 52 59 64 V92" fill="none" stroke="' + GOLDD + '" stroke-width="3.5"/>' +
      '<rect x="32" y="92" width="36" height="22" rx="5" fill="url(#gGold)" stroke="' + GOLDD + '" stroke-width="2"/>' +
      '<path d="M34 100 H66 M34 106 H66" stroke="' + GOLDD + '" stroke-width="2"/>' +
      '<path d="M42 114 H58 L54 124 H46Z" fill="' + GOLDD + '"/>');
  };

  /* stopwatch frame */
  A.stopwatch = () => {
    let ticks = '';
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      const r1 = k % 3 === 0 ? 38 : 42;
      ticks += '<line x1="' + (60 + Math.cos(a) * r1).toFixed(1) + '" y1="' + (78 + Math.sin(a) * r1).toFixed(1) + '" x2="' + (60 + Math.cos(a) * 46).toFixed(1) + '" y2="' + (78 + Math.sin(a) * 46).toFixed(1) + '"/>';
    }
    return svg('0 0 120 140',
      '<rect x="50" y="8" width="20" height="14" rx="4" fill="url(#gGold)"/>' +
      '<rect x="56" y="20" width="8" height="10" fill="' + GOLDD + '"/>' +
      '<circle cx="60" cy="78" r="52" fill="#06231d" stroke="url(#gGold)" stroke-width="7"/>' +
      '<g stroke="' + GOLDL + '" stroke-width="2.5" stroke-linecap="round">' + ticks + '</g>');
  };

  A.pause = () =>
    svg('0 0 100 100',
      '<rect x="22" y="14" width="22" height="72" rx="8" fill="url(#gGold)"/><rect x="56" y="14" width="22" height="72" rx="8" fill="url(#gGold)"/>');

  A.heart = () =>
    svg('0 0 100 90',
      '<path d="M50 84 C20 60 6 44 6 28 C6 14 17 6 29 6 C38 6 46 11 50 19 C54 11 62 6 71 6 C83 6 94 14 94 28 C94 44 80 60 50 84Z" fill="url(#gRose)" stroke="' + GOLD + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M22 24 C24 18 30 15 35 16" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>');

  /* thumbs-up (like), speech bubble (comment), share nodes */
  A.like = (c) =>
    svg('0 0 24 24', '<path fill="' + (c || CREAM) + '" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>');
  A.comment = (c) =>
    svg('0 0 24 24', '<path fill="' + (c || CREAM) + '" d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>');
  A.share = (c) =>
    svg('0 0 24 24',
      '<g fill="' + (c || CREAM) + '" stroke="' + (c || CREAM) + '"><circle cx="18" cy="5" r="3.2"/><circle cx="6" cy="12" r="3.2"/><circle cx="18" cy="19" r="3.2"/>' +
      '<path d="M8.5 10.6 L15.5 6.4 M8.5 13.4 L15.5 17.6" stroke-width="1.8" fill="none"/></g>');

  A.check = () =>
    svg('0 0 100 100', '<circle cx="50" cy="50" r="46" fill="url(#gGold)"/><path d="M28 52 L44 68 L74 34" stroke="#3a2a08" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>');

  /* mountains (two ranges) */
  A.mountains = () =>
    svg('0 0 600 260',
      '<path d="M0 260 V150 L60 96 L110 140 L190 50 L270 150 L330 90 L400 160 L470 70 L540 140 L600 100 V260Z" fill="url(#gStone2)" stroke="' + GOLDD + '" stroke-width="2" stroke-linejoin="round" opacity=".9"/>' +
      '<path d="M0 260 V190 L80 130 L150 190 L240 100 L330 200 L420 120 L510 200 L600 150 V260Z" fill="url(#gStone)" stroke="' + GOLD + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M240 100 L226 136 L244 150 L232 180 M420 120 L410 150 L424 168 M80 130 L92 158 L82 176" stroke="#0a221d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M236 112 L240 100 L250 114Z M414 132 L420 120 L430 134Z" fill="' + CREAM + '" opacity=".75"/>');

  /* descending light beam (stretches to its box) */
  A.beam = () =>
    svg('0 0 100 100', '<path d="M30 0 H70 L100 100 H0Z" fill="url(#gBeam)"/>', 'preserveAspectRatio="none"');

  /* mihrab-style arch of light */
  A.arch = () =>
    svg('0 0 200 300',
      '<path d="M20 300 V120 C20 50 60 10 100 4 C140 10 180 50 180 120 V300Z" fill="url(#gBeam)" fill-opacity=".55"/>' +
      '<path d="M20 300 V120 C20 50 60 10 100 4 C140 10 180 50 180 120 V300" fill="none" stroke="url(#gGold)" stroke-width="7"/>' +
      '<path d="M40 300 V124 C40 64 70 28 100 22 C130 28 160 64 160 124 V300" fill="none" stroke="' + GOLDL + '" stroke-width="2" opacity=".8"/>' +
      '<polygon points="' + starPts(100, 40, 9, 6, 8) + '" fill="' + GOLDL + '"/>');

  /* three speech arcs; each has a class a1..a3 so the page can fade them in turn */
  A.speak = () =>
    svg('0 0 80 100',
      '<g fill="none" stroke="' + GOLD + '" stroke-width="6" stroke-linecap="round"><path class="a1" d="M10 34 Q26 50 10 66"/><path class="a2" d="M28 22 Q54 50 28 78"/><path class="a3" d="M46 10 Q82 50 46 90"/></g>');

  /* rays burst */
  A.burst = () => {
    let p = '';
    for (let k = 0; k < 24; k++) {
      const a = (k * Math.PI) / 12;
      const r = k % 2 ? 70 : 98;
      const w = 0.07;
      p += '<polygon points="100,100 ' + (100 + Math.cos(a - w) * r).toFixed(1) + ',' + (100 + Math.sin(a - w) * r).toFixed(1) + ' ' + (100 + Math.cos(a + w) * r).toFixed(1) + ',' + (100 + Math.sin(a + w) * r).toFixed(1) + '"/>';
    }
    return svg('0 0 200 200', '<g fill="' + GOLDL + '" opacity=".55">' + p + '</g><circle cx="100" cy="100" r="60" fill="url(#rGlow)"/>');
  };

  A.sparkle = () => svg('0 0 100 100', '<path d="M50 0 Q55 45 100 50 Q55 55 50 100 Q45 55 0 50 Q45 45 50 0Z" fill="' + GOLDL + '"/>');

  A.corner = () =>
    svg('0 0 60 60', '<path d="M4 56 V12 Q4 4 12 4 H56" fill="none" stroke="' + GOLD + '" stroke-width="3.5" stroke-linecap="round"/><polygon points="' + starPts(12, 12, 8, 5.5, 8) + '" fill="' + GOLDL + '"/>');

  A.divider = () =>
    svg('0 0 400 24',
      '<path d="M0 12 H168 M232 12 H400" stroke="' + GOLD + '" stroke-width="2" opacity=".85"/>' +
      '<polygon points="' + starPts(200, 12, 11, 8.3, 8) + '" fill="url(#gGold)"/>' +
      '<polygon points="' + starPts(176, 12, 4, 4, 4, 0) + '" fill="' + GOLD + '"/><polygon points="' + starPts(224, 12, 4, 4, 4, 0) + '" fill="' + GOLD + '"/>');

  /* down arrow */
  A.arrowDown = () =>
    svg('0 0 100 100', '<path d="M50 6 V70 M20 44 L50 78 L80 44" fill="none" stroke="url(#gGold)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>');

  /* chevron */
  A.chevron = () =>
    svg('0 0 100 60', '<path d="M10 10 L50 48 L90 10" fill="none" stroke="' + GOLDL + '" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>');

  /* sky band with stars and crescent, and sand dunes for the "sky and earth" beat */
  A.sky = () => {
    let st = '';
    const pts = [[40, 30, 2], [120, 80, 3], [210, 24, 2.5], [300, 70, 2], [390, 34, 3], [470, 90, 2], [560, 28, 2.5], [640, 74, 3], [720, 40, 2], [800, 96, 2.5], [880, 30, 3], [950, 70, 2], [1010, 36, 2.5]];
    pts.forEach((p) => { st += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="' + CREAM + '"/>'; });
    return svg('0 0 1040 120', '<rect width="1040" height="120" rx="30" fill="url(#gSky)"/>' + st +
      '<g transform="translate(900 14) scale(.62)"><circle cx="50" cy="50" r="40" fill="url(#gGold)" mask="url(#mCres)"/></g>');
  };
  A.dunes = () =>
    svg('0 0 1040 120',
      '<rect width="1040" height="120" rx="30" fill="#0c2b24"/>' +
      '<path d="M0 120 V80 C120 40 220 40 330 76 C440 110 520 56 640 52 C760 48 880 92 1040 60 V120Z" fill="url(#gSand)"/>' +
      '<path d="M0 120 V100 C140 76 260 84 380 100 C520 118 700 80 1040 96 V120Z" fill="#8a6a2c"/>');

  return A;
})();
