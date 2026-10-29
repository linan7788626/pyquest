// NLI 崖面掩码：纯逻辑模块（无 Phaser / canvas / ground.js 依赖）。
// 从 def.grid 推导每个陆格的邻水边掩码；Task 4 将在本文件追加渲染函数。
// 输出确定性保证：行主序遍历、无随机、无外部状态（Task 5 快照依赖此性质）。
import { T } from '../data/maps.js';

// 崖面渲染常量（供后续渲染任务使用；此处仅作纯数据导出）
export const CLIFF = Object.freeze({ LIP: 8, REACH: 96, FH: 104 });

// 边位序与 ground.js 的 adjacentMask 一致：W=1, E=2, N=4, S=8
const SIDES = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const INDOOR = new Set([T.DFLOOR, T.DWALL]);

export function isWaterTile(v) {
  return v === T.WATER || v === T.WATER2 || v === T.WATER3;
}

// 遍历网格，对每个陆格（非水、非地牢地板/墙）做 4 邻接水探测；
// 越界邻格视为非水。仅返回至少有一边邻水的格子。
export function computeCliffCells(def) {
  const cells = [];
  const grid = def.grid;
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const v = row[x];
      if (isWaterTile(v) || INDOOR.has(v)) continue;
      let edges = 0;
      for (let bit = 0; bit < 4; bit++) {
        const [dx, dy] = SIDES[bit];
        if (isWaterTile(grid[y + dy]?.[x + dx])) edges |= 1 << bit;
      }
      if (edges) cells.push({ x, y, edges });
    }
  }
  return cells;
}
