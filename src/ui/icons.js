// ============================================================
// 像素图标常量（#10）：与 HUD 爱心 / 碎片同族的内联 SVG
// - 全部 shape-rendering="crispEdges"，10~12 格像素网格
// - 颜色全部取自现有 token / 现有组件用色：
//   金 #ffd257 · 高光 #fff3c4 · 深金 #e0a53c · 边棕 #b98a4e
//   纸 #fff8ea / #f3e3c4 · 青 #3ddad7 · 锁定紫 #a89bb3 / #8c8098 / #564e66
// - 尺寸不写死：由使用处 CSS 按所在行字号控制（.pq-icon 基类）
// ============================================================

// 折叠藏宝图（世界地图标题）：羊皮纸 + 红色虚线路径 + 金色终点星标
const MAP = `
  <svg class="pq-icon" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">
    <rect x="1" y="1" width="10" height="10" fill="#b98a4e"/>
    <rect x="2" y="2" width="8" height="8" fill="#fff8ea"/>
    <rect x="2" y="2" width="1" height="8" fill="#f3e3c4"/>
    <rect x="3" y="3" width="1" height="1" fill="#e86a6a"/>
    <rect x="5" y="5" width="1" height="1" fill="#e86a6a"/>
    <rect x="7" y="7" width="1" height="1" fill="#e86a6a"/>
    <rect x="8" y="3" width="2" height="2" fill="#ffd257"/>
    <rect x="8" y="3" width="1" height="1" fill="#fff3c4"/>
  </svg>`;

// 传送准星（地图页脚提示）：四角取景框 + 金心，替代 🌀
const SWIRL = `
  <svg class="pq-icon" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">
    <g fill="#3ddad7">
      <rect x="2" y="2" width="3" height="1"/><rect x="2" y="3" width="1" height="2"/>
      <rect x="7" y="2" width="3" height="1"/><rect x="9" y="3" width="1" height="2"/>
      <rect x="2" y="9" width="3" height="1"/><rect x="2" y="7" width="1" height="2"/>
      <rect x="7" y="9" width="3" height="1"/><rect x="9" y="7" width="1" height="2"/>
    </g>
    <rect x="5" y="5" width="2" height="2" fill="#ffd257"/>
  </svg>`;

// 挂锁（锁定地标徽章）：用锁定态同款紫灰色板，替代 🔒
const LOCK = `
  <svg class="pq-icon" viewBox="0 0 10 12" shape-rendering="crispEdges" aria-hidden="true">
    <g fill="#a89bb3">
      <rect x="3" y="0" width="4" height="1"/>
      <rect x="2" y="1" width="1" height="3"/>
      <rect x="7" y="1" width="1" height="3"/>
    </g>
    <rect x="1" y="4" width="8" height="7" fill="#8c8098"/>
    <rect x="2" y="5" width="6" height="5" fill="#564e66"/>
    <rect x="4" y="6" width="2" height="2" fill="#fff8ea"/>
  </svg>`;

// 大头针（当前所在章徽章）：金头红点 + 深金针杆，替代 📍
const PIN = `
  <svg class="pq-icon" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
    <rect x="3" y="0" width="4" height="1" fill="#fff3c4"/>
    <rect x="2" y="1" width="6" height="2" fill="#ffd257"/>
    <rect x="3" y="3" width="4" height="1" fill="#ffd257"/>
    <rect x="4" y="2" width="2" height="1" fill="#e86a6a"/>
    <rect x="4" y="4" width="2" height="5" fill="#e0a53c"/>
    <rect x="4" y="9" width="2" height="1" fill="#b98a4e"/>
  </svg>`;

// 章节印章（胜利画面标题）：金色像素圆章 + 四角星光。
// 统一一枚印章而非每章各异：胜利奖励用同一枚「通关金印」，
// 与 #victory h1 的金色标题、星空背景的金星点共用一套奖励语言。
const STAMP = `
  <svg class="pq-icon" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">
    <g fill="#b98a4e">
      <rect x="4" y="0" width="4" height="1"/><rect x="2" y="1" width="8" height="1"/>
      <rect x="1" y="2" width="10" height="1"/><rect x="0" y="3" width="12" height="6"/>
      <rect x="1" y="9" width="10" height="1"/><rect x="2" y="10" width="8" height="1"/>
      <rect x="4" y="11" width="4" height="1"/>
    </g>
    <g fill="#ffd257">
      <rect x="4" y="1" width="4" height="1"/><rect x="2" y="2" width="8" height="1"/>
      <rect x="1" y="3" width="10" height="6"/>
      <rect x="2" y="9" width="8" height="1"/><rect x="4" y="10" width="4" height="1"/>
    </g>
    <rect x="5" y="3" width="2" height="6" fill="#fff3c4"/>
    <rect x="3" y="5" width="6" height="2" fill="#fff3c4"/>
    <rect x="5" y="5" width="2" height="2" fill="#fff8ea"/>
  </svg>`;

