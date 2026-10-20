# Van Astra

Prototipo inicial de un MMORPG de fantasía en 2D, inspirado en los juegos de aventura online clásicos. **Van Astra es un proyecto original**: este repositorio no contiene código ni recursos de otros juegos.

## Estado actual

La primera versión es un prototipo local en el navegador. El aventurero tiene un diseño pixel art original, vistas en cuatro direcciones y animación básica al caminar y atacar. Sirve como punto de partida para construir el mundo y probar el bucle básico de exploración y combate; todavía no incluye cuentas ni multijugador en red. El progreso se guarda en este navegador.

## Ejecutar

No hacen falta dependencias ni un proceso de compilación. Con Python 3, inicia el servidor estático:

```bash
python3 -m http.server 8000
```

También puedes iniciarlo con `npm run serve`.

Abre [http://localhost:8000](http://localhost:8000) en el navegador.

Para ejecutar las pruebas de lógica con Node.js:

```bash
npm test
```

## Controles

- **WASD** o **flechas**: moverse.
- **Espacio** o **clic**: atacar a una criatura cercana.
- **I**: abrir o cerrar la ficha del personaje.
- Desde la ficha puedes crear y cambiar de personaje.
- Completa la misión de caza derrotando tres limos para ganar experiencia y monedas.
- **Poción de vida**: pulsa su casilla en el inventario para recuperar hasta 30 puntos de vida.
- Las criaturas derrotadas dejan gelatina y monedas; a veces también una poción de vida.
- El nivel, la experiencia, la salud y el inventario de cada personaje se guardan automáticamente en este navegador.

## Estructura

```text
index.html       Interfaz del juego
styles.css       Estilos adaptables
src/             Lógica del cliente, el mundo, las misiones y el inventario (JavaScript nativo)
src/character.js Renderizado pixel art del personaje
assets/sprites/  Arte fuente .ase y PNG usados por el juego
tests/           Pruebas de lógica con el ejecutor integrado de Node.js
```

El personaje tiene sprites propios en las cuatro direcciones. Los archivos `.ase` de `assets/sprites/` se pueden editar en LibreSprite; sus versiones PNG son las que carga el navegador.

## Próximos pasos

1. Separar el cliente y el servidor para habilitar partidas multijugador reales.
2. Añadir autenticación segura y guardado de personajes en el servidor.
3. Diseñar más zonas, criaturas, objetos y progresión.
4. Incorporar pruebas, registro de errores y despliegue automatizado.

La autoridad del juego —movimiento, combate, inventario y guardado— deberá trasladarse al servidor antes de publicar una versión online. El cliente actual solo es una demostración local.
