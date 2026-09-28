// ============================================================
// 全屏模态：标题画面 & 胜利画面（支持存档：继续冒险 / 新的冒险）
// 胜利画面文案来自章节配置（data/chapters.js 的 victory 字段）
// ============================================================
import { G } from '../core/state.js';
import { CHAPTERS } from '../data/chapters.js';
import { hasSave, clearSave, saveChapter } from '../core/save.js';

export function initTitle({ onNew, onContinue }) {
  const el = document.getElementById('title');
  const btnStart = document.getElementById('btn-start');
  const btnNew = document.getElementById('btn-new');

  if (hasSave()) {
    // 有存档：主按钮变「继续冒险」，副按钮「新的冒险」
    const ch = saveChapter();
    btnStart.textContent = ch >= 2 ? `继续冒险 · 第${ch}章` : '继续冒险';
    btnStart.addEventListener('click', () => {
      el.classList.add('hidden');
      onContinue();
    });
    btnNew.style.display = '';
    btnNew.addEventListener('click', () => {
      // eslint-disable-next-line no-alert
      if (!window.confirm('开始新的冒险会覆盖当前存档，确定吗？')) return;
      el.classList.add('hidden');
      onNew();
    });
  } else {
    btnStart.addEventListener('click', () => {
      el.classList.add('hidden');
      onNew();
    });
  }
}

export function showVictory(ch, { hasNext, onNext, onRestart } = {}) {
  const el = document.getElementById('victory');
  const cfg = (ch && ch.victory) || {
    title: '🎉 冒险成功！', text: '你完成了试炼！', next: '继续冒险',
  };
  document.getElementById('victory-title').textContent = cfg.title;
  document.getElementById('victory-text').innerHTML = cfg.text;

  const elapsed = Math.max(0, Math.round((Date.now() - G.startTime) / 1000));
  const solved = G.answered.size;
  const doneCount = CHAPTERS.filter((c) => G.progress[c.id].done).length;
  document.getElementById('victory-stats').textContent =
    `用时 ${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒 · 解开 ${solved} 个符文谜题 · 章节 ${doneCount} / ${CHAPTERS.length}`;

  const btnNext = document.getElementById('btn-next');
  const btnRestart = document.getElementById('btn-restart');
  btnNext.textContent = cfg.next;

  // 用 onclick 赋值（覆盖式），避免多章通关后监听器叠加
  btnNext.onclick = () => {
    el.classList.add('hidden');
    if (onNext) onNext();
  };
  btnRestart.onclick = () => {
    clearSave();
    location.reload();
  };
  el.classList.remove('hidden');
}
