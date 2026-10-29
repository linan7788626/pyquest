// ============================================================
// HUD：生命值（爱心）、代码碎片计数、当前目标提示
// ============================================================
import { G, chapterShards, cp } from '../core/state.js';
import { phaseOf, PHASE } from '../core/phase.js';
import { CHAPTERS, getChapter } from '../data/chapters.js';
import { L, t } from '../core/i18n.js';
import { ICON } from './icons.js';

// 保持 SVG 外壳、尺寸与 #hearts svg 测试契约；内嵌 NLI 平滑 PNG。
const SVG_HEART = (state) => `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <image href="/nli-preview/ui_heart_${state}.png" width="64" height="64"/>
  </svg>`;

export const SVG_SHARD = `
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <image href="/nli-preview/ui_shard.png" width="64" height="64"/>
  </svg>`;

function heartState(i) {
  // 每颗心代表 2 点生命（G.hearts 为心数，这里简化：直接按颗数渲染）
  return i < G.hearts ? 'full' : 'empty';
}

export class HUD {
  constructor() {
    this.root = document.getElementById('hud-top');
    this.heartsEl = document.getElementById('hearts');
    this.shardEl = document.getElementById('shard-count');
    this.objectiveEl = document.getElementById('objective');
    this.hintEl = document.getElementById('hint');
    this._lastShards = null; // 场景重启后首次 render 不误播碎片 gain 弹跳
    this._lastHearts = null; // 同上：首次 render 不误播扣心红闪
    this._hurtT = 0;
    this._flightGained = 0;  // 「碎片入袋」飞行中：暂扣的碎片数（视觉延后跳变）
    this._flightT = 0;
    this._onHud = () => this.render();
    this._onFlight = (e) => this._deferShards(e);
    document.addEventListener('pyquest:hud', this._onHud);
    document.addEventListener('pyquest:shardflight', this._onFlight);
    this.render();
  }

  show() { this.root.style.display = 'flex'; }

  destroy() {
    document.removeEventListener('pyquest:hud', this._onHud);
    document.removeEventListener('pyquest:shardflight', this._onFlight);
  }

  // 碎片正在飞向计数器：duration 内显示旧数字，落袋后跳 +1 并单次 gainPop
  _deferShards(e) {
    const { gained = 0, duration = 950 } = e.detail || {};
    if (!gained) return;
    this._flightGained = gained;
    clearTimeout(this._flightT);
    this._flightT = setTimeout(() => {
      this._flightGained = 0;
      this.render();
    }, duration);
    this.render(); // 立即回显旧数字（本次结算发生在同一帧内，不可见闪烁）
  }

  render() {
    let html = '';
    for (let i = 0; i < G.maxHearts; i++) {
      const state = heartState(i);
      html += SVG_HEART(state);
    }
    const hurt = this._lastHearts != null && G.hearts < this._lastHearts;
    this._lastHearts = G.hearts;
    this.heartsEl.innerHTML = html;
    if (hurt) {
      this.heartsEl.classList.remove('hurt-flash');
      void this.heartsEl.offsetWidth; // 重启动画
      this.heartsEl.classList.add('hurt-flash');
      clearTimeout(this._hurtT);
      this._hurtT = setTimeout(() => this.heartsEl.classList.remove('hurt-flash'), 200);
    }

    const cur = chapterShards();
    // 飞行中暂扣增量：数字等碎片落袋（T.REVEAL）才跳 + gainPop
    const shown = this._flightGained ? Math.max(0, cur.shards - this._flightGained) : cur.shards;
    const gained = this._lastShards != null && shown > this._lastShards;
    this._lastShards = shown;
    this.shardEl.innerHTML = `${SVG_SHARD} <span>${shown} / ${cur.needed}</span>`;
    if (gained) {
      this.shardEl.classList.remove('gain');
      void this.shardEl.offsetWidth;
      this.shardEl.classList.add('gain');
    }

    // 目标提示：按章内阶段（core/phase.js）推导
    // （#11：目标行已与碎片计数胶囊分层，独立悬挂在胶囊下方）
    const ch = L(getChapter(G.current));
    const next = CHAPTERS.find((c) => c.id === ch.id + 1);
    const allDone = CHAPTERS.every((c) => cp(c.id).done);
    const phase = phaseOf(ch.id);
    let objective;
    if (allDone) objective = `${ICON.star}${t('全部通关！自由探索吧', 'All chapters clear! Explore freely')}`;
    else if (phase === PHASE.DONE) objective = next ? t(`本章通关！前往${next.fieldName}`, `Chapter clear! Head for ${L(next).fieldName}`) : t('本章通关！', 'Chapter clear!');
    else if (phase === PHASE.OPEN) objective = t(`进入${ch.lairName}，击败${ch.bossName}！`, `Enter the ${ch.lairName} and defeat the ${ch.bossName}!`);
    else objective = t(`收集${ch.shardLabel}，解开巢穴封印`, `Collect ${ch.shardLabel} to break the lair seal`);
    this.objectiveEl.innerHTML = objective;
  }

  hint(html) {
    if (html === this._last) return;
    this._last = html;
    if (!html) { this.hintEl.classList.add('hidden'); return; }
    this.hintEl.innerHTML = html;
    this.hintEl.classList.remove('hidden');
  }
}
