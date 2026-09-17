// ============================================================
// 存档系统：localStorage 持久化冒险进度
// - saveGame()：把 G 的关键进度写入 localStorage（自动在每次 HUD
//   更新时触发，即碎片/爱心/开门/BOSS 等事件都会自动存档）
// - loadGame()：读取存档并应用到 G（标题画面「继续冒险」用）
// - clearSave()：删除存档（「新的冒险」/ 重新开始用）
// ============================================================
import { G } from './state.js';

const KEY = 'pyquest:save:v1';

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function saveGame() {
  try {
    const data = {
      v: 1,
      savedAt: Date.now(),
      startTime: G.startTime,
      hearts: G.hearts,
      maxHearts: G.maxHearts,
      shards: G.shards,
      ch2Shards: G.ch2Shards,
      answered: [...G.answered],
      qAnswered: [...G.qAnswered],
      runeRolls: { ...G.runeRolls },
      gateOpen: G.gateOpen,
      bossShielded: G.bossShielded,
      bossDefeated: G.bossDefeated,
      ch1Done: G.ch1Done,
      ch2GateOpen: G.ch2GateOpen,
      boss2Shielded: G.boss2Shielded,
      ch2Done: G.ch2Done,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* 隐私模式等环境下静默失败，不影响游戏 */ }
}

/** 读取存档并应用到 G。成功返回 true，无档/版本不符返回 false */
export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return false;
    G.startTime = d.startTime || Date.now();
    G.hearts = d.hearts ?? 6;
    G.maxHearts = d.maxHearts ?? 6;
    G.shards = d.shards ?? 0;
    G.ch2Shards = d.ch2Shards ?? 0;
    G.answered = new Set(d.answered || []);
    G.qAnswered = new Set(d.qAnswered || []);
    G.runeRolls = d.runeRolls || {};
    G.gateOpen = !!d.gateOpen;
    G.bossShielded = d.bossShielded !== false;
    G.bossDefeated = !!d.bossDefeated;
    G.ch1Done = !!d.ch1Done;
    G.ch2GateOpen = !!d.ch2GateOpen;
    G.boss2Shielded = d.boss2Shielded !== false;
    G.ch2Done = !!d.ch2Done;
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

/** 只读探测存档进度（不应用到 G）：1 = 第一章中，2 = 第二章中 */
export function saveChapter() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || d.v !== 1) return 1;
    if (d.ch1Done && !d.ch2Done) return 2;
    return 1;
  } catch {
    return 1;
  }
}

/** 绑定自动存档：任何 HUD 数据变化（碎片/爱心/开门等）都自动写档 */
export function initAutosave() {
  document.addEventListener('pyquest:hud', saveGame);
  // 关页/切后台时兜底保存
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGame();
  });
}
