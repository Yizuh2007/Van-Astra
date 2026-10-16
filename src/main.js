import { Game } from "./game.js";

const canvas = document.querySelector("#game-canvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("No se ha encontrado el canvas del juego.");
}

const ui = {
  level: document.querySelector("#player-level"),
  xpLabel: document.querySelector("#player-xp-label"),
  xpBar: document.querySelector("#xp-bar"),
  healthLabel: document.querySelector("#health-label"),
  healthBar: document.querySelector("#health-bar"),
  attack: document.querySelector("#attack-label"),
  creatureCount: document.querySelector("#creature-count"),
  coordinates: document.querySelector("#coordinates"),
  message: document.querySelector("#game-message"),
};

const game = new Game(canvas, ui);
game.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy());
}
