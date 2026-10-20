export const STARTER_QUEST = Object.freeze({
  id: "forest-slimes",
  title: "Plaga en el bosque",
  target: 3,
  rewardExperience: 60,
  rewardGold: 20,
});

export class QuestTracker {
  constructor(savedState = null) {
    const savedKills = savedState?.kills;
    this.kills = Number.isInteger(savedKills) && savedKills >= 0
      ? Math.min(savedKills, STARTER_QUEST.target)
      : 0;
    this.completed = this.kills >= STARTER_QUEST.target;
  }

  recordKill() {
    if (this.completed) return false;

    this.kills += 1;
    if (this.kills < STARTER_QUEST.target) return false;

    this.kills = STARTER_QUEST.target;
    this.completed = true;
    return true;
  }

  serialize() {
    return { kills: this.kills };
  }
}
