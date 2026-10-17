import { CREATURE_SPAWNS, PLAYER_START, TILE_SIZE, VIEWPORT } from "./config.js";
import { Player, Slime } from "./entities.js";
import { Input } from "./input.js";
import { INVENTORY_CAPACITY, Inventory, ITEMS } from "./inventory.js";
import { World } from "./world.js";

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.ui = ui;
    this.world = new World();
    this.player = new Player(PLAYER_START.x, PLAYER_START.y);
    this.inventory = new Inventory(INVENTORY_CAPACITY);
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
    this.renderInventory();
  }

  start() {
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  frame = (timestamp) => {
    // Limitar el tiempo entre cuadros evita saltos grandes si el navegador se pausa un momento.
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
    // El golpe alcanza a la criatura viva más cercana dentro del rango, sin apuntar directamente.
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
      const gelLeftover = this.inventory.add("slime-gel", 1);
      const coinLeftover = this.inventory.add("gold-coin", 3);
      const loot = [];
      if (gelLeftover < 1) loot.push("gelatina x1");
      if (coinLeftover < 3) loot.push(`monedas x${3 - coinLeftover}`);

      const message = [`¡Criatura derrotada! +${target.experience} XP.`];
      if (levelsGained > 0) message.push(`¡Nivel ${this.player.level}! Ataque y vida aumentados.`);
      if (loot.length > 0) message.push(`Botín: ${loot.join(", ")}.`);
      if (gelLeftover > 0 || coinLeftover > 0) message.push("Inventario lleno: no se guardó todo el botín.");
      this.notify(message.join(" "));
      this.renderInventory();
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

  renderInventory() {
    this.ui.inventoryCapacity.textContent = `${this.inventory.usedSlots} / ${this.inventory.capacity}`;
    this.ui.inventoryGrid.replaceChildren();

    this.inventory.slots.forEach((entry, index) => {
      const slot = document.createElement("div");
      slot.className = `inventory-slot${entry ? "" : " is-empty"}`;
      slot.setAttribute("role", "listitem");

      if (!entry) {
        slot.setAttribute("aria-label", `Espacio vacío ${index + 1}`);
      } else {
        const item = ITEMS[entry.itemId];
        slot.style.setProperty("--item-color", item.color);
        slot.setAttribute("aria-label", `${item.name}: ${entry.quantity}`);
        slot.title = `${item.name} x${entry.quantity}`;

        const icon = document.createElement("span");
        icon.className = "inventory-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = item.icon;
        slot.append(icon);

        const quantity = document.createElement("span");
        quantity.className = "inventory-quantity";
        quantity.textContent = entry.quantity;
        quantity.setAttribute("aria-hidden", "true");
        slot.append(quantity);
      }

      this.ui.inventoryGrid.append(slot);
    });
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
