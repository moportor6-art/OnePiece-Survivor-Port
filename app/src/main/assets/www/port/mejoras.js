// ─── Mejoras del port (One Piece Survivor) ───────────────────────────────────────────────
// Todo lo nuestro va aquí y en port/mejoras.css; el código de PXVLO no se toca (solo los 3 ganchos de
// tools/parches.py). Se carga después del juego. Cada mejora va en su propio bloque con try/catch: si una
// actualización del juego cambia algo que necesita, esa mejora se apaga sola y el juego sigue normal.
//   1. Opciones del port (Opciones → PORT) · 2. Críticos en rojo y contador · 3. Límite de FPS
//   4. Joystick fijo o flotante, tamaño, zona muerta y vibración · 5. Daño por técnica (pausa y final)
//   6. Minimapa · 7. Editor del HUD (desde la pausa) · 8. Misiones diarias y semanales · 9. Historial
(function () {
  'use strict';
  var KEY = 'op_port_opts';
  var DEF = { critRojo: true, critCont: true, critMarca: true, fps: 0, joy: 'flotante', joyTam: 'normal', joyZona: 10,
    vibra: true, mini: true, auto: false, saltar: false, fpsCont: true, dps: true, flechas: true, musBat: 'battle', musMenu: 'menu' };
  var O = {};
  try { O = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { O = Object.assign({}, DEF); }
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(O)); } catch (e) { /* nada */ } aplicar(); }
  var OP = window.OPPort = { o: O, guardar: guardar, run: null };
  function bloque(nombre, fn) { try { fn(); } catch (e) { console.warn('[port] ' + nombre + ' desactivado:', e); } }
  function $(id) { return document.getElementById(id); }
  function visible(id) { var e = $(id); return !!e && e.style.display !== 'none' && getComputedStyle(e).display !== 'none'; }
  function jugando() { return typeof gameState !== 'undefined' && gameState === 'PLAYING'; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nombreTec(k) {
    var p = window.UPGRADE_POOL_MAP && window.UPGRADE_POOL_MAP[k];
    if (p && p.title) return p.title;
    if (typeof EVOLUTIONS !== 'undefined' && EVOLUTIONS[k] && skills[k] && skills[k].evolved) return EVOLUTIONS[k].name;
    return k === 'otros' ? 'Otros' : k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ');
  }
  function aplicar() {
    window.OPCritColor = O.critRojo ? '#ff3b30' : '#facc15';
    document.body.classList.toggle('op-sin-critcont', !O.critCont);
    document.body.classList.toggle('op-sin-mini', !O.mini);
    if (OP.aplicarExtras) OP.aplicarExtras();
    if (OP.aplicarHud) OP.aplicarHud();
  }

  // ─── Datos de la partida en curso (se reinician con resetGame) ───
  function nuevaPartida() { OP.run = { golpes: 0, crits: 0, sobre: 0, dano: {}, serie: [], t0: Date.now(), jefes: 0, cofres: 0 }; }
  nuevaPartida();
  bloque('origen del daño', function () {   // fuera de los ataques (técnicas de la tripulación, Gears…) cuenta como «Otros»
    var up = update;
    update = function () { window.__opAtk = null; return up.apply(this, arguments); };   // eslint-disable-line no-global-assign
  });
  bloque('reinicio', function () {
    var r0 = resetGame;
    resetGame = function () { var r = r0.apply(this, arguments); nuevaPartida(); return r; };   // eslint-disable-line no-global-assign
  });

  // ─── 1. Opciones del port ───
  var FILAS = [
    ['sec', 'PORT'],
    ['tog', 'critRojo', 'Críticos en rojo', 'el número del golpe crítico', 'crit'],
    ['tog', 'critMarca', 'Marca «!» en los críticos', '', 'crit'],
    ['tog', 'critCont', 'Contador de críticos', 'en la partida', 'power'],
    ['sel', 'fps', 'Límite de FPS', [[0, 'Sin límite'], [120, '120'], [60, '60'], [30, '30 (ahorro)']], 'gauge'],
    ['sel', 'joy', 'Joystick', [['flotante', 'Flotante (donde toques)'], ['fijo', 'Fijo (abajo a la izquierda)']], 'pad'],
    ['sel', 'joyTam', 'Tamaño del joystick', [['chico', 'Chico'], ['normal', 'Normal'], ['grande', 'Grande']], 'pad'],
    ['sel', 'joyZona', 'Zona muerta', [[0, 'Ninguna'], [10, '10%'], [20, '20%'], [30, '30%']], 'pad'],
    ['tog', 'vibra', 'Vibración', 'golpes, nivel y jefes', 'sound'],
    ['tog', 'mini', 'Minimapa', 'cofres y jefes', 'ship'],
    ['tog', 'flechas', 'Flechas al jefe y los cofres', 'en el borde de la pantalla', 'ship'],
    ['tog', 'auto', 'Auto-aprender', 'elige las mejoras sin pausar (botón AUTO en partida)', 'up'],
    ['tog', 'saltar', 'Saltar animaciones', 'ruleta de cofres y evoluciones', 'fastforward'],
    ['tog', 'dps', 'Daño por segundo en vivo', '', 'power'],
    ['tog', 'fpsCont', 'Contador de FPS', '', 'gauge'],
    ['sel', 'musBat', 'Música de batalla', [['battle', 'Batalla'], ['menu', 'La del menú'], ['alterna', 'Alternar en cada partida']], 'sound'],
    ['sel', 'musMenu', 'Música del menú', [['menu', 'Menú'], ['battle', 'La de batalla']], 'sound'],
  ];
  bloque('opciones', function () {
    var caja = null;
    function crear() {
      var cols = document.querySelectorAll('#options-screen .opt-col');
      var col = cols[cols.length - 1];
      if (!col) return;
      caja = document.createElement('div');
      caja.className = 'op-port';
      var h = '';
      FILAS.forEach(function (f) {
        if (f[0] === 'sec') h += '<div class="op-section"><span>' + f[1] + '</span></div>';
        var ic = '<span class="op-ic">' + ((typeof ICONS !== 'undefined' && ICONS[f[4]]) || '') + '</span>';
        if (f[0] === 'sec') { /* arriba */ }
        else if (f[0] === 'tog') h += '<label class="op-row op-toggle">' + ic + '<span class="op-lbl">' + f[2]
          + (f[3] ? ' <small>' + f[3] + '</small>' : '') + '</span><input type="checkbox" data-op="' + f[1] + '"' + (O[f[1]] ? ' checked' : '') + '><i></i></label>';
        else h += '<div class="op-row op-select">' + ic + '<label class="op-lbl">' + f[2] + '</label><select data-op="' + f[1] + '">'
          + f[3].map(function (v) { return '<option value="' + v[0] + '"' + (String(O[f[1]]) === String(v[0]) ? ' selected' : '') + '>' + v[1] + '</option>'; }).join('')
          + '</select></div>';
      });
      caja.innerHTML = h;
      caja.addEventListener('change', function (e) {
        var k = e.target.dataset.op;
        if (!k) return;
        var v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (typeof DEF[k] === 'number') v = +v;
        O[k] = v; guardar();
        if (typeof playSound === 'function') playSound('ui');
      });
      col.insertBefore(caja, col.querySelector('.opt-account'));
    }
    setInterval(function () { if (visible('options-screen') && (!caja || !caja.isConnected)) crear(); }, 400);
  });

  // ─── 2. Críticos: rojo, «!», contador y récord ───
  bloque('criticos', function () {
    var cd = calculateDamage;
    calculateDamage = function () {   // eslint-disable-line no-global-assign
      var r = cd.apply(this, arguments);
      if (r.isCrit && player.critDmgBonus) r.amount = Math.round(r.amount * (2 + player.critDmgBonus) / 2);   // Golpe crítico (tienda)
      var R = OP.run;
      R.golpes++;
      if (r.isCrit) R.crits++;
      if (r.isOvercrit) R.sobre++;
      var A = window.__opAtk, k = (A && (A.id || A.vis || A.type)) || 'otros';
      R.dano[k] = (R.dano[k] || 0) + r.amount;
      return r;
    };
    var sd = spawnDamageText;
    spawnDamageText = function (x, y, info) {   // eslint-disable-line no-global-assign
      var r = sd.apply(this, arguments);
      if (O.critMarca && info && info.isCrit && damageTexts.length) {
        var d = damageTexts[damageTexts.length - 1];
        if (d && typeof d.text === 'number') d.text = d.text + '!';
      }
      return r;
    };
    var el = document.createElement('div');
    el.id = 'op-crit';
    el.innerHTML = '<b>CRÍTICOS</b> <span id="op-crit-n">0</span> <small id="op-crit-p">0%</small>';
    ($('ui-layer') || document.body).appendChild(el);
    setInterval(function () {
      var R = OP.run;
      el.style.display = jugando() || (typeof gameState !== 'undefined' && gameState === 'PAUSED') ? '' : 'none';
      $('op-crit-n').textContent = R.crits + (R.sobre ? ' (+' + R.sobre + ')' : '');
      if (OP.dpsTxt) OP.dpsTxt();
      $('op-crit-p').textContent = (R.golpes ? Math.round(R.crits * 100 / R.golpes) : 0) + '%';
    }, 250);
  });

  // ─── 3. Límite de FPS (y que la calidad automática no lo confunda con un teléfono lento) ───
  bloque('fps', function () {
    var gl = gameLoop, ult = 0;
    gameLoop = function (now) {   // eslint-disable-line no-global-assign
      var lim = +O.fps;
      if (lim > 0 && ult && now - ult < 1000 / lim - 2) { requestAnimationFrame(gameLoop); return; }
      ult = now;
      return gl.apply(this, arguments);
    };
    var pt = perfTick;
    perfTick = function () { if (+O.fps > 0 && +O.fps < 55) return; return pt.apply(this, arguments); };   // eslint-disable-line no-global-assign
  });

  // ─── 4. Joystick y vibración ───
  function vibrar(ms) { try { if (O.vibra && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ } }
  bloque('joystick', function () {
    var TAM = { chico: 0.78, normal: 1, grande: 1.3 };
    window.addEventListener('touchstart', function (e) {   // va después del del juego: ajusta lo que él acaba de hacer
      if (!joystick.active) return;
      JOY_HALF = Math.round((compactHUD() ? 50 : 65) * (TAM[O.joyTam] || 1));
      var z = joystickZone;
      z.style.width = z.style.height = (JOY_HALF * 2) + 'px';
      var t = null;
      for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === joystick.touchId) t = e.changedTouches[i];
      if (!t) return;
      if (O.joy === 'fijo') {
        var cx = 24 + JOY_HALF + (window.visualViewport ? 0 : 0), cy = innerHeight - 24 - JOY_HALF;
        z.style.left = (cx - JOY_HALF) + 'px'; z.style.top = (cy - JOY_HALF) + 'px';
        joystickDelta(t.clientX, t.clientY, cx, cy);
      } else {
        z.style.left = (t.clientX - JOY_HALF) + 'px'; z.style.top = (t.clientY - JOY_HALF) + 'px';
        joystickDelta(t.clientX, t.clientY, t.clientX, t.clientY);
      }
      zona();
    }, { passive: true });
    function zona() {
      var dz = (+O.joyZona || 0) / 100, m = Math.hypot(joystick.dx, joystick.dy);
      if (m < dz) { joystick.dx = 0; joystick.dy = 0; }
      else if (dz > 0) { var k = (m - dz) / (1 - dz) / m; joystick.dx *= k; joystick.dy *= k; }
    }
    window.addEventListener('touchmove', function () { if (joystick.active) zona(); }, { passive: true });
    // Vibración: golpes recibidos, subir de nivel y llegada del jefe
    var hp0 = null, ultV = 0;
    setInterval(function () {
      if (!jugando() || typeof player === 'undefined') { hp0 = null; return; }
      if (hp0 !== null && player.hp < hp0 - 0.5 && Date.now() - ultV > 260) { ultV = Date.now(); vibrar(25); }
      hp0 = player.hp;
    }, 120);
    var lu = levelUp;
    levelUp = function () { vibrar([30, 40, 30]); return lu.apply(this, arguments); };   // eslint-disable-line no-global-assign
    var sb = spawnBoss;
    spawnBoss = function () { vibrar([80, 60, 160]); OP.run.jefes++; return sb.apply(this, arguments); };   // eslint-disable-line no-global-assign
  });

  // ─── 5. Daño por técnica: en la pausa y al terminar (con gráfica de daño por minuto) ───
  function tablaDano(R, max) {
    var lista = Object.keys(R.dano).map(function (k) { return [k, R.dano[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var tot = lista.reduce(function (a, v) { return a + v[1]; }, 0) || 1;
    var h = '<div class="op-dano">';
    lista.slice(0, max || 8).forEach(function (v) {
      var pc = v[1] * 100 / tot;
      h += '<div class="op-dano-f"><span>' + esc(nombreTec(v[0])) + '</span><i style="width:' + pc.toFixed(1) + '%"></i><b>'
        + Math.round(v[1]).toLocaleString('es-ES') + ' · ' + Math.round(pc) + '%</b></div>';
    });
    return h + '</div>';
  }
  function grafica(serie) {
    if (!serie || serie.length < 2) return '';
    var w = 300, hgt = 70, mx = Math.max.apply(null, serie) || 1, n = serie.length;
    var pts = serie.map(function (v, i) { return (i * w / (n - 1)).toFixed(1) + ',' + (hgt - v * (hgt - 6) / mx).toFixed(1); }).join(' ');
    return '<svg class="op-graf" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none"><polyline points="0,' + hgt + ' ' + pts + ' ' + w + ',' + hgt
      + '" fill="rgba(255,59,48,.25)" stroke="#ff3b30" stroke-width="2"/></svg><small class="op-graf-l">Daño por cada 30 s de partida</small>';
  }
  bloque('dano', function () {
    // muestreo del daño total cada 30 s de juego
    var ultT = 0, ultTot = 0;
    setInterval(function () {
      if (!jugando()) return;
      var R = OP.run, tot = 0;
      for (var k in R.dano) tot += R.dano[k];
      if (gameTime - ultT >= 30 || gameTime < ultT) {
        if (gameTime >= ultT) R.serie.push(tot - ultTot);
        ultT = gameTime; ultTot = tot;
      }
    }, 1000);
    function enPausa() {
      var s = $('pause-screen');
      if (!s) return;
      var c = $('op-pausa-dano');
      if (!c) {
        c = document.createElement('div'); c.id = 'op-pausa-dano';
        var dest = s.querySelector('#pause-stats');
        (dest && dest.parentNode ? dest.parentNode : s.querySelector('.op-scroll') || s.firstElementChild).appendChild(c);
      }
      var R = OP.run;
      var evo = '';
      if (typeof EVOLUTIONS !== 'undefined' && typeof skills !== 'undefined') {
        Object.keys(skills).forEach(function (k) {
          var sk = skills[k], ev = EVOLUTIONS[k];
          if (!sk || sk.level <= 0 || !ev || sk.evolved) return;
          var tiene = player.passives && player.passives[ev.passive] > 0;
          evo += '<div class="op-evo"><b>' + esc(nombreTec(k)) + '</b> → ' + esc(ev.name) + ' <small>' + (sk.level >= 8 ? 'nivel ✔' : 'nivel ' + sk.level + '/8')
            + ' · ' + esc(nombreTec(ev.passive)) + ' ' + (tiene ? '✔' : '✗') + '</small></div>';
        });
      }
      c.innerHTML = '<div class="op-section"><span>CRÍTICOS</span></div><div class="op-crit-res">' + R.crits + ' de ' + R.golpes + ' golpes ('
        + (R.golpes ? Math.round(R.crits * 100 / R.golpes) : 0) + '%)' + (R.sobre ? ' · ' + R.sobre + ' sobrecríticos' : '')
        + ' · probabilidad ' + Math.round((player.critChance || 0) * 100) + '%</div>'
        + '<div class="op-section"><span>DAÑO POR TÉCNICA</span></div>' + tablaDano(R)
        + (evo ? '<div class="op-section"><span>EVOLUCIONES EN CAMINO</span></div>' + evo : '');
    }
    var tp = togglePause;
    togglePause = function () { var r = tp.apply(this, arguments); try { enPausa(); } catch (e) { /* nada */ } return r; };   // eslint-disable-line no-global-assign
    // Al terminar (derrota o victoria): medidor y gráfica debajo de la Ficha de Singladura
    function alFinal(id, gano) {
      var R = OP.run, el = $(id);
      if (!el) return;
      var tot = 0; for (var k in R.dano) tot += R.dano[k];
      var c = document.createElement('div');
      c.className = 'wanted-board op-final';
      c.innerHTML = '<div class="wanted-subtitle">DAÑO DE LA SINGLADURA · ' + Math.round(tot).toLocaleString('es-ES') + ' · '
        + R.crits + ' CRÍTICOS</div>' + tablaDano(R, 6) + grafica(R.serie);
      el.appendChild(c);
      if (OP.alTerminar) OP.alTerminar(gano, tot);
    }
    var go = triggerGameOver;
    triggerGameOver = function () {   // eslint-disable-line no-global-assign
      var antes = gameState, r = go.apply(this, arguments);
      if (antes !== 'GAMEOVER' && gameState === 'GAMEOVER') try { alFinal('gameover-summary', false); } catch (e) { /* nada */ }
      return r;
    };
    var tv = triggerVictory;
    triggerVictory = function () {   // eslint-disable-line no-global-assign
      var antes = gameState, r = tv.apply(this, arguments);
      if (antes !== 'VICTORY' && gameState === 'VICTORY') try { alFinal('victory-summary', true); } catch (e) { /* nada */ }
      return r;
    };
  });

  // ─── 6. Minimapa (enemigos, élites, jefes y cofres alrededor) ───
  bloque('minimapa', function () {
    var cv = document.createElement('canvas');
    cv.id = 'op-mini'; cv.width = 120; cv.height = 120;
    ($('ui-layer') || document.body).appendChild(cv);
    var g = cv.getContext('2d'), R = 900;   // radio de mundo que abarca
    setInterval(function () {
      var on = O.mini && (jugando() || (typeof gameState !== 'undefined' && gameState === 'PAUSED'));
      cv.style.display = on ? '' : 'none';
      if (!on || typeof player === 'undefined') return;
      var W = cv.width, k = W / 2 / R;
      g.clearRect(0, 0, W, W);
      g.fillStyle = 'rgba(8,14,28,.62)'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 1, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,214,90,.7)'; g.lineWidth = 2; g.stroke();
      function punto(x, y, c, r) {
        var dx = (x - player.x) * k, dy = (y - player.y) * k, d = Math.hypot(dx, dy), m = W / 2 - 4;
        if (d > m) { dx *= m / d; dy *= m / d; }
        g.fillStyle = c; g.beginPath(); g.arc(W / 2 + dx, W / 2 + dy, r, 0, 7); g.fill();
      }
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.isBoss) continue;
        if (Math.abs(e.x - player.x) > R || Math.abs(e.y - player.y) > R) continue;
        punto(e.x, e.y, e.isElite || e.isMiniboss ? '#ff9f1a' : 'rgba(255,80,80,.8)', e.isElite || e.isMiniboss ? 2.6 : 1.4);
      }
      for (var j = 0; j < drops.length; j++) if (drops[j].type === 'chest' && !drops[j].opened) punto(drops[j].x, drops[j].y, '#ffd65a', 3.2);
      for (var b = 0; b < enemies.length; b++) if (enemies[b].isBoss) punto(enemies[b].x, enemies[b].y, '#c084fc', 4.6);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, W / 2, 3, 0, 7); g.fill();
    }, 120);
  });

  // ─── 7. Editor del HUD (Pausa → Editar HUD): mover y cambiar el tamaño de cada pieza ───
  bloque('hud', function () {
    var HKEY = 'op_port_hud';
    var PIEZAS = [['.hud-top .player-status', 'Cartel de vida'], ['#time-top', 'Tiempo'], ['#pause-btn', 'Pausa'],
      ['#gear-btn', 'Botón de Gear'], ['#weapons-hud', 'Técnicas'], ['#op-crit', 'Críticos'], ['#op-mini', 'Minimapa'],
      ['#op-auto', 'Botón AUTO'], ['#op-fps', 'FPS']];
    var H = {};
    try { H = JSON.parse(localStorage.getItem(HKEY)) || {}; } catch (e) { H = {}; }
    OP.aplicarHud = function () {
      PIEZAS.forEach(function (p) {
        var el = document.querySelector(p[0]), v = H[p[0]];
        if (!el) return;
        el.style.translate = v ? v.x + 'px ' + v.y + 'px' : '';
        el.style.scale = v && v.s !== 1 ? String(v.s) : '';
      });
    };
    var capa = null;
    function abrir() {
      if (capa) return;
      $('pause-screen').style.display = 'none';
      var pb = $('pause-btn'); if (pb) { pb._opD = pb.style.display; pb.style.display = 'block'; }
      capa = document.createElement('div');
      capa.id = 'op-hud-ed';
      capa.innerHTML = '<div class="op-hud-bar"><b>EDITAR HUD</b> <span>Arrastra cada pieza · toca una y usa − / +</span>'
        + '<button data-a="-">−</button><button data-a="+">+</button><button data-a="r">Restablecer</button><button data-a="ok" class="ok">Listo</button></div>';
      document.body.appendChild(capa);
      var sel = null;
      PIEZAS.forEach(function (p) {
        var el = document.querySelector(p[0]);
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (!r.width) return;
        var m = document.createElement('div');
        m.className = 'op-hud-p'; m.textContent = p[1];
        m.style.left = r.left + 'px'; m.style.top = r.top + 'px'; m.style.width = r.width + 'px'; m.style.height = r.height + 'px';
        capa.appendChild(m);
        var v = H[p[0]] || (H[p[0]] = { x: 0, y: 0, s: 1 });
        m.addEventListener('pointerdown', function (e) {
          e.preventDefault(); sel = { p: p, m: m, v: v };
          capa.querySelectorAll('.op-hud-p').forEach(function (q) { q.classList.toggle('sel', q === m); });
          var sx = e.clientX, sy = e.clientY, ox = v.x, oy = v.y, ml = parseFloat(m.style.left), mt = parseFloat(m.style.top);
          function mov(ev) {
            v.x = Math.round(ox + ev.clientX - sx); v.y = Math.round(oy + ev.clientY - sy);
            m.style.left = (ml + ev.clientX - sx) + 'px'; m.style.top = (mt + ev.clientY - sy) + 'px';
            OP.aplicarHud();
          }
          function fin() { removeEventListener('pointermove', mov); removeEventListener('pointerup', fin); }
          addEventListener('pointermove', mov); addEventListener('pointerup', fin);
        });
      });
      capa.querySelector('.op-hud-bar').addEventListener('click', function (e) {
        var a = e.target.dataset && e.target.dataset.a;
        if (!a) return;
        if (a === 'ok') { cerrar(); return; }
        if (a === 'r') { H = {}; OP.aplicarHud(); cerrar(); abrir(); return; }
        if (!sel) return;
        sel.v.s = Math.max(0.5, Math.min(2, Math.round((sel.v.s + (a === '+' ? 0.1 : -0.1)) * 10) / 10));
        OP.aplicarHud();
      });
    }
    function cerrar() {
      try { localStorage.setItem(HKEY, JSON.stringify(H)); } catch (e) { /* nada */ }
      if (capa) capa.remove();
      capa = null;
      var pb = $('pause-btn'); if (pb && pb._opD !== undefined) pb.style.display = pb._opD;
      $('pause-screen').style.display = 'flex';
    }
    OP.editarHud = abrir;
    var acc = document.querySelector('#pause-screen .pz-actions');
    if (acc) {
      var b = document.createElement('button');
      b.className = 'op-btn'; b.innerHTML = '<span class="op-ic">✥</span><span>Editar HUD</span>';
      b.onclick = abrir;
      acc.insertBefore(b, acc.lastElementChild);
    }
    OP.aplicarHud();
  });

  // ─── 8. Misiones diarias y semanales (premio en Berries) ───
  bloque('misiones', function () {
    var MKEY = 'op_port_misiones';
    var M = {};
    try { M = JSON.parse(localStorage.getItem(MKEY)) || {}; } catch (e) { M = {}; }
    function hoy() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    function semana() { var d = new Date(), j = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + 'w' + Math.ceil(((d - j) / 864e5 + j.getDay() + 1) / 7); }
    // tipo: kills (enemigos), tiempo (segundos sobrevividos), crits, partidas, victorias, jefes, cofres, dano
    var DIARIAS = [['kills', 300, 'Derrota {n} enemigos', 300], ['kills', 800, 'Derrota {n} enemigos', 600], ['crits', 150, 'Asesta {n} críticos', 400],
      ['tiempo', 600, 'Sobrevive {m} minutos en total', 400], ['partidas', 3, 'Juega {n} singladuras', 300], ['jefes', 1, 'Derrota a un jefe', 500],
      ['cofres', 3, 'Abre {n} cofres', 350], ['dano', 50000, 'Causa {n} de daño', 450]];
    var SEMANALES = [['kills', 5000, 'Derrota {n} enemigos', 2500], ['victorias', 3, 'Conquista {n} islas', 3000], ['crits', 1500, 'Asesta {n} críticos', 2000],
      ['jefes', 5, 'Derrota {n} jefes', 3000], ['tiempo', 3600, 'Navega {m} minutos en total', 2500], ['dano', 600000, 'Causa {n} de daño', 3000]];
    function elegir(lista, n, semilla) {
      var s = 0; for (var i = 0; i < semilla.length; i++) s = (s * 31 + semilla.charCodeAt(i)) >>> 0;
      var l = lista.slice(), r = [];
      while (r.length < n && l.length) { s = (s * 1103515245 + 12345) >>> 0; var x = l.splice(s % l.length, 1)[0]; if (!r.some(function (q) { return q[0] === x[0]; })) r.push(x); }
      return r.map(function (q) { return { t: q[0], meta: q[1], txt: q[2], pre: q[3], v: 0, ok: false }; });
    }
    function al_dia() {
      if (!M.d || M.d.id !== hoy()) M.d = { id: hoy(), l: elegir(DIARIAS, 3, hoy()) };
      if (!M.w || M.w.id !== semana()) M.w = { id: semana(), l: elegir(SEMANALES, 3, semana()) };
    }
    function guardarM() { try { localStorage.setItem(MKEY, JSON.stringify(M)); } catch (e) { /* nada */ } }
    al_dia(); guardarM();
    function texto(q) { return q.txt.replace('{n}', q.meta.toLocaleString('es-ES')).replace('{m}', Math.round(q.meta / 60)); }
    function sumar(t, n) {
      al_dia();
      [M.d, M.w].forEach(function (g) { g.l.forEach(function (q) { if (q.t === t && !q.ok) q.v = Math.min(q.meta, q.v + n); }); });
    }
    OP.alTerminar = function (gano, tot) {
      var R = OP.run;
      if (OP.extrasFin) try { OP.extrasFin(gano, tot); } catch (e) { /* nada */ }
      sumar('kills', window.lastRun ? window.lastRun.kills : 0); sumar('tiempo', Math.floor(gameTime)); sumar('crits', R.crits);
      sumar('partidas', 1); if (gano) sumar('victorias', 1); sumar('jefes', R.jefesMuertos || 0); sumar('cofres', R.cofres); sumar('dano', Math.round(tot));
      guardarM();
      if (OP.historial) OP.historial(gano, tot);
      var listas = M.d.l.concat(M.w.l).filter(function (q) { return q.v >= q.meta && !q.ok; }).length;
      if (listas && typeof showAchToast === 'function') setTimeout(function () { showAchToast('◉ MISIONES: ' + listas + ' recompensa(s) lista(s) para cobrar en el menú'); }, 1500);
    };
    // jefes derrotados y cofres abiertos
    var ke = killEnemy;
    killEnemy = function (e) { if (e && e.isBoss && !e._opMuerto) { e._opMuerto = true; OP.run.jefesMuertos = (OP.run.jefesMuertos || 0) + 1; } return ke.apply(this, arguments); };   // eslint-disable-line no-global-assign
    var oc = openChestRoulette;
    openChestRoulette = function () { OP.run.cofres++; return oc.apply(this, arguments); };   // eslint-disable-line no-global-assign
    function cobrar(q) {
      if (q.ok || q.v < q.meta) return 0;
      q.ok = true; meta.beli += q.pre; return q.pre;
    }
    function pantalla() {
      al_dia();
      var s = $('op-misiones');
      if (!s) {
        s = document.createElement('div'); s.id = 'op-misiones'; s.className = 'overlay-screen';
        document.body.appendChild(s);
        s.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          if (b.dataset.c === 'cerrar') { s.style.display = 'none'; $('start-screen').style.display = 'flex'; return; }
          var z = 0;
          if (b.dataset.c === 'todo') M.d.l.concat(M.w.l).forEach(function (q) { z += cobrar(q); });
          else { var p = b.dataset.c.split(':'); z = cobrar(M[p[0]].l[+p[1]]); }
          if (z) { saveMeta(); updateMetaUI(); guardarM(); if (typeof playSound === 'function') playSound('coin'); if (typeof showAchToast === 'function') showAchToast('+' + z.toLocaleString('es-ES') + ' Berries'); }
          pantalla();
        });
      }
      function fila(q, g, i) {
        var pc = Math.round(q.v * 100 / q.meta);
        return '<div class="op-mis"><div><b>' + texto(q) + '</b><small>' + q.v.toLocaleString('es-ES') + ' / ' + q.meta.toLocaleString('es-ES') + ' · ฿' + q.pre.toLocaleString('es-ES') + '</small>'
          + '<i><u style="width:' + pc + '%"></u></i></div>'
          + (q.ok ? '<span class="op-mis-ok">✔</span>' : q.v >= q.meta ? '<button data-c="' + g + ':' + i + '">COBRAR</button>' : '') + '</div>';
      }
      var listas = M.d.l.concat(M.w.l).filter(function (q) { return q.v >= q.meta && !q.ok; }).length;
      s.innerHTML = '<div class="wanted-board op-board"><div class="op-head"><div class="wanted-title op-title">MISIONES</div>'
        + '<div class="wanted-subtitle">RECOMPENSAS EN BERRIES</div></div><div class="op-scroll">'
        + (listas > 1 ? '<button class="op-todo" data-c="todo">COBRAR TODO (' + listas + ')</button>' : '')
        + '<div class="op-section"><span>DIARIAS</span></div>' + M.d.l.map(function (q, i) { return fila(q, 'd', i); }).join('')
        + '<div class="op-section"><span>SEMANALES</span></div>' + M.w.l.map(function (q, i) { return fila(q, 'w', i); }).join('')
        + '</div><button class="btn-start op-foot" data-c="cerrar">VOLVER</button></div>';
      s.style.display = 'flex';
      $('start-screen').style.display = 'none';
    }
    OP.misiones = pantalla;
    var sec = document.querySelector('#start-screen .menu-secondary');
    if (sec) {
      var b = document.createElement('button');
      b.className = 'map-btn'; b.id = 'op-btn-mis'; b.innerHTML = '<span class="op-slot">✦</span> MISIONES <span id="op-mis-n"></span>';
      b.onclick = pantalla;
      sec.insertBefore(b, sec.children[0]);
      setInterval(function () {
        al_dia();
        var n = M.d.l.concat(M.w.l).filter(function (q) { return q.v >= q.meta && !q.ok; }).length;
        $('op-mis-n').textContent = n ? '(' + n + ')' : '';
      }, 1000);
    }
  });

  // ─── 9. Historial de partidas (en Récords) y récord de críticos ───
  bloque('historial', function () {
    var HKEY = 'op_port_historial';
    function leer() { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; } }
    OP.historial = function (gano, tot) {
      var l = leer(), R = OP.run, lr = window.lastRun || {};
      l.unshift({ f: new Date().toISOString().slice(0, 16).replace('T', ' '), c: lr.char || selectedCharacter, m: lr.map || selectedMap, g: !!gano,
        t: Math.round(gameTime), k: lr.kills || 0, n: lr.level || 0, d: Math.round(tot), cr: R.crits, s: R.serie.slice(0, 40) });
      try { localStorage.setItem(HKEY, JSON.stringify(l.slice(0, 30))); } catch (e) { /* nada */ }
    };
    var rr = renderRecords;
    renderRecords = function () {   // eslint-disable-line no-global-assign
      var r = rr.apply(this, arguments);
      var box = $('records-table');
      if (!box) return r;
      var l = leer();
      var masCrit = l.reduce(function (a, x) { return x.cr > (a ? a.cr : -1) ? x : a; }, null);
      var h = '<h3 class="op-hist-t">ÚLTIMAS SINGLADURAS</h3>';
      if (masCrit) h += '<div class="op-hist-rec">Récord de críticos: <b>' + masCrit.cr.toLocaleString('es-ES') + '</b> · ' + esc(masCrit.c) + ' en ' + esc(masCrit.m) + '</div>';
      if (!l.length) h += '<div class="op-hist-v">Todavía no hay partidas registradas.</div>';
      h += '<div class="op-hist">' + l.map(function (x) {
        return '<div class="op-hist-f"><span>' + (x.g ? '★ ' : '') + esc(x.c) + ' · ' + esc(x.m) + '</span><small>' + x.f + '</small><b>' + formatTime(x.t)
          + ' · Nv ' + x.n + ' · ' + x.k + ' K · ' + x.d.toLocaleString('es-ES') + ' daño · ' + x.cr + ' crít.</b>' + grafica(x.s) + '</div>';
      }).join('') + '</div>';
      box.insertAdjacentHTML('beforeend', h);
      return r;
    };
  });

  aplicar();
})();
