// ============================================================
// 列表巨蟒 毕森（第二章 BOSS）
// - 身体 = 一条会动的「列表」：头 + 若干体节沿轨迹跟随
// - 符文护盾期免伤（答对 boss2 符文才能破盾）
// - 破盾后攻击头部造成伤害；每损失 2 HP 断掉一节尾巴并提速
// - 蓄力后向前冲刺突咬
// ============================================================
import Phaser from 'phaser';
import { G } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { Slime } from './Slime.js';
import { CS } from '../core/scale.js';

const SEG_GAP = 15;     // 体节间距（头部轨迹采样间隔）
const MAX_TRAIL = 300;  // 头部轨迹记录长度

export class BossSnake extends Slime {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.setTexture('snake_head');
    this.setDisplaySize(18 * CS, 18 * CS); // 2 倍：36px 蛇头
    this.k = this.scaleX;
    this.anims.stop(); // 停止继承的史莱姆动画，防止覆盖贴图
    this.setOrigin(0.5, 0.82);
    this.body.setSize(16, 10).setOffset(10, 25);

    this.hp = 12;
    this.isBoss = true;
    this.chaseRange = 180;
    this.chaseSpeed = 46;
    this.wanderSpeed = 22;
    this.lost = 0; // 已断掉的体节数（决定提速）

    // 体节（无物理体的跟随图片）
    this.segs = [];
    for (let i = 0; i < 6; i++) {
      const s = scene.add.image(x, y - i * 4, 'snake_body').setDisplaySize(14 * CS, 14 * CS);
      this.segs.push(s);
    }
    this.trail = [];

    if (G.boss2Shielded) this.setTint(0x7f9dff);
    this.shadow.setScale(2.4);

    this.nextDartAt = scene.time.now + 3000;
    this.teleUntil = 0;
    this.dartUntil = 0;
  }

  update() {
    if (this.dead) return;
    const now = this.scene.time.now;
    // 呼吸感
    const wob = Math.sin(now / 170) * 0.055;
    this.setScale(this.k * (1 + wob), this.k * (1 - wob));
    if (now < this.knockUntil) return;

    const p = this.scene.player;
    const dist = p ? Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) : 9999;

    if (G.boss2Shielded) {
      // 护盾期：缓慢游荡（象征符文封印）
      if (now > this.wanderUntil) {
        this.wanderUntil = now + Phaser.Math.Between(1200, 2200);
        const a = Math.random() * Math.PI * 2;
        this.setVelocity(Math.cos(a) * 14, Math.sin(a) * 14);
      }
    } else if (now < this.teleUntil) {
      // 蓄力：短暂定身 + 抖动
      this.setVelocity(0, 0);
      this.setScale(this.k * (1 + Math.sin(now / 24) * 0.09), this.k * (1 - Math.sin(now / 24) * 0.09));
    } else if (now < this.dartUntil) {
      // 冲刺：保持触发时设置的速度
    } else if (p && !p.dying && dist < this.chaseRange) {
      const speed = this.chaseSpeed + this.lost * 5;
      const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
      // 蛇形走位
      const t = a + Math.sin(now / 240) * 0.5;
      this.setVelocity(Math.cos(t) * speed, Math.sin(t) * speed);
      // 触发冲刺突咬
      if (dist < 150 && now > this.nextDartAt) {
        this.nextDartAt = now + 3600;
        this.teleUntil = now + 420;
        this.dartUntil = now + 940;
        const dash = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
        this.scene.time.delayedCall(420, () => {
          if (this.dead) return;
          this.setVelocity(Math.cos(dash) * 170, Math.sin(dash) * 170);
        });
        sfx.swing();
      }
    } else if (now > this.wanderUntil) {
      this.wanderUntil = now + Phaser.Math.Between(800, 1600);
      const a = Math.random() * Math.PI * 2;
      this.setVelocity(Math.cos(a) * this.wanderSpeed, Math.sin(a) * this.wanderSpeed);
    }

    this.setFlipX(this.body.velocity.x < 0);
    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 1).setDepth(this.y - 0.5);

    // 记录轨迹 + 让体节跟随
    this.trail.unshift({ x: this.x, y: this.y - 2 });
    if (this.trail.length > MAX_TRAIL) this.trail.pop();
    this.segs.forEach((s, i) => {
      const t = this.trail[Math.min((i + 1) * SEG_GAP, this.trail.length - 1)];
      if (t) s.setPosition(t.x, t.y);
      s.setDepth(s.y);
      // 体节接触伤害（头部走 slimeGroup 的 overlap）
      if (p && !p.dying && Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) < 14) {
        p.takeDamage(1, s.x, s.y);
      }
    });
  }

  hurt(dmg, fromX, fromY) {
    if (this.dead) return;
    if (G.boss2Shielded) {
      const now = this.scene.time.now;
      if (now < this.hurtCdUntil) return;
      this.hurtCdUntil = now + 400;
      this.scene.floatText(this.x, this.y - 30, '符文护盾抵消了攻击！', '#9fb8ff');
      sfx.hitEnemy();
      const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
      this.setVelocity(Math.cos(angle) * 70, Math.sin(angle) * 70);
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
        .setTint([0x6fce5e, 0xb5e48c, 0xffffff][i % 3]).setScale(1.6).setDepth(1800);
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 70;
      this.scene.tweens.add({
        targets: p, x: s.x + Math.cos(a) * sp, y: s.y + Math.sin(a) * sp - 6,
        alpha: 0, duration: 480, onComplete: () => p.destroy(),
      });
    }
    s.destroy();
    this.scene.floatText(this.x, this.y - 34, '巨蟒的尾巴断了一节！', '#9dff9d');
  }

  die() {
    this.dead = true;
    const scene = this.scene;
    sfx.bossDie();
    this.burst([0x6fce5e, 0xb5e48c, 0xffffff, 0xffd257], 26);
    scene.cameras.main.flash(400);
    // 剩余体节依次爆裂
    this.segs.forEach((s, i) => {
      scene.time.delayedCall(i * 90, () => {
        if (!s.active) return;
        for (let j = 0; j < 6; j++) {
          const p = scene.add.image(s.x, s.y, 'particle')
            .setTint([0x6fce5e, 0xffffff, 0xffd257][j % 3]).setScale(1.6).setDepth(1800);
          const a = Math.random() * Math.PI * 2;
          scene.tweens.add({
            targets: p, x: s.x + Math.cos(a) * 48, y: s.y + Math.sin(a) * 48 - 12,
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
