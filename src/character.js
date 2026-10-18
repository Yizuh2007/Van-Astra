const PIXEL_SIZE = 2;
const SPRITE_WIDTH = 16 * PIXEL_SIZE;
// Si no se carga un PNG, se usa el dibujo provisional de abajo.
function loadSpriteArtwork(filename) {
  if (typeof Image === "undefined") return null;

  const artwork = new Image();
  artwork.src = new URL(`../assets/sprites/${filename}`, import.meta.url).href;
  return artwork;
}

const SPRITE_ARTWORK = Object.freeze({
  front: loadSpriteArtwork("player-front.png"),
  back: loadSpriteArtwork("player-back.png"),
  left: loadSpriteArtwork("player-left.png"),
  right: loadSpriteArtwork("player-right.png"),
});

const COLORS = Object.freeze({
  o: "#292a28", // contorno
  h: "#49352d", // cabello oscuro
  H: "#79513a", // reflejo del cabello
  S: "#e3b78d", // piel
  s: "#bd8060", // sombra de piel
  e: "#302b2a", // ojos
  G: "#668453", // túnica verde
  g: "#405d43", // sombras de la túnica
  T: "#91a96b", // reflejos de tela
  L: "#92613e", // cuero
  Y: "#e4bd67", // detalles dorados
  b: "#3d3531", // botas
  B: "#71523b", // cuero de las botas
});

const SPRITES = Object.freeze({
  front: [
    "...oooooo...",
    "..ohhhhhho..",
    ".ohhHHHHhho.",
    ".ohhSSSSShho.",
    ".oSSSeSeSSo.",
    "..oSSssSSo..",
    "...oGGGGo...",
    "..oGGGGGGo..",
    ".oGGGGGGGGo.",
    ".oGGLYYLGGo.",
    "..oGGLLGGo..",
    "...oGGGGo...",
    "...oobbo...",
    "..oob..bo..",
    "..ob....bo..",
  ],
  back: [
    "...oooooo...",
    "..ohHHHHho..",
    ".ohhHHHHHho.",
    ".ohhHHHHHho.",
    "..ohhhhhho..",
    "...ohhho....",
    "...oggggo...",
    "..ogGGGggo..",
    ".ogGGGGGGgo.",
    ".ogGGYGGGGo.",
    "..ogGGGGgo..",
    "...oggggo...",
    "...oobbo...",
    "..oob..bo..",
    "..ob....bo..",
  ],
  side: [
    "...ooooo....",
    "..ohhhhho...",
    ".ohhHHHHho..",
    ".ohhSSSSHho.",
    "..oSSSeSso..",
    "..oSSSSSo...",
    "...oGGGGo...",
    "..oGGGGGGo..",
    ".oGGGGGGGGo.",
    ".oGGLYYGGGo.",
    "..oGGGLLGGo..",
    "...oGGGGo...",
    "...oobbo....",
    "..oob..bo...",
    "..ob....bo...",
  ],
});

function drawSword(context, x, y, facingX, facingY) {
  const angle = Math.atan2(facingY, facingX) + Math.PI / 2;
  const handX = x + facingX * 2 + facingY * 8;
  const handY = y - 2 + facingY * 2 - facingX * 8;

  context.save();
  context.translate(Math.round(handX), Math.round(handY));
  context.rotate(angle);
  context.fillStyle = "#d7e0d8";
  context.fillRect(-1.5, -17, 3, 12);
  context.fillStyle = "#f2e7c0";
  context.fillRect(-0.5, -15, 1, 8);
  context.fillStyle = "#dfbd68";
  context.fillRect(-4, -5, 8, 2);
  context.fillStyle = "#74503a";
  context.fillRect(-1.5, -3, 3, 6);
  context.fillStyle = "#d7bd83";
  context.fillRect(-2, 2, 4, 2);
  context.restore();
}

function drawSprite(context, sprite, left, top, mirrored, walkFrame, moving) {
  context.save();
  context.translate(left, top);
  if (mirrored) {
    context.translate(SPRITE_WIDTH, 0);
    context.scale(-1, 1);
  }

  sprite.forEach((row, rowIndex) => {
    const offset = Math.floor((16 - row.length) / 2);
    [...row].forEach((pixel, columnIndex) => {
      const color = COLORS[pixel];
      if (!color) return;

      let step = 0;
      if (moving && (pixel === "b" || pixel === "B")) {
        const side = columnIndex + offset < 8 ? -1 : 1;
        step = (walkFrame === 0 ? side : -side) * PIXEL_SIZE;
      }

      context.fillStyle = color;
      context.fillRect(
        (columnIndex + offset) * PIXEL_SIZE + step,
        rowIndex * PIXEL_SIZE,
        PIXEL_SIZE,
        PIXEL_SIZE,
      );
    });
  });

  context.restore();
}

