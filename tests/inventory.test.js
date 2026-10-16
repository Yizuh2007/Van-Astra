import assert from "node:assert/strict";
import test from "node:test";
import { Inventory } from "../src/inventory.js";

test("el inventario apila objetos y abre otro espacio al superar el máximo", () => {
  const inventory = new Inventory(3);

  assert.equal(inventory.add("slime-gel", 3), 0);
  assert.equal(inventory.add("slime-gel", 98), 0);
  assert.equal(inventory.count("slime-gel"), 101);
  assert.equal(inventory.usedSlots, 2);
  assert.deepEqual(inventory.slots.slice(0, 2), [
    { itemId: "slime-gel", quantity: 99 },
    { itemId: "slime-gel", quantity: 2 },
  ]);
});

test("el inventario informa qué cantidad no cabe cuando se llena", () => {
  const inventory = new Inventory(1);

  assert.equal(inventory.add("slime-gel", 99), 0);
  assert.equal(inventory.add("slime-gel", 4), 4);
  assert.equal(inventory.add("gold-coin", 3), 3);
  assert.equal(inventory.count("slime-gel"), 99);
  assert.equal(inventory.count("gold-coin"), 0);
});

test("el inventario rechaza objetos y cantidades no válidos", () => {
  const inventory = new Inventory();

  assert.throws(() => inventory.add("unknown-item"), /Objeto desconocido/);
  assert.throws(() => inventory.add("slime-gel", 0), /entero positivo/);
  assert.throws(() => new Inventory(0), /capacidad/);
});
