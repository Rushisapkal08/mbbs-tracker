/* MBBS Tracker – PWA glue: registers the service worker and offers "install" help.
 * Does nothing inside the Android (Capacitor) app, so the same files can power both. */
(function () {
  'use strict';

  var cap = window.Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return;

  /* ---- service worker ---- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        // pick up new releases when the app is reopened / brought back to the foreground
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) reg.update().catch(function () {});
        });
      }).catch(function (e) { console.warn('Service worker registration failed:', e); });
    });
  }

  /* ---- install helper ---- */
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  if (standalone) return; // already installed

  var KEY = 'lt_pwa_hide', HIDE_DAYS = 14;
  function hidden() {
    try { var t = +localStorage.getItem(KEY); return t && Date.now() - t < HIDE_DAYS * 864e5; } catch (e) { return false; }
  }
  function remember() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  if (hidden()) return;

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isMacSafari = !isIOS && /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua);

  var bar = null;
  function close() { if (bar) { bar.remove(); bar = null; } }

  function show(text, actionLabel, onAction) {
    if (bar || !document.body) return;
    bar = document.createElement('div');
    bar.setAttribute('role', 'dialog');
    bar.style.cssText =
      'position:fixed;left:12px;right:12px;max-width:736px;margin:auto;z-index:6;' +
      'bottom:calc(env(safe-area-inset-bottom,0px) + 84px);display:flex;align-items:center;gap:10px;' +
      'padding:12px 14px;border-radius:16px;background:var(--card,#fff);color:var(--tx,#1d1d1b);' +
      'border:1px solid var(--bd,#e2e2dc);box-shadow:0 10px 30px rgba(0,0,0,.22);font-size:13px;line-height:1.35';

    var msg = document.createElement('div');
    msg.style.cssText = 'flex:1;min-width:0';
    msg.textContent = text;
    bar.appendChild(msg);

    if (actionLabel) {
      var go = document.createElement('button');
      go.textContent = actionLabel;
      go.style.cssText = 'background:var(--ac,#6d28d9);color:var(--donetx,#fff);border:0;font-weight:600;padding:8px 14px;border-radius:10px';
      go.onclick = onAction;
      bar.appendChild(go);
    }

    var x = document.createElement('button');
    x.textContent = '✕';
    x.setAttribute('aria-label', 'Dismiss');
    x.style.cssText = 'background:none;border:0;color:var(--mut,#6b6b66);font-size:16px;padding:6px';
    x.onclick = function () { remember(); close(); };
    bar.appendChild(x);

    document.body.appendChild(bar);
  }

  // Chrome / Edge / Android: real install prompt
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    show('Install MBBS Tracker for quick access and offline use.', 'Install', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function (c) {
        deferred = null; close();
        if (c && c.outcome !== 'accepted') remember();
      });
    });
  });
  window.addEventListener('appinstalled', function () { deferred = null; close(); });

  // Safari has no install prompt, so show instructions instead
  function safariHint() {
    if (isIOS) show('Install: tap the Share button, then “Add to Home Screen”.');
    else if (isMacSafari) show('Install: in Safari choose File → Add to Dock.');
  }
  if (isIOS || isMacSafari) {
    window.addEventListener('load', function () { setTimeout(safariHint, 2500); });
  }
})();
