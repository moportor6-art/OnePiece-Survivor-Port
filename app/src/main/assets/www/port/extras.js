// ─── Mejoras del port, segunda tanda (va después de port/mejoras.js) ───────────────────────────
//   1. Auto-aprender sin pausar (botón AUTO en partida) · 2. Saltar animaciones (cofres y evoluciones)
//   3. Contador de FPS y daño por segundo en vivo · 4. Flechas al jefe y a los cofres
//   5. Radio (qué música suena en batalla y en el menú) · 6. Desafío diario con racha
//   7. Sala de entrenamiento · 8. Estadísticas globales y logros del port (Bitácora)
(function () {
  'use strict';
  var OP = window.OPPort;
  if (!OP) return;
  var O = OP.o;
  function bloque(nombre, fn) { try { fn(); } catch (e) { console.warn('[port] ' + nombre + ' desactivado:', e); } }
  function $(id) { return document.getElementById(id); }
  function estado() { return typeof gameState !== 'undefined' ? gameState : ''; }
  function jugando() { return estado() === 'PLAYING'; }
  function enPartida() { return /^(PLAYING|PAUSED|UPGRADE|ARCANA|CHEST)$/.test(estado()); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString('es-ES'); }
  function toast(t) { if (typeof showAchToast === 'function') showAchToast(t); }
  var CHARS = ['luffy', 'zoro', 'usopp', 'sanji', 'nami', 'chopper', 'robin', 'franky', 'brook', 'jinbe'];
  var CHAR_N = { luffy: 'Luffy', zoro: 'Zoro', usopp: 'Usopp', sanji: 'Sanji', nami: 'Nami', chopper: 'Chopper', robin: 'Robin', franky: 'Franky', brook: 'Brook', jinbe: 'Jinbe' };
  var MAPAS = (typeof RECORD_MAPS !== 'undefined' && RECORD_MAPS) || ['shelltown', 'syrup', 'baratie', 'arlongpark', 'drum', 'alabasta', 'skypiea', 'water7', 'enieslobby', 'thrillerbark', 'marineford', 'wholecake', 'wano'];
  function mapaN(m) { return (typeof RECORD_MAP_NAMES !== 'undefined' && RECORD_MAP_NAMES[m]) || m; }

  // ─── 1. Auto-aprender: elige la mejora en el mismo instante (la partida no llega a pausarse) ───
  bloque('auto-aprender', function () {
    function puntos(card) {
      var id = card.dataset.id, kind = card.dataset.kind;
      if (!id) return 1;   // «Bolsa de Berries»: la única opción
      var sk = skills[id], lv = kind === 'weapon' ? ((sk && sk.level) || 0) : ((player.passives && player.passives[id]) || 0);
      var ev = typeof EVOLUTIONS !== 'undefined' ? EVOLUTIONS : {};
      if (kind === 'weapon') {
        if (lv > 0) return 80 + lv * 4 + (ev[id] && player.passives && player.passives[ev[id].passive] > 0 ? 25 : 0);   // subir lo que ya tienes
        return 55;   // técnica nueva
      }
      var pide = Object.keys(ev).some(function (k) { return skills[k] && skills[k].level > 0 && !skills[k].evolved && ev[k].passive === id; });
      return (pide ? 75 : 35) + (lv > 0 ? 10 : 0) + (id === 'power' || id === 'cd' ? 6 : 0);
    }
    function elegir(contenedor) {
      var cards = Array.prototype.slice.call(document.querySelectorAll(contenedor + ' .upgrade-card'));
      if (!cards.length) return false;
      cards.sort(function (a, b) { return puntos(b) - puntos(a); });
      var t = cards[0].querySelector('h4');
      cards[0].click();
      OP.ultimaAuto = t ? t.innerText.replace(/\s+/g, ' ').trim() : '';
      return true;
    }
    var su = showUpgradeScreen;
    showUpgradeScreen = function () {   // eslint-disable-line no-global-assign
      var r = su.apply(this, arguments);
      if (O.auto && !window._applyOnly && !(typeof _banishing !== 'undefined' && _banishing)) {
        if (elegir('#upgrade-options')) { $('upgrade-screen').style.display = 'none'; aviso(); }
      }
      return r;
    };
    var sa = showArcanaScreen;
    showArcanaScreen = function () {   // eslint-disable-line no-global-assign
      var r = sa.apply(this, arguments);
      if (O.auto && estado() === 'ARCANA') { var c = document.querySelector('#arcana-options .upgrade-card'); if (c) c.click(); }
      return r;
    };
    // aviso discreto de lo que se aprendió (sin tapar el juego)
    var av = document.createElement('div'); av.id = 'op-auto-av'; ($('ui-layer') || document.body).appendChild(av);
    var avT = 0;
    function aviso() {
      if (!OP.ultimaAuto) return;
      av.textContent = '✦ ' + OP.ultimaAuto; av.style.opacity = '1';
      clearTimeout(avT); avT = setTimeout(function () { av.style.opacity = '0'; }, 1600);
    }
    // botón AUTO en partida
    var b = document.createElement('button');
    b.id = 'op-auto'; b.type = 'button';
    b.onclick = function (e) { e.stopPropagation(); O.auto = !O.auto; OP.guardar(); if (typeof playSound === 'function') playSound('ui'); };
    b.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
    ($('ui-layer') || document.body).appendChild(b);
    OP.aplicarExtras = function () {
      b.textContent = 'AUTO ' + (O.auto ? 'ON' : 'OFF');
      b.classList.toggle('on', !!O.auto);
      document.body.classList.toggle('op-sin-fps', !O.fpsCont);
      document.body.classList.toggle('op-sin-dps', !O.dps);
    };
    setInterval(function () { b.style.display = jugando() ? '' : 'none'; }, 300);
    OP.aplicarExtras();
  });

  // ─── 2. Saltar animaciones: la ruleta del cofre se resuelve al instante y la evolución dura poco ───
  bloque('saltar animaciones', function () {
    var sc = showChestScreen;
    showChestScreen = function (items) {   // eslint-disable-line no-global-assign
      var r = sc.apply(this, arguments);
      if (!O.saltar && !O.auto) return r;
      if (window._chestAnim) { clearInterval(window._chestAnim); window._chestAnim = null; }
      var scr = $('chest-screen');
      if (scr) {
        scr.querySelectorAll('.chest-reel').forEach(function (rl, k) {
          rl.classList.add('done');
          rl.querySelector('.chest-icon').innerHTML = items[k].icon;
          rl.querySelector('.chest-name').innerText = items[k].title;
        });
        var btn = scr.querySelector('.chest-take'); if (btn) btn.disabled = false;
      }
      if (O.auto) {   // sin pausa: se recoge solo y se avisa qué traía
        toast('◉ COFRE: ' + items.map(function (i) { return i.title; }).join(' · '));
        setTimeout(closeChestRoulette, 0);
      }
      return r;
    };
    setInterval(function () {
      if ((O.saltar || O.auto) && window._evolveCut && window._evolveCut.life > 0.35) window._evolveCut.life = 0.35;
    }, 50);
  });

  // ─── 3. Contador de FPS y daño por segundo en vivo ───
  bloque('fps y dps', function () {
    var f = document.createElement('div'); f.id = 'op-fps'; document.body.appendChild(f);
    var n = 0, t0 = performance.now();
    (function bucle(now) {
      n++;
      if (now - t0 >= 500) { f.textContent = Math.round(n * 1000 / (now - t0)) + ' FPS'; n = 0; t0 = now; }
      requestAnimationFrame(bucle);
    })(t0);
    var crit = $('op-crit');
    if (crit) crit.insertAdjacentHTML('beforeend', '<span class="op-dps"> · DPS <b id="op-dps-n">0</b></span>');
    var hist = [];
    setInterval(function () {
      if (!jugando()) return;
      var tot = 0, d = OP.run.dano; for (var k in d) tot += d[k];
      hist.push([gameTime, tot]);
      while (hist.length > 2 && gameTime - hist[0][0] > 5) hist.shift();
      if (hist.length > 1 && hist[hist.length - 1][1] < hist[0][1]) hist = [hist[hist.length - 1]];   // partida nueva
    }, 250);
    OP.dpsTxt = function () {
      var el = $('op-dps-n'); if (!el) return;
      var a = hist[0], z = hist[hist.length - 1];
      el.textContent = a && z && z[0] > a[0] ? fmt((z[1] - a[1]) / (z[0] - a[0])) : '0';
    };
  });

  // ─── 4. Flechas en el borde: jefe (morado) y cofres (dorado) fuera de la pantalla ───
  bloque('flechas', function () {
    var cv = document.createElement('canvas'); cv.id = 'op-flechas'; document.body.appendChild(cv);
    var g = cv.getContext('2d');
    function dibujar() {
      requestAnimationFrame(dibujar);
      var on = O.flechas && jugando() && typeof cameraCenter === 'function';
      cv.style.display = on ? '' : 'none';
      if (!on) return;
      var W = innerWidth, H = innerHeight;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      g.clearRect(0, 0, W, H);
      var rc = (typeof canvas !== 'undefined' && canvas.getBoundingClientRect) ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: W, height: H };
      var cc = cameraCenter(), kx = rc.width / VIEW_W, ky = rc.height / VIEW_H;
      function flecha(x, y, color, tam, txt) {
        var sx = rc.left + (x - cc[0] + VIEW_W / 2) * kx, sy = rc.top + (y - cc[1] + VIEW_H / 2) * ky;
        var m = 26;
        if (sx > m && sx < W - m && sy > m && sy < H - m) return;   // se ve en pantalla: sin flecha
        var cx = W / 2, cy = H / 2, ang = Math.atan2(sy - cy, sx - cx);
        var t = Math.min((W / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (H / 2 - m) / Math.abs(Math.sin(ang) || 1e-6));
        var px = cx + Math.cos(ang) * t, py = cy + Math.sin(ang) * t;
        g.save(); g.translate(px, py); g.rotate(ang);
        g.fillStyle = color; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(tam, 0); g.lineTo(-tam * 0.7, -tam * 0.7); g.lineTo(-tam * 0.35, 0); g.lineTo(-tam * 0.7, tam * 0.7); g.closePath();
        g.stroke(); g.fill(); g.restore();
        if (txt) {
          g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#000'; g.fillStyle = '#fff';
          var tx = px - Math.cos(ang) * (tam + 10), ty = py - Math.sin(ang) * (tam + 10) + 4;
          g.strokeText(txt, tx, ty); g.fillText(txt, tx, ty);
        }
      }
      for (var j = 0; j < drops.length; j++) {
        var d = drops[j];
        if (d.type === 'chest' && !d.opened) flecha(d.x, d.y, '#ffd65a', 11, Math.round(Math.hypot(d.x - player.x, d.y - player.y) / 10) + 'm');
      }
      for (var i = 0; i < enemies.length; i++) if (enemies[i].isBoss) flecha(enemies[i].x, enemies[i].y, '#c084fc', 16, 'JEFE');
    }
    requestAnimationFrame(dibujar);
  });

  // ─── 5. Radio: qué pista suena en batalla y en el menú (el juego trae dos) ───
  bloque('radio', function () {
    var SRC = { battle: 'assets/music/battle.mp3', menu: 'assets/music/menu.mp3' };
    var turno = false;
    function poner(a, cual) {
      var url = SRC[cual]; if (!url || !a) return;
      if (a.getAttribute('src') !== url) { var on = !a.paused; a.src = url; if (on) a.play().catch(function () {}); }
    }
    function batalla() {
      var c = O.musBat === 'alterna' ? (turno ? 'menu' : 'battle') : O.musBat;
      poner(battleMusic, c);
    }
    var sg = startGame;
    startGame = function () { turno = !turno; batalla(); return sg.apply(this, arguments); };   // eslint-disable-line no-global-assign
    var prev = OP.aplicarExtras;
    OP.aplicarExtras = function () { prev(); poner(menuMusic, O.musMenu); if (O.musBat !== 'alterna') batalla(); };
    OP.aplicarExtras();
  });

  // el desafío y el entrenamiento cambian isla/personaje/clima: al volver al menú se deja lo que tenías
  bloque('selección', function () {
    var prev = null;
    OP.guardarSel = function () { if (!prev) prev = { m: selectedMap, c: selectedCharacter, r: runCurseRank }; };
    var bm = backToMenu;
    backToMenu = function () {   // eslint-disable-line no-global-assign
      var r = bm.apply(this, arguments);
      if (prev) { selectedMap = prev.m; selectedCharacter = prev.c; runCurseRank = prev.r; prev = null; }
      return r;
    };
  });

  // ─── Pantallas propias (mismo cartel que las del juego) ───
  function pantalla(id, titulo, sub, html, alCerrar) {
    var s = $(id);
    if (!s) { s = document.createElement('div'); s.id = id; s.className = 'overlay-screen op-pant'; document.body.appendChild(s); }
    s.innerHTML = '<div class="wanted-board op-board"><div class="op-head"><div class="wanted-title op-title">' + titulo + '</div>'
      + '<div class="wanted-subtitle">' + sub + '</div></div><div class="op-scroll">' + html + '</div>'
      + '<button class="btn-start op-foot" data-c="cerrar">VOLVER</button></div>';
    s.querySelector('[data-c=cerrar]').onclick = function () { s.style.display = 'none'; $('start-screen').style.display = 'flex'; if (alCerrar) alCerrar(); };
    s.style.display = 'flex'; $('start-screen').style.display = 'none';
    return s;
  }
  function botonMenu(txt, fn, antesDe) {
    var sec = document.querySelector('#start-screen .menu-secondary');
    if (!sec) return;
    var b = document.createElement('button');
    b.className = 'map-btn'; b.innerHTML = txt; b.onclick = fn;
    sec.insertBefore(b, antesDe ? sec.children[antesDe] : null);
    return b;
  }

  // ─── 6. Desafío diario: misma isla, personaje y clima para todos cada día; racha de días seguidos ───
  bloque('desafio', function () {
    var DKEY = 'op_port_diario';
    function leer() { try { return JSON.parse(localStorage.getItem(DKEY)) || { dias: {}, racha: 0, ult: '' }; } catch (e) { return { dias: {}, racha: 0, ult: '' }; } }
    function hoy(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function del(dia) {
      var s = 0; for (var i = 0; i < dia.length; i++) s = (s * 131 + dia.charCodeAt(i)) >>> 0;
      function r(n) { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) % n; }
      return { mapa: MAPAS[r(MAPAS.length)], pj: CHARS[r(CHARS.length)], clima: r(3) };
    }
    function puntaje(x) { return (x.g ? 1e7 : 0) + Math.round(x.t) * 1000 + Math.min(999, x.k); }
    var activo = null;
    function jugar() {
      var d = del(hoy());
      activo = hoy();
      $('op-diario').style.display = 'none';
      OP.guardarSel();
      selectedMap = d.mapa; selectedCharacter = d.pj;   // el desafío deja jugar aunque no los tengas desbloqueados
      try { runCurseRank = d.clima; } catch (e) { /* nada */ }
      if (typeof selectMode === 'function' && typeof runMode !== 'undefined' && runMode !== 'normal') selectMode('normal');
      startGame();
      setTimeout(function () { toast('◉ DESAFÍO DIARIO — ' + CHAR_N[d.pj] + ' en ' + mapaN(d.mapa) + (d.clima ? ' · Clima ' + d.clima : '')); }, 600);
    }
    function ver() {
      var D = leer(), dia = hoy(), d = del(dia), yo = D.dias[dia];
      var h = '<div class="op-dia"><div class="op-dia-c"><b>' + CHAR_N[d.pj] + '</b><span>en</span><b>' + mapaN(d.mapa) + '</b>'
        + '<small>' + (d.clima ? 'Clima peligroso ' + d.clima : 'Mar en calma') + ' · modo Normal</small></div>'
        + '<p>Mismo reto para todos hoy, aunque el personaje o la isla no estén desbloqueados. Primera partida del día: <b>฿500</b>; '
        + 'si conquistas la isla: <b>฿1.500</b> más (una vez al día).</p>'
        + (yo ? '<p class="op-dia-yo">Tu mejor marca de hoy: <b>' + (yo.g ? '★ conquistada · ' : '') + formatTime(yo.t) + ' · ' + yo.k + ' derrotados</b> (' + yo.n + ' intento' + (yo.n > 1 ? 's' : '') + ')</p>' : '')
        + '<p class="op-dia-r">Racha: <b>' + D.racha + ' día' + (D.racha === 1 ? '' : 's') + ' seguido' + (D.racha === 1 ? '' : 's') + '</b></p>'
        + '<button class="op-todo" id="op-dia-go">¡ZARPAR AL DESAFÍO!</button></div>';
      var dias = Object.keys(D.dias).sort().reverse().slice(0, 7);
      if (dias.length) h += '<div class="op-section"><span>ÚLTIMOS DÍAS</span></div>' + dias.map(function (k) {
        var x = D.dias[k], q = del(k);
        return '<div class="op-mis"><div><b>' + k + ' · ' + CHAR_N[q.pj] + ' en ' + mapaN(q.mapa) + '</b><small>' + (x.g ? '★ ' : '') + formatTime(x.t) + ' · ' + x.k + ' derrotados</small></div></div>';
      }).join('');
      var s = pantalla('op-diario', 'DESAFÍO DIARIO', hoy(), h);
      s.querySelector('#op-dia-go').onclick = jugar;
    }
    OP.desafio = ver;
    botonMenu('<span class="op-slot">☀</span> DESAFÍO DIARIO', ver, 1);
    // al terminar: guardar la marca, la racha y los premios
    var prev = OP.extrasFin;
    OP.extrasFin = function (gano, tot) {
      if (prev) prev(gano, tot);
      if (!activo) return;
      var D = leer(), dia = activo, x = { g: !!gano, t: Math.round(gameTime), k: window.lastRun ? window.lastRun.kills : 0, n: 1 };
      activo = null;
      var yo = D.dias[dia], premio = 0;
      if (!yo) { premio += 500; x.n = 1; }
      else { x.n = yo.n + 1; if (puntaje(yo) > puntaje(x)) { x = Object.assign({}, yo, { n: x.n }); } }
      if (gano && !(yo && yo.premioG)) { premio += 1500; x.premioG = true; } else if (yo && yo.premioG) x.premioG = true;
      D.dias[dia] = x;
      if (D.ult !== dia) {
        var ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
        D.racha = D.ult === hoy(ayer) ? D.racha + 1 : 1; D.ult = dia;
      }
      var ks = Object.keys(D.dias).sort(); while (ks.length > 40) delete D.dias[ks.shift()];
      try { localStorage.setItem(DKEY, JSON.stringify(D)); } catch (e) { /* nada */ }
      if (premio) { meta.beli += premio; saveMeta(); updateMetaUI(); setTimeout(function () { toast('☀ DESAFÍO DIARIO: +' + fmt(premio) + ' Berries · racha ' + D.racha); }, 2500); }
      OP.estad && OP.estad('diario', D.racha);
    };
  });

  // ─── 7. Sala de entrenamiento: muñecos de práctica, sin oleadas ni jefe, sin perder vida ───
  bloque('entrenamiento', function () {
    var activo = false, panel = null;
    function munecos() {
      var tipo = (typeof mapEnemies === 'function' && mapEnemies().base) || 'grunt';
      for (var i = 0; i < 3; i++) {
        var a = i * 2.1, e = makeEnemy(tipo, player.x + Math.cos(a) * 150, player.y + Math.sin(a) * 150, 1);
        e.hp = e.maxHp = 1e9; e.speed = 0; e.damage = 0; e._muneco = true;
        enemies.push(e);
      }
    }
    function entrar() {
      activo = true;
      OP.guardarSel();
      selectedMap = 'shelltown';
      startGame();
      setTimeout(function () {
        if (estado() === 'ARCANA') { var c = document.querySelector('#arcana-options .upgrade-card'); if (c) c.click(); }
        enemies.length = 0; munecos(); OP.run.dano = {};
      }, 300);
      if (!panel) {
        panel = document.createElement('div'); panel.id = 'op-entreno';
        panel.innerHTML = '<b>ENTRENAMIENTO</b><button data-e="nivel">+1 nivel</button><button data-e="reset">Reiniciar daño</button><button data-e="salir">Salir</button>';
        panel.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
        panel.addEventListener('click', function (e) {
          var k = e.target.dataset && e.target.dataset.e; if (!k) return;
          if (k === 'nivel' && jugando()) { player.level++; levelUp(); }
          if (k === 'reset') { OP.run.dano = {}; OP.run.crits = 0; OP.run.golpes = 0; }
          if (k === 'salir') { salir(); backToMenu(); }
        });
        document.body.appendChild(panel);
      }
      panel.style.display = 'flex';
    }
    function salir() { activo = false; if (panel) panel.style.display = 'none'; }
    OP.entrenar = entrar;
    var up = update;
    update = function (dt) {   // eslint-disable-line no-global-assign
      var r = up.apply(this, arguments);
      if (activo) {
        gameTime = Math.min(gameTime, 60);   // nunca llega el jefe
        player.hp = player.maxHp;
        for (var i = enemies.length - 1; i >= 0; i--) {
          var e = enemies[i];
          if (!e._muneco) enemies.splice(i, 1); else { e.hp = e.maxHp; e.speed = 0; }
        }
        if (!enemies.length) munecos();
        enemyBullets.length = 0;
      }
      return r;
    };
    var bm = backToMenu;
    backToMenu = function () { salir(); return bm.apply(this, arguments); };   // eslint-disable-line no-global-assign
    var go = triggerGameOver;
    triggerGameOver = function () { if (activo) return; return go.apply(this, arguments); };   // eslint-disable-line no-global-assign
    setInterval(function () { if (panel) panel.style.display = activo && enPartida() ? 'flex' : 'none'; }, 300);
    botonMenu('<span class="op-slot">⚔</span> ENTRENAMIENTO', entrar, 2);
  });

  // ─── 8. Bitácora: estadísticas globales y logros del port (premio en Berries) ───
  bloque('bitacora', function () {
    var EKEY = 'op_port_estad';
    var E = {};
    try { E = JSON.parse(localStorage.getItem(EKEY)) || {}; } catch (e) { E = {}; }
    function g() { try { localStorage.setItem(EKEY, JSON.stringify(E)); } catch (e) { /* nada */ } }
    ['partidas', 'victorias', 'tiempo', 'crits', 'dano', 'kills', 'jefes', 'cofres', 'misiones'].forEach(function (k) { E[k] = E[k] || 0; });
    E.tec = E.tec || {}; E.pj = E.pj || {}; E.muertes = E.muertes || {}; E.logros = E.logros || {}; E.racha = E.racha || 0;
    OP.estad = function (k, v) { if (k === 'diario') E.racha = Math.max(E.racha, v); if (k === 'mision') E.misiones++; g(); revisar(); };
    var LOGROS = [
      ['crit1', 'Ojo de halcón', 'Asesta 1.000 críticos', function () { return E.crits >= 1000; }, 800],
      ['crit2', 'Precisión de Mihawk', 'Asesta 10.000 críticos', function () { return E.crits >= 10000; }, 3000],
      ['crit3', 'Sin un solo fallo', 'Asesta 50.000 críticos', function () { return E.crits >= 50000; }, 8000],
      ['dano1', 'Puño de goma', 'Causa 1.000.000 de daño en total', function () { return E.dano >= 1e6; }, 1000],
      ['dano2', 'Rey de los piratas', 'Causa 20.000.000 de daño en total', function () { return E.dano >= 2e7; }, 6000],
      ['part1', 'Grumete', 'Juega 10 singladuras', function () { return E.partidas >= 10; }, 500],
      ['part2', 'Navegante veterano', 'Juega 100 singladuras', function () { return E.partidas >= 100; }, 4000],
      ['vic1', 'Conquistador', 'Conquista 10 islas', function () { return E.victorias >= 10; }, 2000],
      ['tiempo1', 'Diez horas en el mar', 'Navega 10 horas en total', function () { return E.tiempo >= 36000; }, 5000],
      ['jefe1', 'Cazador de Shichibukai', 'Derrota 25 jefes', function () { return E.jefes >= 25; }, 3000],
      ['cofre1', 'Buscatesoros', 'Abre 100 cofres', function () { return E.cofres >= 100; }, 2000],
      ['mis1', 'A la orden, capitán', 'Completa 20 misiones', function () { return E.misiones >= 20; }, 2500],
      ['racha1', 'Siete días en el Grand Line', 'Juega el desafío diario 7 días seguidos', function () { return E.racha >= 7; }, 3500],
      ['tripu', 'Tripulación completa', 'Juega con los 10 Sombreros de Paja', function () { return CHARS.every(function (c) { return E.pj[c] > 0; }); }, 3000],
    ];
    function revisar() {
      LOGROS.forEach(function (l) {
        if (E.logros[l[0]]) return;
        var ok = false; try { ok = l[3](); } catch (e) { /* nada */ }
        if (ok) { E.logros[l[0]] = Date.now(); meta.beli += l[4]; saveMeta(); updateMetaUI(); g(); toast('◉ LOGRO DEL PORT: ' + l[1] + ' — +' + fmt(l[4]) + ' Berries'); }
      });
    }
    var prev = OP.extrasFin;
    OP.extrasFin = function (gano, tot) {
      if (prev) prev(gano, tot);
      var R = OP.run;
      E.partidas++; if (gano) E.victorias++;
      E.tiempo += Math.round(gameTime); E.crits += R.crits; E.dano += Math.round(tot);
      E.kills += window.lastRun ? window.lastRun.kills : 0; E.jefes += R.jefesMuertos || 0; E.cofres += R.cofres;
      for (var k in R.dano) E.tec[k] = (E.tec[k] || 0) + Math.round(R.dano[k]);
      E.pj[selectedCharacter] = (E.pj[selectedCharacter] || 0) + 1;
      if (!gano) E.muertes[selectedMap] = (E.muertes[selectedMap] || 0) + 1;
      g(); setTimeout(revisar, 3000);
    };
    // misiones cobradas (port/mejoras.js): se cuentan al cobrar
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('#op-misiones button[data-c]');
      if (b && b.dataset.c !== 'cerrar') setTimeout(function () {
        var V = {}, nuevas = 0, M = null;
        try { M = JSON.parse(localStorage.getItem('op_port_misiones')); } catch (er) { /* nada */ }
        if (!M) return;
        [M.d, M.w].forEach(function (q) {   // cada lista (día/semana) se cuenta una sola vez por su id
          var n = q.l.filter(function (x) { return x.ok; }).length, k = q.id;
          V[k] = n; nuevas += Math.max(0, n - ((E.misVistas || {})[k] || 0));
        });
        E.misVistas = V; if (nuevas) { E.misiones += nuevas; g(); revisar(); }
      }, 50);
    }, true);
    function top(o, f) { var m = null; for (var k in o) if (!m || o[k] > o[m]) m = k; return m ? f(m) + ' (' + fmt(o[m]) + ')' : '—'; }
    function ver() {
      var h = '<div class="op-est">'
        + [['Singladuras', fmt(E.partidas)], ['Islas conquistadas', fmt(E.victorias)], ['Tiempo en el mar', formatTime(E.tiempo)],
          ['Enemigos derrotados', fmt(E.kills)], ['Críticos', fmt(E.crits)], ['Daño total', fmt(E.dano)], ['Jefes derrotados', fmt(E.jefes)],
          ['Cofres abiertos', fmt(E.cofres)], ['Misiones completadas', fmt(E.misiones)], ['Mejor racha diaria', E.racha + ' días'],
          ['Técnica favorita', top(E.tec, function (k) { return esc(k === 'otros' ? 'Otros' : (window.UPGRADE_POOL_MAP && window.UPGRADE_POOL_MAP[k] && window.UPGRADE_POOL_MAP[k].title) || k); })],
          ['Personaje más usado', top(E.pj, function (k) { return CHAR_N[k] || k; })], ['Isla donde más caes', top(E.muertes, mapaN)]]
          .map(function (x) { return '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join('') + '</div>'
        + '<div class="op-section"><span>LOGROS DEL PORT · ' + Object.keys(E.logros).length + ' / ' + LOGROS.length + '</span></div>'
        + LOGROS.map(function (l) {
          var ok = !!E.logros[l[0]];
          return '<div class="op-mis' + (ok ? '' : ' op-gris') + '"><div><b>' + (ok ? '◉ ' : '○ ') + l[1] + '</b><small>' + l[2] + ' · ฿' + fmt(l[4]) + '</small></div>' + (ok ? '<span class="op-mis-ok">✔</span>' : '') + '</div>';
        }).join('');
      pantalla('op-bitacora', 'BITÁCORA', 'ESTADÍSTICAS Y LOGROS DEL PORT', h);
    }
    OP.bitacora = ver;
    botonMenu('<span class="op-slot">✎</span> BITÁCORA', ver);
    revisar();
  });
})();
