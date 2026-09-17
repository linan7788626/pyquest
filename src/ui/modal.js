// ============================================================
// 全屏模态：标题画面 & 胜利画面（支持存档：继续冒险 / 新的冒险）
// ============================================================
import { G } from '../core/state.js';
import { hasSave, clearSave, saveChapter } from '../core/save.js';

export function initTitle({ onNew, onContinue }) {
  const el = document.getElementById('title');
  const btnStart = document.getElementById('btn-start');
  const btnNew = document.getElementById('btn-new');

  if (hasSave()) {
    // 有存档：主按钮变「继续冒险」，副按钮「新的冒险」
    const ch = saveChapter();
    btnStart.textContent = ch >= 2 ? '继续冒险 · 第二章' : '继续冒险';
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

const VICTORY_TEXT = {
  1: {
    title: '🎉 第一章 完成！',
    text: '你击败了循环史莱姆王，<br />掌握了变量、输出、条件与循环的基础咒语！',
    next: '▶ 进入第二章 · 函数之森',
  },
  2: {
    title: '👑 全 部 通 关 ！',
    text: '你封印了列表巨蟒「毕森」，<br />函数与列表的咒语也已尽收囊中！<br />你已成为真正的 Python 勇者。',
    next: '返回村庄继续冒险',
  },
};

export function showVictory(chapter = 1, { onNext, onRestart } = {}) {
  const el = document.getElementById('victory');
  const cfg = VICTORY_TEXT[chapter] || VICTORY_TEXT[1];
  document.getElementById('victory-title').textContent = cfg.title;
  document.getElementById('victory-text').innerHTML = cfg.text;

  const elapsed = Math.max(0, Math.round((Date.now() - G.startTime) / 1000));
  document.getElementById('victory-stats').textContent =
    `用时 ${Math.floor(elapsed / 60)} 分 ${elapsed % 60} 秒 · 解开 ${G.answered.size} 个符文谜题`;

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
