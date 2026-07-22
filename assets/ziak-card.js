/* ══════════════════════════════════════════════════════════
   ZIAK — Unified Product Card behaviour
   - Wishlist heart toggle
   - Add to Cart (AJAX) with "Added to Cart" ✓ state
   Uses event delegation so it covers every card on the page,
   including cards cloned by carousels.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__ziakCardInit) return;
  window.__ziakCardInit = true;

  var ADDED_TIMEOUT = 2200;

  var CART_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  var CHECK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  document.addEventListener('click', function (e) {
    /* ── Wishlist ── */
    var heart = e.target.closest('.ziak-card__wishlist');
    if (heart) {
      e.preventDefault();
      e.stopPropagation();
      heart.classList.toggle('is-liked');
      return;
    }

    /* ── Add to cart ── */
    var btn = e.target.closest('[data-ziak-atc]');
    if (!btn) return;

    e.preventDefault();
    var variantId = btn.getAttribute('data-variant-id');
    if (!variantId || btn.classList.contains('is-loading')) return;

    btn.classList.add('is-loading');

    fetch(window.Shopify && window.Shopify.routes ? window.Shopify.routes.root + 'cart/add.js' : '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('add-to-cart failed');
        return res.json();
      })
      .then(function () {
        showAdded(btn);
        refreshCartUI();
      })
      .catch(function () {
        /* Fallback: navigate to the standard cart-add flow */
        window.location.href = '/cart';
      })
      .finally(function () {
        btn.classList.remove('is-loading');
      });
  });

  function showAdded(btn) {
    var label = btn.querySelector('.ziak-card__atc-label');
    var prevText = label ? label.textContent : '';
    var iconEl = btn.querySelector('svg');

    btn.classList.add('is-added');
    if (iconEl) iconEl.outerHTML = CHECK_ICON;
    if (label) label.textContent = 'Added to Cart';

    clearTimeout(btn.__ziakTimer);
    btn.__ziakTimer = setTimeout(function () {
      btn.classList.remove('is-added');
      var freshIcon = btn.querySelector('svg');
      if (freshIcon) freshIcon.outerHTML = CART_ICON;
      var freshLabel = btn.querySelector('.ziak-card__atc-label');
      if (freshLabel) freshLabel.textContent = prevText || 'Add to Cart';
    }, ADDED_TIMEOUT);
  }

  /* Ask the theme's cart components to refresh, if present. */
  function refreshCartUI() {
    var bubble = document.getElementById('cart-icon-bubble');
    fetch((window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/') + '?section_id=cart-icon-bubble')
      .then(function (r) { return r.text(); })
      .then(function (html) {
        if (!bubble) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.getElementById('cart-icon-bubble');
        if (fresh) bubble.innerHTML = fresh.innerHTML;
      })
      .catch(function () {});

    document.dispatchEvent(new CustomEvent('ziak:cart:updated'));
  }
})();
