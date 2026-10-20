import { AuthMenu } from "./auth-menu.js";
import { Game } from "./game.js";

const canvas = document.querySelector("#game-canvas");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("No se ha encontrado el canvas del juego.");
}

const gameUi = {
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

let game = null;
let authMenu;

const exitGame = () => {
  game?.destroy();
  game = null;
};

const authUi = {
  authScreen: document.querySelector("#auth-screen"),
  authTitle: document.querySelector("#auth-title"),
  authDescription: document.querySelector("#auth-description"),
  authConfigWarning: document.querySelector("#auth-config-warning"),
  authForm: document.querySelector("#auth-form"),
  authEmailField: document.querySelector("#auth-email-field"),
  authEmail: document.querySelector("#auth-email"),
  authPasswordField: document.querySelector("#auth-password-field"),
  authPassword: document.querySelector("#auth-password"),
  authPasswordLabel: document.querySelector("#auth-password-label"),
  authSubmit: document.querySelector("#auth-submit"),
  authMessage: document.querySelector("#auth-message"),
  authModeToggle: document.querySelector("#auth-mode-toggle"),
  authResetToggle: document.querySelector("#auth-reset-toggle"),
  authDemoButton: document.querySelector("#auth-demo-button"),
  mainMenu: document.querySelector("#main-menu"),
  menuStatus: document.querySelector("#menu-status"),
  menuUser: document.querySelector("#menu-user"),
  menuPlay: document.querySelector("#menu-play"),
  menuSignOut: document.querySelector("#menu-sign-out"),
  gameShell: document.querySelector("#game-shell"),
  backToMenu: document.querySelector("#back-to-menu"),
};

authMenu = new AuthMenu(authUi, {
  onStartGame: (userId) => {
    exitGame();
    game = new Game(canvas, gameUi, userId);
    game.start();
  },
  onExitGame: exitGame,
});
void authMenu.initialize();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    authMenu.destroy();
    exitGame();
  });
}
