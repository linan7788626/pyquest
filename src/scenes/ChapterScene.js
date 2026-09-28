// ============================================================
// 通用章节场景：数据驱动的野外（Field）与巢穴（Lair）
// - FieldScene：碎片符文 + 引导 NPC + 巢穴封印门（集齐碎片解锁）
// - LairScene：BOSS 符文破盾 + BOSS 战 + 通关结算（进入下一章）
// 由 main.js 按 chapters.js 注册表批量生成（8 章 × 2 场景）
// ============================================================
import { G, updateHud, cp } from '../core/state.js';
import { CHAPTERS, getChapter } from '../data/chapters.js';
import { WorldScene } from './WorldScene.js';
import { showVictory } from '../ui/modal.js';
import { sfx } from '../audio/sfx.js';

export class FieldScene extends WorldScene {
  constructor(key, ch) { super(key); this.ch = ch; }

  init(data) {
    this.spawnKey = data && data.spawn ? data.spawn : (this.ch.id === 1 ? 'start' : 'fromPrev');
  }

  create() {
    this.mapDef = this.ch.buildField(this.ch);
    super.create();
  }

  /** 引导 NPC（长老/石碑）：对话内容来自章节配置 */
  talkToElder() {
    const ctx = { cp: cp(this.ch.id), G, ch: this.ch };
    this.dialogue.say({ name: this.ch.npcName, lines: this.ch.npc(ctx) });
  }

  /** 封印之门被按 E 检查：集齐碎片则当场解锁 */
  onDoorLocked(it) {
    const P = cp(this.ch.id);
    if (it.prop.unlockOnShards && P.shards >= P.shardsNeeded) {
      P.gateOpen = true;
      updateHud();
      sfx.openGate();
      it.locked = false;
      it.sprite.clearTint();
      if (it.body) it.body.body.enable = false;
      const aura = this.add.image(it.x, it.y - 72, 'particle')
        .setTint(0x3ddad7).setAlpha(0.16).setScale(36).setDepth(it.y - 2);
      this.tweens.add({ targets: aura, alpha: 0.3, scale: 42, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
      this.cameras.main.shake(240, 0.004);
      this.floatText(it.x, it.y + 180, '封印瓦解了！', '#3ddad7');
    } else {
      this.dialogue.say({
        name: it.prop.label || '封印之门',
        lines: it.prop.lockLines,
      });
    }
  }
}

export class LairScene extends WorldScene {
  constructor(key, ch) { super(key); this.ch = ch; }

  init(data) {
    this.spawnKey = data && data.spawn ? data.spawn : 'fromField';
  }

  create() {
    const def = this.ch.buildLair(this.ch);
    // BOSS 已被封印则不再生成
    if (cp(this.ch.id).done) def.boss = null;
    this.mapDef = def;
    super.create();
  }

  breakBossShield() {
    const P = cp(this.ch.id);
    P.bossShielded = false;
    updateHud();
    if (!this.boss || !this.boss.active) return;
    sfx.shieldBreak();
    this.boss.clearTint();
    this.cameras.main.flash(300);
    this.cameras.main.shake(300, 0.006);
    this.floatText(this.boss.x, this.boss.y - 32, '护盾破碎了！', '#ff9db3');
  }

  onBossDefeated() {
    const P = cp(this.ch.id);
    P.bossDefeated = true;
    P.done = true;
    updateHud();
    const next = getChapter(this.ch.id + 1);
    const hasNext = !!next && next.id > this.ch.id;
    this.time.delayedCall(1100, () => showVictory(this.ch, {
      hasNext,
      onNext: () => this.scene.start(
        hasNext ? next.fieldKey : CHAPTERS[0].fieldKey,
        { spawn: hasNext ? 'fromPrev' : 'start' },
      ),
    }));
  }
}

/** 工厂：为章节生成绑定好的场景类（Phaser 需要每章独立类注册唯一 key） */
export function makeFieldScene(ch) {
  return class extends FieldScene {
    constructor() { super(ch.fieldKey, ch); }
  };
}

export function makeLairScene(ch) {
  return class extends LairScene {
    constructor() { super(ch.lairKey, ch); }
  };
}
