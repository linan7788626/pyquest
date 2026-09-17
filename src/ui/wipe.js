// ============================================================
// 塞尔达式圆形揭示转场：画面被圆形"吞没"→ 切换场景 → 圆形展开
// ============================================================

let running = false;

export function wipeTransition(mid, { closeMs = 420, openMs = 460 } = {}) {
  if (running) return;
  running = true;
  const el = document.getElementById('wipe');
  if (!el) { mid && mid(); running = false; return; }

  el.style.transition = `clip-path ${closeMs}ms ease-in`;
  // 强制 reflow 确保过渡生效
  void el.offsetWidth;
  el.style.clipPath = 'circle(78% at 50% 50%)';

  setTimeout(() => {
    mid && mid();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = `clip-path ${openMs}ms ease-out`;
      el.style.clipPath = 'circle(0% at 50% 50%)';
      setTimeout(() => { running = false; }, openMs);
    }));
  }, closeMs + 40);
}
