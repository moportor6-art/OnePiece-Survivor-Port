// Prueba automática del juego tal como va en la app: sin internet, desde app/src/main/assets/www.
// Pantalla de inicio → menú → partida con Luffy (~20 s, eligiendo mejoras) → pausa con Atrás → seguir →
// volver al menú → reabrir y comprobar que la partida guardada sigue ahí.
// Falla (y GitHub no publica la APK) si el juego tira errores, si le falta algún archivo o si intenta salir a internet.
// uso: node tests/smoke.cjs [carpeta www] [carpeta de capturas]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const WWW = path.resolve(process.argv[2] || 'app/src/main/assets/www');
const SHOTS = process.argv[3] || '';
const MIME = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png',
  jpg: 'image/jpeg', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', woff2: 'font/woff2', webmanifest: 'application/manifest+json' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(WWW, p);
      if (!f.startsWith(WWW) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[f.split('.').pop()] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = [];

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const exe = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(p => fs.existsSync(p));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true, locale: 'es-MX',
    userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  const external = new Set(), missing = new Set(), errors = [];
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(base) || u.startsWith('blob:') || u.startsWith('data:')) return r.continue();
    external.add(u.split('?')[0]);
    return r.abort();
  });
  page.on('response', r => { if (r.status() >= 400) missing.add(r.url().replace(base, '').split('?')[0]); });
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  const shot = async n => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${n}.png` }); } };
  const estado = () => page.evaluate(() => typeof gameState !== 'undefined' ? gameState : '?');
  // Elige la primera carta de cualquier ventana de elección abierta (Voluntad de D, mejoras, cofres)
  const elegir = () => page.evaluate(() => {
    for (const id of ['arcana-screen', 'upgrade-screen']) {
      const s = document.getElementById(id);
      if (s && getComputedStyle(s).display !== 'none') {
        const b = s.querySelector('[onclick], button, .upgrade-card, .arcana-card');
        if (b) { b.click(); return id; }
      }
    }
    return '';
  });

  await page.goto(base, { waitUntil: 'load' });
  await sleep(3500);
  await shot('1-inicio');
  await page.mouse.click(450, 300);   // «Haz clic para zarpar»
  await sleep(1500);
  await shot('2-menu');
  if (await estado() !== 'START') fail.push('no llegó al menú (estado ' + await estado() + ')');

  await page.evaluate(() => { selectCharacter('luffy'); startGame(); });
  await sleep(1500);
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  for (let t = 0; t < 20; t++) {
    await elegir();
    const k = keys[t % 4];
    await page.keyboard.down(k); await sleep(900); await page.keyboard.up(k);
  }
  await shot('3-partida');
  // nada opaco puede tapar el juego (en la 0.3 un canvas del port heredó el fondo oscuro y dejó la pantalla negra)
  const tapa = await page.evaluate(() => {
    const cv = document.getElementById('gameCanvas'), out = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (el === cv || el.contains(cv) || el.closest('.overlay-screen')) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.5) continue;
      if (r.width * r.height < innerWidth * innerHeight * 0.5) continue;
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/), p = m ? m[1].split(',') : [];
      if (p.length && (p[3] === undefined || parseFloat(p[3]) > 0.9)) out.push((el.id || el.tagName) + ' ' + cs.backgroundColor);
    }
    return out;
  });
  if (tapa.length) fail.push('algo opaco tapa el juego: ' + tapa.join(', '));
  // el botón AUTO responde a un toque de verdad (en la 0.3 el HUD del juego tenía pointer-events:none y no hacía nada)
  if (await estado() === 'PLAYING') {
    const pos = await page.evaluate(() => { const b = document.getElementById('op-auto'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, OPPort.o.auto]; });
    if (pos) {
      await page.touchscreen.tap(pos[0], pos[1]); await sleep(300);
      if (await page.evaluate(() => OPPort.o.auto) === pos[2]) fail.push('el botón AUTO no responde al tocarlo');
      await page.touchscreen.tap(pos[0], pos[1]); await sleep(300);
    }
  }
  const st = await estado();
  if (!['PLAYING', 'LEVELUP', 'PAUSED', 'GAMEOVER', 'CHEST'].includes(st) && !/UP/.test(st)) fail.push('la partida no está en juego (estado ' + st + ')');
  if (await elegir() === '' && st === 'PLAYING') {
    const r = await page.evaluate(() => window.psBack());
    if (r !== 'paused') fail.push('Atrás en partida no pausó (' + r + ')');
    await sleep(500); await shot('4-pausa');
    const r2 = await page.evaluate(() => window.psBack());
    if (r2 !== 'resumed') fail.push('Atrás en la pausa no siguió la partida (' + r2 + ')');
  }
  await page.evaluate(() => { try { backToMenu(); } catch (e) { /* ya en el menú */ } });
  await sleep(1500);
  const opciones = await page.evaluate(() => { showOptions(); return window.psBack(); });
  if (opciones !== 'closed') fail.push('Atrás no cerró Opciones (' + opciones + ')');

  // Reabrir: la partida guardada (localStorage) sigue ahí
  const antes = await page.evaluate(() => JSON.stringify(Object.keys(localStorage)));
  await page.reload({ waitUntil: 'load' });
  await sleep(3000);
  const despues = await page.evaluate(() => JSON.stringify(Object.keys(localStorage)));
  if (antes !== despues || antes === '[]') fail.push(`el guardado no sobrevivió al reabrir (${antes} → ${despues})`);
  await shot('5-reabrir');

  if (errors.length) fail.push('errores del juego:\n  ' + errors.slice(0, 8).join('\n  '));
  if (missing.size) fail.push('faltan archivos:\n  ' + [...missing].slice(0, 20).join('\n  '));
  if (external.size) fail.push('intentó salir a internet:\n  ' + [...external].slice(0, 20).join('\n  '));
  await browser.close(); srv.close();
  if (fail.length) { console.log('✗ ' + fail.join('\n✗ ')); process.exit(1); }
  console.log('✓ Todo bien: menú, partida, pausa, opciones y guardado, sin errores ni internet');
})().catch(e => { console.error(e); process.exit(1); });
