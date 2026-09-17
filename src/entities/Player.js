// ============================================================
// 玩家：0x72 骑士（knight_m）—— 移动/挥剑攻击/受击/死亡重生
// 贴图 16×28（×2 显示 32×56），正面视角 + 左右翻转
// ============================================================
import Phaser from 'phaser';
import { G, updateHud } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { wipeTransition } from '../ui/wipe.js';

const SCALE = 2; // 16×28 → 32×56（整数倍，像素完美）

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'knight_m_idle_anim_f0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.95);          // 脚底锚点（帧底 y=27/28）
    this.setDisplaySize(16 * SCALE, 28 * SCALE);
    // body：世界尺寸 20×10；纹素偏移（×SCALE 后生效）
    this.body.setSize(20, 10).setOffset(3, 22);
    this.setCollideWorldBounds(true);

    this.speed = 150;
    this.facing = 'down';
    this.invulUntil = 0;
    this.attackCdUntil = 0;
    this.attackAnimUntil = 0;
    this.dying = false;
    this.nextDust = 0;
    this.setDepth(this.y);
    this.play('knight_idle');

    // 脚下软阴影
    this.shadow = scene.add.image(x, y + 1, 'shadow')
      .setDisplaySize(24, 12).setAlpha(0.55).setDepth(this.y - 0.5);
  }

  update(keys) {
    if (this.dying) return;
    const now = this.scene.time.now;
    const speed = this.speed;

    let vx = 0, vy = 0;
    if (keys.left.isDown || keys.a.isDown) vx = -speed;
    else if (keys.right.isDown || keys.d.isDown) vx = speed;
    if (keys.up.isDown || keys.w.isDown) vy = -speed;
    else if (keys.down.isDown || keys.s.isDown) vy = speed;
    this.setVelocity(vx, vy);

    const moving = vx !== 0 || vy !== 0;
    if (vx > 0) this.facing = 'right';
    else if (vx < 0) this.facing = 'left';
    else if (vy > 0) this.facing = 'down';
    else if (vy < 0) this.facing = 'up';

    this.setFlipX(this.facing === 'left');
    this.anims.play(moving ? 'knight_run' : 'knight_idle', true);
    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 1).setDepth(this.y - 0.5);

    // 走路扬尘
    if (moving && now > this.nextDust) {
      this.nextDust = now + 230;
      const d = this.scene.add.image(this.x + Phaser.Math.Between(-3, 3), this.y + 2, 'particle')
        .setTint(0xd9cfae).setAlpha(0.75).setScale(1).setDepth(this.y - 0.4);
      this.scene.tweens.add({
        targets: d, x: d.x + Phaser.Math.Between(-5, 5), y: d.y + 3,
        alpha: 0, scale: 0.4, duration: 380, onComplete: () => d.destroy(),
      });
    }
  }

  tryAttack() {
    const scene = this.scene;
    const now = scene.time.now;
    if (this.dying || now < this.attackCdUntil) return;
    this.attackCdUntil = now + 320;
    this.attackAnimUntil = 0; // 0x72 帧无攻击动画，用挥剑弧光表现
    sfx.swing();

    const offsets = { down: [0, 12], up: [0, -14], left: [-14, 0], right: [14, 0] };
    const [ox, oy] = offsets[this.facing];

    // 挥剑弧光
    const slash = scene.add.sprite(this.x + ox, this.y + oy - 6, 'slash_0')
      .setDisplaySize(28, 28)
      .setDepth(this.depth + 10);
    if (this.facing === 'left') slash.setFlipX(true);
    if (this.facing === 'up') slash.setRotation(-Math.PI / 2);
    if (this.facing === 'down') slash.setRotation(Math.PI / 2);
    slash.play('slash');
    slash.once('animationcomplete', () => slash.destroy());

    // 攻击判定：矩形相交检测（确定性，避免物理刚体同步问题）
    const wide = this.facing === 'left' || this.facing === 'right';
    const w = wide ? 30 : 20;
    const h = wide ? 20 : 30;
    const rect = new Phaser.Geom.Rectangle(this.x + ox - w / 2, this.y + oy - h / 2, w, h);
    this.scene.applyAttack(rect);
  }

  takeDamage(amount, sx, sy) {
    const scene = this.scene;
    const now = scene.time.now;
    if (this.dying || now < this.invulUntil) return;

    G.hearts -= amount;
    updateHud();
    sfx.hurt();
    scene.cameras.main.shake(120, 0.004);
    // 受击镜头微缩放（冲击感）
    scene.cameras.main.zoomTo(4.18, 70, 'Sine.easeOut');
    scene.time.delayedCall(100, () => scene.cameras.main.zoomTo(4, 140));

    // 击退
    const angle = Phaser.Math.Angle.Between(sx, sy, this.x, this.y);
    this.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
    scene.time.delayedCall(140, () => { if (!this.dying) this.setVelocity(0, 0); });

    // 无敌闪烁
    this.invulUntil = now + 1000;
    this.setTint(0xff8a8a);
    scene.tweens.add({
      targets: this, alpha: 0.25, duration: 90, yoyo: true, repeat: 5,
      onComplete: () => { this.clearTint(); this.setAlpha(1); },
    });

    if (G.hearts <= 0) this.die();
  }

  die() {
    if (this.dying) return;
    this.dying = true;
    this.setVelocity(0, 0);
    sfx.die();
    this.anims.stop();
    this.setTint(0x888888);
    const scene = this.scene;
    // 塞尔达式圆形转场回村重生
    wipeTransition(() => {
      G.hearts = G.maxHearts;
      updateHud();
      scene.scene.start('Village', { spawn: 'start' });
    });
  }
}
