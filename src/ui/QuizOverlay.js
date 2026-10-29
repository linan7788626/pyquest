// ============================================================
// 答题面板：选择题 / 代码填空，暂停游戏世界，纯 DOM 交互
// ============================================================
import { highlight } from '../data/quizData.js';
import { damageHearts, chapterShards } from '../core/state.js';
import { sfx } from '../audio/sfx.js';
import { SVG_SHARD } from './HUD.js';

// 「碎片入袋」兑付时刻时间轴（ms；t=0 = 点击「领取奖励」）。
// 逻辑（关面板 / 恢复场景 / 发放奖励）在 t=0 原样执行，仅视觉延后兑付，
// 保证外部对答对后状态的等待不受影响。CSS 侧 .shard-pulse 的
// animation-delay (940ms) 与 T.REVEAL 联动，改动需同步 index.html。
const T = {
  GLOW: 120,          // 题面代码块泛起徽记金光
  LAUNCH: 100,        // 面板开始碎裂、首枚碎片起飞
  STAGGER: 70,        // 碎片起飞间隔
  FLY: 560,           // 单枚飞行时长
  BACKDROP_FADE: 880, // 背景暗层开始淡出（临近落袋）
  REVEAL: 950,        // 最后一枚落袋：HUD 数字跳变 + gainPop + 屏幕金光脉冲
  CLEAN: 1200,        // 全部收尾
  SHARDS: 5,          // 视觉碎片枚数（1 次答对兑付 1 枚 → 5 枚全落袋后数字 +1）
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class QuizOverlay {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.q = null;
    this.selected = -1;
    this.phase = 'answering'; // answering | correct
    this._flightToken = 0;    // 碎片飞行代次（快速连续答题时作废旧飞行的定时器/DOM）
    this._flightEls = [];     // 飞行中的碎片 / 金光脉冲元素
    this._flightT1 = 0;
    this._flightT2 = 0;
    this.shardCountEl = document.getElementById('shard-count');
    this.backdrop = document.getElementById('quiz-backdrop');
    this.panel = document.getElementById('quiz');
    this.chapterEl = document.getElementById('quiz-chapter');
    this.promptEl = document.getElementById('quiz-prompt');
    this.codeEl = document.getElementById('quiz-code');
    this.optionsEl = document.getElementById('quiz-options');
    this.feedbackEl = document.getElementById('quiz-feedback');
    this.confirmBtn = document.getElementById('quiz-confirm');
    this.cancelBtn = document.getElementById('quiz-cancel');

    this._confirmHandler = () => this.confirm();
    this._cancelHandler = () => this.close(true);
    this.confirmBtn.addEventListener('click', this._confirmHandler);
    this.cancelBtn.addEventListener('click', this._cancelHandler);

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

    // 复位上一次「碎片入袋」飞行的残留（快速连续答题时飞行可能未结束）
    clearTimeout(this._flightT1);
    clearTimeout(this._flightT2);
    this._flightToken++;
    this._flightEls.forEach((el) => el.remove());
    this._flightEls = [];
    this.panel.getAnimations().forEach((a) => a.cancel());
    this.codeEl.classList.remove('blessed');
    this.backdrop.classList.remove('fading');
    this.backdrop.style.pointerEvents = ''; // 复位飞行期间的透传设置

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
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'opt';
      btn.innerHTML = `<b style="color:#8a6335">${i + 1}. </b><code>${esc(opt)}</code>`;
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
    if (this.phase === 'correct') { this._collect(); return; }
    if (this.selected < 0) return;

    const correct = this.selected === this.q.answer;
    const btn = this.optionsEl.children[this.selected];

    if (correct) {
      this.phase = 'correct';
      btn.classList.add('right');
      this.feedbackEl.className = 'ok';
      // 反馈分层（#8）：首行结果，次行「解析」内嵌条（教学内容，绿系）
      this.feedbackEl.innerHTML =
        '<div class="fb-line">✨ 咒语生效了！</div>' +
        (this.q.explain
          ? `<div class="fb-hint"><span class="fb-hint-label">解析</span>${esc(this.q.explain)}</div>`
          : '');
      this.confirmBtn.textContent = '领取奖励';
      this.cancelBtn.style.display = 'none';
      sfx.correct();
    } else {
      btn.classList.add('wrong');
      btn.classList.remove('selected');
      this.selected = -1;
      this.confirmBtn.disabled = true;
      this.feedbackEl.className = 'bad';
      // 反馈分层（#8）：首行 失败+惩罚（红），次行「提示」内嵌条（教学内容，棕系）
      this.feedbackEl.innerHTML =
        '<div class="fb-line">咒语失败了…… 生命 -1</div>' +
        `<div class="fb-hint"><span class="fb-hint-label">提示</span>${esc(this._hint())}</div>`;
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

  // ---------- 「碎片入袋」兑付时刻 ----------
  // 点击「领取奖励」：逻辑即刻结算（面板状态关闭、场景恢复、奖励发放），
  // 若本次答对产出碎片，则视觉上延后约 1.2s 兑付（面板碎裂 → 碎片飞向计数器）。
  _collect() {
    this.isOpen = false;
    this.scene.scene.resume();
    const cb = this.onCorrect;
    this.onCorrect = null;
    const before = chapterShards().shards;
    if (cb) cb();
    const gained = chapterShards().shards - before;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (gained <= 0 || reduced) { this._closeVisuals(); return; } // 祝福符文 / 降级：直接原流程
    this._playShardFlight(gained);
  }

  _closeVisuals() {
    this.backdrop.classList.remove('show', 'fading');
    this.backdrop.style.pointerEvents = '';
    this.codeEl.classList.remove('blessed');
  }

  _playShardFlight(gained) {
    const ui = document.getElementById('ui');
    const uiRect = ui.getBoundingClientRect();
    const token = ++this._flightToken;
    clearTimeout(this._flightT1);
    clearTimeout(this._flightT2);

    // t=0 题面代码块泛起徽记金光
    this.codeEl.classList.add('blessed');
    // 面板即将碎裂：立即放行指针（视觉上的暗层保留到临近落袋再淡出）
    this.backdrop.style.pointerEvents = 'none';

    // 通知 HUD 延后碎片数字跳变（T.REVEAL 时刻 +1 并单次 gainPop）
    document.dispatchEvent(
      new CustomEvent('pyquest:shardflight', { detail: { gained, duration: T.REVEAL } })
    );

    // t≈100 面板碎裂淡出（配合碎片起飞，不生硬消失）
    this.panel.animate(
      [
        { transform: 'scale(1)', opacity: 1, offset: 0 },
        { transform: 'scale(1.03)', opacity: 1, offset: 0.3 },
        { transform: 'scale(.78)', opacity: 0, offset: 1 },
      ],
      { duration: 260, delay: T.LAUNCH, easing: 'cubic-bezier(.45,.05,.65,.35)', fill: 'both' }
    );

    // 碎片起飞点：面板矩形内散布（复用 HUD 碎片 SVG 造型，放大约 2 倍）
    const panelBox = this.panel.getBoundingClientRect();
    const targetSvg = this.shardCountEl?.querySelector('svg');
    const targetBox = (targetSvg || this.shardCountEl).getBoundingClientRect();
    const spawn = [
      { fx: 0.5, fy: 0.4 }, { fx: 0.24, fy: 0.6 }, { fx: 0.76, fy: 0.58 },
      { fx: 0.4, fy: 0.82 }, { fx: 0.62, fy: 0.8 },
    ];
    const HW = 17, HH = 20.5; // 碎片元素 34×41 的半宽半高（见 index.html .shard-fly）
    for (let i = 0; i < T.SHARDS; i++) {
      const el = document.createElement('div');
      el.className = 'shard-fly';
      el.innerHTML = SVG_SHARD;
      ui.appendChild(el);
      this._flightEls.push(el);

      const s = {
        x: panelBox.left - uiRect.left + panelBox.width * spawn[i].fx,
        y: panelBox.top - uiRect.top + panelBox.height * spawn[i].fy,
      };
      const t = {
        x: targetBox.left - uiRect.left + targetBox.width / 2,
        y: targetBox.top - uiRect.top + targetBox.height / 2,
      };
      // 弧线控制点：上抛 + 横向错开，起飞间隔 70ms、旋转方向交替
      const c = {
        x: (s.x + t.x) / 2 + (i - 2) * 36,
        y: s.y - 170 - (i % 2) * 24,
      };
      const m = { x: (s.x + 2 * c.x + t.x) / 4, y: (s.y + 2 * c.y + t.y) / 4 }; // 贝塞尔中点
      const rot = i % 2 ? -25 : 22;
      el.animate(
        [
          { transform: `translate(${s.x - HW}px, ${s.y - HH}px) rotate(0deg) scale(2.3)`, opacity: 0, offset: 0 },
          { transform: `translate(${s.x - HW}px, ${s.y - HH}px) rotate(${rot * 0.4}deg) scale(2.3)`, opacity: 1, offset: 0.1 },
          { transform: `translate(${m.x - HW}px, ${m.y - HH}px) rotate(${rot}deg) scale(1.45)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${t.x - HW}px, ${t.y - HH}px) rotate(${rot * 1.4}deg) scale(.55)`, opacity: 1, offset: 1 },
        ],
        {
          duration: T.FLY,
          delay: T.LAUNCH + i * T.STAGGER,
          easing: 'cubic-bezier(.33,.12,.35,1)',
          fill: 'both',
        }
      );
    }

    // 临近落袋：屏幕极轻金光脉冲（峰值 opacity .18，≤200ms，见 .shard-pulse）
    const pulse = document.createElement('div');
    pulse.className = 'shard-pulse';
    ui.appendChild(pulse);
    this._flightEls.push(pulse);

    // 背景暗层在接近落袋时淡出；全部收尾后清理 DOM 与类
    this._flightT1 = setTimeout(() => {
      if (token !== this._flightToken) return;
      this.backdrop.classList.add('fading');
    }, T.BACKDROP_FADE);
    this._flightT2 = setTimeout(() => {
      if (token !== this._flightToken) return;
      this._flightEls.forEach((el) => el.remove());
      this._flightEls = [];
      this.panel.getAnimations().forEach((a) => a.cancel());
      this._closeVisuals();
    }, T.CLEAN);
  }

  close(cancelled) {
    this.isOpen = false;
    this.backdrop.classList.remove('show');
    this.scene.scene.resume();
    if (cancelled && this.onCancel) { const cb = this.onCancel; this.onCancel = null; cb(); }
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
    this.confirmBtn.removeEventListener('click', this._confirmHandler);
    this.cancelBtn.removeEventListener('click', this._cancelHandler);
    clearTimeout(this._flightT1); clearTimeout(this._flightT2);
    this._flightToken++;
    this._flightEls.forEach(el => el.remove());
    this.panel.getAnimations().forEach(a => a.cancel());
    this._closeVisuals();
    this.isOpen = false;
  }
}
