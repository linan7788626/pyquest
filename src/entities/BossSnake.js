// ============================================================
// 列表巨蟒 毕森（第二章 BOSS）
// - 身体 = 一条会动的「列表」：黑勇士蛇头 + 黑小兵体节沿轨迹跟随
// - 符文护盾期免伤（答对 boss2 符文才能破盾）
// - 破盾后攻击头部造成伤害；每损失 2 HP 断掉一节尾巴并提速
// - 蓄力后向前冲刺突咬
// ============================================================
import Phaser from 'phaser';
import { G } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { Slime } from './Slime.js';

const SEG_GAP = 184;      // 体节间距（头部轨迹采样间隔；角色 ×2 后等比）
const MAX_TRAIL = 4800;  // 头部轨迹记录长度
const HEAD_SCALE = 2.5; // 基础 ×2 后保持 1.25 比例
const SEG_SCALE = 1.24;

export class BossSnake extends Slime {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.setTexture('warrior_black_idle');
    this.setScale(HEAD_SCALE);
    this.setOrigin(0.5, 136 / 192);
    this.body.setSize(60, 26).setOffset(66, 132);
    this.anims.stop();
    this.play('ts_warrior_black_idle');
    this.animIdle = 'ts_warrior_black_idle';
    this.animRun = 'ts_warrior_black_run';

    this.hp = 12;
    this.isBoss = true;
    this.chaseRange = 1280;
    this.chaseSpeed = 350;
    this.wanderSpeed = 170;
    this.lost = 0; // 已断掉的体节数（决定提速）

    // 体节（无物理体的跟随精灵）
    this.segs = [];
    for (let i = 0; i < 6; i++) {
      const s = scene.add.sprite(x, y - (i + 1) * 160, 'pawn_black_idle')
        .setScale(SEG_SCALE).setOrigin(0.5, 134 / 192);
      s.play('ts_pawn_black_idle');
      this.segs.push(s);
    }
    this.trail = [];

    if (G.progress[scene.ch.id].bossShielded) this.setTint(0x7f9dff);
    this.shadow.setDisplaySize(180, 90);

