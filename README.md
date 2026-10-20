# Van Astra

Prototipo inicial de un MMORPG de fantasía en 2D, inspirado en los juegos de aventura online clásicos. **Van Astra es un proyecto original**: este repositorio no contiene código ni recursos de otros juegos.

## Estado actual

La primera versión es un prototipo local en el navegador. El aventurero tiene un diseño pixel art original, vistas en cuatro direcciones y animación básica al caminar y atacar. El acceso por correo usa Supabase cuando se configura; el progreso todavía se guarda localmente y no hay multijugador en red.

## Inicio y desarrollo

Instala las dependencias y arranca el servidor de desarrollo:

```bash
npm install
npm run dev
```

Necesitas Node.js **20.19+** o **22.12+**. Abre [http://localhost:5173](http://localhost:5173) en el navegador. Para generar una versión de producción, usa `npm run build`.

## Configurar el acceso por correo

1. Crea un proyecto en Supabase y abre la configuración de **API**.
2. Copia `.env.example` como `.env.local`.
3. Completa `VITE_SUPABASE_URL` con la URL del proyecto y `VITE_SUPABASE_ANON_KEY` con la clave pública `anon` o `publishable`.
4. En Supabase, configura la URL local `http://localhost:5173` como sitio y destino permitido para los enlaces de confirmación y recuperación.
5. Reinicia `npm run dev`.

No pongas claves `service_role` en el cliente ni en GitHub. Mientras Supabase no esté configurado, puedes entrar en modo local; el juego guarda los perfiles en este navegador, separados por usuario cuando se inicia sesión, pero todavía no los sincroniza con la nube.

Para ejecutar las pruebas de lógica con Node.js:

```bash
npm test
```

## Controles

- **WASD** o **flechas**: moverse.
- **Espacio** o **clic**: atacar a una criatura cercana.
- **I**: abrir o cerrar la ficha del personaje.
- Desde la ficha puedes crear y cambiar de personaje.
- Desde el menú inicial puedes entrar con correo, crear una cuenta, recuperar la contraseña o probar el modo local.
- **Poción de vida**: pulsa su casilla en el inventario para recuperar hasta 30 puntos de vida.
- Las criaturas derrotadas dejan gelatina y monedas; a veces también una poción de vida.
- El nivel, la experiencia, la salud y el inventario de cada personaje se guardan automáticamente en este navegador.

## Estructura

```text
index.html       Interfaz del juego
styles.css       Estilos adaptables
src/             Lógica del cliente, el mundo y el inventario (JavaScript nativo)
src/character.js Renderizado pixel art del personaje
src/auth-menu.js Login, registro, recuperación y menú inicial
src/supabase-client.js Cliente de autenticación Supabase
.env.example     Plantilla de configuración de Supabase
vite.config.js   Configuración de Vite
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
