/* Seasonal touches across the whole site, plus a small cookie game.
   Thanksgiving: Nov 1 through Thanksgiving Day (4th Thursday of November).
     Falling leaves, and a turkey in a pilgrim hat that walks along the bottom
     of the screen, flies now and then, and drops cookies all over the site.
   Christmas: the day after Thanksgiving through Dec 31.
     Snow, and Santa's sleigh crossing the screen dropping gingerbread cookies.
   Outside those windows nothing renders. Dates use Minnesota time.
   Preview any season with ?season=thanksgiving | christmas | none */
(function () {
  'use strict';

  // ------------------------------------------------------------------ dates
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
    var firstWeekday = new Date(year, 10, 1).getDay();
    return 1 + ((4 - firstWeekday + 7) % 7) + 21;
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
  var TG = season === 'thanksgiving';
  document.documentElement.classList.add('season-' + season);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia('(max-width: 640px)').matches;

  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  function load(k, def, kind) { try { var v = store(kind || 'localStorage').getItem(k); return v === null ? def : v; } catch (e) { return def; } }
  function save(k, v, kind) { try { store(kind || 'localStorage').setItem(k, v); } catch (e) {} }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  // ------------------------------------------------------------------ greeting
  var ICONS = {
    thanksgiving: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 0l2 5 4-2-1 5h5l-4 4 2 2h-6l-1 5-1 1-1-1-1-5H2l2-2-4-4h5L4 3l4 2z" fill="#c0612b"/><path d="M10 6v14" stroke="#7a3a17" stroke-width="1" fill="none"/></svg>',
    christmas: '<svg viewBox="0 0 20 20" aria-hidden="true"><g stroke="#2f6b4f" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M10 1v18M2.2 5.5l15.6 9M2.2 14.5l15.6-9"/><path d="M8 3l2 2 2-2M8 17l2-2 2 2"/></g><circle cx="10" cy="10" r="2.2" fill="#b23a32"/></svg>'
  };
  var GREETING = {
    thanksgiving: 'Happy Thanksgiving! We’re grateful for every family we serve.',
    christmas: 'Merry Christmas &amp; Happy New Year from all of us at Sloan.'
  };
  var copy = document.querySelector('.hero-copy, .story-hero-copy');
  var pill = null;
  if (copy) {
    pill = document.createElement('p');
    pill.className = 'season-greeting';
    pill.innerHTML = ICONS[season] + '<span>' + GREETING[season] + '</span>';
    copy.insertBefore(pill, copy.firstChild);
  }

  if (reduced) return;

  // ------------------------------------------------------------------ falling leaves / snow (whole page)
  var layer = document.createElement('div');
  layer.className = 'season-layer';
  layer.setAttribute('aria-hidden', 'true');
  var canvas = document.createElement('canvas');
  layer.appendChild(canvas);
  document.body.appendChild(layer);
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  var MAPLE = typeof Path2D === 'function' ? new Path2D('M10 0l2 5 4-2-1 5h5l-4 4 2 2h-6l-1 5-1 1-1-1-1-5H2l2-2-4-4h5L4 3l4 2z') : null;
  var OAK = typeof Path2D === 'function' ? new Path2D('M10 0C15 3 16 7 14 9c3 1 3 5 0 6 1 3-2 5-4 5s-5-2-4-5c-3-1-3-5 0-6C4 7 5 3 10 0z') : null;
  var LEAF_COLORS = ['#c0612b', '#d08a2e', '#9a3b1d', '#b08a4a', '#c9772f'];
  var SNOW_COLORS = ['rgba(150,170,190,0.55)', 'rgba(175,195,212,0.6)', 'rgba(255,255,255,0.95)'];
  var parts = [];
  function spawnParticle(p, initial, burst) {
    p.x = rand(0, W);
    p.y = initial ? rand(-H, H) : rand(-60, -10);
    p.temp = !!burst;
    if (TG) {
      p.size = rand(small ? 12 : 14, small ? 20 : 26);
      p.vy = burst ? rand(1.2, 2.4) : rand(0.35, 0.8);
      p.sway = rand(0.6, 1.6);
      p.rot = rand(0, Math.PI * 2);
      p.vr = rand(-0.015, 0.015);
      p.shape = Math.random() < 0.6 ? MAPLE : OAK;
      p.color = pick(LEAF_COLORS);
      p.alpha = rand(0.5, 0.8);
    } else {
      p.size = rand(1.2, small ? 3 : 3.6);
      p.vy = (burst ? rand(1.2, 2.2) : rand(0.3, 0.9)) * (p.size / 2.4);
      p.sway = rand(0.3, 0.9);
      p.color = pick(SNOW_COLORS);
    }
    p.phase = rand(0, Math.PI * 2);
    return p;
  }
  var baseCount = TG ? (small ? 8 : 16) : (small ? 34 : 70);
  for (var i = 0; i < baseCount; i++) parts.push(spawnParticle({}, true));
  function shower(n) { for (var i = 0; i < n; i++) parts.push(spawnParticle({}, false, true)); }

  var tick = 0;
  function drawParticles() {
    if (!ctx) return;
    tick += 1;
    ctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.y += p.vy;
      p.x += Math.sin(tick * 0.012 + p.phase) * p.sway * 0.35;
      if (p.y > H + 30) {
        if (p.temp) { parts.splice(i, 1); continue; }
        spawnParticle(p, false);
      }
      if (TG && p.shape) {
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + Math.sin(tick * 0.02 + p.phase) * 0.4);
        var s = p.size / 20;
        ctx.scale(s, s * (0.75 + 0.25 * Math.cos(tick * 0.03 + p.phase)));
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
  }

  // ------------------------------------------------------------------ cookie game
  var GOAL = 10;
  var YEAR = today().y;
  var countKey = 'sfs-cookies-' + season + '-' + YEAR;
  var hiddenKey = 'sfs-season-game-hidden';
  var count = parseInt(load(countKey, '0'), 10) || 0;
  var celebrated = count >= GOAL;
  var gameOn = load(hiddenKey, '0', 'sessionStorage') !== '1';
  var MAX_COOKIES = small ? 10 : 14;

  var COOKIE_SVG = TG
    ? '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#d9a35f"/><circle cx="20" cy="20" r="17" fill="none" stroke="#b9803e" stroke-width="2"/><path d="M8 15a13 13 0 0 1 9-8" stroke="#f0c98a" stroke-width="2.4" stroke-linecap="round" fill="none"/><g fill="#5a3418"><circle cx="14" cy="16" r="2.6"/><circle cx="25" cy="13" r="2.2"/><circle cx="26" cy="25" r="2.8"/><circle cx="15" cy="27" r="2.2"/><circle cx="20" cy="20" r="1.8"/></g></svg>'
    : '<svg viewBox="0 0 40 40"><g fill="#b86a2e"><circle cx="20" cy="9" r="6.5"/><path d="M13 15h14l7 6-3 3-5-3 3 14h-6l-3-8-3 8h-6l3-14-5 3-3-3z"/></g><g fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"><path d="M17 11q3 2.4 6 0M8.5 20.5l3 1.6M31.5 20.5l-3 1.6M15 34h4M21 34h4"/></g><g fill="#fff"><circle cx="17.5" cy="7.5" r="1"/><circle cx="22.5" cy="7.5" r="1"/></g><g fill="#c0392b"><circle cx="20" cy="19" r="1.4"/><circle cx="20" cy="24" r="1.4"/></g></svg>';

  var cookieLayer = document.createElement('div');
  cookieLayer.className = 'season-cookies';
  cookieLayer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cookieLayer);

  var LABEL = TG ? 'the turkey’s cookies' : 'Santa’s cookies';
  var hud = document.createElement('div');
  hud.className = 'season-hud';
  hud.innerHTML =
    '<span class="hud-cookie" aria-hidden="true">' + COOKIE_SVG + '</span>' +
    '<span class="hud-text" role="status" aria-live="polite"><strong>0</strong><span class="hud-goal"></span><em>Catch ' + LABEL + '</em></span>' +
    '<button type="button" class="hud-close" aria-label="Hide the cookie game">&times;</button>';
  document.body.appendChild(hud);
  var hudCount = hud.querySelector('strong');
  var hudGoal = hud.querySelector('.hud-goal');
  function renderHud(bump) {
    hudCount.textContent = String(count);
    hudGoal.textContent = count >= GOAL ? ' cookies!' : ' / ' + GOAL;
    if (bump) { hud.classList.remove('is-bump'); void hud.offsetWidth; hud.classList.add('is-bump'); }
  }
  renderHud(false);
  hud.querySelector('.hud-close').addEventListener('click', function () { setGame(false); });

  function liveCookies() { return cookieLayer.querySelectorAll('.season-cookie:not(.is-collected)'); }
  function dropCookie(clientX, clientY, fallPx) {
    if (!gameOn) return;
    var live = liveCookies();
    if (live.length >= MAX_COOKIES) live[0].remove();
    var b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    b.className = 'season-cookie';
    b.innerHTML = COOKIE_SVG;
    b.style.left = Math.round(clientX + window.scrollX - 17) + 'px';
    b.style.top = Math.round(clientY + (fallPx || 0) + window.scrollY - 17) + 'px';
    b.style.setProperty('--fall', (fallPx || 0) + 'px');
    b.style.setProperty('--tilt', rand(-25, 25).toFixed(0) + 'deg');
    b.classList.add(fallPx ? 'is-falling' : 'is-dropped');
    b.addEventListener('click', collect);
    cookieLayer.appendChild(b);
  }
  function popText(x, y, text) {
    var s = document.createElement('span');
    s.className = 'season-pop';
    s.textContent = text;
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    cookieLayer.appendChild(s);
    setTimeout(function () { s.remove(); }, 1100);
  }
  function collect(e) {
    var b = e.currentTarget;
    if (b.classList.contains('is-collected')) return;
    b.classList.add('is-collected');
    var left = parseFloat(b.style.left), top = parseFloat(b.style.top);
    for (var i = 0; i < 7; i++) {
      var c = document.createElement('i');
      c.className = 'season-crumb';
      c.style.left = (left + 17) + 'px';
      c.style.top = (top + 17) + 'px';
      c.style.setProperty('--dx', rand(-36, 36).toFixed(0) + 'px');
      c.style.setProperty('--dy', rand(-42, 8).toFixed(0) + 'px');
      cookieLayer.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 750); })(c);
    }
    popText(left + 10, top - 6, '+1');
    setTimeout(function () { b.remove(); }, 450);
    count += 1;
    save(countKey, String(count));
    renderHud(true);
    if (count >= GOAL && !celebrated) { celebrated = true; celebrate(); }
  }

  // ------------------------------------------------------------------ celebration
  function celebrate() {
    shower(TG ? 36 : 90);
    var card = document.createElement('div');
    card.className = 'season-toast';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'You found all the cookies');
    card.innerHTML =
      '<span class="toast-emoji" aria-hidden="true">' + (TG ? '🦃' : '🎅') + '</span>' +
      '<p class="toast-title">' + (TG ? 'You caught ' + GOAL + ' cookies!' : 'You saved Santa’s cookies!') + '</p>' +
      '<p class="toast-text">' + (TG ? 'Happy Thanksgiving from David, Adam, Eric and everyone at Sloan Financial Solutions.' : 'Merry Christmas from David, Adam, Eric and everyone at Sloan Financial Solutions.') + '</p>' +
      '<div class="toast-actions"><button type="button" class="toast-keep">Keep playing</button><button type="button" class="toast-hide">Hide the game</button></div>';
    document.body.appendChild(card);
    requestAnimationFrame(function () { card.classList.add('is-in'); });
    function close() { card.classList.remove('is-in'); setTimeout(function () { card.remove(); }, 400); }
    card.querySelector('.toast-keep').addEventListener('click', close);
    card.querySelector('.toast-hide').addEventListener('click', function () { close(); setGame(false); });
    setTimeout(close, 9000);
  }

  // ------------------------------------------------------------------ the turkey
  var BUBBLES = ['Gobble gobble!', 'Catch my cookies!', 'Happy Thanksgiving!', 'Grateful for you!', 'Wheee!', 'Gobble!'];
  var turkey = null, tState = null;
  if (TG) {
    var feathers = '';
    var FEATHER_COLORS = ['#8a4a22', '#c0612b', '#e0a43a', '#b23a32', '#d08a2e', '#c0612b', '#8a4a22'];
    for (var f = 0; f < 7; f++) {
      feathers += '<ellipse cx="34" cy="18" rx="8.5" ry="22" fill="' + FEATHER_COLORS[f] + '" transform="rotate(' + (-66 + f * 22) + ' 34 48)"/>';
    }
    turkey = document.createElement('div');
    turkey.className = 'turkey';
    turkey.setAttribute('aria-hidden', 'true');
    turkey.innerHTML =
      '<div class="turkey-flip"><svg class="turkey-svg" viewBox="0 0 100 92" width="88" height="81">' +
        '<g class="turkey-tail">' + feathers + '<circle cx="34" cy="48" r="12" fill="#6b3b1c"/></g>' +
        '<g stroke="#e0a43a" stroke-width="3" stroke-linecap="round" fill="none">' +
          '<path class="leg leg-a" d="M44 72 L41 86 M41 86 L36 88 M41 86 L45 89"/>' +
          '<path class="leg leg-b" d="M54 72 L56 86 M56 86 L52 89 M56 86 L61 88"/>' +
        '</g>' +
        '<ellipse cx="48" cy="58" rx="22" ry="18" fill="#7a4524"/>' +
        '<ellipse cx="50" cy="63" rx="13" ry="9" fill="#9a5a2e"/>' +
        '<g class="turkey-wing"><ellipse cx="42" cy="58" rx="12" ry="8.5" fill="#5e3219"/><path d="M33 58 q9 7 19 2" stroke="#4a2612" stroke-width="1.4" fill="none"/></g>' +
        '<g class="turkey-head">' +
          '<path d="M60 50 Q64 40 66 34" stroke="#9a5a2e" stroke-width="7" stroke-linecap="round" fill="none"/>' +
          '<circle cx="68" cy="31" r="8" fill="#c98b5a"/>' +
          '<circle cx="71" cy="29" r="2.4" fill="#fff"/><circle cx="71.8" cy="29.2" r="1.3" fill="#14293b"/>' +
          '<path d="M75 31 L83 33 L75 35z" fill="#e0a43a"/>' +
          '<path d="M75 35 q2 7 -1 9 q-3 -2 -1 -9z" fill="#d8352a"/>' +
          '<g><rect x="58" y="12" width="18" height="12" rx="1.5" fill="#1d1d1f"/><rect x="54" y="22" width="26" height="3.4" rx="1.7" fill="#1d1d1f"/><rect x="58" y="19" width="18" height="2.6" fill="#7a5a34"/><rect x="64.5" y="18.3" width="5" height="4" rx=".6" fill="none" stroke="#e0b84a" stroke-width="1.3"/></g>' +
        '</g>' +
      '</svg></div>' +
      '<div class="turkey-bubble"></div>';
    document.body.appendChild(turkey);
    turkey.addEventListener('click', function () { if (gameOn) poke(); });
    tState = {
      x: -100, dir: 1, mode: 'walk', modeT: 0, yOff: 0,
      speed: small ? 46 : 62,
      nextDrop: 2.2, nextFly: rand(12, 18), nextPeck: rand(5, 8),
      fly: null, greeted: false
    };
  }
  var bubbleTimer = 0;
  function say(el, text, ms) {
    var b = el.querySelector('.turkey-bubble, .sleigh-bubble');
    if (!b) return;
    b.textContent = text;
    b.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { b.classList.remove('is-on'); }, ms || 1800);
  }
  var laneCache = 0;
  function laneGround() {
    if (!laneCache) laneCache = parseFloat(getComputedStyle(turkey).bottom) || 16;
    return H - laneCache - 6;
  }
  window.addEventListener('resize', function () { laneCache = 0; });
  function startFly(targetX, bonus) {
    var s = tState;
    s.mode = 'fly';
    s.fly = { from: s.x, to: targetX, t: 0, dur: rand(2.2, 2.8), height: rand(small ? 110 : 150, small ? 160 : 230), drops: bonus ? [0.3, 0.7] : [0.5] };
    s.dir = targetX > s.x ? 1 : -1;
    turkey.classList.remove('is-pecking');
    turkey.classList.add('is-flying');
  }
  function poke() {
    say(turkey, pick(BUBBLES), 1600);
    turkey.classList.remove('is-poked'); void turkey.offsetWidth; turkey.classList.add('is-poked');
    if (tState.mode !== 'fly') {
      var target = tState.x < W / 2 ? rand(W * 0.6, W - 110) : rand(10, W * 0.35);
      setTimeout(function () { startFly(target, true); }, 250);
    }
  }
  function stepTurkey(dt) {
    var s = tState;
    if (!s.greeted && s.x > 20) {
      s.greeted = true;
      say(turkey, count >= GOAL ? 'Gobble! More cookies!' : 'Psst! Catch my cookies!', 3600);
    }
    if (s.mode === 'walk') {
      s.x += s.dir * s.speed * dt;
      if (s.x > W - 96 && s.dir > 0) s.dir = -1;
      if (s.x < 4 && s.dir < 0) s.dir = 1;
      s.nextDrop -= dt; s.nextFly -= dt; s.nextPeck -= dt;
      if (s.nextDrop <= 0 && s.x > 0 && s.x < W - 90) {
        dropCookie(s.x + (s.dir > 0 ? 10 : 70), laneGround() - 14, 0);
        s.nextDrop = rand(4.5, 7.5);
      }
      if (s.nextPeck <= 0) { s.mode = 'peck'; s.modeT = 1.3; s.nextPeck = rand(6, 10); turkey.classList.add('is-pecking'); }
      else if (s.nextFly <= 0 && s.x > 0) {
        s.nextFly = rand(14, 22);
        startFly(s.x < W / 2 ? rand(W * 0.55, W - 110) : rand(10, W * 0.4), false);
      }
    } else if (s.mode === 'peck') {
      s.modeT -= dt;
      if (s.modeT <= 0) { s.mode = 'walk'; turkey.classList.remove('is-pecking'); }
    } else if (s.mode === 'fly') {
      var fl = s.fly;
      fl.t += dt / fl.dur;
      var p = Math.min(fl.t, 1);
      var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      s.x = fl.from + (fl.to - fl.from) * ease;
      s.yOff = Math.sin(Math.PI * p) * fl.height;
      while (fl.drops.length && p >= fl.drops[0]) {
        fl.drops.shift();
        dropCookie(s.x + 40, laneGround() - 14 - s.yOff, s.yOff);
      }
      if (p >= 1) { s.mode = 'walk'; s.yOff = 0; turkey.classList.remove('is-flying'); }
    }
    turkey.style.transform = 'translate3d(' + s.x.toFixed(1) + 'px,' + (-s.yOff).toFixed(1) + 'px,0)';
    turkey.classList.toggle('is-left', s.dir < 0);
  }

  // ------------------------------------------------------------------ Santa's sleigh (whole page)
  var sleigh = null, sState = null;
  function reindeer(x, rudolph) {
    return '<g transform="translate(' + x + ' 0)">' +
      '<ellipse cx="26" cy="42" rx="15" ry="6.5" fill="#7a5a34"/>' +
      '<path d="M38 40 Q42 32 44 28" stroke="#7a5a34" stroke-width="5" stroke-linecap="round" fill="none"/>' +
      '<ellipse cx="47" cy="26" rx="5.5" ry="3.6" fill="#7a5a34"/>' +
      '<path d="M44 23 L42 15 M42 18 L38 16 M46 23 L47 14 M47 17 L51 14" stroke="#5a4226" stroke-width="1.3" stroke-linecap="round" fill="none"/>' +
      '<circle cx="52.5" cy="26.5" r="' + (rudolph ? 2.2 : 1.4) + '" fill="' + (rudolph ? '#d8352a' : '#3a2a18') + '"/>' +
      '<g class="legs" stroke="#5a4226" stroke-width="2" stroke-linecap="round"><path d="M16 46 L8 54 M20 47 L14 56 M33 46 L42 52 M36 45 L46 49"/></g>' +
      '<path d="M11 39 L6 36" stroke="#7a5a34" stroke-width="3" stroke-linecap="round"/>' +
    '</g>';
  }
  if (!TG) {
    sleigh = document.createElement('div');
    sleigh.className = 'season-sleigh';
    sleigh.setAttribute('aria-hidden', 'true');
    sleigh.innerHTML =
      '<svg viewBox="0 0 270 80" width="270" height="80">' +
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
      '</svg><div class="sleigh-bubble"></div>';
    document.body.appendChild(sleigh);
    sleigh.addEventListener('click', function () {
      if (!gameOn) return;
      say(sleigh, pick(['Ho ho ho!', 'Merry Christmas!', 'Catch the cookies!']), 1500);
      var r = sleigh.getBoundingClientRect();
      dropCookie(r.left + 50, r.top + 60, rand(H * 0.25, H * 0.5));
    });
    sState = { active: false, wait: 2.5, t: 0, dur: 0, y: 0, drops: [], greeted: false };
  }
  function stepSleigh(dt) {
    var s = sState;
    var w = small ? 180 : 270;
    if (!s.active) {
      s.wait -= dt;
      sleigh.style.transform = 'translate3d(-400px,0,0)';
      if (s.wait <= 0) {
        s.active = true; s.t = 0; s.dur = small ? 7 : 10;
        s.y = rand(small ? 118 : 136, small ? 190 : 240);
        s.drops = gameOn ? [rand(0.15, 0.45), rand(0.55, 0.85)] : [];
      }
      return;
    }
    s.t += dt / s.dur;
    var p = Math.min(s.t, 1);
    var x = -w - 20 + (W + w + 60) * p;
    var y = s.y - Math.sin(Math.PI * p) * 34;
    sleigh.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    if (!s.greeted && p > 0.2 && gameOn) { s.greeted = true; say(sleigh, 'Ho ho ho! Catch my cookies!', 3000); }
    while (s.drops.length && p >= s.drops[0]) {
      s.drops.shift();
      dropCookie(x + w * 0.2, y + (small ? 40 : 58), rand(H * 0.25, H * 0.6));
    }
    if (p >= 1) { s.active = false; s.wait = rand(14, 22); }
  }

  // ------------------------------------------------------------------ on / off
  function setGame(on) {
    gameOn = on;
    save(hiddenKey, on ? '0' : '1', 'sessionStorage');
    document.documentElement.classList.toggle('season-game-off', !on);
    if (!on) cookieLayer.innerHTML = '';
  }
  setGame(gameOn);
  if (pill) pill.addEventListener('click', function () { if (!gameOn) setGame(true); });

  // ------------------------------------------------------------------ loop
  var running = false, raf = 0, last = 0;
  function frame(now) {
    var dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    drawParticles();
    if (gameOn && turkey) stepTurkey(dt);
    if (sleigh) stepSleigh(dt);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  start();
})();
