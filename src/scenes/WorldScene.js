// ============================================================
// WorldScene：世界场景基类
// 负责：瓦片地图构建、道具生成、玩家/史莱姆、攻击判定、
//       交互系统（符文石/NPC/石门）、传送门、HUD 与 UI
// ============================================================
import Phaser from 'phaser';
import { G, updateHud, healHearts, addShards, markRuneSolved } from '../core/state.js';
import { Player } from '../entities/Player.js';
import { Slime } from '../entities/Slime.js';
import { BossSlime } from '../entities/BossSlime.js';
import { BossSnake } from '../entities/BossSnake.js';
import { HUD } from '../ui/HUD.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { QuizOverlay } from '../ui/QuizOverlay.js';
import { pickQuestion } from '../data/quizData.js';
import { saveGame } from '../core/save.js';
import { sfx } from '../audio/sfx.js';
import { wipeTransition } from '../ui/wipe.js';
import { T } from '../data/maps.js';
import { makeGroundTexture } from '../textures/ground.js';

export class WorldScene extends Phaser.Scene {
  constructor(key) { super(key); }

  create() {
    // 场景重启（死亡重生/传送回来）会复用实例，必须重置瞬态标记
    this.transitioning = false;

    const def = this.mapDef;
    this.def = def;

    // ---------- 地面（整图高清画布） + 碰撞体 ----------
    const groundKey = makeGroundTexture(this, def);
    this.add.image(0, 0, groundKey).setOrigin(0, 0)
      .setDisplaySize(def.w * 16, def.h * 16) // 4x 超采样画布 → 逻辑尺寸
      .setDepth(-10);

    this.physics.world.setBounds(0, 0, def.w * 16, def.h * 16);
    this.solids = this.physics.add.staticGroup();
    this.torches = [];

    // 碰撞瓦片 → 不可见静态矩形（替代 Tilemap 碰撞层）
    this.tileBodies = [];
    for (let y = 0; y < def.h; y++) {
      for (let x = 0; x < def.w; x++) {
        if (!def.colliding.includes(def.grid[y][x])) continue;
        const r = this.add.rectangle(x * 16 + 8, y * 16 + 8, 16, 16).setVisible(false);
        this.physics.add.existing(r, true);
        this.tileBodies.push(r);
      }
    }

    this.decorateWater(def);

    // ---------- 玩家 ----------
    const spawn = def.spawns[this.spawnKey] || Object.values(def.spawns)[0];
    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, this.tileBodies);
    this.physics.add.collider(this.player, this.solids);

    // ---------- 道具 ----------
    this.interactables = [];
    this.npc = null;
    this.gate = null;
    def.props.forEach((p) => this.spawnProp(p));

    // ---------- 史莱姆 ----------
    this.slimeGroup = this.physics.add.group();
    (def.slimes || []).forEach((s) => this.slimeGroup.add(new Slime(this, s.x, s.y, s.variant)));
    this.physics.add.collider(this.slimeGroup, this.tileBodies);
    this.physics.add.collider(this.slimeGroup, this.solids);
    this.physics.add.collider(this.slimeGroup, this.slimeGroup);
    this.physics.add.overlap(this.player, this.slimeGroup, (pl, s) => {
      if (!s.dead) pl.takeDamage(1, s.x, s.y);
    });
    if (def.boss) {
      this.boss = def.boss.type === 'snake'
        ? new BossSnake(this, def.boss.x, def.boss.y)
        : new BossSlime(this, def.boss.x, def.boss.y);
      this.slimeGroup.add(this.boss);
      this.physics.add.collider(this.player, this.boss);
    }

    // ---------- 攻击判定 ----------
    // Player.tryAttack 计算攻击矩形后调用 applyAttack（见下）

    // ---------- 相机 ----------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, def.w * 16, def.h * 16);
    cam.setZoom(4);
    cam.startFollow(this.player, true, 0.12, 0.12);
    if (def.ambient) cam.setBackgroundColor(def.ambient);

