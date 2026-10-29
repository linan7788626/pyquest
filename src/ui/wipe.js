// One transition lock spans both scenes and the complete reveal animation.
let running = false;
export const transitionRunning = () => running;
export function wipeTransition(mid, { closeMs = 420, openMs = 460, onFinish } = {}) {
  if (running) return false;
  running = true;
  const el = document.getElementById('wipe');
  const finish = () => {
    running = false;
    if (el) el.style.clipPath = 'circle(0% at 50% 50%)';
    onFinish?.();
  };
  if (!el) { try { mid?.(); } finally { finish(); } return true; }
  el.style.transition = `clip-path ${closeMs}ms ease-in`;
  void el.offsetWidth;
  el.style.clipPath = 'circle(78% at 50% 50%)';
  setTimeout(() => {
    try { mid?.(); }
    catch (error) { finish(); console.error('Scene transition failed', error); return; }
    el.style.transition = `clip-path ${openMs}ms ease-out`;
    el.style.clipPath = 'circle(0% at 50% 50%)';
    setTimeout(finish, openMs);
  }, closeMs + 40);
  return true;
}
