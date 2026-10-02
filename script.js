(function () {
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

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

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('nav-locked', open);
      if (!open) closeMenus();
    });
  }

  document.addEventListener('click', function (event) {
    if (!event.target.closest('.nav-item')) closeMenus();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMenus();
      if (header && header.classList.contains('nav-open')) toggle.click();
    }
  });

  // Close the mobile drawer after following an in-page link.
  if (nav) {
    nav.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function () {
        if (header.classList.contains('nav-open')) toggle.click();
        closeMenus();
      });
    });
  }

  // Placeholder links (client login, Form CRS) until the real destinations exist.
  document.querySelectorAll('[data-placeholder]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      var label = link.getAttribute('data-placeholder') === 'form-crs' ? 'Form CRS' : 'Client login';
      link.setAttribute('title', label + ' link coming soon');
      link.classList.add('placeholder-hit');
      setTimeout(function () { link.classList.remove('placeholder-hit'); }, 900);
    });
  });

  // Only one FAQ item open at a time.
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

  // "Who we serve" tabs.
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.serve-tab'));
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (event) {
      var next = null;
      if (event.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { event.preventDefault(); selectTab(next); next.focus(); }
    });
  });

  // Subtle reveal on scroll for cards.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
