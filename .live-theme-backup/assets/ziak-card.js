/* ══════════════════════════════════════════════════════════
   ZIAK — Unified Product Card behaviour
   - Size picker popup: shown before ATC when product has sizes
   - Add to Cart (AJAX) with persistent "Added" state
   - Cart counter sync (window.ZiakCart)
   - Exposes window.ziakShowSizePicker for wishlist intercept
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__ziakCardInit) return;
  window.__ziakCardInit = true;

  var CART_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  var CHECK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  var CLOSE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* ── Size Picker (singleton) ──────────────────────────── */

  var _picker     = null;
  var _pickerCard = null;
  var _pickerMode = '';      // 'atc' | 'wishlist'
  var _chosenId   = null;    // selected variant id
  var _chosenAvail = false;

  function buildPicker() {
    if (_picker) return;
    _picker = document.createElement('div');
    _picker.id = 'ziak-size-modal';
    _picker.className = 'ziak-szpk';
    _picker.setAttribute('role', 'dialog');
    _picker.setAttribute('aria-modal', 'true');
    _picker.setAttribute('aria-label', 'Select your size');
    _picker.hidden = true;
    _picker.innerHTML =
      '<div class="ziak-szpk__backdrop"></div>' +
      '<div class="ziak-szpk__sheet">' +
        '<div class="ziak-szpk__head">' +
          '<span class="ziak-szpk__name"></span>' +
          '<button class="ziak-szpk__close" aria-label="Close">' + CLOSE_SVG + '</button>' +
        '</div>' +
        '<p class="ziak-szpk__prompt">SELECT SIZE</p>' +
        '<div class="ziak-szpk__chips"></div>' +
        '<button class="ziak-szpk__cta" disabled>' +
          '<span class="ziak-szpk__cta-label">Choose a size to continue</span>' +
        '</button>' +
      '</div>';

    document.body.appendChild(_picker);

    _picker.querySelector('.ziak-szpk__backdrop').addEventListener('click', closePicker);
    _picker.querySelector('.ziak-szpk__close').addEventListener('click', closePicker);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !_picker.hidden) closePicker();
    });

    _picker.querySelector('.ziak-szpk__cta').addEventListener('click', function () {
      if (!_chosenId || !_chosenAvail) return;
      /* Save ALL module-level vars to locals BEFORE closePicker() clears them */
      var chosenId = _chosenId;
      var card = _pickerCard, mode = _pickerMode;
      closePicker();
      if (mode === 'atc') {
        doATC(chosenId, card);
      } else if (mode === 'wishlist') {
        doWishlist(chosenId, card);
      }
    });
  }

  function openPicker(card, mode) {
    buildPicker();
    _pickerCard = card;
    _pickerMode = mode;
    _chosenId   = null;
    _chosenAvail = false;

    /* Product title */
    var tLink = card.querySelector('.ziak-card__title-link');
    _picker.querySelector('.ziak-szpk__name').textContent =
      tLink ? tLink.textContent.trim() : '';

    /* CTA */
    var cta      = _picker.querySelector('.ziak-szpk__cta');
    var ctaLabel = _picker.querySelector('.ziak-szpk__cta-label');
    cta.disabled = true;
    ctaLabel.textContent = 'Choose a size to continue';

    /* Parse "size:variantId:available|..." — deduplicate by size label */
    var raw     = card.getAttribute('data-size-opts') || '';
    var entries = raw.split('|').filter(Boolean);
    var seen    = {};
    var chips   = _picker.querySelector('.ziak-szpk__chips');
    chips.innerHTML = '';

    entries.forEach(function (entry) {
      var parts = entry.split(':');
      var label = parts[0] || '';
      var vid   = parts[1] || '';
      var avail = parts[2] !== 'false';
      if (seen[label]) return;  // deduplicate same size across colour variants
      seen[label] = true;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ziak-szpk__chip' + (avail ? '' : ' is-unavailable');
      btn.textContent = label;
      if (!avail) btn.title = 'Out of stock';

      btn.addEventListener('click', function () {
        chips.querySelectorAll('.ziak-szpk__chip').forEach(function (c) {
          c.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        _chosenId    = vid;
        _chosenAvail = avail;
        if (avail) {
          cta.disabled = false;
          ctaLabel.textContent = mode === 'atc' ? 'Add to Cart' : 'Save to Wishlist';
        } else {
          cta.disabled = true;
          ctaLabel.textContent = 'Out of Stock';
        }
      });

      chips.appendChild(btn);
    });

    _picker.hidden = false;
    requestAnimationFrame(function () {
      _picker.querySelector('.ziak-szpk__sheet').classList.add('is-open');
    });
    document.body.style.overflow = 'hidden';
  }

  function closePicker() {
    if (!_picker) return;
    _picker.querySelector('.ziak-szpk__sheet').classList.remove('is-open');
    document.body.style.overflow = '';
    var p = _picker;
    setTimeout(function () { p.hidden = true; }, 300);
    _pickerCard = null;
    _pickerMode = '';
    _chosenId   = null;
  }

  /* Expose so ziak-wishlist.js can call it for heart clicks */
  window.ziakShowSizePicker = openPicker;

  /* ── Add to cart ─────────────────────────────────────── */

  function setAdded(btn, added) {
    if (!btn) return;
    var label = btn.querySelector('.ziak-card__atc-label');
    var icon  = btn.querySelector('svg');
    if (added) {
      if (btn.classList.contains('is-added')) return;
      btn.classList.add('is-added');
      if (icon)  icon.outerHTML  = CHECK_ICON;
      if (label) label.textContent = 'Added to Cart';
    } else {
      if (!btn.classList.contains('is-added')) return;
      btn.classList.remove('is-added');
      var i2 = btn.querySelector('svg');
      if (i2)  i2.outerHTML  = CART_ICON;
      var l2 = btn.querySelector('.ziak-card__atc-label');
      if (l2) l2.textContent = 'Add to Cart';
    }
  }

  function doATC(variantId, card) {
    var btn = card ? card.querySelector('[data-ziak-atc]') : null;
    if (btn) btn.classList.add('is-loading');

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: parseInt(variantId, 10), quantity: 1 }] })
    })
    .then(function (res) {
      if (!res.ok) throw new Error('add failed');
      return res.json();
    })
    .then(function () {
      if (btn) {
        btn.setAttribute('data-variant-id', String(variantId));
        setAdded(btn, true);
      }
      if (window.ZiakCart && window.ZiakCart.refresh) window.ZiakCart.refresh();
    })
    .catch(function () {
      window.location.href = '/cart';
    })
    .then(function () {    // finally-equivalent (IE compat)
      if (btn) btn.classList.remove('is-loading');
    });
  }

  /* Called from the size picker confirm after wishlist mode */
  function doWishlist(variantId, card) {
    var heart = card ? card.querySelector('[data-ziak-wishlist]') : null;
    if (!heart || !window.ZiakWishlist) return;
    heart.setAttribute('data-variant-id', String(variantId));
    var item = {
      handle:    heart.getAttribute('data-handle')   || '',
      url:       heart.getAttribute('data-url')      || '',
      title:     heart.getAttribute('data-title')    || '',
      subtitle:  heart.getAttribute('data-subtitle') || '',
      image:     heart.getAttribute('data-image')    || '',
      price:     heart.getAttribute('data-price')    || '',
      available: heart.getAttribute('data-available') !== 'false',
      variantId: String(variantId)
    };
    var nowIn = window.ZiakWishlist.toggle(item);
    heart.classList.toggle('is-liked', nowIn);
  }

  /* ── Cart sync ───────────────────────────────────────── */

  function syncFromCart(cart) {
    if (!cart || !cart.items) return;
    var inCart = {};
    cart.items.forEach(function (it) { inCart[String(it.variant_id)] = true; });
    document.querySelectorAll('.ziak-card__atc[data-variant-id]').forEach(function (btn) {
      setAdded(btn, !!inCart[String(btn.getAttribute('data-variant-id'))]);
    });
  }

  /* ── ATC click delegation ────────────────────────────── */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ziak-atc]');
    if (!btn) return;
    e.preventDefault();
    if (btn.classList.contains('is-loading')) return;

    /* Already in cart → go to cart page */
    if (btn.classList.contains('is-added')) {
      window.location.href = '/cart';
      return;
    }

    var card     = btn.closest('.ziak-card');
    var sizeOpts = card && card.getAttribute('data-size-opts');

    if (sizeOpts) {
      /* Product has size variants → must pick a size first */
      openPicker(card, 'atc');
    } else {
      /* Single-variant or demo card → add immediately */
      var vid = btn.getAttribute('data-variant-id');
      if (!vid) return;
      doATC(vid, card);
    }
  });

  document.addEventListener('ziak:cart:synced', function (e) {
    if (e && e.detail) syncFromCart(e.detail);
  });

  function boot() {
    if (window.ZiakCart && window.ZiakCart.refresh) {
      window.ZiakCart.refresh();
    } else {
      fetch('/cart.js', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(syncFromCart)
        .catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
