#!/usr/bin/env python3
"""Pone al día app/src/main/assets/www con la web del juego (https://opsurvivor.pages.dev/, de PXVLO).

Uso: python3 tools/actualizar.py [carpeta www]

- Baja siempre los archivos de texto (index.html, css/, js/, sw.js, manifest) y de ellos saca la lista de
  todo lo que el juego usa (sprites, atlas, mapas, música, efectos, Gears): no adivina rutas.
- De los archivos grandes (imágenes, sonido) solo baja los nuevos; si el autor cambia la versión de la caché
  (CACHE_VER de sw.js) es que tocó alguno sin cambiarle el nombre, y entonces los vuelve a bajar todos.
- Vuelve a poner lo del port en index.html (fuentes locales y local.js). Lo nuestro (local.js, css/fonts.css,
  assets/fonts/) nunca se toca ni se borra.
- Escribe en la salida «CAMBIOS=n»: 0 si no había nada nuevo.
"""
import os, re, sys, hashlib, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

BASE = 'https://opsurvivor.pages.dev/'
WWW = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'app/src/main/assets/www')
NUESTRO = {'local.js', 'css/fonts.css'}
TEXTO = ('.html', '.js', '.css', '.json', '.webmanifest')


def bajar(p):
    for intento in range(4):
        try:
            req = urllib.request.Request(BASE + urllib.request.quote(p), headers={'User-Agent': 'Mozilla/5.0 OPSurvivorPort'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 404):
                return None
        except Exception:
            pass
    return None


cambios = []


def guardar(p, data):
    out = os.path.join(WWW, p)
    if os.path.exists(out) and open(out, 'rb').read() == data:
        return
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'wb').write(data)
    cambios.append(p)


def del_port(html):
    """Lo del port dentro de index.html: fuentes locales y la capa local.js antes del juego."""
    html = re.sub(r'\s*<link rel="preconnect" href="https://fonts\.googleapis\.com">', '', html)
    html = re.sub(r'<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">', '<link href="css/fonts.css" rel="stylesheet">', html)
    html = re.sub(r'\s*<script src="https://static\.itch\.io/[^"]*"></script>', '', html)
    if 'src="local.js"' not in html:
        html = html.replace('<script src="js/atlas-index.js"></script>', '<script src="local.js"></script>\n<script src="js/atlas-index.js"></script>', 1)
    return html


# 1. Los archivos de texto: siempre (son pocos y son los que cambian)
idx = bajar('index.html')
if not idx:
    sys.exit('no se pudo bajar index.html')
html = idx.decode('utf-8')
pend = ['manifest.webmanifest', 'sw.js'] + re.findall(r'(?:src|href)="((?:js|css)/[^"?]+)', html)
guardar('index.html', del_port(html).encode('utf-8'))

viejo_sw = open(os.path.join(WWW, 'sw.js'), encoding='utf-8').read() if os.path.exists(os.path.join(WWW, 'sw.js')) else ''
ver = lambda s: (re.search(r"CACHE_VER\s*=\s*'([^']+)'", s) or [None, ''])[1]
assets, vistos = set(), set()
while pend:
    p = pend.pop()
    if p in vistos or p in NUESTRO:
        continue
    vistos.add(p)
    d = bajar(p)
    if d is None:
        continue
    if p == 'sw.js':
        todo_de_nuevo = ver(viejo_sw) != ver(d.decode('utf-8', 'replace'))
    guardar(p, d)
    s = d.decode('utf-8', 'replace')
    for m in re.findall(r'(assets/[A-Za-z0-9_\-./ ]+\.(?:png|jpe?g|webp|gif|mp3|wav|ogg|json|woff2?|ttf|svg|js|css))', s):
        (pend.append(m) if m.endswith(TEXTO) else assets.add(m))
    for m in re.findall(r'''url\(['"]?(?:\.\./)?(assets/[^)'"]+)''', s):
        assets.add(m)
    # Rutas que el juego arma al vuelo: efectos (SFX_FILES) y cuadros de los Gears (L('g4_idle', 6))
    if p == 'js/audio.js':
        m = re.search(r'SFX_FILES\s*=\s*\{(.*?)\}', s, re.S)
        if m:
            assets.update('assets/sfx/' + f for f in re.findall(r"['\"]([^'\"]+\.(?:mp3|wav|ogg))['\"]", m.group(1)))
    if p == 'js/gears.js':
        for n, c in re.findall(r"L\('([a-z0-9_]+)',\s*(\d+)\)", s):
            assets.update(f'assets/sprites/gears/{n}_{i}.png' for i in range(int(c)))

# 2. Imágenes y sonidos: los nuevos (o todos, si el autor subió la versión de la caché)
if 'todo_de_nuevo' not in dir():
    todo_de_nuevo = False
falta = sorted(a for a in assets if todo_de_nuevo or not os.path.exists(os.path.join(WWW, a)))


def uno(a):
    d = bajar(a)
    return a, d


with ThreadPoolExecutor(12) as ex:
    for a, d in ex.map(uno, falta):
        if d is not None:
            guardar(a, d)

print(f'{len(vistos)} de texto, {len(assets)} recursos · versión de la caché {ver(open(os.path.join(WWW, "sw.js"), encoding="utf-8").read())}')
for c in cambios[:40]:
    print('  ·', c)
print(f'CAMBIOS={len(cambios)}')
