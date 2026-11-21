/* Seasonal touches for the home page hero.
   Thanksgiving: from Nov 1 through Thanksgiving Day (4th Thursday of November).
   Christmas:    from the day after Thanksgiving through Dec 31.
   Outside those windows nothing renders. Dates use Minnesota time.
   Preview any season with ?season=thanksgiving | christmas | none */
(function () {
  'use strict';
  var hero = document.querySelector('.hero');
  if (!hero) return;

  function today() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = parseInt(p.value, 10); });
      return { y: o.year, m: o.month, d: o.day };
    } catch (e) {
      var n = new Date();
      return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
    }
  }
  function thanksgivingDay(year) {
    var firstWeekday = new Date(year, 10, 1).getDay(); // 0 = Sunday
    return 1 + ((4 - firstWeekday + 7) % 7) + 21;       // 4th Thursday
  }
  function currentSeason() {
    var forced = (location.search.match(/[?&]season=(thanksgiving|christmas|none)/) || [])[1];
    if (forced) return forced === 'none' ? null : forced;
    var t = today();
    var tg = thanksgivingDay(t.y);
    if (t.m === 11 && t.d <= tg) return 'thanksgiving';
    if ((t.m === 11 && t.d > tg) || t.m === 12) return 'christmas';
    return null;
  }

  var season = currentSeason();
  if (!season) return;
  document.documentElement.classList.add('season-' + season);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width: 640px)').matches;

  // ---------------------------------------------------------------- greeting
  var ICONS = {
    thanksgiving: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0l2 5 4-2-1 5h5l-4 4 2 2h-6l-1 5-1 1-1-1-1-5H2l2-2-4-4h5L4 3l4 2z" fill="#c0612b"/><path d="M10 6v14" stroke="#7a3a17" stroke-width="1" fill="none"/></svg>',
    christmas: '<svg viewBox="0 0 20 20" aria-hidden="true"><g stroke="#2f6b4f" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M10 1v18M2.2 5.5l15.6 9M2.2 14.5l15.6-9"/><path d="M8 3l2 2 2-2M8 17l2-2 2 2"/></g><circle cx="10" cy="10" r="2.2" fill="#b23a32"/></svg>'
  };
  var TEXT = {
    thanksgiving: 'Happy Thanksgiving! We’re grateful for every family we serve.',
    christmas: 'Merry Christmas &amp; Happy New Year from all of us at Sloan.'
  };
  var copy = hero.querySelector('.hero-copy');
  if (copy) {
    var pill = document.createElement('p');
    pill.className = 'season-greeting';
    pill.innerHTML = ICONS[season] + '<span>' + TEXT[season] + '</span>';
    copy.insertBefore(pill, copy.firstChild);
  }

  if (reduced) return;

  // ---------------------------------------------------------------- falling layer
  var layer = document.createElement('div');
  layer.className = 'season-layer';
  layer.setAttribute('aria-hidden', 'true');
  var canvas = document.createElement('canvas');
  layer.appendChild(canvas);
  hero.insertBefore(layer, hero.firstChild);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  var MAPLE = new Path2D('M10 0l2 5 4-2-1 5h5l-4 4 2 2h-6l-1 5-1 1-1-1-1-5H2l2-2-4-4h5L4 3l4 2z');
  var OAK = new Path2D('M10 0C15 3 16 7 14 9c3 1 3 5 0 6 1 3-2 5-4 5s-5-2-4-5c-3-1-3-5 0-6C4 7 5 3 10 0z');
  var LEAF_COLORS = ['#c0612b', '#d08a2e', '#9a3b1d', '#b08a4a', '#c9772f'];
  var SNOW_COLORS = ['rgba(150,170,190,0.55)', 'rgba(175,195,212,0.6)', 'rgba(255,255,255,0.95)'];

  function rand(a, b) { return a + Math.random() * (b - a); }
  var count = season === 'thanksgiving' ? (small ? 10 : 22) : (small ? 34 : 70);
  var parts = [];
  function spawn(p, initial) {
    p.x = rand(0, W);
    p.y = initial ? rand(-H, H) : rand(-60, -10);
    if (season === 'thanksgiving') {
      p.size = rand(small ? 12 : 14, small ? 20 : 26);
      p.vy = rand(0.35, 0.8);
      p.sway = rand(0.6, 1.6);
      p.rot = rand(0, Math.PI * 2);
      p.vr = rand(-0.015, 0.015);
      p.shape = Math.random() < 0.6 ? MAPLE : OAK;
      p.color = LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0];
      p.alpha = rand(0.55, 0.85);
    } else {
      p.size = rand(1.2, small ? 3 : 3.6);
      p.vy = rand(0.3, 0.9) * (p.size / 2.4);
      p.sway = rand(0.3, 0.9);
      p.color = SNOW_COLORS[(Math.random() * SNOW_COLORS.length) | 0];
    }
    p.phase = rand(0, Math.PI * 2);
    return p;
  }
  for (var i = 0; i < count; i++) parts.push(spawn({}, true));

  var running = false, raf = 0, t = 0;
  function frame() {
    t += 1;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.y += p.vy;
      p.x += Math.sin(t * 0.012 + p.phase) * p.sway * 0.35;
      if (p.y > H + 30) spawn(p, false);
      if (season === 'thanksgiving') {
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + Math.sin(t * 0.02 + p.phase) * 0.4);
        var s = p.size / 20;
        ctx.scale(s, s * (0.75 + 0.25 * Math.cos(t * 0.03 + p.phase)));
        ctx.translate(-10, -10);
        ctx.fillStyle = p.color;
        ctx.fill(p.shape);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  var onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen && !document.hidden) start(); else stop();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (onScreen) start();
  });
  start();

  // ---------------------------------------------------------------- Santa
  if (season === 'christmas') {
    var sky = document.createElement('div');
    sky.className = 'season-sky';
    sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML =
      '<div class="sleigh"><svg viewBox="0 0 270 80" width="270" height="80">' +
        '<g class="sleigh-trail" fill="#d6b67b"><circle cx="4" cy="52" r="1.6"/><circle cx="-2" cy="44" r="1.1"/><circle cx="8" cy="40" r="1.3"/></g>' +
        '<path d="M12 66 Q8 72 18 72 L76 72 Q86 72 90 62" stroke="#14293b" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M26 66 L26 72 M78 66 L80 72" stroke="#14293b" stroke-width="2"/>' +
        '<circle cx="34" cy="40" r="9" fill="#7a5a34"/>' +
        '<circle cx="58" cy="40" r="9" fill="#b23a32"/>' +
        '<circle cx="58" cy="28" r="5.5" fill="#f1d3b8"/>' +
        '<path d="M52 31 Q58 39 64 31 Q58 35 52 31z" fill="#fff"/>' +
        '<path d="M64.5 25 Q60 14 52 20 L53.5 25z" fill="#b23a32"/><circle cx="51.5" cy="19.5" r="2" fill="#fff"/><rect x="53" y="24" width="12" height="2.6" rx="1.3" fill="#fff"/>' +
        '<path d="M16 54 Q16 46 22 46 L84 46 Q88 46 86 54 L84 66 L24 66 Q18 66 16 54z" fill="#b23a32"/>' +
        '<path d="M18 50 L84 50" stroke="#d6b67b" stroke-width="1.6"/>' +
        '<path d="M86 50 L111 40" stroke="#8a6a3a" stroke-width="1.2" fill="none"/>' +
        '<path d="M140 38 L163 38 M192 38 L215 38" stroke="#8a6a3a" stroke-width="1" fill="none"/>' +
        reindeer(100, false) + reindeer(152, false) + reindeer(204, true) +
      '</svg></div>';
    hero.appendChild(sky);
  }
  function reindeer(x, rudolph) {
    return '<g transform="translate(' + x + ' 0)" class="deer">' +
      '<ellipse cx="26" cy="42" rx="15" ry="6.5" fill="#7a5a34"/>' +
      '<path d="M38 40 Q42 32 44 28" stroke="#7a5a34" stroke-width="5" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="47" cy="26" rx="5.5" ry="3.6" fill="#7a5a34"/>' +
      '<path d="M44 23 L42 15 M42 18 L38 16 M46 23 L47 14 M47 17 L51 14" stroke="#5a4226" stroke-width="1.3" stroke-linecap="round" fill="none"/>' +
      '<circle cx="52.5" cy="26.5" r="' + (rudolph ? 2.2 : 1.4) + '" fill="' + (rudolph ? '#d8352a' : '#3a2a18') + '"/>' +
      '<g class="legs" stroke="#5a4226" stroke-width="2" stroke-linecap="round"><path d="M16 46 L8 54 M20 47 L14 56 M33 46 L42 52 M36 45 L46 49"/></g>' +
      '<path d="M11 39 L6 36" stroke="#7a5a34" stroke-width="3" stroke-linecap="round"/>' +
    '</g>';
  }
})();
