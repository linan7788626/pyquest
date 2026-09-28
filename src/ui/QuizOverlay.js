// ============================================================
// 答题面板：选择题 / 代码填空，暂停游戏世界，纯 DOM 交互
// ============================================================
import { highlight } from '../data/quizData.js';
import { damageHearts } from '../core/state.js';
import { sfx } from '../audio/sfx.js';

export class QuizOverlay {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.q = null;
    this.selected = -1;
    this.phase = 'answering'; // answering | correct

    this.backdrop = document.getElementById('quiz-backdrop');
    this.panel = document.getElementById('quiz');
    this.chapterEl = document.getElementById('quiz-chapter');
    this.promptEl = document.getElementById('quiz-prompt');
    this.codeEl = document.getElementById('quiz-code');
    this.optionsEl = document.getElementById('quiz-options');
    this.feedbackEl = document.getElementById('quiz-feedback');
    this.confirmBtn = document.getElementById('quiz-confirm');
    this.cancelBtn = document.getElementById('quiz-cancel');

    this.confirmBtn.addEventListener('click', () => this.confirm());
    this.cancelBtn.addEventListener('click', () => this.close(true));

    this._keyHandler = (e) => {
      if (!this.isOpen) return;
      if (/^[1-4]$/.test(e.key)) this.select(parseInt(e.key, 10) - 1);
      else if (e.key === 'Enter') this.confirm();
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  open(q, { onCorrect, onCancel } = {}) {
    this.isOpen = true;
    this.q = q;
    this.selected = -1;
    this.phase = 'answering';
    this.onCorrect = onCorrect || null;
    this.onCancel = onCancel || null;

    this.scene.scene.pause();

    this.chapterEl.textContent = q.chapter;
    this.chapterEl.classList.toggle('boss', !!q.chapterBoss);
    this.promptEl.textContent = q.prompt;
    this.codeEl.innerHTML = highlight(q.code);
    this.feedbackEl.textContent = '';
    this.feedbackEl.className = '';
    this.confirmBtn.disabled = true;
    this.confirmBtn.textContent = '确认咒语';
    this.cancelBtn.style.display = 'inline-block';

    this.optionsEl.innerHTML = '';
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'opt';
      btn.innerHTML = `<b style="color:#b98a4e">${i + 1}. </b><code>${esc(opt)}</code>`;
      btn.addEventListener('click', () => this.select(i));
      this.optionsEl.appendChild(btn);
    });

    this.backdrop.classList.add('show');
  }

  select(i) {
    if (this.phase !== 'answering' || i < 0 || i >= this.q.options.length) return;
    this.selected = i;
    [...this.optionsEl.children].forEach((el, j) => {
      el.classList.toggle('selected', j === i);
      el.classList.remove('right', 'wrong');
    });
    this.confirmBtn.disabled = false;
    // 填空题：把选中的词填进空槽
    const blank = document.getElementById('quiz-blank');
    if (blank && this.q.fill) blank.textContent = this.q.options[i];
    sfx.talk();
  }

  confirm() {
    if (!this.isOpen) return;
    if (this.phase === 'correct') { this.close(false); this.onCorrect && this.onCorrect(); return; }
    if (this.selected < 0) return;

    const correct = this.selected === this.q.answer;
    const btn = this.optionsEl.children[this.selected];

    if (correct) {
      this.phase = 'correct';
      btn.classList.add('right');
      this.feedbackEl.className = 'ok';
      this.feedbackEl.innerHTML = `✨ 咒语生效了！${this.q.explain}`;
      this.confirmBtn.textContent = '领取奖励';
      this.cancelBtn.style.display = 'none';
      sfx.correct();
    } else {
      btn.classList.add('wrong');
      btn.classList.remove('selected');
      this.selected = -1;
      this.confirmBtn.disabled = true;
      this.feedbackEl.className = 'bad';
      this.feedbackEl.textContent = '咒语失败了…… 生命 -1，重新考虑一下！（提示：' + this._hint() + '）';
      this.panel.classList.remove('shake');
      void this.panel.offsetWidth; // 重启动画
      this.panel.classList.add('shake');
      damageHearts(1);
      sfx.wrong();
    }
  }

  _hint() {
    const tips = {
      '第一章 · 变量': '变量就像口袋：名字 = 值，文字要加引号',
      '第一章 · 数据类型': '整数 int、小数 float、文字 str、真假 bool',
      '第一章 · 字符串': '字符串要成对引号，f 字符串会把 {变量} 换成值',
      '第一章 · 输出': 'print 用逗号连打多项时中间自动加空格',
      '第一章 · 列表': '索引从 0 开始，append 加到末尾，切片含头不含尾',
      '第一章 · 元组': '元组像封蜡的卷轴，创建后不能修改',
      '第二章 · 条件': 'if 条件为 True 才执行，elif 从上到下依次检查',
      '第二章 · 循环': 'range(n) 产生 0 到 n-1，for 对每个数执行一次',
      '第二章 · 函数': 'def 定义函数，return 把结果交回给调用处',
      '第二章 · 字典': '字典按键取值 d["键"]，in 只查键不查值',
      '第三章 · NumPy': 'ndarray 运算逐元素进行，索引从 0 开始',
      '第三章 · 绘图': 'plot 折线 / scatter 散点 / hist 直方图 / savefig 保存',
      '第三章 · 科学计算': 'quad 算积分；蒙特卡洛用随机数估计面积',
      '第四章 · 天文包': 'FITS 头文件存元数据，Astropy 管单位与坐标',
      '第五章 · 加速': '能向量化就不用 for，@jit 即时编译',
      '第六章 · 数值方法': 'quad 积分、solve_ivp 解方程、curve_fit 拟合',
      '第七章 · 线性代数与信号': 'eig 特征值、fft 变到频域、卷积滑动相乘',
      '第八章 · 暗物质': 'NFW 轮廓：ρ(r) ∝ 1/[r(1+r/rs)²]',
    };
    return tips[this.q.chapter] || '仔细读题，逐行理解代码';
  }

  close(cancelled) {
    this.isOpen = false;
    this.backdrop.classList.remove('show');
    this.scene.scene.resume();
    if (cancelled && this.onCancel) { const cb = this.onCancel; this.onCancel = null; cb(); }
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
  }
}
