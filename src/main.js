// ============================================================
// PyQuest · Python 冒险记 —— 游戏入口
// P4A@UCAS 八周课程 = 八章关卡（data/chapters.js 注册表驱动）
// ============================================================
import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import { makeFieldScene, makeLairScene } from './scenes/ChapterScene.js';
import { CHAPTERS } from './data/chapters.js';
import { initAutosave } from './core/save.js';

const GAME_W = 1920;
const GAME_H = 1280;

// 每章注册 野外(field) + 巢穴(lair) 两个场景
const scenes = [BootScene];
const sceneKeys = [];
for (const ch of CHAPTERS) {
  scenes.push(makeFieldScene(ch));
  scenes.push(makeLairScene(ch));
  sceneKeys.push(ch.fieldKey, ch.lairKey);
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  // 像素完美渲染：16px 贴图 × 相机 4x 整数放大，锐利无插值
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  backgroundColor: '#2c2438',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: scenes,
};

// eslint-disable-next-line no-new
const game = new Phaser.Game(config);

// ---------- 自动存档（HUD 更新 / 关页时写入 localStorage） ----------
initAutosave();

// ---------- 测试接缝（window.__PYQUEST__）：只读查询 + 语义化作弊指令 ----------
// 面向 E2E 脚本的稳定入口（见 src/core/seam.js）；正常游戏路径不经过它
import { buildSeam } from './core/seam.js';
window.__PYQUEST__ = buildSeam(game, sceneKeys);

// ---------- 舞台自适应（保持 3:2，让 DOM UI 与画布重合） ----------
// #12 移动端断裂修复：DOM UI 的字号 / 间距是绝对像素，stage 被压到手机上的
// 374×249 时浮层必然溢出截断（design-m1/m3/m4）。结构性修法：
// #ui-scale 固定按 960×640 设计尺寸布局（= canvas 1920×1280 内部尺寸的一半），
// 由这里以「stage 宽 / 960」的系数统一 transform: scale——与画布同系数、
// 同原点（stage 左上角），所有浮层 / 字号 / 间距随画布等比缩放且与画面像素对齐。
// #ui 本身保持不缩放（恒等于 stage 矩形）：碎片飞行等用 getBoundingClientRect
// 计算视觉坐标的 JS 特效挂在 #ui 上，视觉像素即布局像素，不受缩放影响。
// 竖屏（innerHeight > innerWidth）时再把设计画布向上下扩展铺满整块视口：
// 全屏浮层（quiz / 地图 / 标题 / 胜利）得以占满屏幕；HUD / 提示 / 对话通过
// --cam-pad（画布区域外的设计边距）仍锚定画布边缘（.portrait 断点见 index.html）。
const stage = document.getElementById('stage');
const uiScaleEl = document.getElementById('ui-scale');
const UI_W = 960;
const UI_H = 640;
function fitStage() {
  const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  const w = Math.round(GAME_W * s);
  const h = Math.round(GAME_H * s);
  stage.style.width = `${w}px`;
  stage.style.height = `${h}px`;
  document.documentElement.style.setProperty('--quiz-height', `${Math.max(100, (window.innerHeight - 32) / (w / UI_W))}px`);
  const k = w / UI_W; // 与画布同系数：画布 1920 设计宽 → stage 宽 w
  const portrait = window.innerHeight > window.innerWidth;
  document.body.classList.toggle('portrait', portrait);
  if (portrait) {
    // 画布上下的黑边：bar 是视口像素（用于定位 #ui-scale 的原点），
    // pad 是换算回设计坐标的等价值（用于 #ui 内部的 calc 锚定与设计画布扩高）
    const bar = Math.max(0, (window.innerHeight - h) / 2);
    const pad = bar / k;
    uiScaleEl.style.top = `${-bar}px`; // top/left 定位在父容器（stage）坐标系，不被 scale 缩放
    uiScaleEl.style.height = `${UI_H + pad * 2}px`; // height 是自身设计坐标，会被 scale
    document.documentElement.style.setProperty('--cam-pad', `${pad}px`);
  } else {
    uiScaleEl.style.top = '0px';
    uiScaleEl.style.height = `${UI_H}px`;
    document.documentElement.style.setProperty('--cam-pad', '0px');
  }
  uiScaleEl.style.transform = `scale(${k})`;
  // Phaser 在 Game 构造时就读过一次父容器尺寸（那时 stage 还是 CSS 默认 960×640，
  // fitStage 尚未执行），之后步进轮询只按「尺寸变化」触发、不保证补读——
  // 桌面端画布会卡在 960×640 居中、与 stage 错位。这里显式重读父容器并刷新，
  // 保证 canvas 与 stage（从而与 #ui-scale）严格重合、同系数同原点。
  if (game.scale) {
    game.scale.getParentBounds();
    if (game.scale.canvas) game.scale.refresh();
  }
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', fitStage);
fitStage();

document.addEventListener('pyquest:save-error', () => {
  let notice = document.getElementById('save-error');
  if (!notice) { notice = document.createElement('div'); notice.id = 'save-error'; notice.setAttribute('role', 'status'); notice.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:9999;background:#fff0cf;color:#653711;padding:8px;border-radius:6px'; document.body.append(notice); }
  notice.textContent = '当前进度未能保存，请检查浏览器存储空间或隐私设置。';
});