    // ---------- UI ----------
    this.hud = new HUD();
    this.hud.show();
    this.dialogue = new DialogueBox(this);
    this.quiz = new QuizOverlay(this);
    // 场景关闭时移除 DOM 监听，防止场景重启后监听器泄漏
    this.events.once('shutdown', () => {
      this.dialogue && this.dialogue.destroy();
      this.quiz && this.quiz.destroy();
    });

    // ---------- 传送门 ----------
    (def.portals || []).forEach((p) => {
      const zone = this.add.zone(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2, p.rect.w, p.rect.h);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => this.usePortal(p));
    });

    // ---------- 输入 ----------
    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D', e: 'E', j: 'J', m: 'M',
    });
    this.input.keyboard.on('keydown-E', () => this.tryInteract());
    this.input.keyboard.on('keydown-J', () => this.player.tryAttack());
    this.input.keyboard.on('keydown-SPACE', () => this.player.tryAttack());
    this.input.keyboard.on('keydown-M', () => {
      const muted = sfx.toggleMute();
      this.hud.hint(muted ? '🔇 已静音（按 M 恢复）' : '🔊 声音已开启');
      this.time.delayedCall(1400, () => this.hud.hint(null));
    });

    updateHud();
    this.startAmbient();
    this.onSceneCreated && this.onSceneCreated();
  }

  /** 水面：岸边泡沫 + 波浪动画（独立帧图片循环） */
  decorateWater(def) {
    const isWater = (v) => v === T.WATER || v === T.WATER2 || v === T.WATER3;
    const waterTiles = [];
    for (let y = 0; y < def.h; y++) {
      for (let x = 0; x < def.w; x++) {
        if (!isWater(def.grid[y][x])) continue;
        waterTiles.push({ x, y });
        // 四邻若是陆地，则在水瓦片靠岸一侧铺泡沫
        const nb = [
          ['foam_n', x, y - 1], ['foam_s', x, y + 1],
          ['foam_w', x - 1, y], ['foam_e', x + 1, y],
        ];
        nb.forEach(([tex, nx, ny]) => {
          const inside = nx >= 0 && ny >= 0 && nx < def.w && ny < def.h;
          if (inside && !isWater(def.grid[ny][nx])) {
            this.add.image(x * 16 + 8, y * 16 + 8, tex).setDisplaySize(16, 16).setDepth(-6);
          }
        });
      }
    }
    // 波浪动画（3 帧贴图循环）
    if (waterTiles.length) {
      this.waterImgs = waterTiles.map(({ x, y }) => this.add.image(x * 16 + 8, y * 16 + 8, 'water_0')
        .setDisplaySize(16.5, 16.5).setDepth(-8));
      const seq = [0, 1, 2, 1];
      let f = 0;
      this.time.addEvent({
        delay: 480, loop: true,
        callback: () => {
          f = (f + 1) % seq.length;
          this.waterImgs.forEach((im) => im.setTexture(`water_${seq[f]}`));
        },
      });
      this.waterTiles = waterTiles;
    }
  }

  /** 环境氛围粒子：村庄花粉/水波光/云影，地牢火把飞灰 */
  startAmbient() {
    const def = this.def;
    this.time.addEvent({ delay: 640, loop: true, callback: () => this.spawnAmbient() });

    if (!def.ambient) {
      // 村庄：云影缓缓漂过
      for (let i = 0; i < 3; i++) {
        const c = this.add.image(
          Phaser.Math.Between(60, def.w * 16 - 60),
          Phaser.Math.Between(60, def.h * 16 - 60),
          'cloudshadow',
        ).setAlpha(0.34).setDepth(1500).setScale(Phaser.Math.FloatBetween(1.8, 2.8));
        this.tweens.add({
          targets: c,
          x: c.x + Phaser.Math.Between(-130, 130),
          y: c.y + Phaser.Math.Between(-70, 70),
          duration: Phaser.Math.Between(26000, 42000),
          yoyo: true, repeat: -1, ease: 'sine.inout',
        });
      }
    }
  }

  spawnAmbient() {
    const def = this.def;
    const view = this.cameras.main.worldView;
    if (def.ambient) {
      // 地牢：火把飞灰
      if (!this.torches.length) return;
      const t = Phaser.Utils.Array.GetRandom(this.torches);
      const p = this.add.image(t.x + Phaser.Math.Between(-2, 2), t.y - 10, 'particle')
        .setTint(0xffb84d).setAlpha(0.85).setScale(1.2).setDepth(1200);
      this.tweens.add({ targets: p, y: p.y - 16, x: p.x + Phaser.Math.Between(-4, 4), alpha: 0, duration: 950, onComplete: () => p.destroy() });
      return;
    }
    // 村庄：花粉漂浮 + 水面波光
    if (this.waterTiles && Math.random() < 0.35) {
      const w = Phaser.Utils.Array.GetRandom(this.waterTiles);
      const p = this.add.image(w.x * 16 + Phaser.Math.Between(2, 14), w.y * 16 + Phaser.Math.Between(2, 14), 'particle')
        .setTint(0xeafcff).setAlpha(0.95).setScale(1.1).setDepth(-5);
      this.tweens.add({ targets: p, y: p.y - 2, alpha: 0, scale: 0.2, duration: 620, onComplete: () => p.destroy() });
      return;
    }
    const p = this.add.image(view.x + Phaser.Math.Between(10, view.width - 10), view.y + Phaser.Math.Between(10, view.height - 10), 'particle')
      .setTint(0xfff0a8).setAlpha(0.8).setScale(1.2).setDepth(1200);
    this.tweens.add({ targets: p, x: p.x + 7, y: p.y - 9, alpha: 0, duration: 2500, onComplete: () => p.destroy() });
  }

  // ---------- 道具生成 ----------
  spawnProp(p) {
    switch (p.type) {
      case 'tree': {
        const t = this.add.image(p.x, p.y, 'tree').setDisplaySize(40, 40);
        this.solids.add(t);
        t.body.setSize(24, 16).setOffset(8, 15);
        t.setDepth(p.y + 4);
        this.add.image(p.x, p.y + 5, 'shadow').setScale(2.8).setAlpha(0.5).setDepth(p.y + 3);
        break;
      }
      case 'house': {
        const h = this.add.image(p.x, p.y, 'house').setOrigin(0.5, 1).setDisplaySize(128, 112);
        this.solids.add(h);
        h.body.setSize(128, 52).setOffset(0, 60);
        h.setDepth(p.y);
        this.add.image(p.x, p.y - 3, 'shadow').setScale(8.8, 3.4).setAlpha(0.45).setDepth(p.y - 1);        break;
      }
      case 'npc': {
        const big = p.id === 'tablet' ? [40, 46] : [32, 32];
        const e = this.add.image(p.x, p.y, p.tex || 'elder').setOrigin(0.5, 0.9).setDisplaySize(big[0], big[1]);
        e.setDepth(p.y);
        this.add.image(p.x, p.y + 1, 'shadow').setScale(1.5).setAlpha(0.5).setDepth(p.y - 1);
        this.tweens.add({ targets: e, y: p.y - 1.5, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
        this.npc = { x: p.x, y: p.y, id: p.id, sprite: e };
        break;
      }
      case 'rune': {
        const s = this.add.image(p.x, p.y, 'rune').setOrigin(0.5, 0.92).setDisplaySize(40, 42);
        s.setDepth(p.y);
        this.add.image(p.x, p.y + 1, 'shadow').setScale(2.8).setAlpha(0.5).setDepth(p.y - 1);
        const it = {
          kind: 'rune', x: p.x, y: p.y, qid: p.qid,
          bossRune: !!p.bossRune, healRune: !!p.healRune, sprite: s, alive: true,
        };
        if (G.answered.has(p.qid)) {
          it.alive = false;
          s.setTexture('rune_cracked');
        } else {
          // 光晕 + 呼吸
          const aura = this.add.image(p.x, p.y - 14, 'particle')
            .setTint(0x3ddad7).setAlpha(0.2).setScale(7.5).setDepth(p.y - 0.5);
          this.tweens.add({ targets: aura, alpha: 0.32, scale: 8.5, duration: 780, yoyo: true, repeat: -1, ease: 'sine.inout' });
          this.tweens.add({ targets: s, scale: 0.6, duration: 800, yoyo: true, repeat: -1 });
        }
        this.interactables.push(it);
        break;
      }
      case 'gate': {
        const g = this.add.image(p.x, p.y, G.gateOpen ? 'gate_open' : 'gate_closed').setDisplaySize(64, 64);
        g.setDepth(p.y + 16);
        this.gate = { x: p.x, y: p.y, sprite: g };
        if (!G.gateOpen) {
          this.solids.add(g);
          g.body.setSize(64, 64);
        }
        break;
      }
      case 'torch': {
        const t = this.add.sprite(p.x, p.y, 'torch_0').setOrigin(0.5, 0.9).setDisplaySize(16, 32);
        t.play('torch_burn');
        t.setDepth(p.y - 6);
        this.torches.push({ x: p.x, y: p.y });
        const glow = this.add.image(p.x, p.y - 14, 'particle')
          .setScale(7).setAlpha(0.16).setTint(0xffb84d).setDepth(p.y - 7);
        this.tweens.add({ targets: glow, alpha: 0.26, scale: 7.8, duration: 520, yoyo: true, repeat: -1 });
        break;
      }
      case 'bush': {
        this.add.image(p.x, p.y, 'bush').setOrigin(0.5, 0.9).setDisplaySize(30, 22).setDepth(p.y - 0.5);
        break;
      }
      case 'crystal': {
        const c = this.add.image(p.x, p.y, 'crystal').setOrigin(0.5, 0.95).setDisplaySize(32, 36);
        c.setDepth(p.y);
        this.solids.add(c);
        c.body.setSize(22, 12).setOffset(5, 20);
        this.add.image(p.x, p.y + 1, 'shadow').setScale(2.6).setAlpha(0.45).setDepth(p.y - 1);
        // 晶体微光
        const glow = this.add.image(p.x, p.y - 12, 'particle')
          .setScale(5.5).setAlpha(0.1).setTint(0x57d9d0).setDepth(p.y - 0.6);
        this.tweens.add({ targets: glow, alpha: 0.2, scale: 6, duration: 1100, yoyo: true, repeat: -1, ease: 'sine.inout' });
        break;
      }
      case 'shroom': {
        const s = this.add.image(p.x, p.y, 'shroom').setOrigin(0.5, 0.9).setDisplaySize(20, 20).setDepth(p.y - 0.4);
        this.tweens.add({ targets: s, alpha: 0.72, duration: 1300, yoyo: true, repeat: -1, ease: 'sine.inout' });
        break;
      }
      case 'door': {
        const d = this.add.image(p.x, p.y, 'portal_door').setOrigin(0.5, 1).setDisplaySize(48, 48);
        d.setDepth(p.y - 1);
        const aura = this.add.image(p.x, p.y - 20, 'particle')
          .setTint(0x3ddad7).setAlpha(0.16).setScale(6).setDepth(p.y - 2);
        this.tweens.add({ targets: aura, alpha: 0.28, scale: 7, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
        break;
      }
      case 'doorlink': {
        // 带封印状态的传送门：locked 时有实体阻挡 + 可按 E 检查（子类可覆写 onDoorLocked 解锁）
        const locked = !!(p.requires && !G[p.requires]);
        const d = this.add.image(p.x, p.y, 'portal_door').setOrigin(0.5, 1).setDisplaySize(48, 48);
        d.setDepth(p.y + 4);
        const it = { kind: 'doorlink', x: p.x, y: p.y, locked, prop: p, sprite: d, alive: true };
        if (locked) {
          d.setTint(0x8a8496);
          const body = this.add.rectangle(p.x, p.y - 14, 34, 24).setVisible(false);
          this.physics.add.existing(body, true);
          this.tileBodies.push(body);
          it.body = body;
        } else {
          const aura = this.add.image(p.x, p.y - 20, 'particle')
            .setTint(0x3ddad7).setAlpha(0.16).setScale(6).setDepth(p.y - 2);
          this.tweens.add({ targets: aura, alpha: 0.3, scale: 7, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
        }
        this.interactables.push(it);
        break;
      }
      default: break;
    }
  }

  // ---------- 交互 ----------
  tryInteract() {
    if (this.quiz.isOpen || this.dialogue.isOpen || this.player.dying) return;
    const px = this.player.x, py = this.player.y;
    const dist = (x, y) => Phaser.Math.Distance.Between(px, py, x, y);

    if (this.npc && dist(this.npc.x, this.npc.y) < 36) {
      this.talkToElder();
      return;
    }
    for (const it of this.interactables) {
      if (it.kind === 'rune' && dist(it.x, it.y) < 30) {
        if (!it.alive) { this.floatText(it.x, it.y - 40, '咒语已领悟 ✓', '#3ddad7'); return; }
        this.openRuneQuiz(it);
        return;
      }
      if (it.kind === 'doorlink' && it.locked && dist(it.x, it.y) < 34) {
        this.onDoorLocked(it);
        return;
      }
    }
    if (this.gate && !G.gateOpen && dist(this.gate.x, this.gate.y + 20) < 42) {
      this.tryOpenGate();
    }
  }

  openRuneQuiz(it) {
    const q = pickQuestion(it.qid); // 同难度题池随机抽题（答对前固定不变）
    saveGame(); // 抽中的题目绑定到这块符文石，立即存档
    this.quiz.open(q, {
      onCorrect: () => {
        markRuneSolved(it.qid, q.id); // 槽位破解 + 题目记为已用
        it.alive = false;
        it.sprite.setTexture('rune_cracked');
        sfx.pickup();
        if (it.bossRune) {
          this.breakBossShield();
        } else if (it.healRune) {
          // 祝福符文：不产碎片，答对回复 1 颗心
          healHearts(1);
          sfx.heal();
          this.floatText(it.x, it.y - 40, '+1 ❤ 符文祝福', '#ff8aa0');
          this.spawnShardFx(it.x, it.y - 14, 0xff8aa0);
        } else {
          addShards(1);
          const label = G.ch1Done ? '函数碎片' : '代码碎片';
          this.floatText(it.x, it.y - 40, `+1 ${label}`, '#ffd257');
          this.spawnShardFx(it.x, it.y - 14);
        }
      },
    });
  }

  spawnShardFx(x, y, tint = 0xffd257) {
    for (let i = 0; i < 14; i++) {
      const p = this.add.image(x, y, 'particle').setTint(tint).setDepth(1900).setScale(1.8);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-36, 36),
        y: y - Phaser.Math.Between(10, 52),
        alpha: 0, duration: 650,
        onComplete: () => p.destroy(),
      });
    }
  }

  tryOpenGate() {
    if (G.shards >= G.shardsNeeded) {
      G.gateOpen = true;
      sfx.openGate();
      this.gate.sprite.setTexture('gate_open');
      if (this.gate.sprite.body) this.gate.sprite.body.enable = false;
      updateHud();
      this.cameras.main.shake(240, 0.004);
      this.floatText(this.gate.x, this.gate.y + 26, '轰隆—— 石门打开了！', '#ffd257');
    } else {
      this.dialogue.say({
        name: '石门',
        lines: [
          `石门上刻着一行小字：「以 ${G.shardsNeeded} 枚代码碎片作为钥匙」。`,
          `（当前碎片 ${G.shards} / ${G.shardsNeeded}，去找村庄里的符文石答题吧）`,
        ],
      });
    }
  }

  usePortal(p) {
    if (this.transitioning || this.player.dying) return;
    // 封印中的传送门：提示但不传送
    if (p.requires && !G[p.requires]) {
      const now = this.time.now;
      if (now < (p._lockCd || 0)) return;
      p._lockCd = now + 1500;
      sfx.hitEnemy();
      this.floatText(this.player.x, this.player.y - 22, p.lockHint || '被魔法封印着……', '#9fb8ff');
      return;
    }
    this.transitioning = true;
    this.player.setVelocity(0, 0);
    // 传送期间免疫伤害，避免死亡与传送竞态
    this.player.invulUntil = Number.MAX_SAFE_INTEGER;
    // 塞尔达式圆形揭示转场
    wipeTransition(() => this.scene.start(p.to, { spawn: p.spawn }));
  }

  // ---------- 通用工具 ----------
  floatText(x, y, text, color = '#ffffff') {
    const t = this.add.text(x, y, text, {
      fontFamily: '"ZCOOL KuaiLe","PingFang SC",sans-serif',
      fontSize: '16px', color,
      stroke: '#4a3b32', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  spawnHeartDrop(x, y) {
    const h = this.physics.add.staticImage(x, y, 'heart_full')
      .setDisplaySize(15, 13).setDepth(1500);
    this.tweens.add({ targets: h, y: h.y - 4, duration: 520, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, h, () => {
      if (G.hearts >= G.maxHearts) { this.floatText(h.x, h.y - 14, '生命已满', '#9fb8ff'); return; }
      healHearts(1);
      sfx.heal();
      h.destroy();
    });
  }

  spawnSlime(x, y) {
    this.slimeGroup.add(new Slime(this, x, y));
  }

  /** 挥剑命中判定：攻击矩形与所有史莱姆包围盒相交即造成伤害 */
  applyAttack(rect) {
    this.slimeGroup.children.iterate((s) => {
      if (!s || !s.active || s.dead) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, s.getBounds())) {
        s.hurt(1, this.player.x, this.player.y);
      }
    });
  }

  // ---------- 每帧 ----------
  update() {
    this.player.update(this.keys);
    this.slimeGroup.children.iterate((s) => { if (s && s.update && s.active) s.update(); });
    this.updateInteractHint();
  }

  updateInteractHint() {
    const px = this.player.x, py = this.player.y;
    const dist = (x, y) => Phaser.Math.Distance.Between(px, py, x, y);
    let hint = null;

    if (this.npc && dist(this.npc.x, this.npc.y) < 36) {
      hint = this.npc.id === 'elder' ? '按 <kbd>E</kbd> 与长老对话' : '按 <kbd>E</kbd> 阅读石碑';
    } else {
      for (const it of this.interactables) {
        if (it.kind === 'rune' && dist(it.x, it.y) < 30) {
          hint = it.alive ? '按 <kbd>E</kbd> 解读符文石' : null;
          break;
        }
        if (it.kind === 'doorlink' && it.locked && dist(it.x, it.y) < 34) {
          hint = `按 <kbd>E</kbd> 检查${it.prop.label || '封印之门'}`;
          break;
        }
      }
    }
    if (!hint && this.gate && !G.gateOpen && dist(this.gate.x, this.gate.y + 20) < 42) {
      hint = '按 <kbd>E</kbd> 检查石门';
    }
    this.hud.hint(hint);
  }

  // ---------- 子类可覆写的钩子 ----------
  talkToElder() {}
  breakBossShield() {}
  onBossDefeated() {}
  onSceneCreated() {}
  /** 封印之门被检查时触发（如：函数之森里集齐碎片即可当场解锁） */
  onDoorLocked(it) {
    this.dialogue.say({
      name: it.prop.label || '封印之门',
      lines: it.prop.lockLines || ['一道魔法封印挡住了去路……'],
    });
  }
}
