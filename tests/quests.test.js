import assert from "node:assert/strict";
import test from "node:test";
import { QuestTracker, STARTER_QUEST } from "../src/quests.js";

test("la misión registra progreso y se completa una sola vez", () => {
  const quest = new QuestTracker();

  assert.equal(quest.recordKill(), false);
  assert.equal(quest.kills, 1);
  assert.equal(quest.recordKill(), false);
  assert.equal(quest.recordKill(), true);
  assert.equal(quest.completed, true);
  assert.equal(quest.kills, STARTER_QUEST.target);
  assert.equal(quest.recordKill(), false);
  assert.equal(quest.kills, STARTER_QUEST.target);
});

test("el progreso de misión se serializa y restaura de forma segura", () => {
  const quest = new QuestTracker({ kills: 2 });
  const restored = new QuestTracker(quest.serialize());

  assert.equal(restored.kills, 2);
  assert.equal(restored.completed, false);
  assert.equal(restored.recordKill(), true);
  assert.equal(new QuestTracker({ kills: -1 }).kills, 0);
  assert.equal(new QuestTracker({ kills: 500 }).completed, true);
});
