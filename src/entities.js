export class Player {
  constructor(x, y) {
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
    this.attackCooldown = 0;
    this.attackAnimation = 0;
    this.dead = false;
    this.respawnTimer = 0;
  }

  update(delta, direction, world) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.attackAnimation = Math.max(0, this.attackAnimation - delta);
    if (this.dead) return;

    if (direction.x !== 0 || direction.y !== 0) {
      this.facing = direction;
      const nextX = this.x + direction.x * this.speed * delta;
      const nextY = this.y + direction.y * this.speed * delta;
      if (!world.isBlocked(nextX, this.y, this.radius)) this.x = nextX;
      if (!world.isBlocked(this.x, nextY, this.radius)) this.y = nextY;
    }
  }

  takeDamage(amount) {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health > 0) return false;

    this.dead = true;
    this.respawnTimer = 1.5;
    return true;
  }

  gainExperience(amount) {
    this.xp += amount;
    let levelsGained = 0;

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
  }

  draw(context) {
    context.fillStyle = "rgba(20, 35, 27, 0.42)";
    context.beginPath();
    context.ellipse(this.x, this.y + 8, 13, 6, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#bdc98c";
    context.fillRect(this.x - 9, this.y - 11, 18, 19);
    context.fillStyle = "#547c55";
    context.fillRect(this.x - 8, this.y - 2, 16, 12);
    context.fillStyle = "#d9c49a";
    context.fillRect(this.x - 6, this.y - 17, 12, 11);
    context.fillStyle = "#493b32";
    context.fillRect(this.x - 7, this.y - 19, 14, 5);
    context.fillRect(this.x - 5, this.y - 22, 10, 4);
    context.fillStyle = "#302d29";
    context.fillRect(this.x + 2, this.y - 12, 2, 2);
    context.fillStyle = "#394d38";
    context.fillRect(this.x - 7, this.y + 8, 5, 5);
    context.fillRect(this.x + 2, this.y + 8, 5, 5);

    if (this.attackAnimation > 0) {
      const angle = Math.atan2(this.facing.y, this.facing.x);
      context.strokeStyle = `rgba(218, 239, 153, ${Math.min(1, this.attackAnimation * 4)})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(this.x, this.y, 25, angle - 0.72, angle + 0.72);
      context.stroke();
    }

    context.font = "11px Manrope, sans-serif";
    context.textAlign = "center";
    context.fillStyle = "rgba(15, 24, 19, 0.8)";
    context.fillText("Viajero", this.x + 1, this.y - 28);
    context.fillStyle = "#e5eddc";
    context.fillText("Viajero", this.x, this.y - 29);
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
