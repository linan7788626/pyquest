// ============================================================
// 对话框：底部面板，打字机效果，E / 点击推进
// ============================================================
import { sfx } from '../audio/sfx.js';

export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.el = document.getElementById('dialogue');
    this.nameEl = document.getElementById('dlg-name');
    this.textEl = document.getElementById('dlg-text');
    this.isOpen = false;
    this.lines = [];
    this.lineIndex = 0;
    this.typing = false;
    this.timer = null;

    this.el.addEventListener('click', () => this.advance());
    this._keyHandler = (e) => {
      if (!this.isOpen) return;
      if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.advance();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  /** say({ name, lines: [] }, onDone) */
  say({ name = '', lines = [] }, onDone) {
    this.isOpen = true;
    this.lines = lines;
    this.lineIndex = 0;
    this.onDone = onDone || null;
    this.nameEl.textContent = name;
    this.nameEl.style.display = name ? 'block' : 'none';
    this.el.classList.add('show');
    this.scene.scene.pause();
    this._showLine();
  }

  _showLine() {
    const line = this.lines[this.lineIndex];
    this.typing = true;
    this.textEl.textContent = '';
    let i = 0;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.textEl.textContent = line.slice(0, ++i);
      if (i % 3 === 0) sfx.talk();
      if (i >= line.length) {
        clearInterval(this.timer);
        this.typing = false;
      }
    }, 24);
  }

  advance() {
    if (!this.isOpen) return;
    if (this.typing) {
      // 立即显示整行
      clearInterval(this.timer);
      this.textEl.textContent = this.lines[this.lineIndex];
      this.typing = false;
      return;
    }
    this.lineIndex++;
    if (this.lineIndex >= this.lines.length) {
      this.close();
    } else {
      this._showLine();
    }
  }

  close() {
    this.isOpen = false;
    clearInterval(this.timer);
    this.el.classList.remove('show');
    this.scene.scene.resume();
    if (this.onDone) { const cb = this.onDone; this.onDone = null; cb(); }
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
  }
}
