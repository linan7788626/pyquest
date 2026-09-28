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

// ---------- 调试/测试句柄 ----------
import { G } from './core/state.js';
window.__PYQUEST__ = {
  game,
  G,
  scene: (key) => game.scene.getScene(key),
  active: () => sceneKeys
    .map((k) => game.scene.getScene(k))
    .find((s) => s && (s.scene.isActive() || s.scene.isPaused())),
};

// ---------- 舞台自适应（保持 3:2，让 DOM UI 与画布重合） ----------
const stage = document.getElementById('stage');
function fitStage() {
  const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  stage.style.width = `${Math.floor(GAME_W * s)}px`;
  stage.style.height = `${Math.floor(GAME_H * s)}px`;
}
window.addEventListener('resize', fitStage);
fitStage();