    this.nextDartAt = scene.time.now + 3000;
    this.teleUntil = 0;
    this.dartUntil = 0;
  }

  update() {
    if (this.dead) return;
    const now = this.scene.time.now;
    if (now < this.knockUntil) return;

    const p = this.scene.player;
    const dist = p ? Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) : 9999;

    if (G.progress[this.scene.ch.id].bossShielded) {
      // 护盾期：缓慢游荡（象征符文封印）
      if (now > this.wanderUntil) {
        this.wanderUntil = now + Phaser.Math.Between(1200, 2200);
        const a = Math.random() * Math.PI * 2;
        this.setVelocity(Math.cos(a) * 55, Math.sin(a) * 55);
      }
    } else if (now < this.teleUntil) {
      // 蓄力：短暂定身 + 抖动
      this.setVelocity(0, 0);
      const sh = Math.sin(now / 24) * 0.06;
      this.setScale(HEAD_SCALE * (1 + sh), HEAD_SCALE * (1 - sh));
    } else if (now < this.dartUntil) {
      // 冲刺：保持触发时设置的速度
    } else if (p && !p.dying && dist < this.chaseRange) {
      const speed = this.chaseSpeed + this.lost * 36;
      const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
      // 蛇形走位
      const t = a + Math.sin(now / 240) * 0.5;
      this.setVelocity(Math.cos(t) * speed, Math.sin(t) * speed);
      // 触发冲刺突咬
      if (dist < 1040 && now > this.nextDartAt) {
        this.nextDartAt = now + 3600;
        this.teleUntil = now + 420;
        this.dartUntil = now + 940;
        const dash = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
        this.scene.time.delayedCall(420, () => {
          if (this.dead) return;
          this.setVelocity(Math.cos(dash) * 1280, Math.sin(dash) * 1280);
        });
        sfx.swing();
      }
    } else if (now > this.wanderUntil) {
      this.wanderUntil = now + Phaser.Math.Between(800, 1600);
      const a = Math.random() * Math.PI * 2;
      this.setVelocity(Math.cos(a) * this.wanderSpeed, Math.sin(a) * this.wanderSpeed);
    }

    const moving = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.y) > 10;
    this.setFlipX(this.body.velocity.x < 0);
    this.anims.play(moving ? this.animRun : this.animIdle, true);
    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 2).setDepth(this.y - 0.5);

    // 记录轨迹 + 让体节跟随
    this.trail.unshift({ x: this.x, y: this.y - 32 });
    if (this.trail.length > MAX_TRAIL) this.trail.pop();
    this.segs.forEach((s, i) => {
      const t = this.trail[Math.min((i + 1) * SEG_GAP, this.trail.length - 1)];
      if (t) s.setPosition(t.x, t.y);
      s.setFlipX(this.body.velocity.x < 0);
      s.setDepth(s.y);
      // 体节接触伤害（头部走 slimeGroup 的 overlap）
      if (p && !p.dying && Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) < 208) {
        p.takeDamage(1, s.x, s.y);
      }
    });
  }

  hurt(dmg, fromX, fromY) {
    if (this.dead) return;
    if (G.progress[this.scene.ch.id].bossShielded) {
      const now = this.scene.time.now;
      if (now < this.hurtCdUntil) return;
      this.hurtCdUntil = now + 400;
      this.scene.floatText(this.x, this.y - 110, '符文护盾抵消了攻击！', '#9fb8ff');
      sfx.hitEnemy();
      const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
      this.setVelocity(Math.cos(angle) * 520, Math.sin(angle) * 520);
      this.knockUntil = now + 160;
      return;
    }
    super.hurt(dmg, fromX, fromY);
    if (this.dead) return;
    // 每损失 2 HP 断一节尾巴，并变得更快
    if (this.hp % 2 === 0) this.popSegment();
  }

  popSegment() {
    const s = this.segs.pop();
    if (!s) return;
    this.lost++;
    sfx.enemyDie();
    for (let i = 0; i < 8; i++) {
      const p = this.scene.add.image(s.x, s.y, 'particle')
        .setTint([0x6fce5e, 0xb5e48c, 0xffffff][i % 3]).setScale(4).setDepth(1800);
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 190;
      this.scene.tweens.add({
        targets: p, x: s.x + Math.cos(a) * sp, y: s.y + Math.sin(a) * sp - 20,
        alpha: 0, duration: 480, onComplete: () => p.destroy(),
      });
    }
    s.destroy();
    this.scene.floatText(this.x, this.y - 120, '巨蟒的尾巴断了一节！', '#9dff9d');
  }

  die() {
    this.dead = true;
    const scene = this.scene;
    sfx.bossDie();
    this.burst([0x6fce5e, 0xb5e48c, 0xffffff, 0xffd257], 28);
    scene.cameras.main.flash(400);
    // 剩余体节依次爆裂
    this.segs.forEach((s, i) => {
      scene.time.delayedCall(i * 90, () => {
        if (!s.active) return;
        for (let j = 0; j < 6; j++) {
          const p = scene.add.image(s.x, s.y, 'particle')
            .setTint([0x6fce5e, 0xffffff, 0xffd257][j % 3]).setScale(4).setDepth(1800);
          const a = Math.random() * Math.PI * 2;
          scene.tweens.add({
            targets: p, x: s.x + Math.cos(a) * 150, y: s.y + Math.sin(a) * 150 - 40,
            alpha: 0, duration: 460, onComplete: () => p.destroy(),
          });
        }
        s.destroy();
      });
    });
    if (this.shadow) this.shadow.destroy();
    this.destroy();
    scene.onBossDefeated();
  }
}
