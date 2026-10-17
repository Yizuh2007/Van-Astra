import { TILE_SIZE } from "./config.js";

const COLUMNS = 48;
const ROWS = 36;
const GRASS_COLORS = ["#426d45", "#467348", "#3e6942", "#49764a"];

// El resultado depende de la posición, así que el mapa conserva los mismos adornos al redibujarse.
function tileHash(column, row, salt = 0) {
  const value = Math.sin(column * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

export class World {
  constructor() {
    this.width = COLUMNS * TILE_SIZE;
    this.height = ROWS * TILE_SIZE;
    this.decorations = [];
    this.obstacles = [];
    this.createDecorations();
  }

  isPath(column, row) {
    const eastWest = column >= 3 && column <= 45 && row >= 18 && row <= 19;
    const northSouth = column >= 26 && column <= 27 && row >= 5 && row <= 32;
    return eastWest || northSouth;
  }

  createDecorations() {
    for (let row = 1; row < ROWS - 1; row += 1) {
      for (let column = 1; column < COLUMNS - 1; column += 1) {
        const nearStart = Math.hypot(column - 24, row - 18) < 6;
        // Se deja libre el camino y el área de inicio para que el jugador pueda salir sin obstáculos.
        if (nearStart || this.isPath(column, row)) continue;

        const chance = tileHash(column, row);
        const x = (column + 0.5) * TILE_SIZE;
        const y = (row + 0.5) * TILE_SIZE;

        if (chance < 0.075) {
          const tree = { type: "tree", x, y, radius: 11, variant: tileHash(column, row, 1) };
          this.decorations.push(tree);
          this.obstacles.push(tree);
        } else if (chance < 0.092) {
          const rock = { type: "rock", x, y, radius: 10, variant: tileHash(column, row, 2) };
          this.decorations.push(rock);
          this.obstacles.push(rock);
        } else if (chance > 0.83) {
          this.decorations.push({ type: "flowers", x, y, variant: tileHash(column, row, 3) });
        }
      }
    }
  }

  isBlocked(x, y, radius) {
    if (x - radius < 0 || y - radius < 0 || x + radius > this.width || y + radius > this.height) {
      return true;
    }

    return this.obstacles.some((obstacle) => {
      const minimumDistance = radius + obstacle.radius;
      return Math.hypot(x - obstacle.x, y - obstacle.y) < minimumDistance;
    });
  }

  draw(context, cameraX, cameraY, viewportWidth, viewportHeight) {
    const firstColumn = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
    const lastColumn = Math.min(COLUMNS - 1, Math.ceil((cameraX + viewportWidth) / TILE_SIZE));
    const firstRow = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
    const lastRow = Math.min(ROWS - 1, Math.ceil((cameraY + viewportHeight) / TILE_SIZE));

    context.fillStyle = "#365d3d";
    context.fillRect(0, 0, this.width, this.height);

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const x = column * TILE_SIZE;
        const y = row * TILE_SIZE;
        const hash = tileHash(column, row, 4);

        context.fillStyle = this.isPath(column, row)
          ? hash > 0.65 ? "#8e805c" : "#827553"
          : GRASS_COLORS[Math.floor(hash * GRASS_COLORS.length)];
        context.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        if (this.isPath(column, row)) {
          context.fillStyle = hash > 0.5 ? "#a09268" : "#766a4d";
          context.fillRect(x + 5 + Math.floor(hash * 13), y + 8 + Math.floor(hash * 12), 3, 2);
        } else if (hash > 0.52) {
          context.fillStyle = "rgba(190, 207, 126, 0.18)";
          context.fillRect(x + Math.floor(hash * 24), y + Math.floor(tileHash(column, row, 5) * 25), 2, 3);
        }
      }
    }

    this.decorations.forEach((decoration) => {
      if (
        decoration.x < cameraX - 40 || decoration.x > cameraX + viewportWidth + 40
        || decoration.y < cameraY - 45 || decoration.y > cameraY + viewportHeight + 45
      ) return;

      if (decoration.type === "tree") this.drawTree(context, decoration);
      if (decoration.type === "rock") this.drawRock(context, decoration);
      if (decoration.type === "flowers") this.drawFlowers(context, decoration);
    });
  }

  drawTree(context, tree) {
    const { x, y, variant } = tree;
    context.fillStyle = "rgba(23, 42, 29, 0.35)";
    context.beginPath();
    context.ellipse(x, y + 5, 19, 8, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#75533a";
    context.fillRect(x - 4, y - 4, 8, 19);
    context.fillStyle = variant > 0.5 ? "#244a32" : "#285036";
    context.fillRect(x - 15, y - 22, 30, 21);
    context.fillRect(x - 11, y - 30, 22, 15);
    context.fillRect(x - 20, y - 15, 9, 12);
    context.fillRect(x + 11, y - 17, 9, 13);
    context.fillStyle = variant > 0.5 ? "#397044" : "#3b7547";
    context.fillRect(x - 10, y - 24, 15, 9);
    context.fillRect(x + 3, y - 17, 9, 7);
    context.fillStyle = "rgba(164, 191, 103, 0.42)";
    context.fillRect(x - 7, y - 21, 3, 3);
  }

  drawRock(context, rock) {
    context.fillStyle = "rgba(23, 42, 29, 0.32)";
    context.fillRect(rock.x - 10, rock.y + 4, 21, 6);
    context.fillStyle = rock.variant > 0.5 ? "#777d72" : "#858778";
    context.fillRect(rock.x - 9, rock.y - 5, 17, 10);
    context.fillRect(rock.x - 5, rock.y - 9, 10, 5);
    context.fillStyle = "#a6a995";
    context.fillRect(rock.x - 4, rock.y - 5, 5, 2);
  }

  drawFlowers(context, flowers) {
    const colors = ["#e7cd81", "#e5a3a2", "#c1b7e5"];
    context.fillStyle = colors[Math.floor(flowers.variant * colors.length)];
    context.fillRect(flowers.x - 4, flowers.y, 3, 3);
    context.fillRect(flowers.x + 3, flowers.y - 5, 3, 3);
    context.fillStyle = "#dce29c";
    context.fillRect(flowers.x + 4, flowers.y + 4, 2, 2);
  }
}
