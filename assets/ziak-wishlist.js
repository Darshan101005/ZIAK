/* ══════════════════════════════════════════════════════════
   ZIAK — Wishlist store (localStorage based, no backend)
   Global API: window.ZiakWishlist
     .all()            -> array of items
     .count()          -> number
     .has(key)         -> boolean
     .add(item)        -> true
     .remove(key)      -> false
     .toggle(item)     -> boolean (true if now in wishlist)
     .clear()
   Item shape:
     { handle, url, title, subtitle, image, price, available, variantId, addedOn }
   Key = handle (falls back to url).
   Fires document event 'ziak:wishlist:updated' { items, count } on change.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.ZiakWishlist) return;

  var KEY = 'ziak_wishlist_v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('ziak:wishlist:updated', {
      detail: { items: list, count: list.length }
    }));
  }
  function keyOf(item) {
    return (item && item.handle && item.handle.length) ? item.handle : (item ? item.url : '');
  }

  var API = {
    all: read,
    count: function () { return read().length; },
    has: function (k) { return read().some(function (i) { return keyOf(i) === k; }); },
    add: function (item) {
      var list = read();
      var k = keyOf(item);
      if (!k) return true;
      if (!list.some(function (i) { return keyOf(i) === k; })) {
        item.addedOn = item.addedOn || Date.now();
        list.push(item);
        write(list);
      }
      return true;
    },
    remove: function (k) {
      write(read().filter(function (i) { return keyOf(i) !== k; }));
      return false;
    },
    toggle: function (item) {
      var k = keyOf(item);
      if (API.has(k)) { API.remove(k); return false; }
      API.add(item);
      return true;
    },
    clear: function () { write([]); }
  };
  window.ZiakWishlist = API;

  /* ── Cart counter (trolley bubble) — injected onto every cart icon ── */
  function updateCartBubbles(count) {
    document.querySelectorAll('a[aria-label="Cart"]').forEach(function (link) {
      link.classList.add('ziak-cart-link');
      var b = link.querySelector('.ziak-cart-count');
      if (!b) {
        b = document.createElement('span');
        b.className = 'ziak-cart-count';
        b.setAttribute('data-ziak-cart-count', '');
        link.appendChild(b);
      }
      b.textContent = count;
      b.style.display = count > 0 ? '' : 'none';
    });
  }
  window.ZiakCart = {
    refresh: function () {
      fetch('/cart.js', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          updateCartBubbles(cart.item_count || 0);
          document.dispatchEvent(new CustomEvent('ziak:cart:synced', { detail: cart }));
        })
        .catch(function () {});
    }
  };

  /* ── Inject small shared styles once (count bubble) ── */
  function injectStyles() {
    if (document.getElementById('ziak-wishlist-styles')) return;
    var css =
      '.ziak-wish-link{position:relative;}' +
      '.ziak-wish-count{position:absolute;top:-7px;right:-9px;min-width:16px;height:16px;padding:0 4px;' +
      'background:#C77B3B;color:#fff;border-radius:9px;font-size:10px;line-height:16px;text-align:center;' +
      'font-weight:700;box-sizing:border-box;pointer-events:none;z-index:5;}' +
      '.ziak-cart-link{position:relative;}' +
      '.ziak-cart-count{position:absolute;top:-7px;right:-9px;min-width:16px;height:16px;padding:0 4px;' +
      'background:#1A1A1A;color:#fff;border-radius:9px;font-size:10px;line-height:16px;text-align:center;' +
      'font-weight:700;box-sizing:border-box;pointer-events:none;z-index:5;}';
    var s = document.createElement('style');
    s.id = 'ziak-wishlist-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function updateBubbles() {
    var c = API.count();
    document.querySelectorAll('[data-ziak-wishlist-count]').forEach(function (el) {
      el.textContent = c;
      el.style.display = c > 0 ? '' : 'none';
    });
  }

  function syncHearts() {
    document.querySelectorAll('.ziak-card__wishlist').forEach(function (btn) {
      var k = btn.getAttribute('data-handle') || btn.getAttribute('data-url');
      if (!k) return;
      btn.classList.toggle('is-liked', API.has(k));
    });
  }

  function itemFromButton(btn) {
    return {
      handle: btn.getAttribute('data-handle') || '',
      url: btn.getAttribute('data-url') || '',
      title: btn.getAttribute('data-title') || '',
      subtitle: btn.getAttribute('data-subtitle') || '',
      image: btn.getAttribute('data-image') || '',
      price: btn.getAttribute('data-price') || '',
      available: btn.getAttribute('data-available') !== 'false',
      variantId: btn.getAttribute('data-variant-id') || ''
    };
  }

  /* ── Click delegation for hearts + cart "move to wishlist" ── */
  document.addEventListener('click', function (e) {
    var heart = e.target.closest('.ziak-card__wishlist');
    if (heart) {
      e.preventDefault();
      e.stopPropagation();

      /* If the card has size variants, let the size picker handle the toggle */
      var card = heart.closest('.ziak-card');
      if (card && card.getAttribute('data-size-opts') && typeof window.ziakShowSizePicker === 'function') {
        window.ziakShowSizePicker(card, 'wishlist');
        return;
      }

      var nowIn = API.toggle(itemFromButton(heart));
      heart.classList.toggle('is-liked', nowIn);
      return;
    }

    var move = e.target.closest('[data-ziak-wishlist-move]');
    if (move) {
      e.preventDefault();
      API.add(itemFromButton(move));
      move.classList.add('is-liked');
      var line = move.getAttribute('data-line');
      if (line) {
        /* Move = add to wishlist + remove that line from the cart, then reload */
        window.location.href = '/cart/change?line=' + encodeURIComponent(line) + '&quantity=0';
      }
      return;
    }
  });

  document.addEventListener('ziak:wishlist:updated', function () {
    updateBubbles();
    syncHearts();
  });

  function boot() {
    injectStyles();
    updateBubbles();
    syncHearts();
    window.ZiakCart.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
