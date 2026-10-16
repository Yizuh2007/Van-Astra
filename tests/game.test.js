import assert from "node:assert/strict";
import test from "node:test";
import { Player, Slime } from "../src/entities.js";
import { TILE_SIZE } from "../src/config.js";
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
