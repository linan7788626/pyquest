// ============================================================
// 循环地牢：暗色调地牢，循环/条件符文石 + 循环史莱姆王
// ============================================================
import { G, updateHud } from '../core/state.js';
import { WorldScene } from './WorldScene.js';
import { buildDungeon } from '../data/maps.js';
import { showVictory } from '../ui/modal.js';
import { sfx } from '../audio/sfx.js';
export default class DungeonScene extends WorldScene {
  constructor() { super('Dungeon'); }

  init(data) {
    this.spawnKey = data && data.spawn ? data.spawn : 'fromVillage';
  }

  create() {
    const def = buildDungeon();
    // BOSS 已被击败则不再生成
    if (G.bossDefeated) def.boss = null;
    this.mapDef = def;
    super.create();
  }

  breakBossShield() {
    G.bossShielded = false;
    updateHud();
    if (!this.boss || !this.boss.active) return;
    sfx.shieldBreak();
    this.boss.clearTint();
    this.cameras.main.flash(300);
    this.cameras.main.shake(300, 0.006);
    this.floatText(this.boss.x, this.boss.y - 32, '护盾破碎了！', '#ff9db3');
  }

  onBossDefeated() {
    G.bossDefeated = true;
    G.ch1Done = true;
    updateHud();
    this.time.delayedCall(1000, () => showVictory(1, {
      onNext: () => this.scene.start('Forest', { spawn: 'fromVillage' }),
    }));
  }
}
