// ============================================================
// 世界地图（全局关卡地图）：Tab 呼出 / 关闭
// - 八章路径节点：周次、世界名、碎片进度、通关状态、当前位置 📍
// - 解锁规则与传送门一致：通关前一章节即解锁，点击节点快速传送
//   到该章野外（塞尔达式圆形转场）
// ============================================================
import { G, cp } from '../core/state.js';
import { CHAPTERS } from '../data/chapters.js';
import { sfx } from '../audio/sfx.js';
import { wipeTransition } from './wipe.js';

export class WorldMap {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.backdrop = document.getElementById('map-backdrop');
    this.pathEl = document.getElementById('map-path');
    this.subEl = document.getElementById('map-sub');

    this._keyHandler = (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      this.toggle();
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    const s = this.scene;
    // 答题 / 对话 / 转场 / 濒死期间不打开
    if (s.quiz && s.quiz.isOpen) return;
    if (s.dialogue && s.dialogue.isOpen) return;
    if (s.transitioning) return;
    if (s.player && s.player.dying) return;

    this.isOpen = true;
    s.scene.pause();
    this.render();
    this.backdrop.classList.add('show');
    sfx.talk();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.backdrop.classList.remove('show');
    this.scene.scene.resume();
  }

  /** 章节解锁规则：第 1 章常开，其余需前一章节通关 */
  unlocked(id) {
    if (id === 1) return true;
    return cp(id - 1).done;
  }

  render() {
    const doneCount = CHAPTERS.filter((c) => cp(c.id).done).length;
    this.subEl.innerHTML = `P4A 八周旅程 · 已通关 <b>${doneCount} / ${CHAPTERS.length}</b> · <b>Tab</b> 关闭`;

    this.pathEl.innerHTML = '';
    CHAPTERS.forEach((ch) => {
      const p = cp(ch.id);
      const unlocked = this.unlocked(ch.id);
      const here = G.current === ch.id;
      const classes = ['map-node'];
      if (!unlocked) classes.push('locked');
      if (p.done) classes.push('done');
      if (here) classes.push('here');
      const badge = !unlocked ? '🔒' : (p.done ? '✓' : (here ? '📍' : ''));
      const status = !unlocked
        ? { cls: 'locked', text: '通关前一章节解锁' }
        : p.done
          ? { cls: 'done', text: `已通关 · 碎片 ${p.shards}/${p.shardsNeeded}` }
          : { cls: '', text: `${ch.bossName}待挑战 · 碎片 ${p.shards}/${p.shardsNeeded}` };

      const btn = document.createElement('button');
      btn.className = classes.join(' ');
      btn.dataset.id = ch.id;
      btn.innerHTML = `
        <div class="mn-top"><span>Week ${ch.week}</span><span class="mn-badge">${badge}</span></div>
        <div class="mn-name">${ch.title}</div>
        <div class="mn-world">${ch.fieldName} → ${ch.lairName}</div>
        <div class="mn-status ${status.cls}">${status.text}</div>`;
      if (unlocked) btn.addEventListener('click', () => this.travel(ch));
      this.pathEl.appendChild(btn);
    });
  }

  /** 快速传送到章节野外（圆形转场 + 传送期间免伤） */
  travel(ch) {
    if (!this.isOpen) return;
    const s = this.scene;
    this.close();
    if (s.transitioning || s.player.dying) return;
    s.transitioning = true;
    s.player.setVelocity(0, 0);
    s.player.invulUntil = Number.MAX_SAFE_INTEGER;
    sfx.openGate();
    wipeTransition(() => s.scene.start(ch.fieldKey, { spawn: ch.id === 1 ? 'start' : 'fromPrev' }));
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
  }
}
