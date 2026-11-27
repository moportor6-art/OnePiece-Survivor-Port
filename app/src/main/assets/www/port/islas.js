// Islas generadas (worldgen) — botón «Isla desconocida» en la selección de isla.
// Sin tocar el juego: registra el mapa «gen» en las mismas tablas que las islas de PXVLO
// (WALK_POLYS, MAP_OBSTACLES, MAP_ORIGIN_Y, MAP_ENEMIES, WAVE_TEXT, VFX_MAP, PROP_BY_MAP, IMG.genMap).
// El fondo se pinta en un canvas con los colores del bioma; los obstáculos dibujados son exactamente sus cápsulas.
// Necesita port/worldgen.js (copia de dist/worldgen.js del repo worldgen) cargado antes.
(function () {
  'use strict';
  if (typeof WorldGen === 'undefined' || typeof WALK_POLYS === 'undefined') return;
  var WG = WorldGen, ID = 'gen', KEY = 'op_port_isla';
  var BIOMAS = WG.biomas.onepiece;
  var ORDEN = ['desierto', 'nieve', 'bosque', 'ciudad'];
  var NOMBRES = { desierto: 'Desierto', nieve: 'Nieve', bosque: 'Selva', ciudad: 'Puerto' };

  var cfg;
  try { cfg = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cfg = {}; }
  if (!BIOMAS[cfg.bioma]) cfg.bioma = 'desierto';
  if (!cfg.semilla) cfg.semilla = nuevaSemilla();
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* nada */ } }
  function nuevaSemilla() { return 1000 + Math.floor(Math.random() * 899000); }

  var isla = null, lienzo = null;

  // ─── 1. Registrar el mapa en las tablas del juego ───
  function registrar() {
    isla = WG.adapters.onepiece.isla(cfg.semilla, cfg.bioma);
    var src = isla.enemigosDe;
    WALK_POLYS[ID] = isla.walkPoly;
    MAP_OBSTACLES[ID] = isla.obstaculos;
    MAP_ORIGIN_Y[ID] = 446;
    MAP_ENEMIES[ID] = MAP_ENEMIES[src];
    if (typeof WAVE_TEXT !== 'undefined') WAVE_TEXT[ID] = WAVE_TEXT[src];
    if (typeof VFX_MAP !== 'undefined') VFX_MAP[ID] = VFX_MAP[src];
    if (typeof PROP_BY_MAP !== 'undefined') PROP_BY_MAP[ID] = PROP_BY_MAP[src];
    var nombre = 'Isla desconocida';
    if (typeof RECORD_MAP_NAMES !== 'undefined') RECORD_MAP_NAMES[ID] = nombre;
    if (typeof COLL_MAP_NAMES !== 'undefined') COLL_MAP_NAMES[ID] = nombre;
    lienzo = null; // se vuelve a pintar la próxima vez que el juego pida IMG.genMap
  }
  // El fondo se pinta solo cuando el juego lo pide (al elegir la isla o al empezar la partida)
  Object.defineProperty(IMG, ID + 'Map', {
    configurable: true, enumerable: true,
    get: function () { if (!lienzo && isla) lienzo = pintar(isla, cfg.semilla); return lienzo; }
  });
  registrar();

  // ─── 2. Pintado del fondo (2816×1536: 1 px de lienzo = 1 px de mundo) ───
  var W = MAP_PX_W * 2, H = MAP_PX_H * 2, OX = MAP_PX_W, OY = 446 * 2;

  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function tono(h, k) { // k > 0 aclara, k < 0 oscurece
    var c = rgb(h).map(function (v) { return Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)); });
    return 'rgb(' + c.join(',') + ')';
  }
  function mezcla(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')';
  }
  function camino(g, poly) {
    g.beginPath();
    for (var i = 0; i < poly.length; i++) g[i ? 'lineTo' : 'moveTo'](poly[i][0] + OX, poly[i][1] + OY);
    g.closePath();
  }
  // Textura de ruido (a 1/8 de resolución, se escala con suavizado)
  function textura(semilla, escala) {
    var n = WG.core.createNoise(semilla), tw = W / 8, th = H / 8;
    var c = document.createElement('canvas'); c.width = tw; c.height = th;
    var g = c.getContext('2d'), d = g.createImageData(tw, th);
    for (var y = 0; y < th; y++) for (var x = 0; x < tw; x++) {
      var v = n.fbm(x * escala, y * escala, { octaves: 3 }), i = (y * tw + x) * 4;
      var claro = v > 0;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = claro ? 255 : 0;
      d.data[i + 3] = Math.min(255, Math.abs(v) * 90);
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  function pintar(m, semilla) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    c.complete = true; // render.js comprueba img.complete
    var g = c.getContext('2d'), col = m.colores, poly = m.walkPoly;
    g.imageSmoothingEnabled = true;

    // Mar con oleaje
    g.fillStyle = col.mar; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.55; g.drawImage(textura(semilla + '|mar', 0.05), 0, 0, W, H); g.globalAlpha = 1;
    // Agua poco profunda alrededor de la costa
    g.lineJoin = 'round';
    [[190, 0.18], [120, 0.3], [70, 0.45]].forEach(function (a) {
      camino(g, poly); g.strokeStyle = mezcla(col.mar, '#ffffff', a[1]); g.globalAlpha = 0.6; g.lineWidth = a[0]; g.stroke();
    });
    g.globalAlpha = 1;
    // Espuma, playa y suelo
    camino(g, poly); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 46; g.stroke();
    camino(g, poly); g.strokeStyle = col.orilla; g.lineWidth = 34; g.stroke();
    g.fillStyle = col.orilla; g.fill();
    g.save();
    camino(g, poly); g.clip();
    g.fillStyle = col.suelo;
    g.shadowColor = col.orilla; g.shadowBlur = 40;
    // el suelo va algo hacia dentro para que quede una franja de playa caminable
    g.translate(OX, OY); g.scale(0.985, 0.975); g.translate(-OX, -OY - 6);
    camino(g, poly); g.fill();
    g.restore();
    g.save();
    camino(g, poly); g.clip();
    g.globalAlpha = 0.5; g.drawImage(textura(semilla + '|suelo', 0.09), 0, 0, W, H); g.globalAlpha = 1;
    g.restore();
    camino(g, poly); g.strokeStyle = tono(col.orilla, -0.18); g.lineWidth = 3; g.stroke();

    // Decoración (no bloquea)
    m.decoracion.forEach(function (d) { decor(g, d); });
    // Sombras y luego obstáculos, para que ninguna sombra quede encima de otro objeto
    m.obstaculos.forEach(function (o) { capsula(g, o, 'rgba(0,0,0,.28)', o.r, 6, 12); });
    m.obstaculos.forEach(function (o) { obstaculo(g, o); });
    return c;
  }

  function capsula(g, o, color, r, dx, dy) {
    g.lineCap = 'round'; g.strokeStyle = color; g.lineWidth = r * 2;
    g.beginPath();
    g.moveTo(o.ax + OX + (dx || 0), o.ay + OY + (dy || 0));
    g.lineTo(o.bx + OX + (dx || 0) + 0.01, o.by + OY + (dy || 0));
    g.stroke();
  }
  function circulo(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x + OX, y + OY, r, 0, Math.PI * 2); g.fill(); }

  function obstaculo(g, o) {
    var cx = (o.ax + o.bx) / 2, cy = (o.ay + o.by) / 2, r = o.r;
    switch (o.tipo) {
      case 'arbol': case 'pino': case 'palmera':
        capsula(g, o, tono(o.color, -0.35), r);
        circulo(g, cx, cy, r * 0.82, o.color);
        circulo(g, cx - r * 0.25, cy - r * 0.3, r * 0.45, tono(o.color, 0.18));
        if (o.tipo === 'palmera') for (var i = 0; i < 5; i++) {
          var a = i * 1.257;
          g.strokeStyle = tono(o.color, 0.1); g.lineWidth = 4; g.beginPath();
          g.moveTo(cx + OX, cy + OY); g.lineTo(cx + OX + Math.cos(a) * r * 1.05, cy + OY + Math.sin(a) * r * 1.05); g.stroke();
        }
        if (o.tipo === 'pino') circulo(g, cx + r * 0.15, cy - r * 0.45, r * 0.22, '#ffffff');
        break;
      case 'casa':
        capsula(g, o, tono(o.color, -0.3), r);
        capsula(g, o, o.color, r - 5);
        g.lineCap = 'butt'; capsula(g, o, tono(o.color, -0.25), 3); // caballete del tejado
        break;
      case 'barril':
        capsula(g, o, tono(o.color, -0.3), r);
        circulo(g, cx, cy, r - 3, o.color);
        g.strokeStyle = tono(o.color, -0.45); g.lineWidth = 2; g.beginPath(); g.arc(cx + OX, cy + OY, r * 0.55, 0, Math.PI * 2); g.stroke();
        break;
      default: // roca, ruina, tronco, muro, hielo
        capsula(g, o, tono(o.color, -0.3), r);
        capsula(g, o, o.color, r - 3);
        capsula(g, { ax: o.ax - r * 0.2, ay: o.ay - r * 0.25, bx: o.bx - r * 0.2, by: o.by - r * 0.25 }, tono(o.color, o.tipo === 'hielo' ? 0.6 : 0.2), Math.max(3, r * 0.35));
    }
  }

  function decor(g, d) {
    var x = d.x, y = d.y, c = d.color;
    g.globalAlpha = 0.85;
    switch (d.tipo) {
      case 'duna': case 'monticulo':
        g.fillStyle = c; g.beginPath(); g.ellipse(x + OX, y + OY, 34, 12, 0, 0, Math.PI * 2); g.fill(); break;
      case 'flores':
        for (var i = 0; i < 5; i++) circulo(g, x + Math.cos(i * 2.4) * 9, y + Math.sin(i * 2.4) * 6, 3.2, i % 2 ? c : '#ffffff');
        break;
      case 'arbusto':
        circulo(g, x - 6, y, 9, c); circulo(g, x + 6, y + 1, 8, tono(c, -0.12)); break;
      case 'adoquin':
        g.fillStyle = c; g.fillRect(x + OX - 10, y + OY - 6, 20, 12); break;
      case 'farol':
        circulo(g, x, y, 14, 'rgba(255,220,120,.25)'); circulo(g, x, y, 4, c); break;
      default: // huesos, huellas…
        circulo(g, x, y, 3, c); circulo(g, x + 8, y + 3, 2.5, c);
    }
    g.globalAlpha = 1;
  }

  // ─── 3. Botón y panel en la selección de isla ───
  var cont = document.getElementById('map-select');
  if (!cont) return;
  var btn = document.createElement('button');
  btn.className = 'map-btn'; btn.dataset.map = ID;
  btn.innerHTML = '<span class="op-slot">' + ((typeof ICONS !== 'undefined' && ICONS.ship) || '✦') + '</span> Isla desconocida';
  btn.onclick = function () { selectMap(ID); };
  cont.appendChild(btn);

  var panel = document.createElement('div');
  panel.id = 'op-isla';
  panel.style.cssText = 'display:none; gap:10px; margin:0 0 12px; flex-wrap:wrap; justify-content:center; align-items:center;';
  var sel = document.getElementById('map-selected');
  (sel || cont).insertAdjacentElement('afterend', panel);

  function pintarPanel() {
    var h = '<span class="menu-label">BIOMA</span>';
    ORDEN.forEach(function (b) {
      h += '<button class="map-btn' + (b === cfg.bioma ? ' selected' : '') + '" data-bioma="' + b + '">' + NOMBRES[b] + '</button>';
    });
    h += '<span class="menu-label">SEMILLA <b id="op-isla-sem">' + cfg.semilla + '</b></span>' +
      '<button class="map-btn" data-nueva="1">⟳ Nueva isla</button>';
    panel.innerHTML = h;
  }
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.bioma) cfg.bioma = b.dataset.bioma;
    if (b.dataset.nueva) cfg.semilla = nuevaSemilla();
    guardar(); registrar(); pintarPanel(); rotulo();
    if (typeof playSound === 'function') playSound('ui');
  });
  function rotulo() {
    if (sel && selectedMap === ID) sel.innerText = 'Mapa: Isla desconocida (' + NOMBRES[cfg.bioma] + ', semilla ' + cfg.semilla + ')';
  }

  var selectMap0 = selectMap;
  selectMap = function (id) {
    var r = selectMap0.apply(this, arguments);
    panel.style.display = selectedMap === ID ? 'flex' : 'none';
    rotulo();
    return r;
  };
  pintarPanel();
  if (selectedMap === ID) { panel.style.display = 'flex'; rotulo(); }

  // Para probar desde la consola o los tests
  window.OPIsla = { cfg: cfg, isla: function () { return isla; }, registrar: registrar, pintar: function () { return IMG[ID + 'Map']; } };
})();
