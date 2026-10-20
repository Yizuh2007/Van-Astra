import assert from "node:assert/strict";
import test from "node:test";
import { Game } from "../src/game.js";
import { Player, Slime } from "../src/entities.js";
import { PLAYER_START, TILE_SIZE } from "../src/config.js";
import { Inventory } from "../src/inventory.js";
import { QuestTracker } from "../src/quests.js";
import { World } from "../src/world.js";

test("el jugador sube de nivel y conserva la experiencia sobrante", () => {
  const player = new Player(24 * TILE_SIZE, 18 * TILE_SIZE);
  player.health = 40;

  const levelsGained = player.gainExperience(130);

  assert.equal(levelsGained, 1);
  assert.equal(player.level, 2);
  assert.equal(player.xp, 30);
  assert.equal(player.nextLevelXp, 150);
  assert.equal(player.attack, 15);
  assert.equal(player.maxHealth, 120);
  assert.equal(player.health, 120);
});

test("la poción recupera vida sin superar el máximo", () => {
  const player = new Player(100, 100);
  player.health = 80;

  assert.equal(player.heal(30), 20);
  assert.equal(player.health, player.maxHealth);
});

test("un golpe da unos instantes de protección antes del siguiente", () => {
  const player = new Player(100, 100);
  const world = { isBlocked: () => false };

  assert.equal(player.takeDamage(5), false);
  assert.equal(player.health, 95);
  assert.equal(player.takeDamage(5), false);
  assert.equal(player.health, 95);

  player.update(player.invulnerabilityTimer + 0.01, { x: 0, y: 0 }, world);
  assert.equal(player.takeDamage(5), false);
  assert.equal(player.health, 90);
});

