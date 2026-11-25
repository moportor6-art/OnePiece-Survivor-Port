// ─── Tienda de Berries del port (va antes del juego: state.js la llama con window.OPTienda) ───
// Sube el nivel máximo de las mejoras permanentes y añade mejoras que faltaban.
// Los niveles nuevos (por encima del máximo original) dan medio efecto en las que ya eran fuertes
// (velocidad y área), para que 8 niveles no rompan el equilibrio. Lo ya comprado vale lo mismo que antes.
// Se aplica antes de que el juego lea el guardado: así los niveles altos no se recortan al abrir.
(function () {
  'use strict';
  // id: [nuevo máximo, efecto de cada nivel extra (p, n = niveles extra), texto]
  var MAX = {
    damage:   [8, function (p, n) { p.powerPct += n * 2; }, '+2% daño por nivel'],
    hp:       [8, function (p, n) { p.maxHp += n * 5; p.hp = p.maxHp; }, '+5 HP max por nivel'],
    speed:    [8, function (p, n) { p.speed *= 1 + n * 0.025; }, '+5% velocidad por nivel (del 3 al 8: +2,5%)'],
    area:     [8, function (p, n) { p.areaBonus *= 1 + n * 0.025; }, '+5% área por nivel (del 3 al 8: +2,5%)'],
    cooldown: [8, function (p, n) { p.cdReduction = Math.min(60, p.cdReduction + n * 2); }, '-2% cooldown por nivel'],
    armor:    [8, function (p, n) { p.armor = Math.min(70, p.armor + n * 2); }, '+2% armadura por nivel'],
    luck:     [8, function (p, n) { p.critChance += n * 0.01; }, '+1% prob. crítica por nivel'],
    pickup:   [8, function (p, n) { p.pickupBonus += n * 0.10; }, '+10% rango de recogida por nivel'],
    growth:   [8, function (p, n) { p.growthBonus += n * 0.02; }, '+2% XP por nivel'],
    greed:    [8, function (p, n) { p.greedBonus += n * 0.10; }, '+10% Berries por nivel'],
    revival:  [2, function () { player.revives = (player.revives || 0) + 1; }, 'Revive una vez con 30% HP por nivel']
  };
  window.OPTienda = function (L) {
    try {
      L.forEach(function (u) {
        var m = MAX[u.id];
        if (!m || m[0] <= u.max) return;
        var base = u.max, orig = u.apply;
        u.max = m[0]; u.desc = m[2];
        u.apply = function (p, lvl) {
          orig(p, Math.min(lvl, base));
          if (lvl > base) m[1](p, lvl - base);
        };
      });
      var I = typeof ICONS !== 'undefined' ? ICONS : {};
      L.push(
        { id: 'op_regen', name: 'Recuperación', desc: '+0,15 HP por segundo por nivel', cost: 2500, max: 5, icon: I.meat || I.heart,
          apply: function (p, lvl) { p.regenRate = (p.regenRate || 0) + lvl * 0.15; } },
        { id: 'op_critdmg', name: 'Golpe crítico', desc: '+10% daño de los críticos por nivel', cost: 3500, max: 5, icon: I.crit,
          apply: function (p, lvl) { p.critDmgBonus = (p.critDmgBonus || 0) + lvl * 0.10; } },
        { id: 'op_suerte', name: 'Suerte', desc: '+5% suerte por nivel (cofres con más tesoros y más objetos)', cost: 3000, max: 5, icon: I.luck,
          apply: function (p, lvl) { p.luckBonus += lvl * 0.05; } }
      );
    } catch (e) { console.warn('[port] tienda sin cambios:', e); }
  };
})();
