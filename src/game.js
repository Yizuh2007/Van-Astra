import { CREATURE_SPAWNS, PLAYER_START, TILE_SIZE, VIEWPORT } from "./config.js";
import { Player, Slime } from "./entities.js";
import { Input } from "./input.js";
import { World } from "./world.js";

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.ui = ui;
    this.world = new World();
    this.player = new Player(PLAYER_START.x, PLAYER_START.y);
    this.creatures = CREATURE_SPAWNS.map(({ x, y }, index) => (
      new Slime(index, PLAYER_START.x + x, PLAYER_START.y + y)
    ));
    this.input = new Input();
    this.lastFrame = 0;
    this.hudTimer = 0;
    this.messageTimer = 0;
    this.animationFrame = 0;
    this.camera = { x: 0, y: 0 };

    this.onPointerDown = () => this.attack();
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.updateHud();
  }

  start() {
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  frame = (timestamp) => {
    const delta = Math.min((timestamp - this.lastFrame) / 1000 || 0, 0.05);
    this.lastFrame = timestamp;
    this.update(delta);
    this.draw();
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  update(delta) {
    this.player.update(delta, this.input.direction(), this.world);
    if (this.input.consumeAttack()) this.attack();

    if (this.player.dead) {
      this.player.respawnTimer -= delta;
      if (this.player.respawnTimer <= 0) {
        this.player.respawn();
        this.notify("Has vuelto al bosque. ¡Inténtalo de nuevo!");
      }
    }

    for (const creature of this.creatures) {
      if (!creature.alive) {
        creature.respawnTimer -= delta;
        if (creature.respawnTimer <= 0) creature.respawn();
        continue;
      }

      creature.update(delta, this.player, this.world);
      if (this.player.dead || creature.attackCooldown > 0) continue;

      if (Math.hypot(this.player.x - creature.x, this.player.y - creature.y) < 30) {
        creature.attackCooldown = 1.25;
        const defeated = this.player.takeDamage(5);
        this.notify(defeated ? "Te han derrotado… volverás pronto al bosque." : "¡Una criatura te ha alcanzado!");
      }
    }

    this.messageTimer = Math.max(0, this.messageTimer - delta);
    this.hudTimer += delta;
    if (this.hudTimer >= 0.12) {
      this.hudTimer = 0;
      this.updateHud();
    }
  }

  attack() {
    if (this.player.dead || this.player.attackCooldown > 0) return;
    this.player.attackCooldown = 0.34;
    this.player.attackAnimation = 0.24;

    let target = null;
    let nearestDistance = 64;
    for (const creature of this.creatures) {
      if (!creature.alive) continue;
      const distance = Math.hypot(this.player.x - creature.x, this.player.y - creature.y);
      if (distance < nearestDistance) {
        target = creature;
        nearestDistance = distance;
      }
    }

    if (!target) {
      this.notify("No hay criaturas al alcance. Acércate un poco más.");
      return;
    }

    const defeated = target.takeDamage(this.player.attack);
    if (defeated) {
      const levelsGained = this.player.gainExperience(target.experience);
      this.notify(levelsGained > 0
        ? `¡Has subido al nivel ${this.player.level}! Tu ataque y tu vida han aumentado.`
        : `¡Criatura derrotada! +${target.experience} XP.`);
    } else {
      this.notify("¡Buen golpe! La criatura sigue en pie.");
    }
    this.updateHud();
  }

  notify(message) {
    this.ui.message.textContent = message;
    this.messageTimer = 3;
  }

  updateHud() {
    const { player } = this;
    const xpPercent = (player.xp / player.nextLevelXp) * 100;
    const healthPercent = (player.health / player.maxHealth) * 100;

    this.ui.level.textContent = player.level;
    this.ui.xpLabel.textContent = `${player.xp} / ${player.nextLevelXp} XP`;
    this.ui.xpBar.style.width = `${xpPercent}%`;
    this.ui.healthLabel.textContent = `${player.health} / ${player.maxHealth}`;
    this.ui.healthBar.style.width = `${healthPercent}%`;
    this.ui.attack.textContent = player.attack;
    this.ui.creatureCount.textContent = this.creatures.filter((creature) => creature.alive).length;
    this.ui.coordinates.textContent = `${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`;
  }

  draw() {
    const { context, player } = this;
    this.camera.x = Math.max(0, Math.min(this.world.width - VIEWPORT.width, player.x - VIEWPORT.width / 2));
    this.camera.y = Math.max(0, Math.min(this.world.height - VIEWPORT.height, player.y - VIEWPORT.height / 2));

    context.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    context.save();
    context.translate(-this.camera.x, -this.camera.y);
    this.world.draw(context, this.camera.x, this.camera.y, VIEWPORT.width, VIEWPORT.height);

    for (const creature of this.creatures) creature.draw(context);
    player.draw(context);
    context.restore();

    if (this.messageTimer === 0) {
      this.ui.message.textContent = "Explora el bosque y encuentra criaturas.";
    }
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.input.destroy();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
  }
}
