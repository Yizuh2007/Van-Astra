import { Game } from "./game.js";

const canvas = document.querySelector("#game-canvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("No se ha encontrado el canvas del juego.");
}

const ui = {
  level: document.querySelector("#player-level"),
  playerName: document.querySelector("#player-name"),
  xpLabel: document.querySelector("#player-xp-label"),
  xpBar: document.querySelector("#xp-bar"),
  healthLabel: document.querySelector("#health-label"),
  healthBar: document.querySelector("#health-bar"),
  attack: document.querySelector("#attack-label"),
  creatureCount: document.querySelector("#creature-count"),
  coordinates: document.querySelector("#coordinates"),
  message: document.querySelector("#game-message"),
  questProgress: document.querySelector("#quest-progress"),
  questBar: document.querySelector("#quest-bar"),
  questState: document.querySelector("#quest-state"),
  inventoryGrid: document.querySelector("#inventory-grid"),
  inventoryCapacity: document.querySelector("#inventory-capacity"),
  characterSheet: document.querySelector("#character-sheet"),
  openCharacterSheet: document.querySelector("#open-character-sheet"),
  closeCharacterSheet: document.querySelector("#close-character-sheet"),
  sheetLevel: document.querySelector("#sheet-level"),
  sheetPlayerName: document.querySelector("#sheet-player-name"),
  sheetXpLabel: document.querySelector("#sheet-xp-label"),
  sheetXpBar: document.querySelector("#sheet-xp-bar"),
  sheetHealthLabel: document.querySelector("#sheet-health-label"),
  sheetHealthBar: document.querySelector("#sheet-health-bar"),
  sheetAttack: document.querySelector("#sheet-attack"),
  sheetCoordinates: document.querySelector("#sheet-coordinates"),
  profileSelect: document.querySelector("#character-profile-select"),
  showProfileForm: document.querySelector("#show-profile-form"),
  newProfileForm: document.querySelector("#new-profile-form"),
  newProfileName: document.querySelector("#new-profile-name"),
  cancelProfileForm: document.querySelector("#cancel-profile-form"),
  profileFormMessage: document.querySelector("#profile-form-message"),
};

const game = new Game(canvas, ui);
game.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy());
}
