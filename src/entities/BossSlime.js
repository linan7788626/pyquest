// ============================================================
// 循环之王（第一章 BOSS）：紫军勇士 · 1.6x 巨型化 + 头顶金徽
// 护盾状态下免伤（答对 boss 符文破盾），血量 6/3 时召唤小兵
// ============================================================
import Phaser from 'phaser';
import { G } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { Slime } from './Slime.js';

const BOSS_SCALE = 1.6;

export class BossSlime extends Slime {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.setTexture('warrior_purple_idle');
    this.setScale(BOSS_SCALE);
    this.setOrigin(0.5, 136 / 192);
    this.body.setSize(60, 26).setOffset(66, 132);
    this.anims.stop();
    this.play('ts_warrior_purple_idle');
    this.animIdle = 'ts_warrior_purple_idle';
    this.animRun = 'ts_warrior_purple_run';

    this.hp = 10;
    this.isBoss = true;
    this.chaseRange = 620;
    this.chaseSpeed = 160;
    this.wanderSpeed = 80;

    if (G.bossShielded) this.setTint(0x9fb8ff);
    this.shadow.setDisplaySize(110, 55);

    // 头顶金色王徽（代码碎片贴图，缓慢浮动）
    this.crown = scene.add.image(x, y - 150, 'shard')
      .setDisplaySize(44, 44).setDepth(this.y + 1);
  }

  update() {
    if (this.dead) return;
    const now = this.scene.time.now;
    if (now < this.knockUntil) return;

    const p = this.scene.player;
    const dist = p ? Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) : 9999;
    const moving = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.y) > 10;

    if (p && !p.dying && dist < this.chaseRange) {
      this.scene.physics.moveTo(this, p.x, p.y, this.chaseSpeed);
    } else if (now > this.wanderUntil) {
      this.wanderUntil = now + Phaser.Math.Between(800, 1600);
      const a = Math.random() * Math.PI * 2;
      this.setVelocity(Math.cos(a) * this.wanderSpeed, Math.sin(a) * this.wanderSpeed);
    }
    this.setFlipX(this.body.velocity.x < 0);
    this.anims.play(moving ? this.animRun : this.animIdle, true);
    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 2).setDepth(this.y - 0.5);
    this.crown.setPosition(this.x, this.y - 146 + Math.sin(now / 400) * 7).setDepth(this.y + 1);
  }

  hurt(dmg, fromX, fromY) {
    if (this.dead) return;
    if (G.bossShielded) {
      const now = this.scene.time.now;
      if (now < this.hurtCdUntil) return;
      this.hurtCdUntil = now + 400;
      this.scene.floatText(this.x, this.y - 100, '护盾抵消了攻击！', '#9fb8ff');
      sfx.hitEnemy();
      const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
      this.setVelocity(Math.cos(angle) * 260, Math.sin(angle) * 260);
      this.knockUntil = now + 160;
      return;
    }
    super.hurt(dmg, fromX, fromY);
    if (this.dead) return;

    if (this.hp <= 6 && !this.spawnedWave1) {
      this.spawnedWave1 = true;
      this.scene.spawnSlime(this.x - 120, this.y);
      this.scene.spawnSlime(this.x + 120, this.y);
      this.scene.floatText(this.x, this.y - 130, '循环之王召唤了帮手！', '#ff9db3');
    }
    if (this.hp <= 3 && !this.spawnedWave2) {
      this.spawnedWave2 = true;
      this.scene.spawnSlime(this.x - 120, this.y);
      this.scene.spawnSlime(this.x + 120, this.y);
    }
  }

  die() {
    this.dead = true;
    const scene = this.scene;
    sfx.bossDie();
    this.burst([0xb57ae0, 0xffd257, 0xffffff, 0x9355c7], 30);
    scene.cameras.main.flash(400);
    if (this.crown) this.crown.destroy();
    if (this.shadow) this.shadow.destroy();
    this.destroy();
    scene.onBossDefeated();
  }
}
