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
- **Al minimizar o salir**, la partida se pausa y la música y los efectos se callan de verdad (en Android seguían sonando).
- **Mejoras del port** (`www/port/`, sin tocar el juego; Opciones → PORT):
  - **Críticos:** el número sale en **rojo**, más grande y con «!», y un **contador** en pantalla (críticos y % de la partida).
    En la pausa: críticos, sobrecríticos y tu probabilidad. Récord de críticos en Récords.
  - **Límite de FPS** (sin límite, 120, 60, 30) y la app usa la frecuencia más alta de la pantalla (90/120/144 Hz).
  - **Joystick** flotante o fijo, de tres tamaños y con zona muerta; **vibración** al recibir golpes, subir de nivel y llegar un jefe.
  - **Daño por técnica** en la pausa (con las evoluciones que te faltan) y al terminar, con una **gráfica** del daño.
  - **Minimapa** con enemigos, élites, cofres y jefes.
  - **Editor del HUD** (Pausa → Editar HUD): mover y cambiar el tamaño de cada pieza.
  - **Misiones** diarias y semanales con premio en Berries y «Cobrar todo».
  - **Historial** de las últimas 30 partidas (con su gráfica) en Récords.
  - **AUTO** (botón en partida, se activa y desactiva): aprende las mejoras al subir de nivel **sin pausar**; prioriza
    subir lo que ya tienes y los objetos que piden tus evoluciones. Los cofres se recogen solos y avisan qué traían.
  - **Saltar animaciones:** la ruleta de los cofres se resuelve al instante y la evolución dura menos.
  - **Contador de FPS** y **daño por segundo** en vivo junto al de críticos.
  - **Flechas** en el borde de la pantalla hacia el jefe y los cofres (con la distancia).
  - **Desafío diario:** misma isla, personaje y clima para todos cada día (aunque no estén desbloqueados), marca del día,
    racha de días seguidos y premio en Berries.
  - **Entrenamiento:** muñecos de práctica sin oleadas ni jefe, sin perder vida; sube de nivel y mira el daño por técnica.
  - **Bitácora:** estadísticas de todas tus partidas y 14 logros del port con premio en Berries.
  - **Radio:** qué pista suena en batalla y en el menú (o alternar en cada partida).
  - **Guardar y salir** (en la pausa): la partida se guarda y sigue con **CONTINUAR** en el menú (una vez; si el jefe
    estaba vivo, vuelve a aparecer).
  - **El botón MÚSICA del menú** calla toda la música, también la de batalla.
  - **Tienda de Berries** (`www/port/tienda.js`): las mejoras llegan a nivel 8 (Revivir a 2; en Velocidad y Área los
    niveles nuevos dan medio efecto) y hay tres nuevas: Recuperación, Golpe crítico y Suerte.
  - **0.4:** Bodega ampliada (+2 huecos de pasiva, 6 → 8), Cañón extra (+1 hueco de técnica, 6 → 7), Veterano (empiezas
    hasta 3 niveles más arriba), Haki de armadura (escudo que bloquea un golpe y se recarga), Botín de guerra (curar al
    derrotar), Cofre del tesoro (cofres con más objetos) y Sello de la tripulación (+daño por cada técnica distinta).
  - **Sprites de los Gears** (`www/port/sprites`, de hojas que pasó el usuario): Gear 3 con su propio sprite de brazo
    inflado, Luffy encogido con 4 cuadros de reposo y 4 de correr, y Gear 5 con 6 cuadros de reposo y 6 de ataque.
  - **CARGAR** (botón junto al de Gear, o mantener C): llena el medidor de transformación de cualquier personaje con un
    aura humeante de su color; mientras cargas te quedas quieto y recibes un 30 % más de daño. Estallido de humo al llenarse.
- `tools/parches.py`: los únicos 3 cambios dentro del código del juego (color de los críticos y el gancho del medidor
  de daño). Se vuelven a aplicar solos en cada actualización; si el juego cambia y ya no encajan, la mejora se apaga sola.

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
