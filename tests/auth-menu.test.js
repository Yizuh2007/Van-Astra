import assert from "node:assert/strict";
import test from "node:test";
import { AuthMenu } from "../src/auth-menu.js";

class FakeElement {
  constructor() {
    this.listeners = new Map();
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.classList = { toggle() {} };
  }

  addEventListener(type, callback) {
    this.listeners.set(type, callback);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  click() {
    return this.listeners.get("click")?.({ preventDefault() {} });
  }
}

function createAuthUi() {
  return Object.fromEntries([
    "authScreen", "authTitle", "authDescription", "authConfigWarning", "authForm",
    "authEmailField", "authEmail", "authPasswordField", "authPassword",
    "authPasswordLabel", "authSubmit", "authMessage", "authModeToggle",
    "authResetToggle", "authDemoButton", "mainMenu", "menuStatus", "menuUser",
    "menuPlay", "menuSignOut", "gameShell", "backToMenu",
  ].map((name) => [name, new FakeElement()]));
}

test("sin Supabase se puede entrar y volver desde el modo local", async () => {
  const ui = createAuthUi();
  const startedUsers = [];
  let exits = 0;
  const menu = new AuthMenu(ui, {
    onStartGame: (userId) => startedUsers.push(userId),
    onExitGame: () => { exits += 1; },
  });

  await menu.initialize();
  assert.equal(ui.authConfigWarning.hidden, false);
  assert.equal(ui.authSubmit.disabled, true);
  assert.equal(ui.authScreen.hidden, false);

  ui.authDemoButton.click();
  assert.equal(ui.mainMenu.hidden, false);
  assert.equal(ui.menuStatus.textContent, "MODO LOCAL");

  ui.menuPlay.click();
  assert.equal(ui.gameShell.hidden, false);
  assert.deepEqual(startedUsers, [null]);

  ui.backToMenu.click();
  assert.equal(ui.gameShell.hidden, true);
  assert.equal(ui.mainMenu.hidden, false);

  await ui.menuSignOut.click();
  assert.equal(ui.authScreen.hidden, false);
  assert.equal(ui.mainMenu.hidden, true);
  assert.ok(exits >= 2);

  menu.destroy();
});
