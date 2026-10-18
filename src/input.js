const MOVEMENT_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight",
]);

export class Input {
  constructor() {
    this.keys = new Set();
    this.attackRequested = false;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    // Si se pierde el foco de la ventana, se sueltan las teclas para que no queden atascadas.
    window.addEventListener("blur", this.clear);
  }

  onKeyDown = (event) => {
    const targetTag = event.target?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(targetTag)) return;

    if (MOVEMENT_KEYS.has(event.code) || event.code === "Space") {
      event.preventDefault();
    }

    this.keys.add(event.code);
    // Solo se registra el primer evento de espacio, no las repeticiones mientras se mantiene pulsado.
    if (event.code === "Space" && !event.repeat) this.attackRequested = true;
  };

  onKeyUp = (event) => {
    this.keys.delete(event.code);
  };

  clear = () => {
    this.keys.clear();
  };

  direction() {
    const x = Number(this.keys.has("KeyD") || this.keys.has("ArrowRight"))
      - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    const y = Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"))
      - Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"));
    // Normalizar mantiene la misma velocidad al moverse en diagonal.
    const magnitude = Math.hypot(x, y) || 1;

    return { x: x / magnitude, y: y / magnitude };
  }

  consumeAttack() {
    const requested = this.attackRequested;
    this.attackRequested = false;
    return requested;
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
  }
}
