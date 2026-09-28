// ============================================================
// HUD：生命值（爱心）、代码碎片计数、当前目标提示
// ============================================================
import { G, chapterShards, cp, getChapter } from '../core/state.js';
import { CHAPTERS } from '../data/chapters.js';

const SVG_HEART = (fill, shine) => `
  <svg viewBox="0 0 9 8" shape-rendering="crispEdges">
    <path d="M1 0h2v1h1v1h1V1h1V0h2v1h1v3h-1v1h-1v1h-1v1h-1v1h-1V7H3V6H2V5H1V4H0V1h1z"
      fill="${fill}" stroke="none"/>
    <path d="M2 1h1v1H2z" fill="${shine}"/>
  </svg>`;

const SVG_SHARD = `
  <svg viewBox="0 0 10 12" shape-rendering="crispEdges">
    <path d="M4 0h2v1h1v1h1v2h1v2h-1v2h-1v1h-1v1h-1v1H4v-1H3v-1H2V8H1V6H0V4h1V2h1V1h1z" fill="#ffd257"/>
    <path d="M4 2h1v2h1v2H5v2H4V6H3V4h1z" fill="#fff3c4"/>
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
    document.addEventListener('pyquest:hud', () => this.render());
    this.render();
  }

  show() { this.root.style.display = 'flex'; }

  render() {
    let html = '';
    for (let i = 0; i < G.maxHearts; i++) {
      const state = heartState(i);
      html += state === 'full'
        ? SVG_HEART('#ef5a68', 'rgba(255,255,255,.7)')
        : SVG_HEART('#564e66', 'rgba(255,255,255,.14)');
    }
    this.heartsEl.innerHTML = html;

    const cur = chapterShards();
    const gained = cur.shards > (this._lastShards ?? 0);
    this._lastShards = cur.shards;
    this.shardEl.innerHTML = `${SVG_SHARD} <span>${cur.shards} / ${cur.needed}</span>`;
    if (gained) {
      this.shardEl.classList.remove('gain');
      void this.shardEl.offsetWidth;
      this.shardEl.classList.add('gain');
    }

    // 目标提示：由当前章节进度推导
    const ch = getChapter(G.current);
    const p = cp(ch.id);
    const next = CHAPTERS.find((c) => c.id === ch.id + 1);
    const allDone = CHAPTERS.every((c) => cp(c.id).done);
    let objective;
    if (allDone) objective = '🎉 全部通关！自由探索吧';
    else if (p.done) objective = next ? `本章通关！前往${next.fieldName}` : '本章通关！';
    else if (!p.gateOpen) objective = `收集${ch.shardLabel}，解开巢穴封印`;
    else objective = `进入${ch.lairName}，击败${ch.bossName}！`;
    this.objectiveEl.textContent = objective;
  }

  hint(html) {
    if (html === this._last) return;
    this._last = html;
    if (!html) { this.hintEl.classList.add('hidden'); return; }
    this.hintEl.innerHTML = html;
    this.hintEl.classList.remove('hidden');
  }
}
