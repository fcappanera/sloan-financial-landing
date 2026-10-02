(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var copyrightYear = document.getElementById('copyright-year');
  if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();

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
    nav.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function () {
        setDrawer(false);
        closeMenus();
      });
    });
  }

  // Header condenses after scrolling a little.
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

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
    var open = 9 * 60;
    var close = 16 * 60 + 30;
    var isOpen = isWeekday && now.minutes >= open && now.minutes < close;
    var text;
    if (isOpen) {
      text = 'Open now · until 4:30 pm';
    } else if (isWeekday && now.minutes < open) {
      text = 'Closed · opens today at 9:00 am';
    } else if (now.day === 'Fri' || now.day === 'Sat' || now.day === 'Sun') {
      text = 'Closed · opens Monday at 9:00 am';
    } else {
      text = 'Closed · opens tomorrow at 9:00 am';
    }
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', isOpen);
      var label = el.querySelector('.status-text');
      if (label) label.textContent = text;
    });
  }

  updateStatus();
  setInterval(updateStatus, 60000);

  // ---------------------------------------------------------------
  // Service card spotlight follows the cursor
  // ---------------------------------------------------------------
  if (!reduceMotion) {
    document.querySelectorAll('.service-card').forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (event.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (event.clientY - rect.top) + 'px');
      });
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
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          setProgress();
          io.disconnect();
        }
      }, { threshold: 0.4 });
      io.observe(track);
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

    // Start on the milestone closest to today.
    var month = today.getMonth() + 1;
    var current = stops[0];
    stops.forEach(function (s) {
      if (parseFloat(s.style.getPropertyValue('--m')) <= month + 0.5) current = s;
    });
    select(current, false);

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