// 下箭头（对话「继续」提示）：与 #dlg-next 同色 #7a5f3c，替代 ▼
const CHEVRON = `
  <svg class="pq-icon" viewBox="0 0 10 5" shape-rendering="crispEdges" aria-hidden="true">
    <g fill="#7a5f3c">
      <rect x="0" y="0" width="2" height="1"/><rect x="8" y="0" width="2" height="1"/>
      <rect x="1" y="1" width="2" height="1"/><rect x="7" y="1" width="2" height="1"/>
      <rect x="2" y="2" width="2" height="1"/><rect x="6" y="2" width="2" height="1"/>
      <rect x="3" y="3" width="2" height="1"/><rect x="5" y="3" width="2" height="1"/>
      <rect x="4" y="4" width="2" height="1"/>
    </g>
  </svg>`;

// 四角星光（HUD 目标行「全部通关」）：金色 sparkle，替代 🎉
const STAR = `
  <svg class="pq-icon" viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true">
    <g fill="#ffd257">
      <rect x="4" y="0" width="2" height="3"/>
      <rect x="4" y="7" width="2" height="3"/>
      <rect x="0" y="4" width="3" height="2"/>
      <rect x="7" y="4" width="3" height="2"/>
      <rect x="3" y="3" width="4" height="4"/>
    </g>
    <rect x="4" y="4" width="2" height="2" fill="#fff3c4"/>
  </svg>`;

// ---- 胜利封印页统计印（#13）：用时 / 解开谜题 / 章节进度 ----

// 沙漏（冒险用时印）：棕框金砂，中腰一缕沙流
const HOURGLASS = `
  <svg class="pq-icon" viewBox="0 0 10 12" shape-rendering="crispEdges" aria-hidden="true">
    <g fill="#b98a4e">
      <rect x="1" y="0" width="8" height="1"/>
      <rect x="1" y="11" width="8" height="1"/>
      <rect x="1" y="1" width="1" height="2"/>
      <rect x="8" y="1" width="1" height="2"/>
      <rect x="1" y="8" width="1" height="2"/>
      <rect x="8" y="8" width="1" height="2"/>
    </g>
    <g fill="#ffd257">
      <rect x="3" y="2" width="4" height="1"/>
      <rect x="3" y="3" width="1" height="1"/>
      <rect x="6" y="3" width="1" height="1"/>
      <rect x="4" y="5" width="2" height="2"/>
      <rect x="4" y="8" width="2" height="1"/>
      <rect x="3" y="9" width="4" height="1"/>
    </g>
    <rect x="4" y="4" width="2" height="1" fill="#fff3c4"/>
  </svg>`;

// 钥匙（解开谜题印）：金环 + 深金针杆与齿，「解开」的直觉符号
const KEY = `
  <svg class="pq-icon" viewBox="0 0 10 12" shape-rendering="crispEdges" aria-hidden="true">
    <rect x="2" y="0" width="6" height="5" fill="#ffd257"/>
    <rect x="3" y="1" width="4" height="3" fill="#fff8ea"/>
    <rect x="4" y="5" width="2" height="6" fill="#e0a53c"/>
    <rect x="6" y="8" width="2" height="1" fill="#e0a53c"/>
    <rect x="6" y="10" width="2" height="1" fill="#e0a53c"/>
    <rect x="2" y="0" width="2" height="1" fill="#fff3c4"/>
  </svg>`;

// 三角旗（章节进度印）：棕杆金顶 + 青色燕尾旗，指向下一章
const FLAG = `
  <svg class="pq-icon" viewBox="0 0 10 12" shape-rendering="crispEdges" aria-hidden="true">
    <rect x="2" y="0" width="2" height="1" fill="#ffd257"/>
    <rect x="2" y="1" width="1" height="10" fill="#7a5f3c"/>
    <g fill="#3ddad7">
      <rect x="3" y="2" width="4" height="1"/>
      <rect x="3" y="3" width="5" height="1"/>
      <rect x="3" y="4" width="4" height="1"/>
      <rect x="3" y="5" width="3" height="1"/>
      <rect x="3" y="6" width="2" height="1"/>
    </g>
    <rect x="3" y="2" width="2" height="1" fill="#fff8ea" opacity=".55"/>
    <rect x="1" y="11" width="4" height="1" fill="#b98a4e"/>
  </svg>`;

export const ICON = {
  map: MAP, swirl: SWIRL, lock: LOCK, pin: PIN, stamp: STAMP,
  chevron: CHEVRON, star: STAR, hourglass: HOURGLASS, key: KEY, flag: FLAG,
};

// 仅替换有合适包内对应物的图标；保留原 SVG 外壳与布局类名。
const nliIcon = (key) => `<svg class="pq-icon" viewBox="0 0 64 64" aria-hidden="true"><image href="/nli-preview/${key}.png" width="64" height="64"/></svg>`;
ICON.map = nliIcon('ui_map');
ICON.stamp = nliIcon('ui_stamp');
ICON.key = nliIcon('ui_key');
ICON.star = nliIcon('ui_shard');
