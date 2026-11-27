// Prueba de la Isla desconocida (port/islas.js + worldgen): elegirla, cambiar bioma, jugar ~25 s y comprobar límites y obstáculos.
// uso: node tests/islas.cjs [carpeta www] [carpeta de capturas]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const WWW = path.resolve(process.argv[2] || 'app/src/main/assets/www'), SHOTS = process.argv[3] || 'capturas';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', png: 'image/png', jpg: 'image/jpeg' };
(async () => {
  const srv = await new Promise(res => { const s = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(WWW, p); if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': MIME[f.split('.').pop()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0, '127.0.0.1', () => res(s)); });
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.goto(base); await sleep(3500); await page.mouse.click(450, 300); await sleep(1500);
  const res = {};
  for (const bioma of ['desierto', 'nieve', 'bosque', 'ciudad']) {
    await page.evaluate(b => { selectMap('gen'); document.querySelector(`#op-isla [data-bioma="${b}"]`).click(); }, bioma);
    await sleep(200);
    if (bioma === 'bosque') { await page.screenshot({ path: `${SHOTS}/menu.png` }); }
    const t0 = Date.now();
    await page.evaluate(() => IMG.genMap.width);
    res[bioma] = { pintadoMs: Date.now() - t0, rotulo: await page.evaluate(() => document.getElementById('map-selected').innerText) };
    await page.evaluate(() => { const c = IMG.genMap; const a = document.createElement('a'); window.__png = c.toDataURL('image/jpeg', 0.7); });
    const data = await page.evaluate(() => window.__png);
    fs.writeFileSync(`${SHOTS}/fondo-${bioma}.jpg`, Buffer.from(data.split(',')[1], 'base64'));
  }
  // Partida en la selva
  await page.evaluate(() => { document.querySelector('#op-isla [data-bioma="bosque"]').click(); selectCharacter('luffy'); startGame(); });
  await sleep(1500);
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  let fuera = 0, dentroObs = 0;
  for (let t = 0; t < 24; t++) {
    await page.evaluate(() => { for (const id of ['arcana-screen', 'upgrade-screen']) { const s = document.getElementById(id);
      if (s && getComputedStyle(s).display !== 'none') { const b = s.querySelector('[onclick], button, .upgrade-card, .arcana-card'); if (b) b.click(); } } });
    const k = keys[t % 4]; await page.keyboard.down(k); await sleep(1000); await page.keyboard.up(k);
    const st = await page.evaluate(() => ({ dentro: pointInPoly(player.x, player.y, walkPoly()), obs: hitsObstacle(player.x, player.y, 0), map: selectedMap, n: mapObstacles().length }));
    if (!st.dentro) fuera++; if (st.obs) dentroObs++;
    if (t === 10) await page.screenshot({ path: `${SHOTS}/partida.png` });
    res.partida = st;
  }
  await page.screenshot({ path: `${SHOTS}/partida2.png` });
  res.fuera = fuera; res.dentroObs = dentroObs; res.estado = await page.evaluate(() => gameState); res.errores = errors;
  console.log(JSON.stringify(res, null, 1));
  const mal = [];
  if (res.errores.length) mal.push('errores: ' + res.errores.join(' / '));
  if (res.fuera) mal.push('el jugador salió de la isla ' + res.fuera + ' veces');
  if (res.dentroObs) mal.push('el jugador atravesó obstáculos ' + res.dentroObs + ' veces');
  if (res.partida.map !== 'gen') mal.push('la partida no fue en la isla generada');
  console.log(mal.length ? '✗ ' + mal.join('; ') : '✓ Isla desconocida bien');
  process.exitCode = mal.length ? 1 : 0;
  await browser.close(); srv.close();
})();
