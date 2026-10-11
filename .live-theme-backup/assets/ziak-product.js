/* ══════════════════════════════════════════════════════════
   ZIAK — Product Detail Page behaviour
   - Thumbnail gallery with image swap
   - Zoom lightbox
   - Variant selection (color + size)
   - AJAX add to cart
   - Wishlist toggle
   - Tab switching
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__ziakPdpInit) return;
  window.__ziakPdpInit = true;

  var ADDED_TIMEOUT = 2400;

  /* ── Helpers ── */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  document.addEventListener('DOMContentLoaded', function () {
    var data = window.__ziakProduct;
    if (!data) return;

    var variants    = data.variants || [];
    var productOpts = data.optionNames || [];
    var selected    = {};  // { 'Color': 'Tan Brown', 'Size': 'UK 8' }

    /* Seed from current variant */
    if (data.currentVariant) {
      productOpts.forEach(function (name, i) {
        selected[name] = data.currentVariant['option' + (i + 1)];
      });
    }

    /* ── Thumbnails ── */
    var mainImg = $('#ziak-pdp-main-img');
    var thumbs  = $$('.ziak-pdp__thumb');

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        thumbs.forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
        if (mainImg) {
          mainImg.style.opacity = '0';
          setTimeout(function () {
            mainImg.src = thumb.getAttribute('data-img-url');
            mainImg.alt = thumb.getAttribute('data-img-alt') || '';
            mainImg.style.opacity = '1';
          }, 150);
        }
      });
    });

    /* ── Zoom lightbox ── */
    var zoomBtn     = $('#ziak-pdp-zoom-btn');
    var zoomOverlay = $('#ziak-pdp-zoom-overlay');
    var zoomImg     = $('#ziak-pdp-zoom-img');
    var zoomClose   = $('#ziak-pdp-zoom-close');

    if (zoomBtn && zoomOverlay) {
      zoomBtn.addEventListener('click', function () {
        if (mainImg) zoomImg.src = mainImg.src;
        zoomOverlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
      function closeZoom() {
        zoomOverlay.classList.remove('is-open');
        document.body.style.overflow = '';
      }
      zoomOverlay.addEventListener('click', function (e) {
        if (e.target === zoomOverlay || e.target === zoomClose || e.target.closest('.ziak-pdp__zoom-close')) closeZoom();
      });
      if (zoomClose) zoomClose.addEventListener('click', closeZoom);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && zoomOverlay.classList.contains('is-open')) closeZoom();
      });
    }

    /* ── Variant logic ── */
    function findVariant(opts) {
      for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        var match = true;
        for (var j = 0; j < productOpts.length; j++) {
          if (v['option' + (j + 1)] !== opts[productOpts[j]]) { match = false; break; }
        }
        if (match) return v;
      }
      return null;
    }

    function updateUI(variant) {
      /* Price */
      var priceEl   = $('#ziak-pdp-price');
      var compareEl = $('#ziak-pdp-compare');
      if (priceEl && variant) {
        priceEl.textContent = data.moneyFormat
          ? data.moneyFormat.replace('{{amount}}', (variant.price / 100).toFixed(2))
          : '₹' + (variant.price / 100).toLocaleString('en-IN');
        priceEl.className = 'ziak-pdp__price';
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          priceEl.classList.add('ziak-pdp__price--sale');
          if (compareEl) {
            compareEl.textContent = data.moneyFormat
              ? data.moneyFormat.replace('{{amount}}', (variant.compare_at_price / 100).toFixed(2))
              : '₹' + (variant.compare_at_price / 100).toLocaleString('en-IN');
            compareEl.style.display = '';
          }
        } else if (compareEl) {
          compareEl.style.display = 'none';
        }
      }

      /* ATC button */
      var atcBtn = $('#ziak-pdp-atc');
      if (atcBtn && variant) {
        atcBtn.disabled = !variant.available;
        atcBtn.setAttribute('data-variant-id', variant.id);
        var label = atcBtn.querySelector('.ziak-pdp__atc-label');
        if (label) label.textContent = variant.available ? 'ADD TO CART' : 'SOLD OUT';
      }

      /* SKU */
      var skuEl = $('#ziak-pdp-sku');
      if (skuEl && variant) skuEl.textContent = 'SKU: ' + (variant.sku || 'N/A');

      /* Image */
      if (variant && variant.featured_image) {
        var imgUrl = variant.featured_image.src
          ? variant.featured_image.src.replace(/(\.[a-z]+)\?/, '_1200x$1?')
          : '';
        if (imgUrl && mainImg) {
          mainImg.style.opacity = '0';
          setTimeout(function () {
            mainImg.src = imgUrl;
            mainImg.style.opacity = '1';
          }, 150);
        }
        /* Highlight matching thumbnail */
        thumbs.forEach(function (t) {
          t.classList.remove('is-active');
          var tId = t.getAttribute('data-image-id');
          if (tId && String(variant.featured_image.id) === tId) {
            t.classList.add('is-active');
          }
        });
      }

      /* URL */
      if (variant) {
        var url = window.location.pathname + '?variant=' + variant.id;
        window.history.replaceState({}, '', url);
      }

      /* Mark unavailable sizes */
      updateSizeAvailability();
    }

    function updateSizeAvailability() {
      var sizeChips = $$('.ziak-pdp__size-chip');
      sizeChips.forEach(function (chip) {
        var sizeVal  = chip.getAttribute('data-value');
        var testOpts = {};
        productOpts.forEach(function (name) { testOpts[name] = selected[name]; });
        /* Match any option whose name contains 'size' (handles "Shoe Size" etc.) */
        for (var k = 0; k < productOpts.length; k++) {
          if (productOpts[k].toLowerCase().indexOf('size') !== -1) {
            testOpts[productOpts[k]] = sizeVal;
            break;
          }
        }
        var testVariant = findVariant(testOpts);
        chip.classList.toggle('is-unavailable', !testVariant || !testVariant.available);
      });
    }

    /* ── Color swatches ── */
    $$('.ziak-pdp__swatch').forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        var optName = swatch.getAttribute('data-option-name');
        var value   = swatch.getAttribute('data-value');
        selected[optName] = value;

        /* Update active state */
        $$('.ziak-pdp__swatch').forEach(function (s) { s.classList.remove('is-active'); });
        swatch.classList.add('is-active');

        /* Update label */
        var labelEl = $('#ziak-pdp-color-label');
        if (labelEl) labelEl.textContent = value;

        var variant = findVariant(selected);
        if (variant) updateUI(variant);
      });
    });

    /* ── Size chips ── */
    $$('.ziak-pdp__size-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        /* Allow clicking sold-out sizes — button will show SOLD OUT state */
        var optName = chip.getAttribute('data-option-name');
        var value   = chip.getAttribute('data-value');
        selected[optName] = value;

        $$('.ziak-pdp__size-chip').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');

        var labelEl = $('#ziak-pdp-size-label');
        if (labelEl) labelEl.textContent = value;

        var variant = findVariant(selected);
        if (variant) updateUI(variant);
      });
    });

    /* Initial availability check */
    updateSizeAvailability();

    /* ── Add to Cart (AJAX) ── */
    var atcBtn = $('#ziak-pdp-atc');
    if (atcBtn) {
      atcBtn.addEventListener('click', function () {
        var vid = atcBtn.getAttribute('data-variant-id');
        if (!vid || atcBtn.disabled || atcBtn.classList.contains('is-loading')) return;
        atcBtn.classList.add('is-loading');

        var root = (window.Shopify && window.Shopify.routes) ? window.Shopify.routes.root : '/';
        fetch(root + 'cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: parseInt(vid, 10), quantity: 1 }] })
        })
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function () {
          atcBtn.classList.remove('is-loading');
          atcBtn.classList.add('is-added');
          var label = atcBtn.querySelector('.ziak-pdp__atc-label');
          if (label) label.textContent = '✓ ADDED TO CART';
          refreshCart();
          setTimeout(function () {
            atcBtn.classList.remove('is-added');
            if (label) label.textContent = 'ADD TO CART';
          }, ADDED_TIMEOUT);
        })
        .catch(function () {
          atcBtn.classList.remove('is-loading');
          window.location.href = '/cart';
        });
      });
    }

    /* ── Wishlist toggle (product page) ── */
    var wishBtn = $('#ziak-pdp-wishlist');
    if (wishBtn) {
      /* Sync initial heart state from ZiakWishlist on page load */
      function syncPdpWishState() {
        if (!window.ZiakWishlist) return;
        var key = wishBtn.getAttribute('data-handle') || wishBtn.getAttribute('data-url');
        var inWish = key ? window.ZiakWishlist.has(key) : false;
        wishBtn.classList.toggle('is-liked', inWish);
        var lbl = wishBtn.querySelector('.ziak-pdp__wish-label');
        if (lbl) lbl.textContent = inWish ? 'ADDED TO WISHLIST' : 'ADD TO WISHLIST';
      }

      wishBtn.addEventListener('click', function () {
        if (!window.ZiakWishlist) return;
        /* Always use the ATC button's current variant ID (updated on size chip click) */
        var atcBtn = $('#ziak-pdp-atc');
        var vid = (atcBtn ? atcBtn.getAttribute('data-variant-id') : null)
                  || wishBtn.getAttribute('data-variant-id');
        if (vid) wishBtn.setAttribute('data-variant-id', vid);

        var item = {
          handle:    wishBtn.getAttribute('data-handle')   || '',
          url:       wishBtn.getAttribute('data-url')      || '',
          title:     wishBtn.getAttribute('data-title')    || '',
          subtitle:  wishBtn.getAttribute('data-subtitle') || '',
          image:     wishBtn.getAttribute('data-image')    || '',
          price:     wishBtn.getAttribute('data-price')    || '',
          available: wishBtn.getAttribute('data-available') !== 'false',
          variantId: String(vid || '')
        };
        var nowIn = window.ZiakWishlist.toggle(item);
        wishBtn.classList.toggle('is-liked', nowIn);
        var lbl = wishBtn.querySelector('.ziak-pdp__wish-label');
        if (lbl) lbl.textContent = nowIn ? 'ADDED TO WISHLIST' : 'ADD TO WISHLIST';
      });

      syncPdpWishState();
      document.addEventListener('ziak:wishlist:updated', syncPdpWishState);
    }

    /* ── Tabs ── */
    var tabBtns   = $$('.ziak-pdp__tab-btn');
    var tabPanels = $$('.ziak-pdp__tab-panel');

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        tabBtns.forEach(function (b)   { b.classList.remove('is-active'); });
        tabPanels.forEach(function (p)  { p.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var panel = $('[data-tab-panel="' + target + '"]');
        if (panel) panel.classList.add('is-active');
      });
    });

    /* ── Cart refresh ── */
    function refreshCart() {
      var root = (window.Shopify && window.Shopify.routes) ? window.Shopify.routes.root : '/';
      fetch(root + '?section_id=cart-icon-bubble')
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var bubble = document.getElementById('cart-icon-bubble');
          if (!bubble) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var fresh = doc.getElementById('cart-icon-bubble');
          if (fresh) bubble.innerHTML = fresh.innerHTML;
        })
        .catch(function () {});
      document.dispatchEvent(new CustomEvent('ziak:cart:updated'));
    }

    /* ── Lucide icons ── */
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });
})();
