// ============================================================
// BootScene：生成全部程序化贴图与动画，然后等待玩家选择
// 「继续冒险」（读档）或「新的冒险」（清档重来）
// ============================================================
import Phaser from 'phaser';
import { generateAllTextures, createAnimations } from '../textures/pixelArt.js';
import { initTitle } from '../ui/modal.js';
import { G, resetState } from '../core/state.js';
import { clearSave, loadGame } from '../core/save.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    generateAllTextures(this);
    createAnimations(this);

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
