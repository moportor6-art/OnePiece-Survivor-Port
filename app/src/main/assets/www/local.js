// Capa local del port (lo único nuestro dentro del juego; el resto es la web original de PXVLO sin tocar).
// - Todo en el teléfono: sin service worker, sin sincronización en la nube, sin enlaces que saquen del juego.
// - Opciones → APP: versión, «Buscar actualización» y «Volver a la versión de la app» (puente OPNative, Updater.java).
// - Atrás de Android (lo llama MainActivity: window.psBack): cierra la ventana abierta, pausa la partida o, en el
//   menú, pide salir.
// En Windows (Port Launcher) no hay puente: el panel no sale y el launcher se encarga de actualizar.
(function () {
  'use strict';
  var NATIVE = window.OPNative || null;

  // ─── 1. Sin service worker: la app sirve los archivos y el actualizador decide qué versión va ───
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function () { return Promise.reject(new Error('port offline')); };
      navigator.serviceWorker.getRegistrations && navigator.serviceWorker.getRegistrations()
        .then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});
    }
  } catch (e) { /* nada */ }

  // ─── 2. Nada sale a internet: la nube (api/) responde «sin conexión» al instante ───
  var f0 = window.fetch;
  window.fetch = function (u) {
    var url = typeof u === 'string' ? u : (u && u.url) || '';
    if (/(^|\/)api\//.test(url) || (/^https?:\/\//.test(url) && url.indexOf(location.host) < 0)) {
      return Promise.reject(new TypeError('offline'));
    }
    return f0.apply(this, arguments);
  };
  window.open = function () { return null; };
  function sinEnlaces(root) {
    var as = (root || document).querySelectorAll('a[href]');
    for (var i = 0; i < as.length; i++) {
      var h = as[i].getAttribute('href');
      if (/^(https?:)?\/\//.test(h) && h.indexOf(location.host) < 0) {
        as[i].removeAttribute('href'); as[i].removeAttribute('target'); as[i].style.pointerEvents = 'none';
      }
    }
  }

  // ─── 3. Opciones: la sección CUENTA (nube y Google) se cambia por APP (actualizaciones) ───
  var css = document.createElement('style');
  css.textContent = '.opt-account,#google-slot{display:none!important}'
    + '.op-upd{margin-top:6px;padding:10px 12px;border:2px solid rgba(255,214,90,.35);border-radius:10px;background:rgba(0,0,0,.25);font-size:14px;line-height:1.35}'
    + '.op-upd p{margin:0 0 8px}.op-upd button{font:inherit;font-weight:700;margin:4px 6px 0 0;padding:7px 12px;border-radius:8px;border:2px solid #ffd65a;background:#ffd65a;color:#1b1206;cursor:pointer}'
    + '.op-upd button.ghost{background:transparent;color:#ffd65a}';
  document.head.appendChild(css);

  var box = null;
  function panel() {
    var scr = document.getElementById('options-screen');
    if (!NATIVE || !scr || scr.style.display === 'none') return;
    var col = scr.querySelectorAll('.opt-col'); col = col[col.length - 1];
    if (!col || (box && box.parentNode === col)) return;
    var info = {};
    try { info = JSON.parse(NATIVE.updInfo()); } catch (e) { /* nada */ }
    var sec = document.createElement('div');
    sec.className = 'op-section'; sec.innerHTML = '<span>APP</span>';
    box = document.createElement('div');
    box.className = 'op-upd';
    box.innerHTML = '<p>One Piece Survivor (port offline) ' + (info.name || '')
      + (info.active ? ' · contenido al día: build ' + info.active : '')
      + '. Al actualizar solo se baja lo que cambió.</p>'
      + '<button data-u="check">Buscar actualización</button>'
      + (info.active ? '<button class="ghost" data-u="reset">Volver a la versión de la app</button>' : '');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.u === 'check') NATIVE.updCheck();
      if (b.dataset.u === 'reset') NATIVE.updReset();
    });
    col.appendChild(sec); col.appendChild(box);
    box._sec = sec;
  }
  function quitarPanel() {
    if (box && box.parentNode) { box.parentNode.removeChild(box); if (box._sec && box._sec.parentNode) box._sec.parentNode.removeChild(box._sec); }
    box = null;
  }

  // ─── 4. Atrás de Android ───
  function visible(id) { var el = document.getElementById(id); return !!el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none'; }
  var CIERRES = { 'options-screen': 'closeOptions', 'shop-screen': 'closeShop', 'save-screen': 'closeSavePanel',
    'records-screen': 'closeRecords', 'collection-screen': 'closeCollection', 'achievements-screen': 'closeAchievements' };
  window.psBack = function () {
    for (var id in CIERRES) if (visible(id) && typeof window[CIERRES[id]] === 'function') { window[CIERRES[id]](); return 'closed'; }
    if (visible('controls-screen')) { document.getElementById('controls-screen').style.display = 'none'; return 'closed'; }
    if (typeof gameState !== 'undefined') {
      if (gameState === 'PLAYING') { togglePause(); return 'paused'; }
      if (gameState === 'PAUSED' && visible('pause-screen')) { resumeGame(); return 'resumed'; }
    }
    return 'exit';
  };

  // ─── Arranque: vigila las pantallas y avisa al actualizador de que esta versión arrancó bien ───
  var avisado = false;
  setInterval(function () {
    sinEnlaces();
    if (visible('options-screen')) panel(); else quitarPanel();
    if (!avisado && NATIVE && typeof gameState !== 'undefined' && document.getElementById('start-screen')) {
      avisado = true;
      try { NATIVE.updBooted(); } catch (e) { /* nada */ }
    }
  }, 500);
})();
