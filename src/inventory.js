export const INVENTORY_CAPACITY = 12;

export const ITEMS = Object.freeze({
  "slime-gel": Object.freeze({
    name: "Gelatina de limo",
    icon: "●",
    color: "#91d37a",
    maxStack: 99,
  }),
  "gold-coin": Object.freeze({
    name: "Moneda de oro",
    icon: "◈",
    color: "#e7c56f",
    maxStack: 999,
  }),
  "health-potion": Object.freeze({
    name: "Poción de vida",
    icon: "+",
    color: "#e88479",
    maxStack: 10,
    healAmount: 30,
  }),
});

export class Inventory {
  constructor(capacity = INVENTORY_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("La capacidad del inventario debe ser un entero positivo.");
    }

    this.slots = Array.from({ length: capacity }, () => null);
  }

  get capacity() {
    return this.slots.length;
  }

  get usedSlots() {
    return this.slots.filter(Boolean).length;
  }

  add(itemId, quantity = 1) {
    const item = ITEMS[itemId];
    if (!item) throw new Error(`Objeto desconocido: ${itemId}`);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new RangeError("La cantidad debe ser un entero positivo.");
    }

    let remaining = quantity;

    // Primero completa las pilas existentes y después ocupa espacios libres; devuelve lo que no cabe.
    for (const slot of this.slots) {
      if (!slot || slot.itemId !== itemId || slot.quantity >= item.maxStack) continue;
      const added = Math.min(item.maxStack - slot.quantity, remaining);
      slot.quantity += added;
      remaining -= added;
      if (remaining === 0) return 0;
    }

    for (let index = 0; index < this.slots.length && remaining > 0; index += 1) {
      if (this.slots[index]) continue;
      const added = Math.min(item.maxStack, remaining);
      this.slots[index] = { itemId, quantity: added };
      remaining -= added;
    }

    return remaining;
  }

  remove(itemId, quantity = 1) {
    if (!ITEMS[itemId]) throw new Error(`Objeto desconocido: ${itemId}`);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new RangeError("La cantidad debe ser un entero positivo.");
    }
    if (this.count(itemId) < quantity) return false;

    let remaining = quantity;
    for (let index = 0; index < this.slots.length && remaining > 0; index += 1) {
      const slot = this.slots[index];
      if (!slot || slot.itemId !== itemId) continue;

      const removed = Math.min(slot.quantity, remaining);
      slot.quantity -= removed;
      remaining -= removed;
      if (slot.quantity === 0) this.slots[index] = null;
    }

    return true;
  }

  restore(savedSlots) {
    if (!Array.isArray(savedSlots)) return false;

    this.slots = Array.from({ length: this.capacity }, (_, index) => {
      const entry = savedSlots[index];
      const item = entry && ITEMS[entry.itemId];
      if (!item || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > item.maxStack) {
        return null;
      }

      return { itemId: entry.itemId, quantity: entry.quantity };
    });

    return true;
  }

  count(itemId) {
    return this.slots.reduce(
      (total, slot) => total + (slot?.itemId === itemId ? slot.quantity : 0),
      0,
    );
  }
}
