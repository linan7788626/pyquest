// ============================================================
// 玩家：Tiny Swords 蓝军勇士 —— 移动/挥剑攻击/受击/死亡重生
// 帧规格 192×192（本体 ~79×89，脚底在帧内 y≈136 → origin 0.71）
// ============================================================
import Phaser from 'phaser';
import { G, updateHud } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { wipeTransition } from '../ui/wipe.js';

const SCALE = 2;      // 角色图标放大一倍（192×192 帧 → 384×384 显示）
const FOOT_Y = 136; // 角色脚底在帧内的 y 坐标

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'warrior_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, FOOT_Y / 192);
    this.setScale(SCALE);
    this.body.setSize(60, 26).setOffset(66, 132);
    this.setCollideWorldBounds(true);

    this.speed = 1120;
    this.facing = 'right';
    this.invulUntil = 0;
    this.attackCdUntil = 0;
    this.attackAnimUntil = 0;
    this.dying = false;
    this.nextDust = 0;
    this.setDepth(this.y);
    this.play('ts_warrior_idle');

    // 脚下软阴影（TS 官方椭圆阴影）
    this.shadow = scene.add.image(x, y + 4, 'ts_shadow')
      .setDisplaySize(152, 76).setAlpha(0.55).setDepth(this.y - 0.5);
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
    // 攻击动画期间锁定攻击帧，否则按移动状态切换
    if (now < this.attackAnimUntil) this.anims.play('ts_warrior_attack', true);
    else this.anims.play(moving ? 'ts_warrior_run' : 'ts_warrior_idle', true);
    this.setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 4).setDepth(this.y - 0.5);

    // 跑步扬尘（TS 尘土动画）
    if (moving && now > this.nextDust) {
      this.nextDust = now + 240;
      const d = this.scene.add.sprite(this.x + Phaser.Math.Between(-20, 20), this.y + 8, 'dust')
        .setDisplaySize(200, 200).setAlpha(0.8).setDepth(this.y - 0.4);
      d.play('ts_dust');
      d.once('animationcomplete', () => d.destroy());
    }
  }

  tryAttack() {
    const scene = this.scene;
    const now = scene.time.now;
    if (this.dying || now < this.attackCdUntil) return;
    this.attackCdUntil = now + 340;
    this.attackAnimUntil = now + 280;
    sfx.swing();

    const offsets = { down: [0, 104], up: [0, -112], left: [-116, 0], right: [116, 0] };
    const [ox, oy] = offsets[this.facing];

    // 挥剑弧光
    const slash = scene.add.sprite(this.x + ox, this.y + oy - 40, 'slash_0')
      .setDisplaySize(210, 210)
      .setDepth(this.depth + 10);
    if (this.facing === 'left') slash.setFlipX(true);
    if (this.facing === 'up') slash.setRotation(-Math.PI / 2);
    if (this.facing === 'down') slash.setRotation(Math.PI / 2);
    slash.play('slash');
    slash.once('animationcomplete', () => slash.destroy());

    // 攻击判定：矩形相交检测（确定性，避免物理刚体同步问题）
    const wide = this.facing === 'left' || this.facing === 'right';
    const w = wide ? 250 : 170;
    const h = wide ? 170 : 250;
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
    scene.cameras.main.zoomTo(2.1, 70, 'Sine.easeOut');
    scene.time.delayedCall(100, () => scene.cameras.main.zoomTo(2, 140));

    // 击退
    const angle = Phaser.Math.Angle.Between(sx, sy, this.x, this.y);
    this.setVelocity(Math.cos(angle) * 1520, Math.sin(angle) * 1520);
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
