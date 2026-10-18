import { drawCharacter } from "./character.js";

const DAMAGE_PROTECTION_DURATION = 0.65;
const RESPAWN_PROTECTION_DURATION = 0.75;
const DAMAGE_FLASH_DURATION = 0.18;

export class Player {
  constructor(x, y) {
    this.name = "Viajero";
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.radius = 10;
    this.speed = 178;
    this.level = 1;
    this.xp = 0;
    this.nextLevelXp = 100;
    this.attack = 12;
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.facing = { x: 0, y: 1 };
    this.animationTime = 0;
    this.moving = false;
    this.attackCooldown = 0;
    this.attackAnimation = 0;
    this.invulnerabilityTimer = 0;
    this.damageFlash = 0;
    this.dead = false;
    this.respawnTimer = 0;
  }

  update(delta, direction, world) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.attackAnimation = Math.max(0, this.attackAnimation - delta);
    this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - delta);
    this.damageFlash = Math.max(0, this.damageFlash - delta);
    this.animationTime += delta;
    this.moving = !this.dead && (direction.x !== 0 || direction.y !== 0);
    if (this.dead) return;

    if (direction.x !== 0 || direction.y !== 0) {
      this.facing = direction;
      const nextX = this.x + direction.x * this.speed * delta;
      const nextY = this.y + direction.y * this.speed * delta;
      // Al comprobar cada eje por separado, el jugador puede deslizarse junto a un obstáculo.
      if (!world.isBlocked(nextX, this.y, this.radius)) this.x = nextX;
      if (!world.isBlocked(this.x, nextY, this.radius)) this.y = nextY;
    }
  }

  takeDamage(amount) {
    // Evita que varias criaturas quiten vida en el mismo instante.
    if (this.dead || this.invulnerabilityTimer > 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.damageFlash = DAMAGE_FLASH_DURATION;
    if (this.health > 0) {
      this.invulnerabilityTimer = DAMAGE_PROTECTION_DURATION;
      return false;
    }

    this.dead = true;
    this.respawnTimer = 1.5;
    return true;
  }

  heal(amount) {
    if (this.dead || !Number.isFinite(amount) || amount <= 0) return 0;
    const previousHealth = this.health;
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health - previousHealth;
  }

  gainExperience(amount) {
    this.xp += amount;
    let levelsGained = 0;

    // Se conserva la experiencia sobrante y cada nivel requiere 50 puntos más que el anterior.
    while (this.xp >= this.nextLevelXp) {
      this.xp -= this.nextLevelXp;
      this.level += 1;
      this.nextLevelXp += 50;
      this.attack += 3;
      this.maxHealth += 20;
      this.health = this.maxHealth;
      levelsGained += 1;
    }

    return levelsGained;
  }

  respawn() {
    this.x = this.startX;
    this.y = this.startY;
    this.health = this.maxHealth;
    this.dead = false;
    this.respawnTimer = 0;
    this.invulnerabilityTimer = RESPAWN_PROTECTION_DURATION;
    this.damageFlash = 0;
  }

  draw(context) {
    drawCharacter(context, this);
  }
}

export class Slime {
  constructor(id, x, y) {
    this.id = id;
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;
    this.radius = 11;
    this.maxHealth = 28;
    this.health = this.maxHealth;
    this.speed = 30;
    this.experience = 35;
    this.alive = true;
    this.respawnTimer = 0;
    this.attackCooldown = 0.5 + (id % 4) * 0.2;
    this.hitFlash = 0;
    this.wanderAngle = id * 1.7;
    this.wanderTimer = 1 + (id % 3);
  }

  update(delta, player, world) {
    if (!this.alive) return;

    this.hitFlash = Math.max(0, this.hitFlash - delta);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    let direction = { x: 0, y: 0 };

    // El slime persigue al jugador si está cerca; si no, deambula alrededor de su punto inicial.
    if (!player.dead && distance < 155 && distance > 30) {
      direction = { x: dx / distance, y: dy / distance };
    } else {
      this.wanderTimer -= delta;
      if (this.wanderTimer <= 0) {
        this.wanderAngle += (Math.random() - 0.5) * 2.3;
        this.wanderTimer = 1.2 + Math.random() * 2.2;
      }

      if (distance >= 30 && Math.hypot(this.x - this.homeX, this.y - this.homeY) < 75) {
        direction = { x: Math.cos(this.wanderAngle), y: Math.sin(this.wanderAngle) };
      }
    }

    const nextX = this.x + direction.x * this.speed * delta;
    const nextY = this.y + direction.y * this.speed * delta;
    if (!world.isBlocked(nextX, this.y, this.radius)) this.x = nextX;
    if (!world.isBlocked(this.x, nextY, this.radius)) this.y = nextY;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.hitFlash = 0.14;
    if (this.health > 0) return false;

    this.alive = false;
    this.respawnTimer = 7;
    return true;
  }

  respawn() {
    this.x = this.homeX;
    this.y = this.homeY;
    this.health = this.maxHealth;
    this.alive = true;
    this.respawnTimer = 0;
    this.attackCooldown = 1;
  }

  draw(context) {
    if (!this.alive) return;

    context.fillStyle = "rgba(21, 41, 29, 0.35)";
    context.beginPath();
    context.ellipse(this.x, this.y + 7, 13, 5, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = this.hitFlash > 0 ? "#d8f1ae" : "#82bd72";
    context.beginPath();
    context.moveTo(this.x - 12, this.y + 4);
    context.quadraticCurveTo(this.x - 15, this.y - 10, this.x - 5, this.y - 13);
    context.quadraticCurveTo(this.x + 1, this.y - 18, this.x + 8, this.y - 10);
    context.quadraticCurveTo(this.x + 15, this.y - 3, this.x + 12, this.y + 5);
    context.closePath();
    context.fill();

    context.fillStyle = "#24382b";
    context.fillRect(this.x - 6, this.y - 5, 2, 3);
    context.fillRect(this.x + 4, this.y - 5, 2, 3);
    context.fillStyle = "rgba(21, 39, 28, 0.6)";
    context.fillRect(this.x - 10, this.y - 22, 20, 3);
    context.fillStyle = "#d47a67";
    context.fillRect(this.x - 10, this.y - 22, 20 * (this.health / this.maxHealth), 3);
  }
}
