// ============================================================
// 敌方小怪：Tiny Swords 单位
// variant: 'red'（红小兵 · 村庄/地牢）| 'crimson'（黑勇士 · 森林，更快更硬）
// 帧规格同玩家：192×192/帧，脚底 y≈134
// ============================================================
import Phaser from 'phaser';
import { sfx } from '../audio/sfx.js';

const FOOT_Y = 134; // Pawn 脚底略高

export class Slime extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, variant = 'red') {
    super(scene, x, y, variant === 'crimson' ? 'warrior_black_idle' : 'pawn_red_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const big = variant === 'crimson';
    this.setOrigin(0.5, FOOT_Y / 192);
    this.body.setSize(big ? 60 : 48, big ? 28 : 24).setOffset(big ? 66 : 72, big ? 132 : 134);
    this.setCollideWorldBounds(true);

    this.hp = 2;
    this.chaseRange = 420;
    this.chaseSpeed = 210;
    this.wanderSpeed = 120;
    this.dead = false;
    this.knockUntil = 0;
    this.hurtCdUntil = 0;
    this.wanderUntil = 0;
    if (big) {
      this.hp = 3;
      this.chaseSpeed = 250;
      this.wanderSpeed = 145;
    }
    this.play(big ? 'ts_warrior_black_idle' : 'ts_pawn_red_idle');
    this.animIdle = big ? 'ts_warrior_black_idle' : 'ts_pawn_red_idle';
    this.animRun = big ? 'ts_warrior_black_run' : 'ts_pawn_red_run';
    this.setDepth(this.y);

    // 脚下软阴影
    this.shadow = scene.add.image(x, y + 2, 'ts_shadow')
      .setDisplaySize(big ? 72 : 56, (big ? 72 : 56) / 2).setAlpha(0.5).setDepth(this.y - 0.5);
  }

  update() {
    if (this.dead) return;
    const now = this.scene.time.now;
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
    const moving = Math.abs(this.body.velocity.x) + Math.abs(this.body.velocity.y) > 10;
    this.setFlipX(this.body.velocity.x < 0);
    this.anims.play(moving ? this.animRun : this.animIdle, true);
    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 2).setDepth(this.y - 0.5);
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
    this.burst([0xffffff, 0xffd257], 6);

    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    this.setVelocity(Math.cos(angle) * 700, Math.sin(angle) * 700);
    this.knockUntil = now + 220;

    if (this.hp <= 0) this.die();
  }

  burst(colors, count = 10) {
    for (let i = 0; i < count; i++) {
      const p = this.scene.add.image(this.x, this.y - 20, 'particle')
        .setTint(colors[i % colors.length]).setScale(2.5).setDepth(1800);
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 200;
      this.scene.tweens.add({
        targets: p,
        x: this.x + Math.cos(a) * sp, y: this.y + Math.sin(a) * sp - 30,
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
