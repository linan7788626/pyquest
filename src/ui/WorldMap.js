// 世界地图：NLI插画仅为装饰；原路线、节点、章节语义和点击范围不变。
import { G, cp } from '../core/state.js';
import { phaseOf, PHASE } from '../core/phase.js';
import { CHAPTERS } from '../data/chapters.js';
import { L, t } from '../core/i18n.js';
import { sfx } from '../audio/sfx.js';
import { wipeTransition } from './wipe.js';
import { ICON } from './icons.js';

const MAP_W = 1000;
const MAP_H = 600;
const NODE_POS = {
  1: [12, 80], 2: [23, 53], 3: [38, 77], 4: [49, 47],
  5: [62, 81], 6: [75, 53], 7: [78, 30], 8: [90, 6],
};
const ILLUSTRATIONS = [
  ['castle_medium', 204, 448, 96, 96],
  ['map_forest', 280, 244, 80, 80],
  ['map_highland', 443, 464, 88, 88],
  ['map_tower', 520, 184, 80, 80],
  ['map_forge', 676, 452, 80, 80],
  ['map_temple', 611, 328, 88, 88],
  ['map_signal', 836, 166, 72, 72],
  ['map_halo', 770, 4, 72, 72],
];
const ART = () => `
  <rect width="1000" height="600" fill="#f3e7cc"/>
  <g opacity=".9">${ILLUSTRATIONS.map(([key, x, y, w, h]) =>
    `<image href="/nli-preview/${key}.png" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" style="image-rendering:auto"/>`).join('')}</g>
  <g class="map-notes" fill="#7d5c2b" font-family="PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif">
    <text x="176" y="448" font-size="12" letter-spacing="1" opacity=".55">${t('低语草原', 'Whispering Meadow')}</text>
    <text x="612" y="192" font-size="12" letter-spacing="1" opacity=".5">${t('星陨原野', 'Starfall Fields')}</text>
    <text x="466" y="566" font-size="11" letter-spacing="1" opacity=".45">${t('风蚀台地', 'Windworn Terrace')}</text>
  </g>`;

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
    this._onLang = () => {
      this._renderHead();
      if (this.isOpen) this.render();
    };
    document.addEventListener('pyquest:lang', this._onLang);
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this.pathEl);
    this._renderHead();
  }

  /** 地图头/脚静态文案（构造与语言切换共用） */
  _renderHead() {
    document.querySelector('.map-title').innerHTML = `${ICON.map}${t('冒险地图', 'Adventure Map')}`;
    document.querySelector('.map-tip').innerHTML = `${ICON.swirl}${t('点击点亮的地标快速传送（通关前一章即解锁）', 'Click a lit landmark to fast-travel (unlocked by clearing the previous chapter)')}`;
    this.subEl && (this.subEl.innerHTML = this._subText());
  }

  _subText() {
    const doneCount = CHAPTERS.filter((c) => phaseOf(c.id) === PHASE.DONE).length;
    return t(
      `P4A 八周旅程<span class="dot-sep"></span>已通关 <b>${doneCount} / ${CHAPTERS.length}</b><span class="dot-sep"></span><kbd>Tab</kbd> 关闭`,
      `P4A Eight-Week Journey<span class="dot-sep"></span>Cleared <b>${doneCount} / ${CHAPTERS.length}</b><span class="dot-sep"></span><kbd>Tab</kbd> to close`
    );
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    const s = this.scene;
    if (s.quiz && s.quiz.isOpen) return;
    if (s.dialogue && s.dialogue.isOpen) return;
    if (s.transitioning) return;
    if (s.player && s.player.dying) return;
    this.isOpen = true;
    s.scene.pause();
    this.render();
    this.backdrop.classList.add('show');
    this._fit();
    sfx.talk();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.backdrop.classList.remove('show');
    this.scene.scene.resume();
  }

  unlocked(id) {
    if (id === 1) return true;
    return phaseOf(id - 1) === PHASE.DONE;
  }

  _fit() {
    const w = this.pathEl.clientWidth;
    if (!w) return;
    this.pathEl.style.setProperty('--map-scale', (w / MAP_W).toFixed(4));
    // 只缩小装饰，给原标签留8设计px；节点/路线/命中区不移动。
    const art = this.pathEl.querySelector('.map-art');
    const rect = art?.getBoundingClientRect();
    if (!rect?.width) return; // 原竖屏列表模式隐藏插画层。
    const unit = rect.width / MAP_W;
    const labels = [...this.pathEl.querySelectorAll('.mn-plate')].map((label) => {
      const b = label.getBoundingClientRect();
      return { left: (b.left - rect.left) / unit, right: (b.right - rect.left) / unit,
        top: (b.top - rect.top) / unit, bottom: (b.bottom - rect.top) / unit };
    });
    art.querySelectorAll('image').forEach((image, i) => {
      const [, x, y, width, height] = ILLUSTRATIONS[i];
      const cx = x + width / 2, cy = y + height / 2;
      let scale = 1;
      for (const b of labels) {
        scale = Math.min(scale, Math.max(0,
          (b.left - 8 - cx) * 2 / width, (cx - b.right - 8) * 2 / width,
          (b.top - 8 - cy) * 2 / height, (cy - b.bottom - 8) * 2 / height));
      }
      image.setAttribute('x', cx - width * scale / 2);
      image.setAttribute('y', cy - height * scale / 2);
      image.setAttribute('width', width * scale);
      image.setAttribute('height', height * scale);
    });
  }

  _route(i) {
    const p = CHAPTERS.map((ch) => NODE_POS[ch.id]).map(([x, y]) => [x * 10, y * 6]);
    const a = p[i];
    const b = p[i + 1];
    const p0 = p[i - 1] || a;
    const p3 = p[i + 2] || b;
    const c1x = a[0] + (b[0] - p0[0]) / 6;
    const c1y = a[1] + (b[1] - p0[1]) / 6;
    const c2x = b[0] - (p3[0] - a[0]) / 6;
    const c2y = b[1] - (p3[1] - a[1]) / 6;
    return `M${a[0]} ${a[1]}C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${b[0]} ${b[1]}`;
  }

  render() {
    this.subEl.innerHTML = this._subText();
    const segs = CHAPTERS.slice(0, -1).map((ch, i) => {
      const target = CHAPTERS[i + 1];
      return { d: this._route(i), state: phaseOf(target.id) === PHASE.DONE ? 'done' : this.unlocked(target.id) ? 'open' : 'lock' };
    });
    const casings = segs.map((s) => `<path class="route-casing" d="${s.d}"/>`).join('');
    const routes = segs.map((s) => `<path class="route route--${s.state}" d="${s.d}"/>`).join('');
    // 外链PNG必须置于内联SVG；data:image/svg作为img时浏览器会禁取子图。
    this.pathEl.innerHTML = `
      <svg class="map-art" viewBox="0 0 ${MAP_W} ${MAP_H}" aria-hidden="true" style="pointer-events:none">${ART()}</svg>
      <svg class="route-layer" viewBox="0 0 1000 600" aria-hidden="true">${casings}${routes}</svg>
      <div class="map-nodes"></div>`;
    const layer = this.pathEl.querySelector('.map-nodes');
    CHAPTERS.forEach((chRaw) => {
      const ch = L(chRaw);
      const p = cp(ch.id);
      const unlocked = this.unlocked(ch.id);
      const here = G.current === ch.id;
      const done = phaseOf(ch.id) === PHASE.DONE;
      const classes = ['map-node'];
      if (!unlocked) classes.push('locked');
      if (done) classes.push('done');
      if (here) classes.push('here');
      const badge = !unlocked ? ICON.lock : (here ? ICON.pin : (done ? '✓' : ''));
      const status = !unlocked
        ? { cls: 'locked', text: t('未解锁', 'Locked') }
        : done
          ? { cls: 'done', text: t(`已通关 · ${p.shards}/${p.shardsNeeded}`, `Cleared · ${p.shards}/${p.shardsNeeded}`) }
          : { cls: '', text: t(`待挑战 · ${p.shards}/${p.shardsNeeded}`, `To challenge · ${p.shards}/${p.shardsNeeded}`) };
      // shortName：去掉中文章前缀（第X章 ·）或英文前缀（Chapter X ·）
      const shortName = ch.title.replace(/^(第[一二三四五六七八九十]+章|Chapter\s*\d+)\s*·\s*/, '');
      const [x, y] = NODE_POS[ch.id];
      const btn = document.createElement('button');
      btn.className = classes.join(' ');
      btn.dataset.id = ch.id;
      btn.style.setProperty('--x', x);
      btn.style.setProperty('--y', y);
      btn.title = `${ch.title} · ${ch.fieldName} → ${ch.lairName}`;
      btn.setAttribute('aria-label', `${ch.title}，${!unlocked ? t('未解锁', 'Locked') : done ? t('已通关', 'Cleared') : t('可传送', 'Fast-travel available')}`);
      btn.innerHTML = `
        <span class="mn-pin">
          <span class="mn-disc">${ch.id}</span>
          <span class="mn-badge">${badge}</span>
        </span>
        <span class="mn-plate">
          <span class="mn-week"><span>${t(`第 ${ch.week} 周`, `Week ${ch.week}`)}</span>${here ? `<span class="mn-here-tag">${t('当前', 'Here')}</span>` : ''}</span>
          <span class="mn-name">${shortName}</span>
          <span class="mn-status ${status.cls}">${status.text}</span>
        </span>`;
      if (unlocked) btn.addEventListener('click', () => this.travel(ch));
      else btn.disabled = true;
      layer.appendChild(btn);
    });
  }

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
    document.removeEventListener('pyquest:lang', this._onLang);
    this._ro.disconnect();
  }
}
