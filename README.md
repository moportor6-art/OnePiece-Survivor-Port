# One Piece: Grand Line Survivor — port offline (Android y Windows)

Port no oficial de **[One Piece: Grand Line Survivor](https://pxvlo.itch.io/one-piece-survivor) de PXVLO**,
completo y sin internet. Se instala desde el **Port Launcher** (Android y Windows) o con la APK de *Releases*.

Survivor pirata: sobrevive 8 minutos al caos del Grand Line con Luffy, Zoro, Usopp, Sanji, Nami, Chopper, Robin,
Franky, Brook y Jinbe, por 13 islas de la saga (de Shell Town a Wano), con los Gears de Luffy, el Haki, Berries,
cofres y logros.

## Qué tiene

- **Todo en local.** El juego entero (código, sprites, mapas, música, efectos y las fuentes de letra) va dentro de la app.
  Nada sale a internet: la app corta cualquier petición a otro sitio.
- **La partida se guarda en el teléfono** (como en la web). En *Opciones → Guardado* se puede exportar e importar.
  La sincronización en la nube de la web no está (necesita su servidor).
- **Actualizador propio** en *Opciones → APP*: al abrir la app busca la versión nueva y **baja solo los archivos que
  cambiaron**, sin reinstalar. La APK completa solo se pide si cambia la parte Android. Si algo nuevo no arranca,
  vuelve sola a la versión anterior. En Windows lo actualiza el Port Launcher, también solo con lo que cambió.
- **Al día con la web:** cada día GitHub mira opsurvivor.pages.dev; si PXVLO publicó algo nuevo, lo baja, lo prueba
  y publica una versión (`tools/actualizar.py`, `.github/workflows/actualizar.yml`).
- **Atrás de Android:** en partida pausa, en una ventana la cierra y en el menú pregunta antes de salir.
- Pantalla completa en horizontal y la pantalla no se apaga mientras juegas.

## Cómo está hecho

| Parte | Dónde |
|---|---|
| Juego (copia de la web, sin tocar) | `app/src/main/assets/www/` |
| Capa local (lo único nuestro dentro del juego) | `www/local.js`, `www/css/fonts.css` y `www/assets/fonts/` |
| App Android (WebView, servidor de archivos, Atrás) | `app/src/main/java/com/moportor6/opsurvivor/MainActivity.java` |
| Actualizador | `Updater.java` + `contenido.json` de cada versión |
| Bajar la web y ponerla al día | `tools/actualizar.py` |
| Prueba automática sin internet | `tests/smoke.cjs` (si falla, no se publica) |
| Compilar y publicar | `.github/workflows/build-apk.yml` · diario: `actualizar.yml` |

## Créditos

- **One Piece: Grand Line Survivor:** PXVLO (fan game no oficial y sin ánimo de lucro) — https://pxvlo.itch.io/one-piece-survivor
- Fuentes Pirata One y Bangers: SIL Open Font License.
- One Piece © Eiichiro Oda / Shueisha / Toei Animation. Este port no es oficial y no tiene ánimo de lucro.
