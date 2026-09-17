// ============================================================
// 循环之王（第一章 BOSS）：0x72 大恶魔（big_demon 32×36）
// 护盾状态下免伤（答对 boss 符文破盾），血量 6/3 时召唤小怪
// ============================================================
import Phaser from 'phaser';
import { G } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { Slime } from './Slime.js';

const SCALE = 2; // 32×36 → 64×72

export class BossSlime extends Slime {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.setTexture('big_demon_idle_anim_f0');
    this.setDisplaySize(32 * SCALE, 36 * SCALE);
    this.setOrigin(0.5, 0.94);
    this.body.setSize(40, 14).setOffset(12, 30);
    this.anims.stop();
    this.animIdle = 'demon_idle';
    this.animRun = 'demon_run';
    this.play('demon_idle');

    this.hp = 10;
    this.isBoss = true;
    this.chaseRange = 170;
    this.chaseSpeed = 44;
    this.wanderSpeed = 22;

    if (G.bossShielded) this.setTint(0x9fb8ff);
    this.shadow.setDisplaySize(48, 24);
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
    this.shadow.setPosition(this.x, this.y + 1).setDepth(this.y - 0.5);
  }

  hurt(dmg, fromX, fromY) {
    if (this.dead) return;
    if (G.bossShielded) {
      const now = this.scene.time.now;
      if (now < this.hurtCdUntil) return;
      this.hurtCdUntil = now + 400;
      this.scene.floatText(this.x, this.y - 28, '护盾抵消了攻击！', '#9fb8ff');
      sfx.hitEnemy();
      const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
      this.setVelocity(Math.cos(angle) * 70, Math.sin(angle) * 70);
      this.knockUntil = now + 160;
      return;
    }
    super.hurt(dmg, fromX, fromY);
    if (this.dead) return;

    if (this.hp <= 6 && !this.spawnedWave1) {
      this.spawnedWave1 = true;
      this.scene.spawnSlime(this.x - 32, this.y);
      this.scene.spawnSlime(this.x + 32, this.y);
      this.scene.floatText(this.x, this.y - 36, '循环之王召唤了帮手！', '#ff9db3');
    }
    if (this.hp <= 3 && !this.spawnedWave2) {
      this.spawnedWave2 = true;
      this.scene.spawnSlime(this.x - 32, this.y);
      this.scene.spawnSlime(this.x + 32, this.y);
    }
  }

  die() {
    this.dead = true;
    const scene = this.scene;
    sfx.bossDie();
    this.burst([0xb57ae0, 0xffd257, 0xffffff, 0x9355c7], 28);
    scene.cameras.main.flash(400);
    if (this.shadow) this.shadow.destroy();
    this.destroy();
    scene.onBossDefeated();
  }
}
