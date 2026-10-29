// ============================================================
// 全屏模态：标题画面 & 胜利画面（支持存档：继续冒险 / 新的冒险）
// 胜利画面文案来自章节配置（data/chapters.js 的 victory 字段）
// #13 起胜利画面为「章节封印页」：羊皮纸证书，与标题星空模板脱钩
// ============================================================
import { G } from '../core/state.js';
import { CHAPTERS } from '../data/chapters.js';
import { hasSave, clearSave, saveChapter } from '../core/save.js';
import { L, t } from '../core/i18n.js';
import { ICON } from './icons.js';

// 标题里的 emoji 前缀（chapters.js 的 victory.title 仍写着 🎉👑⚡…）
// 在此剥掉，胜利封印页（#13）标题为纯文字 + 独立大金印
const STRIP_EMOJI = /^[\s\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]+\s*/u;

export function initTitle({ onNew, onContinue }) {
  const el = document.getElementById('title');
  const btnStart = document.getElementById('btn-start');
  const btnNew = document.getElementById('btn-new');
  // 标题按钮文案随语言即时刷新（保存与否的逻辑不变）
  const saved = hasSave();
  const contCh = saved ? saveChapter() : 0;
  const refreshTitle = () => {
    if (!saved) { btnStart.textContent = t('开始冒险', 'Start Adventure'); return; }
    btnStart.textContent = contCh >= 2
      ? t(`继续冒险 · 第${contCh}章`, `Continue · Chapter ${contCh}`)
      : t('继续冒险', 'Continue Adventure');
  };
  refreshTitle();
  document.addEventListener('pyquest:lang', refreshTitle);

  if (saved) {
    // 有存档：主按钮变「继续冒险」，副按钮「新的冒险」
    btnStart.addEventListener('click', () => {
      el.classList.add('hidden');
      onContinue();
    });
    btnNew.style.display = '';
    btnNew.addEventListener('click', () => {
      // eslint-disable-next-line no-alert
      if (!window.confirm(t('开始新的冒险会覆盖当前存档，确定吗？', 'Starting a new adventure will overwrite your current save. Continue?'))) return;
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
  const cfg = (L(ch) && L(ch).victory) || {
    title: t('冒险成功！', 'Adventure Complete!'), text: t('你完成了试炼！', 'You have completed the trial!'), next: t('继续冒险', 'Continue Adventure'),
  };
  // 标题用 textContent（纯文字，兼容断言/读屏）；emoji 前缀已在渲染层剥离
  document.getElementById('victory-title').textContent = cfg.title.replace(STRIP_EMOJI, '');
  document.getElementById('victory-text').innerHTML = cfg.text;
  // 章节金印：封印页的盖章仪式主体（index.html 留空壳，统一由 ICON.stamp 注入）
  document.querySelector('#victory .victory-stamp').innerHTML = ICON.stamp;

  // 三枚统计印（#13）：用时 / 解开谜题 / 章节进度
  // textContent 拼接后仍含「N / 8」，e2e 的章节进度断言不受影响
  const elapsed = Math.max(0, Math.round((Date.now() - G.startTime) / 1000));
  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, '0');
  const solved = G.answered.size;
  const doneCount = CHAPTERS.filter((c) => G.progress[c.id].done).length;
  document.getElementById('victory-stats').innerHTML =
    `<div class="stat-seal">${ICON.hourglass}<b class="stat-num">${mm}:${ss}</b><span class="stat-lbl">${t('冒险用时', 'Time Spent')}</span></div>` +
    `<div class="stat-seal">${ICON.key}<b class="stat-num">${solved}</b><span class="stat-lbl">${t('解开谜题', 'Puzzles Solved')}</span></div>` +
    `<div class="stat-seal">${ICON.flag}<b class="stat-num">${doneCount} / ${CHAPTERS.length}</b><span class="stat-lbl">${t('章节进度', 'Chapter Progress')}</span></div>`;

  const btnNext = document.getElementById('btn-next');
  const btnRestart = document.getElementById('btn-restart');
  btnNext.textContent = cfg.next;

  // 用 onclick 赋值（覆盖式），避免多章通关后监听器叠加
  btnNext.onclick = () => {
    el.classList.add('hidden');
    if (onNext) onNext();
  };
  btnRestart.onclick = () => {
    // 对齐标题界面「新的冒险」的安全标准：清档前确认
    if (!window.confirm(t('确定要放弃这次冒险吗？八周进度将被清除。', 'Abandon this adventure? All eight-week progress will be erased.'))) return;
    clearSave();
    location.reload();
  };
  el.classList.remove('hidden');
}
