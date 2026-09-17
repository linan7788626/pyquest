// ============================================================
// 全局游戏状态（单例，跨场景共享；进度通过 core/save.js 持久化）
// ============================================================

export const G = {
  hearts: 6,
  maxHearts: 6,
  shards: 0,             // 第一章：代码碎片
  shardsNeeded: 5,
  answered: new Set(),   // 已答对的符文槽 id（符文石已破解）
  qAnswered: new Set(),  // 已答对的题目 id（随机抽题时避开）
  runeRolls: {},         // 符文槽 → 已抽中尚未答对的题目 id（重开同符文不变题）
  gateOpen: false,       // 村庄石门是否已开
  bossShielded: true,    // BOSS 是否处于护盾状态
  bossDefeated: false,
  ch1Done: false,        // 第一章通关（击败史莱姆王）
  ch2Shards: 0,          // 第二章：函数碎片
  ch2ShardsNeeded: 5,
  ch2GateOpen: false,    // 函数之森 → 列表洞窟 的封印门
  boss2Shielded: true,   // 列表巨蟒的符文护盾
  ch2Done: false,        // 第二章通关
  startTime: Date.now(),
};

export function resetState() {
  G.hearts = 6;
  G.maxHearts = 6;
  G.shards = 0;
  G.answered = new Set();
  G.qAnswered = new Set();
  G.runeRolls = {};
  G.gateOpen = false;
  G.bossShielded = true;
  G.bossDefeated = false;
  G.ch1Done = false;
  G.ch2Shards = 0;
  G.ch2GateOpen = false;
  G.boss2Shielded = true;
  G.ch2Done = false;
  G.startTime = Date.now();
}

/** 当前章节的碎片进度（HUD / 各场景通用） */
export function chapterShards() {
  return G.ch1Done
    ? { shards: G.ch2Shards, needed: G.ch2ShardsNeeded }
    : { shards: G.shards, needed: G.shardsNeeded };
}

export function addShards(n = 1) {
  if (G.ch1Done) G.ch2Shards += n;
  else G.shards += n;
  updateHud();
}

/** 符文石答对收尾：槽位破解、题目记为已用、清掉抽题记录 */
export function markRuneSolved(slotId, questionId) {
  G.answered.add(slotId);
  G.qAnswered.add(questionId);
  delete G.runeRolls[slotId];
  updateHud();
}

export function damageHearts(n = 1) {
  G.hearts = Math.max(1, G.hearts - n); // 答题失误最多扣到 1，不会答死
  updateHud();
}

export function healHearts(n = 1) {
  G.hearts = Math.min(G.maxHearts, G.hearts + n);
  updateHud();
}

export function updateHud() {
  document.dispatchEvent(new CustomEvent('pyquest:hud'));
}
