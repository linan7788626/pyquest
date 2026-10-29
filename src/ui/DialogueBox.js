// ============================================================
// 对话框：底部面板，打字机效果，E / 点击推进
// 台词支持【E】/【J】/【空格】键帽标记，渲染成与提示条同款的 <kbd>
// ============================================================
import { sfx } from '../audio/sfx.js';
import { ICON } from './icons.js';

// 文本先转义再拼 kbd 标记，防注入
const esc = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 把一行台词拆成词元：普通文本段 或 【键帽】（如【E】、【空格】） */
function tokenize(line) {
  const tokens = [];
  let buf = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '【') {
      const end = line.indexOf('】', i + 1);
      if (end > i) {
        if (buf) { tokens.push({ key: false, s: buf }); buf = ''; }
        tokens.push({ key: true, s: line.slice(i + 1, end) });
        i = end;
        continue;
      }
    }
    buf += line[i];
  }
  if (buf) tokens.push({ key: false, s: buf });
  return tokens;
}

/** 词元 → HTML：文本转义，键帽 → <kbd>（与提示条同款式） */
function renderTokens(tokens) {
  return tokens.map((t) => (t.key ? `<kbd>${esc(t.s)}</kbd>` : esc(t.s))).join('');
}

export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.el = document.getElementById('dialogue');
    this.nameEl = document.getElementById('dlg-name');
    this.textEl = document.getElementById('dlg-text');
    this.nextEl = document.getElementById('dlg-next');
    this.isOpen = false;
    this.lines = [];
    this.lineIndex = 0;
    this.typing = false;
    this.timer = null;

    // 「继续」提示：像素下箭头 + 键帽（▼ emoji → 像素图标；写死内容，重复调用幂等）
    this.nextEl.innerHTML = `${ICON.chevron}按 <kbd>E</kbd> / 点击 继续`;

    this._clickHandler = () => this.advance();
    this.el.addEventListener('click', this._clickHandler);
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
    if (line == null) { this.close(); return; } // 空 lines 守卫：直接收起对话
    this.typing = true;
    // 打字机以「步」为单位：普通字符 1 步 1 字，【键帽】整组 1 步（按键一次落下）
    const steps = [];
    for (const t of tokenize(line)) {
      if (t.key) steps.push([t]);
      else for (const ch of t.s) steps.push([{ key: false, s: ch }]);
    }
    this._steps = steps;
    this.textEl.innerHTML = '';
    let i = 0;
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      i++;
      this.textEl.innerHTML = renderTokens(steps.slice(0, i).flat());
      if (i % 3 === 0) sfx.talk();
      if (i >= steps.length) {
        clearInterval(this.timer);
        this.typing = false;
      }
    }, 24);
  }

  advance() {
    if (!this.isOpen) return;
    if (this.typing) {
      // 立即显示整行（含键帽）
      clearInterval(this.timer);
      this.textEl.innerHTML = renderTokens(this._steps.flat());
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
    this.el.removeEventListener('click', this._clickHandler);
    clearInterval(this.timer);
    this.el.classList.remove('show');
    this.isOpen = false;
  }
}