function drawWalkingArtwork(context, artwork, pose, left, top, walkFrame) {
  const feetTop = 23;
  const feetHeight = SPRITE_WIDTH - feetTop;
  const halfWidth = SPRITE_WIDTH / 2;
  const step = walkFrame === 0 ? 1 : -1;

  context.drawImage(artwork, 0, 0, SPRITE_WIDTH, feetTop + 1, left, top, SPRITE_WIDTH, feetTop + 1);

  if (pose === "front" || pose === "back") {
    context.drawImage(
      artwork,
      0, feetTop, halfWidth, feetHeight,
      left, top + feetTop + step, halfWidth, feetHeight,
    );
    context.drawImage(
      artwork,
      halfWidth, feetTop, halfWidth, feetHeight,
      left + halfWidth, top + feetTop - step, halfWidth, feetHeight,
    );
    return;
  }

  const direction = pose === "left" ? -1 : 1;
  context.drawImage(
    artwork,
    0, feetTop, SPRITE_WIDTH, feetHeight,
    left + step * direction, top + feetTop, SPRITE_WIDTH, feetHeight,
  );
}

export function drawCharacter(context, player) {
  const facingX = player.facing.x;
  const facingY = player.facing.y;
  const sideFacing = Math.abs(facingX) > Math.abs(facingY);
  const pose = sideFacing
    ? (facingX < 0 ? "left" : "right")
    : (facingY < 0 ? "back" : "front");
  const fallbackPose = sideFacing ? "side" : pose;
  const mirrored = pose === "left";
  const walkFrame = Math.floor(player.animationTime * 9) % 2;
  const bob = player.moving
    ? Math.abs(Math.sin(player.animationTime * 9)) * 1.2
    : Math.sin(player.animationTime * 3) * 0.45;
  const spriteLeft = Math.round(player.x - SPRITE_WIDTH / 2);
  const spriteTop = Math.round(player.y - 26 + bob);

  context.fillStyle = "rgba(20, 35, 27, 0.42)";
  context.beginPath();
  context.ellipse(player.x, player.y + 10, 12 + bob * 0.4, 5, 0, 0, Math.PI * 2);
  context.fill();

  // El arma queda detrás al mirar hacia arriba y delante al mirar hacia abajo.
  if (facingY < 0) drawSword(context, player.x, player.y, facingX, facingY);
  const artwork = SPRITE_ARTWORK[pose];
  if (artwork?.complete && artwork.naturalWidth > 0) {
    context.save();
    context.imageSmoothingEnabled = false;
    if (player.moving) {
      // Separo la parte de abajo para que los pies alternen el paso al andar.
      drawWalkingArtwork(context, artwork, pose, spriteLeft, spriteTop, walkFrame);
    } else {
      context.drawImage(artwork, spriteLeft, spriteTop, SPRITE_WIDTH, SPRITE_WIDTH);
    }
    context.restore();
  } else {
    drawSprite(context, SPRITES[fallbackPose], spriteLeft, spriteTop, mirrored, walkFrame, player.moving);
  }
  if (facingY >= 0) drawSword(context, player.x, player.y, facingX, facingY);

  if (player.damageFlash > 0) {
    context.strokeStyle = `rgba(235, 112, 99, ${Math.min(0.9, player.damageFlash * 5)})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, 19, 0, Math.PI * 2);
    context.stroke();
  }

  if (player.attackAnimation > 0) {
    const angle = Math.atan2(facingY, facingX);
    context.strokeStyle = `rgba(218, 239, 153, ${Math.min(1, player.attackAnimation * 4)})`;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(player.x, player.y, 25, angle - 0.72, angle + 0.72);
    context.stroke();
  }

  context.font = "11px Manrope, sans-serif";
  context.textAlign = "center";
  context.fillStyle = "rgba(15, 24, 19, 0.8)";
  context.fillText("Viajero", player.x + 1, player.y - 30);
  context.fillStyle = "#e5eddc";
  context.fillText("Viajero", player.x, player.y - 31);
}
