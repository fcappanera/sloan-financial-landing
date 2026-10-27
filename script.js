(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var motion = root.classList.contains('motion') && !reduceMotion;

  // Run pointer handlers at most once per frame.
  function throttle(fn) {
    var queued = false;
    var lastEvent;
    return function (e) {
      lastEvent = e;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn(lastEvent);
      });
    };
  }

  var copyrightYear = document.getElementById('copyright-year');
  if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();

  // ---------------------------------------------------------------
  // Smooth inertial scrolling (desktop only)
  // ---------------------------------------------------------------
  var lenis = null;
  if (motion && finePointer && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true, anchors: { offset: -90 } });
    root.classList.add('has-lenis');
    var raf = function (time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  // ---------------------------------------------------------------
  // Navigation: dropdowns and mobile drawer
  // ---------------------------------------------------------------
  var header = document.querySelector('.site-header');
  var nav = document.getElementById('main-nav');
  var toggle = document.querySelector('.nav-toggle');
  var triggers = document.querySelectorAll('.nav-trigger');

  function closeMenus(except) {
    triggers.forEach(function (btn) {
      if (btn !== except) {
        btn.setAttribute('aria-expanded', 'false');
        btn.parentElement.classList.remove('open');
      }
    });
  }

  triggers.forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      event.stopPropagation();
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      closeMenus(btn);
      btn.setAttribute('aria-expanded', String(!isOpen));
      btn.parentElement.classList.toggle('open', !isOpen);
    });
  });

  function setDrawer(open) {
    if (!header || !toggle) return;
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open) closeMenus();
    if (lenis) open ? lenis.stop() : lenis.start();
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setDrawer(!header.classList.contains('nav-open'));
    });
  }

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.nav-item')) closeMenus();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMenus();
      setDrawer(false);
    }
  });

  if (nav) {
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setDrawer(false);
        closeMenus();
      });
    });
  }

  // Header: condense after a little scroll, hide while scrolling down,
  // reveal when scrolling up. Mobile CTA bar appears after the hero.
  var mobileCta = document.querySelector('.mobile-cta');
  var lastY = window.scrollY;
  var dirAcc = 0;
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      var d = y - lastY;
      dirAcc = (d > 0) === (dirAcc > 0) ? dirAcc + d : d;
      if (dirAcc > 24 && y > 560 && !header.classList.contains('nav-open') && !header.querySelector('.nav-item.open')) {
        header.classList.add('is-hidden');
      } else if (dirAcc < -24 || y < 240) {
        header.classList.remove('is-hidden');
      }
    }
    if (mobileCta) mobileCta.classList.toggle('is-visible', y > window.innerHeight * 0.7);
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  // ---------------------------------------------------------------
  // Live office status (Central time, Mon to Fri 9:00 to 4:30)
  // ---------------------------------------------------------------
  function centralNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(new Date());
      var get = function (type) {
        var p = parts.find(function (x) { return x.type === type; });
        return p ? p.value : '';
      };
      return { day: get('weekday'), minutes: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
    } catch (e) {
      return null;
    }
  }

  function updateStatus() {
    var now = centralNow();
    if (!now) return;
    var weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    var isWeekday = weekdays.indexOf(now.day) !== -1;
    var isOpen = isWeekday && now.minutes >= 540 && now.minutes < 990;
    var text;
    if (isOpen) text = 'Open now · until 4:30 pm';
    else if (isWeekday && now.minutes < 540) text = 'Closed · opens today at 9:00 am';
    else if (now.day === 'Fri' || now.day === 'Sat' || now.day === 'Sun') text = 'Closed · opens Monday at 9:00 am';
    else text = 'Closed · opens tomorrow at 9:00 am';
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', isOpen);
      var label = el.querySelector('.status-text');
      if (label) label.textContent = text;
    });
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  // ---------------------------------------------------------------
  // Services tabs + deep links ("Ask us about Roth IRAs")
  // ---------------------------------------------------------------
  var svcTabs = Array.prototype.slice.call(document.querySelectorAll('.svc-tab'));
  var svcInk = document.querySelector('.svc-tab-ink');
  function moveInk(tab) {
    if (!svcInk || !tab) return;
    svcInk.style.width = tab.offsetWidth + 'px';
    svcInk.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
  }
  function selectSvc(tab, focus) {
    svcTabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !on;
      if (on) {
        panel.classList.remove('is-entering');
        void panel.offsetWidth;
        panel.classList.add('is-entering');
        panel.querySelectorAll('[data-reveal], [data-reveal-img]').forEach(function (el) { el.classList.add('in'); });
      }
    });
    moveInk(tab);
    if (focus) tab.focus();
  }
  if (svcTabs.length) {
    svcTabs.forEach(function (t) {
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel && t.getAttribute('aria-selected') !== 'true') panel.hidden = true;
    });
    moveInk(svcTabs[0]);
    svcTabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { selectSvc(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = svcTabs[(i + 1) % svcTabs.length];
        if (e.key === 'ArrowLeft') n = svcTabs[(i - 1 + svcTabs.length) % svcTabs.length];
        if (n) { e.preventDefault(); selectSvc(n, true); }
      });
    });
    window.addEventListener('resize', function () {
      moveInk(document.querySelector('.svc-tab[aria-selected="true"]'));
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { moveInk(document.querySelector('.svc-tab[aria-selected="true"]')); });
    }
  }

  function openService(id) {
    var card = document.getElementById(id);
    if (!card || !card.classList.contains('service-card')) return null;
    var panel = card.closest('.svc-panel');
    if (panel && panel.hidden) {
      var tab = document.querySelector('.svc-tab[aria-controls="' + panel.id + '"]');
      if (tab) selectSvc(tab, false);
    }
    card.classList.remove('is-flash');
    void card.offsetWidth;
    card.classList.add('is-flash');
    return card;
  }
  // Capture phase: open the right tab before the smooth-scroll handler runs.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="#svc-"]');
    if (!a) return;
    var href = a.getAttribute('href');
    var id = href.split('#')[1];
    if (href.charAt(0) === '#' || location.pathname === '/' || /index\.html$/.test(location.pathname)) openService(id);
  }, true);
  if (location.hash.indexOf('#svc-') === 0) {
    var landed = openService(location.hash.slice(1));
    if (landed) setTimeout(function () { landed.scrollIntoView({ block: 'center' }); }, 80);
  }

  // ---------------------------------------------------------------
  // Motion system. Everything stays visible unless JS + motion are on.
  // ---------------------------------------------------------------
  if (motion) {
    // 1. Split headings into words for a masked line reveal.
    var headingSel = [
      '.hero-copy h1', '.story-hero h1', '.section-head h2', '.about-copy h2', '.why-copy h2',
      '.compare-copy h2', '.faq-head h2', '.contact-head h2', '.detail-copy h2', '.loc-area-grid h2', '.big-quote p', '.story-cta-inner h2'
    ].join(',');

    var wordIndex;
    var wrapWords = function (node, parent) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            var outer = document.createElement('span');
            outer.className = 'w';
            var inner = document.createElement('span');
            inner.className = 'wi';
            inner.style.setProperty('--wi', wordIndex++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'svg' && child.tagName !== 'BR') {
          if (child.classList.contains('hl')) {
            // Keep the underlined phrase together so its SVG stays aligned.
            var outer = document.createElement('span');
            outer.className = 'w w-hl';
            var inner = document.createElement('span');
            inner.className = 'wi';
            inner.style.setProperty('--wi', wordIndex++);
            child.parentNode.insertBefore(outer, child);
            inner.appendChild(child);
            outer.appendChild(inner);
          } else {
            wrapWords(child);
          }
        }
      });
    };

    document.querySelectorAll(headingSel).forEach(function (h) {
      wordIndex = 0;
      wrapWords(h);
      h.classList.add('split');
      h.setAttribute('data-reveal', '');
    });

    // 2. Generic reveal targets, staggered inside their group.
    var groups = [
      '.trust-row p', '.service-card', '.persona', '.wealth-path li', '.tax-line', '.detail-copy > *:not(h2)', '.detail-card', '.jump-card', '.loc-card', '.chips li', '.person-mini', '.loc-svc', '.loc-area-text', '.crumbs', '.serve-card', '.steps li', '.team-card', '.person', '.roots-card',
      '.promise', '.chapter-list li', '.faq-item', '.office-card', '.map-card', '.story-facts p', '.year-stop',
      '.footer-grid > div', '.section-sub', '.section-head .eyebrow', '.about-copy > p, .about-copy > a, .signature-row',
      '.why-copy > p, .why-copy .signature-row', '.compare-copy > p', '.contact-head > p', '.quote-sub', '.ask-card',
      '.hero-copy > *:not(h1)', '.story-hero-copy > *:not(h1)',
      '.year-panel', '.story-cta-actions', '.story-cta-inner > div > p', '.compare-table tbody tr'
    ];
    groups.forEach(function (sel) {
      var list = document.querySelectorAll(sel);
      list.forEach(function (el, i) {
        if (el.hasAttribute('data-reveal')) return;
        el.setAttribute('data-reveal', '');
        el.style.setProperty('--i', i % 6);
      });
    });

    // 3. Image mask reveals.
    document.querySelectorAll('.hero-photo-frame, .portrait-photo, .serve-strip img, .team-photo, .person-photo, .story-logo img, .ask-card img, .compare-table')
      .forEach(function (el) { el.setAttribute('data-reveal-img', ''); });

    var reveal = function (el) { el.classList.add('in'); };
    // Clipped images report no intersection, so watch their parent instead.
    var watchTarget = function (el) {
      return el.hasAttribute('data-reveal-img') && el.parentElement ? el.parentElement : el;
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            (entry.target.__revealTargets || [entry.target]).forEach(reveal);
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
      document.querySelectorAll('[data-reveal], [data-reveal-img]').forEach(function (el) {
        var t = watchTarget(el);
        t.__revealTargets = t.__revealTargets || [];
        if (t === el && t.__revealTargets.indexOf(el) === -1) t.__revealTargets.push(el);
        if (t !== el) t.__revealTargets.push(el);
        io.observe(t);
      });
    } else {
      document.querySelectorAll('[data-reveal], [data-reveal-img]').forEach(reveal);
    }

    // Safety net: anything already above the fold on load is revealed at once.
    requestAnimationFrame(function () {
      document.querySelectorAll('[data-reveal], [data-reveal-img]').forEach(function (el) {
        var r = watchTarget(el).getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      });
    });

    // 4. Count-up numbers.
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var from = parseInt(el.getAttribute('data-count-from') || '0', 10);
      var done = false;
      var run = function () {
        if (done) return;
        done = true;
        var start = null;
        var dur = 1400;
        var step = function (t) {
          if (!start) start = t;
          var p = Math.min(1, (t - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(from + (target - from) * eased);
          if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = from;
        requestAnimationFrame(step);
      };
      if ('IntersectionObserver' in window) {
        var cio = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) { run(); cio.disconnect(); }
        }, { threshold: 0.6 });
        cio.observe(el);
      }
    });

    // 5. Timeline: light up chapters one after another.
    var chapters = document.querySelector('.chapter-list');
    if (chapters && 'IntersectionObserver' in window) {
      var tio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          chapters.classList.add('is-lit');
          tio.disconnect();
        }
      }, { threshold: 0.35 });
      tio.observe(chapters);
    }

    // 6. Magnetic primary buttons and hero parallax (mouse only).
    if (finePointer) {
      document.querySelectorAll('.button-primary, .button-nav').forEach(function (btn) {
        btn.addEventListener('pointermove', throttle(function (e) {
          var r = btn.getBoundingClientRect();
          var x = (e.clientX - r.left - r.width / 2) / r.width;
          var y = (e.clientY - r.top - r.height / 2) / r.height;
          btn.style.translate = (x * 8).toFixed(1) + 'px ' + (y * 6).toFixed(1) + 'px';
        }));
        btn.addEventListener('pointerleave', function () { btn.style.translate = ''; });
      });

      var hero = document.querySelector('.hero, .story-hero');
      if (hero) {
        var layers = hero.querySelectorAll('[data-depth]');
        hero.addEventListener('pointermove', throttle(function (e) {
          var r = hero.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          layers.forEach(function (l) {
            var d = parseFloat(l.getAttribute('data-depth'));
            l.style.translate = (x * d).toFixed(1) + 'px ' + (y * d).toFixed(1) + 'px';
          });
        }));
        hero.addEventListener('pointerleave', function () {
          layers.forEach(function (l) { l.style.translate = ''; });
        });
      }

      // Subtle 3D tilt on team cards.
      document.querySelectorAll('.person, .team-card').forEach(function (card) {
        card.addEventListener('pointermove', throttle(function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          card.style.setProperty('--rx', (-y * 3).toFixed(2) + 'deg');
          card.style.setProperty('--ry', (x * 4).toFixed(2) + 'deg');
        }));
        card.addEventListener('pointerleave', function () {
          card.style.setProperty('--rx', '0deg');
          card.style.setProperty('--ry', '0deg');
        });
      });
    }
  }

  // ---------------------------------------------------------------
  // Pause looping animations while they are off screen.
  // ---------------------------------------------------------------
  if ('IntersectionObserver' in window) {
    var loopers = document.querySelectorAll('.marquee, .hero, .story-hero, .contact, .quote-band, [data-status]');
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    }, { rootMargin: '100px 0px' });
    loopers.forEach(function (el) { lio.observe(el); });
  }

  // ---------------------------------------------------------------
  // Service card spotlight follows the cursor
  // ---------------------------------------------------------------
  if (!reduceMotion) {
    document.querySelectorAll('.service-card').forEach(function (card) {
      card.addEventListener('pointermove', throttle(function (event) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (event.clientY - rect.top) + 'px');
      }));
    });
  }

  // ---------------------------------------------------------------
  // A year with Sloan: today marker and milestone panel
  // ---------------------------------------------------------------
  var track = document.querySelector('[data-year]');
  if (track) {
    var today = new Date();
    var start = new Date(today.getFullYear(), 0, 1);
    var end = new Date(today.getFullYear() + 1, 0, 1);
    var progress = (today - start) / (end - start);
    var setProgress = function () { track.style.setProperty('--progress', progress.toFixed(4)); };
    if ('IntersectionObserver' in window && !reduceMotion) {
      var yio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { setProgress(); yio.disconnect(); }
      }, { threshold: 0.4 });
      yio.observe(track);
    } else {
      setProgress();
    }

    var stops = Array.prototype.slice.call(track.querySelectorAll('.year-stop'));
    var panel = track.querySelector('.year-panel');
    var title = track.querySelector('.year-panel-title');
    var text = track.querySelector('.year-panel-text');
    var select = function (stop, focus) {
      stops.forEach(function (s) {
        var on = s === stop;
        s.setAttribute('aria-selected', String(on));
        s.tabIndex = on ? 0 : -1;
      });
      title.innerHTML = stop.getAttribute('data-title');
      text.textContent = stop.getAttribute('data-text');
      panel.classList.remove('is-swapping');
      void panel.offsetWidth;
      panel.classList.add('is-swapping');
      if (focus) stop.focus();
    };
    // Start on "all year": advice is never seasonal.
    select(track.querySelector('.year-allyear') || stops[0], false);
    stops.forEach(function (stop, i) {
      stop.addEventListener('click', function () { select(stop, false); });
      stop.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowRight') next = stops[(i + 1) % stops.length];
        if (event.key === 'ArrowLeft') next = stops[(i - 1 + stops.length) % stops.length];
        if (next) { event.preventDefault(); select(next, true); }
      });
    });
  }

  // ---------------------------------------------------------------
  // Contact: switch the map between offices
  // ---------------------------------------------------------------
  var mapFrame = document.querySelector('.office-grid-stacked .map-card iframe');
  var officeCards = document.querySelectorAll('.office-card[data-map]');
  officeCards.forEach(function (card) {
    var show = function () {
      if (!mapFrame || card.classList.contains('is-active')) return;
      officeCards.forEach(function (c) { c.classList.toggle('is-active', c === card); });
      mapFrame.parentElement.classList.add('is-swapping');
      mapFrame.src = card.getAttribute('data-map');
      mapFrame.title = card.getAttribute('data-map-title');
      mapFrame.addEventListener('load', function done() {
        mapFrame.parentElement.classList.remove('is-swapping');
        mapFrame.removeEventListener('load', done);
      });
    };
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      show();
    });
  });

  // ---------------------------------------------------------------
  // FAQ: one open at a time
  // ---------------------------------------------------------------
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });
})();
