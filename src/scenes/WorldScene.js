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

    // ---------- 地面（TS tileset 拼接画布，1:1 像素完美） + 碰撞体 ----------
    const groundKey = makeGroundTexture(this, def);
    this.add.image(0, 0, groundKey).setOrigin(0, 0).setDepth(-10);

    this.physics.world.setBounds(0, 0, def.w * 64, def.h * 64);
    this.solids = this.physics.add.staticGroup();
    this.torches = [];

    // 碰撞瓦片 → 不可见静态矩形（替代 Tilemap 碰撞层）
    this.tileBodies = [];
    for (let y = 0; y < def.h; y++) {
      for (let x = 0; x < def.w; x++) {
        if (!def.colliding.includes(def.grid[y][x])) continue;
        const r = this.add.rectangle(x * 64 + 32, y * 64 + 32, 64, 64).setVisible(false);
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
    cam.setBounds(0, 0, def.w * 64, def.h * 64);
    cam.setZoom(1);
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

  /** 水面：Tiny Swords 岸边泡沫动画（16 帧循环） */
  decorateWater(def) {
    const isWater = (v) => v === T.WATER || v === T.WATER2 || v === T.WATER3;
    const waterTiles = [];
    for (let y = 0; y < def.h; y++) {
      for (let x = 0; x < def.w; x++) {
        if (!isWater(def.grid[y][x])) continue;
        waterTiles.push({ x, y });
        // 四邻若有陆地，则在该水瓦片上叠一圈泡沫动画
        const nb = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
        const nearLand = nb.some(([nx, ny]) => {
          const inside = nx >= 0 && ny >= 0 && nx < def.w && ny < def.h;
          return !inside || !isWater(def.grid[ny][nx]);
        });
        if (nearLand) {
          this.add.sprite(x * 64 + 32, y * 64 + 32, 'foam')
            .setDisplaySize(88, 88).setDepth(-6).play('ts_foam');
        }
      }
    }
    this.waterTiles = waterTiles;
  }

  /** 环境氛围粒子：村庄花粉/水波光/云影，地牢火把飞灰 */
  startAmbient() {
    const def = this.def;
    this.time.addEvent({ delay: 640, loop: true, callback: () => this.spawnAmbient() });

    if (!def.ambient) {
      // 村庄/森林：TS 云影缓缓漂过
      const keys = ['cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5'];
      for (let i = 0; i < 3; i++) {
        const c = this.add.image(
          Phaser.Math.Between(200, def.w * 64 - 200),
          Phaser.Math.Between(200, def.h * 64 - 200),
          keys[i % keys.length],
        ).setAlpha(0.32).setDepth(1500).setDisplaySize(560, 248);
        this.tweens.add({
          targets: c,
          x: c.x + Phaser.Math.Between(-500, 500),
          y: c.y + Phaser.Math.Between(-280, 280),
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
      const p = this.add.image(t.x + Phaser.Math.Between(-8, 8), t.y - 44, 'particle')
        .setTint(0xffb84d).setAlpha(0.85).setScale(3.6).setDepth(1200);
      this.tweens.add({ targets: p, y: p.y - 64, x: p.x + Phaser.Math.Between(-16, 16), alpha: 0, duration: 950, onComplete: () => p.destroy() });
      return;
    }
    // 村庄：花粉漂浮 + 水面波光
    if (this.waterTiles && Math.random() < 0.35) {
      const w = Phaser.Utils.Array.GetRandom(this.waterTiles);
      const p = this.add.image(w.x * 64 + Phaser.Math.Between(8, 56), w.y * 64 + Phaser.Math.Between(8, 56), 'particle')
        .setTint(0xeafcff).setAlpha(0.95).setScale(3.3).setDepth(-5);
      this.tweens.add({ targets: p, y: p.y - 8, alpha: 0, scale: 0.6, duration: 620, onComplete: () => p.destroy() });
      return;
    }
    const p = this.add.image(view.x + Phaser.Math.Between(40, view.width - 40), view.y + Phaser.Math.Between(40, view.height - 40), 'particle')
      .setTint(0xfff0a8).setAlpha(0.8).setScale(3.6).setDepth(1200);
    this.tweens.add({ targets: p, x: p.x + 28, y: p.y - 36, alpha: 0, duration: 2500, onComplete: () => p.destroy() });
  }

  // ---------- 道具生成 ----------
  spawnProp(p) {
    switch (p.type) {
      case 'tree': {
        // TS 树（0.5x 缩小：256 帧宽 → 128/96 显示，保持像素感）+ 风吹摆动
        const variants = [
          ['tree1', 128, 128], ['tree2', 128, 128], ['tree3', 128, 96], ['tree4', 128, 96],
        ];
        const [tex, w, h] = variants[Phaser.Math.Between(0, 3)];
        const t = this.add.sprite(p.x, p.y + h * 0.32, tex).setOrigin(0.5, 0.92).setDisplaySize(w, h);
        t.play(`ts_${tex}`);
        this.solids.add(t);
        t.body.setSize(52, 30).setOffset((w - 52) / 2, h - 36);
        t.setDepth(p.y + 4);
        break;
      }
      case 'house': {
        // TS 蓝顶民居（128×192 原尺寸）
        const tex = ['house1', 'house2', 'house3'][Phaser.Math.Between(0, 2)];
        const h = this.add.image(p.x, p.y + 40, tex).setOrigin(0.5, 1);
        this.solids.add(h);
        h.body.setSize(128, 96).setOffset(0, 96);
        h.setDepth(p.y);
        break;
      }
      case 'npc': {
        if (p.id === 'tablet') {
          // 函数石碑（程序化贴图）+ 符文光晕
          const e = this.add.image(p.x, p.y, 'tablet').setOrigin(0.5, 0.92).setDisplaySize(120, 138);
          e.setDepth(p.y);
          const aura = this.add.image(p.x, p.y - 24, 'particle')
            .setTint(0x3ddad7).setAlpha(0.18).setScale(20).setDepth(p.y - 0.5);
          this.tweens.add({ targets: aura, alpha: 0.3, scale: 26, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
          this.npc = { x: p.x, y: p.y, id: p.id, sprite: e };
        } else {
          // 长老：TS 蓝军僧侣（1:1 原尺寸，idle 动画）
          const e = this.add.sprite(p.x, p.y + 36, 'monk_idle').setOrigin(0.5, 136 / 192);
          e.play('ts_monk_idle');
          e.setDepth(p.y);
          this.add.image(p.x, p.y + 38, 'ts_shadow').setDisplaySize(64, 32).setAlpha(0.5).setDepth(p.y - 1);
          this.npc = { x: p.x, y: p.y, id: p.id, sprite: e };
        }
        break;
      }
      case 'rune': {
        const s = this.add.image(p.x, p.y, 'rune').setOrigin(0.5, 0.92).setDisplaySize(120, 126);
        s.setDepth(p.y);
        this.add.image(p.x, p.y + 2, 'ts_shadow').setDisplaySize(88, 44).setAlpha(0.5).setDepth(p.y - 1);
        const it = {
          kind: 'rune', x: p.x, y: p.y, qid: p.qid,
          bossRune: !!p.bossRune, healRune: !!p.healRune, sprite: s, alive: true,
        };
        if (G.answered.has(p.qid)) {
          it.alive = false;
          s.setTexture('rune_cracked');
        } else {
          // 光晕呼吸 + 石碑本体轻微起伏（幅度控制在 ±1.5% 内，几乎察觉不到跳动）
          const aura = this.add.image(p.x, p.y - 44, 'particle')
            .setTint(0x3ddad7).setAlpha(0.2).setScale(22).setDepth(p.y - 0.5);
          this.tweens.add({ targets: aura, alpha: 0.32, scale: 26, duration: 1400, yoyo: true, repeat: -1, ease: 'sine.inout' });
          this.tweens.add({
            targets: s, scaleX: s.scaleX * 1.015, scaleY: s.scaleY * 0.985,
            duration: 1600, yoyo: true, repeat: -1, ease: 'sine.inout',
          });
        }
        this.interactables.push(it);
        break;
      }
      case 'gate': {
        // 程序化石门（TS 尺度 ×3 = 192）
        const g = this.add.image(p.x, p.y, G.gateOpen ? 'gate_open' : 'gate_closed').setDisplaySize(192, 192);
        g.setDepth(p.y + 16);
        this.gate = { x: p.x, y: p.y, sprite: g };
        if (!G.gateOpen) {
          this.solids.add(g);
          g.body.setSize(180, 170).setOffset(6, 10);
        }
        break;
      }
      case 'torch': {
        // 程序化火炬柱 + TS 火焰动画
        const t = this.add.image(p.x, p.y + 40, 'torch_0').setOrigin(0.5, 0.9).setDisplaySize(56, 112);
        t.setDepth(p.y - 6);
        this.torches.push({ x: p.x, y: p.y });
        const fire = this.add.sprite(p.x, p.y - 30, 'fire').setDisplaySize(72, 72).setDepth(p.y - 5);
        fire.play('ts_fire');
        const glow = this.add.image(p.x, p.y - 30, 'particle')
          .setScale(20).setAlpha(0.16).setTint(0xffb84d).setDepth(p.y - 7);
        this.tweens.add({ targets: glow, alpha: 0.26, scale: 24, duration: 520, yoyo: true, repeat: -1 });
        break;
      }
      case 'bush': {
        // TS 灌木（风吹摆动）
        const tex = `bush${Phaser.Math.Between(1, 4)}`;
        const b = this.add.sprite(p.x, p.y + 40, tex).setOrigin(0.5, 0.92).setDisplaySize(64, 64);
        b.play(`ts_${tex}`);
        b.setDepth(p.y - 0.5);
        break;
      }
      case 'crystal': {
        const c = this.add.image(p.x, p.y, 'crystal').setOrigin(0.5, 0.95).setDisplaySize(88, 99);
        c.setDepth(p.y);
        this.solids.add(c);
        c.body.setSize(60, 34).setOffset(14, 58); // 底座（显示 88×99）
        this.add.image(p.x, p.y + 2, 'ts_shadow').setDisplaySize(80, 40).setAlpha(0.45).setDepth(p.y - 1);
        // 晶体微光
        const glow = this.add.image(p.x, p.y - 34, 'particle')
          .setScale(15).setAlpha(0.1).setTint(0x57d9d0).setDepth(p.y - 0.6);
        this.tweens.add({ targets: glow, alpha: 0.2, scale: 17, duration: 1100, yoyo: true, repeat: -1, ease: 'sine.inout' });
        break;
      }
      case 'shroom': {
        const s = this.add.image(p.x, p.y, 'shroom').setOrigin(0.5, 0.9).setDisplaySize(56, 56).setDepth(p.y - 0.4);
        this.tweens.add({ targets: s, alpha: 0.72, duration: 1300, yoyo: true, repeat: -1, ease: 'sine.inout' });
        break;
      }
      case 'door': {
        const d = this.add.image(p.x, p.y + 24, 'portal_door').setOrigin(0.5, 1).setDisplaySize(150, 150);
        d.setDepth(p.y - 1);
        const aura = this.add.image(p.x, p.y - 36, 'particle')
          .setTint(0x3ddad7).setAlpha(0.16).setScale(18).setDepth(p.y - 2);
        this.tweens.add({ targets: aura, alpha: 0.28, scale: 21, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
        break;
      }
      case 'doorlink': {
        // 带封印状态的传送门：locked 时有实体阻挡 + 可按 E 检查（子类可覆写 onDoorLocked 解锁）
        const locked = !!(p.requires && !G[p.requires]);
        const d = this.add.image(p.x, p.y + 24, 'portal_door').setOrigin(0.5, 1).setDisplaySize(150, 150);
        d.setDepth(p.y + 4);
        const it = { kind: 'doorlink', x: p.x, y: p.y, locked, prop: p, sprite: d, alive: true };
        if (locked) {
          d.setTint(0x8a8496);
          const body = this.add.rectangle(p.x, p.y - 40, 110, 80).setVisible(false);
          this.physics.add.existing(body, true);
          this.tileBodies.push(body);
          it.body = body;
        } else {
          const aura = this.add.image(p.x, p.y - 36, 'particle')
            .setTint(0x3ddad7).setAlpha(0.16).setScale(18).setDepth(p.y - 2);
          this.tweens.add({ targets: aura, alpha: 0.3, scale: 21, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
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

    if (this.npc && dist(this.npc.x, this.npc.y) < 150) {
      this.talkToElder();
      return;
    }
    for (const it of this.interactables) {
      if (it.kind === 'rune' && dist(it.x, it.y) < 130) {
        if (!it.alive) { this.floatText(it.x, it.y - 150, '咒语已领悟 ✓', '#3ddad7'); return; }
        this.openRuneQuiz(it);
        return;
      }
      if (it.kind === 'doorlink' && it.locked && dist(it.x, it.y) < 140) {
        this.onDoorLocked(it);
        return;
      }
    }
    if (this.gate && !G.gateOpen && dist(this.gate.x, this.gate.y + 70) < 170) {
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
          this.floatText(it.x, it.y - 150, '+1 ❤ 符文祝福', '#ff8aa0');
          this.spawnShardFx(it.x, it.y - 44, 0xff8aa0);
        } else {
          addShards(1);
          const label = G.ch1Done ? '函数碎片' : '代码碎片';
          this.floatText(it.x, it.y - 150, `+1 ${label}`, '#ffd257');
          this.spawnShardFx(it.x, it.y - 44);
        }
      },
    });
  }

  spawnShardFx(x, y, tint = 0xffd257) {
    for (let i = 0; i < 14; i++) {
      const p = this.add.image(x, y, 'particle').setTint(tint).setDepth(1900).setScale(5);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-140, 140),
        y: y - Phaser.Math.Between(40, 200),
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
      this.floatText(this.gate.x, this.gate.y + 90, '轰隆—— 石门打开了！', '#ffd257');
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
      this.floatText(this.player.x, this.player.y - 80, p.lockHint || '被魔法封印着……', '#9fb8ff');
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
      fontSize: '34px', color,
      stroke: '#4a3b32', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({ targets: t, y: y - 110, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  spawnHeartDrop(x, y) {
    const h = this.physics.add.staticImage(x, y, 'heart_full')
      .setDisplaySize(58, 50).setDepth(1500);
    this.tweens.add({ targets: h, y: h.y - 16, duration: 520, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, h, () => {
      if (G.hearts >= G.maxHearts) { this.floatText(h.x, h.y - 50, '生命已满', '#9fb8ff'); return; }
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

    if (this.npc && dist(this.npc.x, this.npc.y) < 150) {
      hint = this.npc.id === 'elder' ? '按 <kbd>E</kbd> 与长老对话' : '按 <kbd>E</kbd> 阅读石碑';
    } else {
      for (const it of this.interactables) {
        if (it.kind === 'rune' && dist(it.x, it.y) < 130) {
          hint = it.alive ? '按 <kbd>E</kbd> 解读符文石' : null;
          break;
        }
        if (it.kind === 'doorlink' && it.locked && dist(it.x, it.y) < 140) {
          hint = `按 <kbd>E</kbd> 检查${it.prop.label || '封印之门'}`;
          break;
        }
      }
    }
    if (!hint && this.gate && !G.gateOpen && dist(this.gate.x, this.gate.y + 70) < 170) {
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
