// ============================================================
// BootScene：本地NLI新素材；缺图明确停止，不回退旧装饰美术。
// ============================================================
import Phaser from 'phaser';
import { generateAllTextures, createAnimations } from '../textures/pixelArt.js';
import { loadTSAssets, createTSAnimations, NLI_REQUIRED_KEYS, NLI_SOURCE_VERSION } from '../assets/ts.js';
import { loadTerrainAssets } from '../textures/nliGroundProfiles.js';
import { initTitle } from '../ui/modal.js';
import { furthestChapter } from '../core/state.js';
import { getChapter } from '../data/chapters.js';
import { loadGame, beginNewGame } from '../core/save.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.nliLoadErrors = [];
    this.load.on('loaderror', (file) => this.nliLoadErrors.push(file.key));
    loadTSAssets(this);
    loadTerrainAssets(this);
  }

  create() {
    const missing = NLI_REQUIRED_KEYS.filter((key) => !this.textures.exists(key));
    const manifest = this.cache.json.get('nli_manifest');
    const errors = [...this.nliLoadErrors, ...missing];
    if (manifest?.source_version !== NLI_SOURCE_VERSION) errors.push('nli_manifest:source_version');
    if (errors.length) {
      const message = `游戏图像加载失败，请刷新重试。\n${[...new Set(errors)].join('、')}`;
      document.getElementById('title')?.classList.add('hidden');
      this.add.text(960, 640, message, {
        fontFamily: '"PingFang SC",sans-serif', fontSize: '32px', color: '#fff1cf',
        align: 'center', wordWrap: { width: 1400 },
      }).setOrigin(0.5);
      console.error('[NLI] required assets unavailable', errors);
      return;
    }
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
