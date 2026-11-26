#!/usr/bin/env python3
"""Parches mínimos del port sobre el código de PXVLO. Uso: python3 tools/parches.py [carpeta www]

Los corre tools/actualizar.py cada vez que baja una versión nueva del juego. Cada parche busca su texto exacto:
si ya está puesto no hace nada, y si el juego cambió y ya no lo encuentra, lo avisa y sigue (la mejora que
dependa de él se apaga sola: los mods de www/port/ comprueban que el gancho exista).

1. Críticos en rojo (render.js): el número de un golpe crítico se pinta del color de window.OPCritColor
   (rojo por defecto) y un poco más grande; el sobrecrítico sigue morado.
2. Gancho de ataque (game.js): antes de procesar cada ataque se guarda en window.__opAtk, para que el
   medidor de daño (www/port/danio.js) sepa de qué técnica salió cada golpe.
3. Tienda (state.js): antes de leer el guardado se llama a window.OPTienda (www/port/tienda.js), que sube los
   niveles máximos y añade mejoras. Si este parche no encaja, la tienda queda como la original (sin perder nada:
   el juego devuelve los Berries de los niveles que sobren).
4. Slots (game.js): el tope de 6 técnicas y 6 pasivas pasa a window.OPSlotsTec / OPSlotsPas (tienda.js). Si no
   encaja, queda en 6.
"""
import os, sys

WWW = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'app/src/main/assets/www')
avisos, hechos = [], 0


def parche(archivo, nombre, viejo, nuevo, veces=1):
    global hechos
    p = os.path.join(WWW, archivo)
    s = open(p, encoding='utf-8').read()
    if nuevo in s:
        return
    n = s.count(viejo)
    if n != veces:
        avisos.append(f'{archivo} · {nombre}: se esperaba {veces} y está {n} (el juego cambió: revisar)')
        return
    open(p, 'w', encoding='utf-8').write(s.replace(viejo, nuevo))
    hechos += 1


parche('js/render.js', 'color del crítico',
       "ctx.fillStyle = dtObj.isOvercrit ? '#c084fc' : (dtObj.isCrit ? '#facc15' : '#ffffff');",
       "ctx.fillStyle = dtObj.isOvercrit ? '#c084fc' : (dtObj.isCrit ? (window.OPCritColor || '#ff3b30') : '#ffffff');")
parche('js/render.js', 'tamaño del crítico',
       "(dtObj.isCrit ? 'bold 15px Bangers, Arial, sans-serif'",
       "(dtObj.isCrit ? 'bold 18px Bangers, Arial, sans-serif'")
parche('js/game.js', 'gancho de ataque',
       "        const atk = activeAttacks[i];\n        atk.life -= dt;",
       "        const atk = activeAttacks[i]; window.__opAtk = atk;\n        atk.life -= dt;")

parche('js/state.js', 'gancho de la tienda',
       "META_UPGRADES.forEach(u => meta.upgrades[u.id] = 0);",
       "if (window.OPTienda) window.OPTienda(META_UPGRADES);\nMETA_UPGRADES.forEach(u => meta.upgrades[u.id] = 0);")

parche('js/game.js', 'slots de técnicas comprables',
       "if (equippedWeapons >= 6) return false;",
       "if (equippedWeapons >= (window.OPSlotsTec || 6)) return false;")
parche('js/game.js', 'slots de pasivas comprables',
       "if (ownedPassives >= 6) return false;",
       "if (ownedPassives >= (window.OPSlotsPas || 6)) return false;")

print(f'parches puestos: {hechos}')
for a in avisos:
    print('  ! ' + a)
