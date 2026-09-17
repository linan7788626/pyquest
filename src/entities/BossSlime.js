// ============================================================
// 循环史莱姆王：紫色巨史莱姆，护盾状态下免伤
// 破盾后可被攻击，血量 6/3 时召唤小史莱姆
// ============================================================
import Phaser from 'phaser';
import { G } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { Slime } from './Slime.js';
import { CS } from '../core/scale.js';

export class BossSlime extends Slime {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.setTexture('boss');
    this.setDisplaySize(24 * CS, 24 * CS); // 48×48 模板 1:1 显示（像素完美）
    this.k = this.scaleX;
    this.anims.stop(); // 停止继承的史莱姆动画，防止覆盖 BOSS 贴图
    this.setOrigin(0.5, 0.92);
    this.body.setSize(34, 12).setOffset(7, 31);

    this.hp = 10;
    this.isBoss = true;
    this.chaseRange = 170;
    this.chaseSpeed = 44;
    this.wanderSpeed = 22;

    if (G.bossShielded) this.setTint(0x9fb8ff);
    this.shadow.setDisplaySize(42, 21);
  }

  update() {
    if (this.dead) return;
    const now = this.scene.time.now;
    // 呼吸感：X/Y 反向挤压（果冻感更强）
    const wob = Math.sin(now / 200) * 0.06;
    this.setScale(this.k * (1 + wob), this.k * (1 - wob * 0.85));
    if (now < this.knockUntil) return;

    const p = this.scene.player;
    const dist = p ? Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) : 9999;
    if (p && !p.dying && dist < this.chaseRange) {
      this.scene.physics.moveTo(this, p.x, p.y, this.chaseSpeed);
    } else if (now > this.wanderUntil) {
      this.wanderUntil = now + Phaser.Math.Between(800, 1600);
      const a = Math.random() * Math.PI * 2;
      this.setVelocity(Math.cos(a) * this.wanderSpeed, Math.sin(a) * this.wanderSpeed);
    }
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
      this.scene.floatText(this.x, this.y - 36, '史莱姆王召唤了帮手！', '#ff9db3');
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
