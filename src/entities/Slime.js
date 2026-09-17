// ============================================================
// 史莱姆：游荡 + 靠近追击，被击退，死亡掉落爱心
// variant: 'red'（猩红小怪）| 'crimson'（深红小怪，第二章，更快更硬）
// ============================================================
import Phaser from 'phaser';
import { sfx } from '../audio/sfx.js';
import { CS } from '../core/scale.js';

export class Slime extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, variant = 'red') {
    super(scene, x, y, variant === 'crimson' ? 'slime_blue_0' : 'slime_0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.9);
    this.setDisplaySize(16 * CS, 16 * CS); // 角色 2 倍显示
    this.k = this.scaleX; // 高清贴图的缩放基准（果冻感缩放用）
    this.body.setSize(14, 10).setOffset(9, 23);
    this.setCollideWorldBounds(true);

    this.hp = 2;
    this.chaseRange = 110;
    this.chaseSpeed = 55;
    this.wanderSpeed = 32;
    this.dead = false;
    this.knockUntil = 0;
    this.hurtCdUntil = 0;
    this.wanderUntil = 0;
    this.play(variant === 'crimson' ? 'slime_blue_move' : 'slime_move');
    if (variant === 'crimson') {
      this.hp = 3;
      this.chaseSpeed = 68;
      this.wanderSpeed = 38;
    }
    this.setDepth(this.y);

    // 脚下软阴影
    this.shadow = scene.add.image(x, y + 1, 'shadow')
      .setScale(1.5).setAlpha(0.5).setDepth(this.y - 0.5);
  }

  update() {
    if (this.dead) return;
    const now = this.scene.time.now;
    // 果冻感：X/Y 反向呼吸
    const wob = Math.sin(now / 150) * 0.055;
    this.setScale(this.k * (1 + wob), this.k * (1 - wob));
    if (now < this.knockUntil) return;

    const p = this.scene.player;
    const dist = p ? Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) : 9999;

    if (p && !p.dying && dist < this.chaseRange) {
      this.scene.physics.moveTo(this, p.x, p.y, this.chaseSpeed);
    } else if (now > this.wanderUntil) {
      this.wanderUntil = now + Phaser.Math.Between(700, 2000);
      if (Math.random() < 0.35) {
        this.setVelocity(0, 0);
      } else {
        const a = Math.random() * Math.PI * 2;
        this.setVelocity(Math.cos(a) * this.wanderSpeed, Math.sin(a) * this.wanderSpeed);
      }
    }
    this.setFlipX(this.body.velocity.x < 0);
    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 1).setDepth(this.y - 0.5);
  }

  hurt(dmg, fromX, fromY) {
    const now = this.scene.time.now;
    if (this.dead || now < this.hurtCdUntil) return;
    this.hurtCdUntil = now + 280;

    this.hp -= dmg;
    sfx.hitEnemy();
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.dead || this.clearTint());
    // 受击火花
    this.burst([0xffffff, 0xffd257], 5);

    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    this.setVelocity(Math.cos(angle) * 230, Math.sin(angle) * 230);
    this.knockUntil = now + 220;

    if (this.hp <= 0) this.die();
  }

  burst(colors, count = 10) {
    for (let i = 0; i < count; i++) {
      const p = this.scene.add.image(this.x, this.y - 6, 'particle')
        .setTint(colors[i % colors.length]).setScale(1).setDepth(1800);
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 80;
      this.scene.tweens.add({
        targets: p,
        x: this.x + Math.cos(a) * sp, y: this.y + Math.sin(a) * sp - 12,
        alpha: 0, duration: 550,
        onComplete: () => p.destroy(),
      });
    }
  }

  die() {
    this.dead = true;
    sfx.enemyDie();
    this.burst([0xe8503f, 0xffb09b, 0xffffff]);
    if (Math.random() < 0.22) this.scene.spawnHeartDrop(this.x, this.y);
    if (this.shadow) this.shadow.destroy();
    this.destroy();
  }
}
