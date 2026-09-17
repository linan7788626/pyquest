// ============================================================
// BootScene：加载 Tiny Swords 素材（本地 assets/TinySwordsFreePack）
// + 程序化贴图（符文石/爱心/碎片等游戏专属元素）
// CC0 包仍随仓库分发并加载（水印床/大门等元素继续使用）
// ============================================================
import Phaser from 'phaser';
import { generateAllTextures, createAnimations } from '../textures/pixelArt.js';
import { loadTSAssets, createTSAnimations } from '../assets/ts.js';
import { loadCC0Assets, createCC0Animations } from '../assets/cc0.js';
import { initTitle } from '../ui/modal.js';
import { G, resetState } from '../core/state.js';
import { clearSave, loadGame } from '../core/save.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    loadTSAssets(this);   // Tiny Swords（角色/地形/装饰）
    loadCC0Assets(this);  // CC0（0x72 地牢元素等兜底）
  }

  create() {
    generateAllTextures(this);
    createAnimations(this);
    createTSAnimations(this);
    createCC0Animations(this);

    initTitle({
      onNew: () => {
        clearSave();
        resetState();
        this.scene.start('Village', { spawn: 'start' });
      },
      onContinue: () => {
        if (!loadGame()) { clearSave(); resetState(); }
        // 按存档进度决定落点：第一章回村，第二章进森林
        const key = G.ch1Done && !G.ch2Done ? 'Forest' : 'Village';
        const spawn = key === 'Forest' ? 'fromVillage' : 'start';
        this.scene.start(key, { spawn });
      },
    });
  }
}
