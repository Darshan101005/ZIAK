/* ══════════════════════════════════════════════════════════
   ZIAK — Unified Product Card behaviour
   - Add to Cart (AJAX) with a PERSISTENT "Added to Cart" ✓ state
     (stays until the item is removed/cleared from the cart)
   - Keeps the header cart counter in sync (via window.ZiakCart)
   Wishlist hearts are handled globally by ziak-wishlist.js.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__ziakCardInit) return;
  window.__ziakCardInit = true;

  var CART_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
  var CHECK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  /* Apply / clear the "Added to Cart" state on a single button. */
  function setAdded(btn, added) {
    if (!btn) return;
    var label = btn.querySelector('.ziak-card__atc-label');
    var icon = btn.querySelector('svg');
    if (added) {
      if (btn.classList.contains('is-added')) return;
      btn.classList.add('is-added');
      if (icon) icon.outerHTML = CHECK_ICON;
      if (label) label.textContent = 'Added to Cart';
    } else {
      if (!btn.classList.contains('is-added')) return;
      btn.classList.remove('is-added');
      var i2 = btn.querySelector('svg');
      if (i2) i2.outerHTML = CART_ICON;
      var l2 = btn.querySelector('.ziak-card__atc-label');
      if (l2) l2.textContent = 'Add to Cart';
    }
  }

  /* Reflect the current cart contents onto every card button. */
  function syncFromCart(cart) {
    if (!cart || !cart.items) return;
    var inCart = {};
    cart.items.forEach(function (it) { inCart[String(it.variant_id)] = true; });
    document.querySelectorAll('.ziak-card__atc[data-variant-id]').forEach(function (btn) {
      setAdded(btn, !!inCart[String(btn.getAttribute('data-variant-id'))]);
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ziak-atc]');
    if (!btn) return;

    e.preventDefault();
    var variantId = btn.getAttribute('data-variant-id');
    if (!variantId || btn.classList.contains('is-loading')) return;

    /* Already in cart → clicking again takes them to the cart. */
    if (btn.classList.contains('is-added')) {
      window.location.href = '/cart';
      return;
    }

    btn.classList.add('is-loading');

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('add-to-cart failed');
        return res.json();
      })
      .then(function () {
        setAdded(btn, true);
        if (window.ZiakCart && window.ZiakCart.refresh) window.ZiakCart.refresh();
      })
      .catch(function () {
        window.location.href = '/cart';
      })
      .finally(function () {
        btn.classList.remove('is-loading');
      });
  });

  /* Re-sync whenever the global cart helper reports a change. */
  document.addEventListener('ziak:cart:synced', function (e) {
    if (e && e.detail) syncFromCart(e.detail);
  });

  function boot() {
    if (window.ZiakCart && window.ZiakCart.refresh) {
      /* This fetches the cart, updates counters AND fires ziak:cart:synced. */
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
