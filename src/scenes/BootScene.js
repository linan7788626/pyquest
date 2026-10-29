// ============================================================
// BootScene：加载 Tiny Swords 素材（本地 assets/TinySwordsFreePack）
// + 程序化贴图（爱心/碎片等游戏专属元素）
// ============================================================
import Phaser from 'phaser';
import { generateAllTextures, createAnimations } from '../textures/pixelArt.js';
import { loadTSAssets, createTSAnimations } from '../assets/ts.js';
import { initTitle } from '../ui/modal.js';
import { furthestChapter } from '../core/state.js';
import { getChapter } from '../data/chapters.js';
import { loadGame, beginNewGame } from '../core/save.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    loadTSAssets(this);   // Tiny Swords（角色/地形/装饰）
  }

  create() {
    if (this.textures.exists('npc_elder')) this.textures.get('npc_elder').setFilter(Phaser.Textures.FilterMode.LINEAR);
    generateAllTextures(this);
    createAnimations(this);
    createTSAnimations(this);

    initTitle({
      onNew: () => {
        beginNewGame();
        this.scene.start('Village', { spawn: 'start' });
      },
      onContinue: () => {
        if (!loadGame()) { window.alert('存档暂时无法读取，原始数据已保留。'); document.getElementById('title').classList.remove('hidden'); return; }
        // 按存档进度决定落点：最新可推进章节的野外
        const ch = getChapter(furthestChapter());
        const spawn = ch.id === 1 ? 'start' : 'fromPrev';
        this.scene.start(ch.fieldKey, { spawn });
      },
    });
  }
}
