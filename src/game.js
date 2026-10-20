import { CREATURE_SPAWNS, PLAYER_START, TILE_SIZE, VIEWPORT } from "./config.js";
import { Player, Slime } from "./entities.js";
import { Input } from "./input.js";
import { INVENTORY_CAPACITY, Inventory, ITEMS } from "./inventory.js";
import { QuestTracker, STARTER_QUEST } from "./quests.js";
import { World } from "./world.js";

const SAVE_KEY = "van-astra-save-v1";
const PROFILES_SAVE_KEY = "van-astra-profiles-v1";

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.ui = ui;
    this.world = new World();
    this.player = new Player(PLAYER_START.x, PLAYER_START.y);
    this.inventory = new Inventory(INVENTORY_CAPACITY);
    this.quest = new QuestTracker();
    this.profiles = [];
    this.activeProfileId = null;
    this.creatures = CREATURE_SPAWNS.map(({ x, y }, index) => (
      new Slime(index, PLAYER_START.x + x, PLAYER_START.y + y)
    ));
    this.input = new Input();
    this.lastFrame = 0;
    this.hudTimer = 0;
    this.messageTimer = 0;
    this.saveTimer = 0;
    this.animationFrame = 0;
    this.camera = { x: 0, y: 0 };
    if (!this.loadGame()) {
      // Una poción inicial permite probar el inventario desde el principio.
      this.inventory.add("health-potion", 1);
      this.activeProfileId = "default";
      this.profiles = [{
        id: this.activeProfileId,
        name: this.player.name,
        player: this.serializePlayer(),
        inventory: this.inventory.slots,
        quest: this.quest.serialize(),
      }];
      this.saveGame();
    }

    this.onPointerDown = () => this.attack();
    this.onBeforeUnload = () => this.saveGame();
    this.onCharacterSheetKeyDown = (event) => {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target?.tagName)) return;
      if (this.ui.characterSheet.open) {
        this.input.clear();
        this.input.consumeAttack();
      }
      if (event.code !== "KeyI" || event.repeat) return;
      this.toggleCharacterSheet();
    };
    this.onOpenCharacterSheet = () => this.ui.characterSheet.showModal();
    this.onCloseCharacterSheet = () => this.ui.characterSheet.close();
    this.onCharacterSheetBackdropClick = (event) => {
      if (event.target === this.ui.characterSheet) this.ui.characterSheet.close();
    };
    this.onProfileChange = () => this.switchProfile(this.ui.profileSelect.value);
    this.onShowProfileForm = () => {
      this.ui.profileFormMessage.textContent = "";
      this.ui.newProfileForm.hidden = false;
      this.ui.newProfileName.focus();
    };
    this.onCancelProfileForm = () => {
      this.ui.newProfileForm.reset();
      this.ui.newProfileForm.hidden = true;
      this.ui.profileFormMessage.textContent = "";
    };
    this.onSubmitProfileForm = (event) => {
      event.preventDefault();
      this.createProfile(this.ui.newProfileName.value);
    };

    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("beforeunload", this.onBeforeUnload);
    window.addEventListener("keydown", this.onCharacterSheetKeyDown);
    this.ui.openCharacterSheet.addEventListener("click", this.onOpenCharacterSheet);
    this.ui.closeCharacterSheet.addEventListener("click", this.onCloseCharacterSheet);
    this.ui.characterSheet.addEventListener("click", this.onCharacterSheetBackdropClick);
    this.ui.profileSelect.addEventListener("change", this.onProfileChange);
    this.ui.showProfileForm.addEventListener("click", this.onShowProfileForm);
    this.ui.cancelProfileForm.addEventListener("click", this.onCancelProfileForm);
    this.ui.newProfileForm.addEventListener("submit", this.onSubmitProfileForm);
    this.updateHud();
    this.renderInventory();
    this.renderProfiles();
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
    if (this.ui.characterSheet.open) {
      // La ficha pausa el juego y descarta teclas para evitar mover al personaje mientras está abierta.
      this.input.clear();
      this.input.consumeAttack();
      this.player.update(delta, { x: 0, y: 0 }, this.world);
      return;
    }

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
      if (this.player.dead || this.player.invulnerabilityTimer > 0 || creature.attackCooldown > 0) continue;

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

    this.saveTimer += delta;
    if (this.saveTimer >= 5) {
      this.saveTimer = 0;
      // Así también se guarda la posición mientras el jugador camina.
      this.saveGame();
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
      let levelsGained = this.player.gainExperience(target.experience);
      const questCompleted = this.quest.recordKill();
      const gelLeftover = this.inventory.add("slime-gel", 1);
      const coinLeftover = this.inventory.add("gold-coin", 3);
      let potionLeftover = 0;
      let questGoldLeftover = 0;
      const loot = [];

      if (questCompleted) {
        levelsGained += this.player.gainExperience(STARTER_QUEST.rewardExperience);
        questGoldLeftover = this.inventory.add("gold-coin", STARTER_QUEST.rewardGold);
      }
      if (Math.random() < 0.3) {
        potionLeftover = this.inventory.add("health-potion", 1);
        if (potionLeftover === 0) loot.push("poción de vida x1");
      }
      if (gelLeftover < 1) loot.push("gelatina x1");
      if (coinLeftover < 3) loot.push(`monedas x${3 - coinLeftover}`);

      const message = [`¡Criatura derrotada! +${target.experience} XP.`];
      if (levelsGained > 0) message.push(`¡Nivel ${this.player.level}! Ataque y vida aumentados.`);
      if (questCompleted) {
        const rewardGold = STARTER_QUEST.rewardGold - questGoldLeftover;
        message.push(`¡Misión completada! +${STARTER_QUEST.rewardExperience} XP y ${rewardGold} monedas.`);
      } else if (!this.quest.completed) {
        message.push(`Misión: ${this.quest.kills}/${STARTER_QUEST.target} limos.`);
      }
      if (loot.length > 0) message.push(`Botín: ${loot.join(", ")}.`);
      if (gelLeftover > 0 || coinLeftover > 0 || potionLeftover > 0 || questGoldLeftover > 0) {
        message.push("Inventario lleno: no se guardó todo el botín.");
      }
      this.notify(message.join(" "));
      this.renderInventory();
      this.saveGame();
    } else {
      this.notify("¡Buen golpe! La criatura sigue en pie.");
    }
    this.updateHud();
  }

  notify(message) {
    this.ui.message.textContent = message;
    this.messageTimer = 3;
  }

  loadGame() {
    try {
      const storedProfiles = localStorage.getItem(PROFILES_SAVE_KEY);
      if (storedProfiles) {
        const saved = JSON.parse(storedProfiles);
        if (saved?.version === 1 && Array.isArray(saved.profiles)) {
          this.profiles = saved.profiles.filter((profile) => (
            profile && typeof profile.id === "string"
            && typeof profile.name === "string" && profile.name.trim()
            && profile.player && Array.isArray(profile.inventory)
          ));

          if (this.profiles.length > 0) {
            const activeProfile = this.profiles.find((profile) => (
              profile.id === saved.activeProfileId
            )) || this.profiles[0];
            this.activeProfileId = activeProfile.id;
            this.loadProfile(activeProfile);
            this.notify("Partida cargada.");
            return true;
          }
        }
      }
    } catch {
      // Si el archivo de perfiles está dañado, se prueba el guardado anterior.
    }

    try {
      const oldSave = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (oldSave?.version === 1 && oldSave.player) {
        const oldProfile = {
          id: "default",
          name: "Viajero",
          player: oldSave.player,
          inventory: Array.isArray(oldSave.inventory) ? oldSave.inventory : [],
        };
        this.profiles = [oldProfile];
        this.activeProfileId = oldProfile.id;
        this.loadProfile(oldProfile);
        this.saveGame();
        this.notify("Partida cargada.");
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  loadProfile(profile) {
    this.player = new Player(PLAYER_START.x, PLAYER_START.y);
    this.player.name = profile.name;
    const player = profile.player;
    const { radius } = this.player;
    const insideWorld = Number.isFinite(player.x) && Number.isFinite(player.y)
      && player.x >= radius && player.y >= radius
      && player.x <= this.world.width - radius && player.y <= this.world.height - radius;
    if (insideWorld && !this.world.isBlocked(player.x, player.y, radius)) {
      this.player.x = player.x;
      this.player.y = player.y;
    }

    if (Number.isInteger(player.level) && player.level > 0) this.player.level = player.level;
    if (Number.isInteger(player.nextLevelXp) && player.nextLevelXp > 0) {
      this.player.nextLevelXp = player.nextLevelXp;
    }
    if (Number.isInteger(player.xp) && player.xp >= 0) {
      this.player.xp = Math.min(player.xp, this.player.nextLevelXp - 1);
    }
    if (Number.isInteger(player.attack) && player.attack > 0) this.player.attack = player.attack;
    if (Number.isInteger(player.maxHealth) && player.maxHealth > 0) {
      this.player.maxHealth = player.maxHealth;
    }
    this.player.health = Number.isInteger(player.health) && player.health > 0
      ? Math.min(player.health, this.player.maxHealth)
      : this.player.maxHealth;

    this.inventory = new Inventory(INVENTORY_CAPACITY);
    this.inventory.restore(profile.inventory);
    this.quest = new QuestTracker(profile.quest);
  }

  serializePlayer(player = this.player) {
    return {
      name: player.name,
      x: player.dead ? player.startX : player.x,
      y: player.dead ? player.startY : player.y,
      level: player.level,
      xp: player.xp,
      nextLevelXp: player.nextLevelXp,
      attack: player.attack,
      maxHealth: player.maxHealth,
      health: player.dead ? player.maxHealth : player.health,
    };
  }

  saveGame() {
    try {
      const profile = this.profiles.find(({ id }) => id === this.activeProfileId);
      if (!profile) return false;

      profile.name = this.player.name;
      profile.player = this.serializePlayer();
      profile.inventory = this.inventory.slots;
      profile.quest = this.quest.serialize();
      localStorage.setItem(PROFILES_SAVE_KEY, JSON.stringify({
        version: 1,
        activeProfileId: this.activeProfileId,
        profiles: this.profiles,
      }));
      return true;
    } catch {
      return false;
    }
  }

  createProfile(name) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      this.ui.profileFormMessage.textContent = "Escribe un nombre para el personaje.";
      return false;
    }
    if (trimmedName.length > 16) {
      this.ui.profileFormMessage.textContent = "El nombre no puede tener más de 16 caracteres.";
      return false;
    }
    if (this.profiles.some((profile) => profile.name.toLowerCase() === trimmedName.toLowerCase())) {
      this.ui.profileFormMessage.textContent = "Ya existe un personaje con ese nombre.";
      return false;
    }

    this.saveGame();
    const player = new Player(PLAYER_START.x, PLAYER_START.y);
    player.name = trimmedName;
    const inventory = new Inventory(INVENTORY_CAPACITY);
    inventory.add("health-potion", 1);
    const profile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      player: this.serializePlayer(player),
      inventory: inventory.slots,
      quest: new QuestTracker().serialize(),
    };
    this.profiles.push(profile);
    this.activeProfileId = profile.id;
    this.loadProfile(profile);
    this.ui.newProfileForm.reset();
    this.ui.newProfileForm.hidden = true;
    this.ui.profileFormMessage.textContent = "";
    this.renderProfiles();
    this.updateHud();
    this.renderInventory();
    this.notify(`Personaje ${trimmedName} creado.`);
    this.saveGame();
    return true;
  }

  switchProfile(profileId) {
    if (!profileId || profileId === this.activeProfileId) return;
    const profile = this.profiles.find((entry) => entry.id === profileId);
    if (!profile) return;

    this.saveGame();
    this.activeProfileId = profile.id;
    this.loadProfile(profile);
    this.renderProfiles();
    this.updateHud();
    this.renderInventory();
    this.notify(`Has cambiado a ${profile.name}.`);
  }

  renderProfiles() {
    this.ui.profileSelect.replaceChildren();
    this.profiles.forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;
      this.ui.profileSelect.append(option);
    });
    this.ui.profileSelect.value = this.activeProfileId;
  }

  toggleCharacterSheet() {
    if (this.ui.characterSheet.open) {
      this.ui.characterSheet.close();
    } else {
      this.ui.characterSheet.showModal();
    }
  }

  useItem(itemId) {
    const item = ITEMS[itemId];
    if (!item?.healAmount) return;
    if (this.player.dead) {
      this.notify("No puedes usar una poción mientras estás derrotado.");
      return;
    }
    if (this.player.health >= this.player.maxHealth) {
      this.notify("Ya tienes toda la vida.");
      return;
    }
    if (!this.inventory.remove(itemId)) return;

    const recovered = this.player.heal(item.healAmount);
    this.notify(`Has recuperado ${recovered} puntos de vida.`);
    this.updateHud();
    this.renderInventory();
    this.saveGame();
  }

  updateHud() {
    const { player } = this;
    const xpPercent = (player.xp / player.nextLevelXp) * 100;
    const healthPercent = (player.health / player.maxHealth) * 100;
    const coordinates = `${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`;

    this.ui.playerName.textContent = player.name;
    this.ui.level.textContent = player.level;
    this.ui.xpLabel.textContent = `${player.xp} / ${player.nextLevelXp} XP`;
    this.ui.xpBar.style.width = `${xpPercent}%`;
    this.ui.healthLabel.textContent = `${player.health} / ${player.maxHealth}`;
    this.ui.healthBar.style.width = `${healthPercent}%`;
    this.ui.attack.textContent = player.attack;
    this.ui.creatureCount.textContent = this.creatures.filter((creature) => creature.alive).length;
    this.ui.coordinates.textContent = coordinates;
    this.ui.questProgress.textContent = `${this.quest.kills} / ${STARTER_QUEST.target}`;
    this.ui.questBar.style.width = `${(this.quest.kills / STARTER_QUEST.target) * 100}%`;
    this.ui.questState.textContent = this.quest.completed ? "COMPLETADA" : "EN CURSO";
    this.ui.questState.classList.toggle("is-complete", this.quest.completed);
    this.ui.sheetPlayerName.textContent = player.name;
    this.ui.sheetLevel.textContent = player.level;
    this.ui.sheetXpLabel.textContent = `${player.xp} / ${player.nextLevelXp} XP`;
    this.ui.sheetXpBar.style.width = `${xpPercent}%`;
    this.ui.sheetHealthLabel.textContent = `${player.health} / ${player.maxHealth}`;
    this.ui.sheetHealthBar.style.width = `${healthPercent}%`;
    this.ui.sheetAttack.textContent = player.attack;
    this.ui.sheetCoordinates.textContent = coordinates;
  }

  renderInventory() {
    this.ui.inventoryCapacity.textContent = `${this.inventory.usedSlots} / ${this.inventory.capacity}`;
    this.ui.inventoryGrid.replaceChildren();

    this.inventory.slots.forEach((entry, index) => {
      const item = entry ? ITEMS[entry.itemId] : null;
      const usable = Boolean(item?.healAmount);
      const slot = document.createElement(usable ? "button" : "div");
      if (usable) {
        slot.type = "button";
        slot.addEventListener("click", () => this.useItem(entry.itemId));
      }
      slot.className = `inventory-slot${entry ? "" : " is-empty"}${usable ? " is-usable" : ""}`;
      slot.setAttribute("role", "listitem");

      if (!entry) {
        slot.setAttribute("aria-label", `Espacio vacío ${index + 1}`);
      } else {
        slot.style.setProperty("--item-color", item.color);
        slot.setAttribute("aria-label", `${item.name}: ${entry.quantity}${usable ? ". Pulsa para usar." : ""}`);
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
    this.saveGame();
    this.input.destroy();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    window.removeEventListener("keydown", this.onCharacterSheetKeyDown);
    this.ui.openCharacterSheet.removeEventListener("click", this.onOpenCharacterSheet);
    this.ui.closeCharacterSheet.removeEventListener("click", this.onCloseCharacterSheet);
    this.ui.characterSheet.removeEventListener("click", this.onCharacterSheetBackdropClick);
    this.ui.profileSelect.removeEventListener("change", this.onProfileChange);
    this.ui.showProfileForm.removeEventListener("click", this.onShowProfileForm);
    this.ui.cancelProfileForm.removeEventListener("click", this.onCancelProfileForm);
    this.ui.newProfileForm.removeEventListener("submit", this.onSubmitProfileForm);
  }
}
