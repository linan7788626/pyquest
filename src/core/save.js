// ============================================================
// 存档系统：localStorage 持久化冒险进度（数据驱动多章结构）
// - v2：G.progress[章] 独立进度 + G.current 当前章节
// - v1 → v2 自动迁移：旧两章字段映射到 progress[1] / progress[2]
// - saveGame()：HUD 更新 / 关页 / 切后台时自动写档
// ============================================================
import { G, resetState } from './state.js';
import { CHAPTERS } from '../data/chapters.js';

const KEY = 'pyquest:save:v2';
const OLD_KEY = 'pyquest:save:v1';
let writable = false;
export function beginNewGame() {
  clearSave(); resetState(); writable = true; saveGame();
}
function notifyFailure() {
  document.dispatchEvent(new CustomEvent('pyquest:save-error'));
}


export function hasSave() {
  try { return !!localStorage.getItem(KEY) || !!localStorage.getItem(OLD_KEY); } catch { return false; }
}

export function saveGame() {
  if (!writable) return false;
  try {
    const data = {
      v: 2,
      savedAt: Date.now(),
      startTime: G.startTime,
      hearts: G.hearts,
      maxHearts: G.maxHearts,
      current: G.current,
      answered: [...G.answered],
      qAnswered: [...G.qAnswered],
      runeRolls: { ...G.runeRolls },
      progress: JSON.parse(JSON.stringify(G.progress)),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch { notifyFailure(); return false; }
}

/** 把 v1 存档迁移成 v2 结构（旧键删除） */
function migrateV1(d) {
  resetState();
  const p1 = G.progress[1], p2 = G.progress[2];
  p1.shards = d.shards ?? 0;
  p1.gateOpen = !!d.gateOpen;
  p1.bossShielded = d.bossShielded !== false;
  p1.bossDefeated = !!d.bossDefeated;
  p1.done = !!d.ch1Done;
  p2.shards = d.ch2Shards ?? 0;
  p2.gateOpen = !!d.ch2GateOpen;
  p2.bossShielded = d.boss2Shielded !== false;
  p2.done = !!d.ch2Done;
  p2.bossDefeated = p2.done;
  G.current = d.ch1Done && !d.ch2Done ? 2 : 1;
  G.answered = new Set(d.answered || []);
  G.qAnswered = new Set(d.qAnswered || []);
  G.runeRolls = d.runeRolls || {};
  G.startTime = d.startTime || Date.now();
  G.hearts = d.hearts ?? 6;
  G.maxHearts = d.maxHearts ?? 6;
  writable = true;
  if (saveGame()) { try { localStorage.removeItem(OLD_KEY); } catch { /* noop */ } }
}

/** 读取存档并应用到 G。成功返回 true，无档/版本不符返回 false */
export function loadGame() {
  writable = false;
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || ![1, 2].includes(d.v)) return false;
    if (d.answered != null && !Array.isArray(d.answered)) return false;
    if (d.qAnswered != null && !Array.isArray(d.qAnswered)) return false;
    if ([...(d.answered || []), ...(d.qAnswered || [])].some(id => typeof id !== 'string')) return false;
    if (d.runeRolls != null && (typeof d.runeRolls !== 'object' || Array.isArray(d.runeRolls))) return false;
    if (Object.values(d.runeRolls || {}).some(id => typeof id !== 'string')) return false;
    for (const key of ['hearts','maxHearts','current','startTime','shards','ch2Shards']) {
      if (d[key] != null && (!Number.isFinite(d[key]) || d[key] < 0)) return false;
    }
    if (d.maxHearts != null && (d.maxHearts < 1 || d.maxHearts > 100)) return false;
    if (d.hearts != null && d.hearts > (d.maxHearts ?? 6)) return false;
    if (d.current != null && !Number.isInteger(d.current)) return false;
    if (d.progress != null && (typeof d.progress !== 'object' || Array.isArray(d.progress))) return false;
    for (const saved of Object.values(d.progress || {})) {
      if (!saved || typeof saved !== 'object' || (saved.shards != null && (!Number.isInteger(saved.shards) || saved.shards < 0))) return false;
      for (const flag of ['gateOpen','bossShielded','bossDefeated','done']) if (saved[flag] != null && typeof saved[flag] !== 'boolean') return false;
    }
    resetState();
    if (d.v === 1) { migrateV1(d); return true; }
    if (!d || d.v !== 2) return false;

    G.startTime = d.startTime || Date.now();
    G.hearts = d.hearts ?? 6;
    G.maxHearts = d.maxHearts ?? 6;
    G.current = Math.min(Math.max(d.current || 1, 1), CHAPTERS.length);
    G.answered = new Set(d.answered || []);
    G.qAnswered = new Set(d.qAnswered || []);
    G.runeRolls = d.runeRolls || {};
    // 逐章恢复进度（缺省字段按初始值补齐）
    for (const ch of CHAPTERS) {
      const saved = d.progress && d.progress[ch.id];
      const p = G.progress[ch.id];
      if (!saved) continue;
      p.shards = saved.shards ?? 0;
      p.shardsNeeded = ch.shardsNeeded;
      p.gateOpen = !!saved.gateOpen;
      p.bossShielded = saved.bossShielded !== false;
      p.bossDefeated = !!saved.bossDefeated;
      p.done = !!saved.done;
    }
    writable = true;
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  writable = false;
  try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch { /* noop */ }
}

/** 只读探测存档进度（不应用到 G）：返回玩家可推进到的最新章节号 */
export function saveChapter() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY);
    if (!raw) return 1;
    const d = JSON.parse(raw);
    if (d.v === 1) return d.ch1Done && !d.ch2Done ? 2 : 1;
    if (!d.progress) return 1;
    let n = 1;
    for (const ch of CHAPTERS) {
      if (d.progress[ch.id] && d.progress[ch.id].done) n = Math.min(CHAPTERS.length, ch.id + 1);
    }
    return d.progress[1] && d.progress[1].done ? n : 1;
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