test("el guardado local conserva el progreso y el inventario", () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });

  try {
    const savedGame = Object.create(Game.prototype);
    savedGame.player = new Player(PLAYER_START.x, PLAYER_START.y);
    savedGame.quest = new QuestTracker();
    savedGame.profiles = [{ id: "viajero", name: "Viajero" }];
    savedGame.activeProfileId = "viajero";
    savedGame.player.level = 3;
    savedGame.player.xp = 25;
    savedGame.player.nextLevelXp = 200;
    savedGame.player.attack = 18;
    savedGame.player.maxHealth = 140;
    savedGame.player.health = 65;
    savedGame.player.x += TILE_SIZE;
    savedGame.world = new World();
    savedGame.inventory = new Inventory();
    savedGame.inventory.add("health-potion", 2);
    savedGame.inventory.add("gold-coin", 6);
    savedGame.quest.recordKill();

    assert.equal(savedGame.saveGame(), true);

    const loadedGame = Object.create(Game.prototype);
    loadedGame.player = new Player(PLAYER_START.x, PLAYER_START.y);
    loadedGame.profiles = [];
    loadedGame.activeProfileId = null;
    loadedGame.world = new World();
    loadedGame.inventory = new Inventory();
    loadedGame.ui = { message: { textContent: "" } };
    loadedGame.messageTimer = 0;

    assert.equal(loadedGame.loadGame(), true);
    assert.equal(loadedGame.player.level, 3);
    assert.equal(loadedGame.player.xp, 25);
    assert.equal(loadedGame.player.health, 65);
    assert.equal(loadedGame.player.name, "Viajero");
    assert.equal(loadedGame.player.x, PLAYER_START.x + TILE_SIZE);
    assert.equal(loadedGame.inventory.count("health-potion"), 2);
    assert.equal(loadedGame.inventory.count("gold-coin"), 6);
    assert.equal(loadedGame.quest.kills, 1);
  } finally {
    if (previousStorage) {
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test("la partida antigua pasa al primer perfil sin perder el inventario", () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map([[
    "van-astra-save-v1",
    JSON.stringify({
      version: 1,
      player: {
        x: PLAYER_START.x,
        y: PLAYER_START.y,
        level: 2,
        xp: 20,
        nextLevelXp: 150,
        attack: 15,
        maxHealth: 120,
        health: 90,
      },
      inventory: [{ itemId: "gold-coin", quantity: 9 }],
    }),
  ]]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });

  try {
    const game = Object.create(Game.prototype);
    game.player = new Player(PLAYER_START.x, PLAYER_START.y);
    game.world = new World();
    game.inventory = new Inventory();
    game.profiles = [];
    game.activeProfileId = null;
    game.ui = { message: { textContent: "" } };
    game.messageTimer = 0;

    assert.equal(game.loadGame(), true);
    assert.equal(game.player.name, "Viajero");
    assert.equal(game.player.level, 2);
    assert.equal(game.inventory.count("gold-coin"), 9);
    assert.ok(values.has("van-astra-profiles-v1"));
  } finally {
    if (previousStorage) {
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test("cada perfil conserva por separado el personaje y el inventario", () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });

  try {
    const savedPlayer = (name, health) => ({
      name,
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      level: 1,
      xp: 0,
      nextLevelXp: 100,
      attack: 12,
      maxHealth: 100,
      health,
    });
    const game = Object.create(Game.prototype);
    game.world = new World();
    game.player = new Player(PLAYER_START.x, PLAYER_START.y);
    game.quest = new QuestTracker();
    game.inventory = new Inventory();
    game.profiles = [
      {
        id: "viajero",
        name: "Viajero",
        player: savedPlayer("Viajero", 80),
        inventory: [{ itemId: "health-potion", quantity: 1 }],
        quest: { kills: 1 },
      },
      {
        id: "exploradora",
        name: "Exploradora",
        player: savedPlayer("Exploradora", 60),
        inventory: [{ itemId: "gold-coin", quantity: 7 }],
        quest: { kills: 2 },
      },
    ];
    game.activeProfileId = "viajero";
    game.loadProfile(game.profiles[0]);
    game.ui = { message: { textContent: "" } };
    game.renderProfiles = () => {};
    game.updateHud = () => {};
    game.renderInventory = () => {};

    game.switchProfile("exploradora");
    assert.equal(game.player.name, "Exploradora");
    assert.equal(game.inventory.count("gold-coin"), 7);
    assert.equal(game.quest.kills, 2);
    game.player.health = 45;

    game.switchProfile("viajero");
    assert.equal(game.player.health, 80);
    assert.equal(game.inventory.count("health-potion"), 1);
    assert.equal(game.quest.kills, 1);
    game.switchProfile("exploradora");
    assert.equal(game.player.health, 45);
  } finally {
    if (previousStorage) {
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test("se puede crear un perfil con nombre propio y una poción inicial", () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });

  try {
    const game = Object.create(Game.prototype);
    game.world = new World();
    game.player = new Player(PLAYER_START.x, PLAYER_START.y);
    game.quest = new QuestTracker();
    game.inventory = new Inventory();
    game.profiles = [{ id: "viajero", name: "Viajero" }];
    game.activeProfileId = "viajero";
    game.ui = {
      message: { textContent: "" },
      profileFormMessage: { textContent: "" },
      newProfileForm: { reset() {}, hidden: false },
    };
    game.renderProfiles = () => {};
    game.updateHud = () => {};
    game.renderInventory = () => {};

    assert.equal(game.createProfile(" Lira "), true);
    assert.equal(game.player.name, "Lira");
    assert.equal(game.inventory.count("health-potion"), 1);
    assert.equal(game.profiles.length, 2);
    assert.equal(game.profiles[0].name, "Viajero");
    assert.equal(game.profiles[1].name, "Lira");
    assert.equal(game.createProfile("lira"), false);
  } finally {
    if (previousStorage) {
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test("derrotar tres limos completa la misión y entrega sus recompensas", () => {
  const player = new Player(100, 100);
  const game = Object.create(Game.prototype);
  game.player = player;
  game.inventory = new Inventory();
  game.quest = new QuestTracker();
  game.creatures = Array.from({ length: 3 }, (_, index) => ({
    alive: true,
    x: 110 + index * 10,
    y: 100,
    experience: 35,
    takeDamage() {
      this.alive = false;
      return true;
    },
  }));
  game.ui = { message: { textContent: "" } };
  game.messageTimer = 0;
  game.notify = (message) => { game.ui.message.textContent = message; };
  game.renderInventory = () => {};
  game.updateHud = () => {};
  game.saveGame = () => true;

  for (let kill = 0; kill < 3; kill += 1) {
    game.attack();
    player.attackCooldown = 0;
  }

  assert.equal(game.quest.completed, true);
  assert.equal(game.inventory.count("slime-gel"), 3);
  assert.equal(game.inventory.count("gold-coin"), 29);
  assert.equal(player.level, 2);
  assert.equal(player.xp, 65);
  assert.match(game.ui.message.textContent, /Misión completada/);
});

test("el jugador actualiza la orientación y la animación al moverse", () => {
  const player = new Player(100, 100);
  const world = { isBlocked: () => false };

  player.update(0.1, { x: -1, y: 0 }, world);

  assert.equal(player.moving, true);
  assert.deepEqual(player.facing, { x: -1, y: 0 });
  assert.ok(player.animationTime > 0);
  assert.equal(player.x, 100 - player.speed * 0.1);
});

test("el personaje se dibuja mirando en las cuatro direcciones", () => {
  const player = new Player(100, 100);
  const context = {
    arc() {},
    beginPath() {},
    ellipse() {},
    fill() {},
    fillRect() {},
    fillText() {},
    restore() {},
    rotate() {},
    save() {},
    scale() {},
    stroke() {},
    translate() {},
  };

  for (const facing of [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ]) {
    player.facing = facing;
    assert.doesNotThrow(() => player.draw(context));
  }
});

test("una criatura derrotada deja de estar activa y puede reaparecer", () => {
  const slime = new Slime(0, 100, 100);

  assert.equal(slime.takeDamage(12), false);
  assert.equal(slime.health, 16);
  assert.equal(slime.takeDamage(16), true);
  assert.equal(slime.alive, false);

  slime.respawn();
  assert.equal(slime.alive, true);
  assert.equal(slime.health, slime.maxHealth);
});

test("el mundo define un camino y mantiene libre la zona inicial", () => {
  const world = new World();

  assert.equal(world.isPath(24, 18), true);
  assert.equal(world.isPath(5, 5), false);
  assert.equal(world.isBlocked(24 * TILE_SIZE, 18 * TILE_SIZE, 10), false);
  assert.equal(world.isBlocked(0, 0, 10), true);
});
