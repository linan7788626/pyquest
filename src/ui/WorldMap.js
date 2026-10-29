// ============================================================
// 世界地图（全局关卡地图）：Tab 呼出 / 关闭
// - 羊皮纸大地图：各章地形色块 + landmark 图标 + 小径连线
// - 8 个章节地标散布在地图上（左下的村庄 → 右上的深空）
// - 解锁规则与传送门一致：通关前一章节即解锁，点击地标快速传送
//   到该章野外（塞尔达式圆形转场）
// ============================================================
import { G, cp } from '../core/state.js';
import { phaseOf, PHASE } from '../core/phase.js';
import { CHAPTERS } from '../data/chapters.js';
import { sfx } from '../audio/sfx.js';
import { wipeTransition, transitionRunning } from './wipe.js';
import { ICON } from './icons.js';

const MAP_W = 1000;
const MAP_H = 600;

// 地标在画布上的位置（百分比）。叙事顺序：
// W1 草原村庄（左下）→ W2 森林 → W3 高原 → W4 星图塔 → W5 熔炉
// → W6 神殿 → W7 圣殿 → W8 深空晕环（右上）
const NODE_POS = {
  1: [12, 80],
  2: [23, 53],
  3: [38, 77],
  4: [49, 47],
  5: [62, 81],
  6: [75, 53],
  7: [78, 30],
  8: [90, 6],
};

// ---------- 静态地图美术（羊皮纸 + 地形 + landmark） ----------
const ART = `
  <defs>
    <linearGradient id="pq-parch" x1="0" y1="0" x2="0.22" y2="1">
      <stop offset="0" stop-color="#fdf4e0"/>
      <stop offset="0.55" stop-color="#f6e6c5"/>
      <stop offset="1" stop-color="#eed9b4"/>
    </linearGradient>
    <radialGradient id="pq-warm" cx="0.24" cy="0.1" r="0.9">
      <stop offset="0" stop-color="#fffaf0" stop-opacity=".85"/>
      <stop offset="1" stop-color="#fffaf0" stop-opacity="0"/>
    </radialGradient>
    <filter id="pq-grain" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="9" result="n"/>
      <feColorMatrix in="n" type="saturate" values="0"/>
    </filter>
    <filter id="pq-soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.4" flood-color="#6b4f2e" flood-opacity=".35"/>
    </filter>
  </defs>

  <rect width="1000" height="600" fill="url(#pq-parch)"/>
  <rect width="1000" height="600" fill="url(#pq-warm)"/>

  <!-- 地形色块：柔粉彩 + 深一点的描边，像织梦岛的卡通地图 -->
  <g class="map-terrain" stroke-width="2.5" stroke-linejoin="round">
    <!-- W1 低语草原（左下） -->
    <g>
      <path d="M-70 505C-20 458 70 442 158 464C222 480 268 505 258 545C247 590 158 616 66 603C4 594-46 570-70 540Z"
        fill="#a8d287" stroke="#86b96a"/>
      <ellipse cx="128" cy="500" rx="92" ry="52" fill="#bce2a0"/>
      <path d="M-70 540C-20 590 90 616 180 602" fill="none" stroke="#93c477" stroke-width="2" opacity=".6"/>
    </g>

    <!-- W2 函数之森（左中） -->
    <g>
      <path d="M72 302C96 246 168 224 232 240C296 256 330 300 322 344C314 392 256 420 194 408C132 396 74 372 72 340Z"
        fill="#8cc487" stroke="#6da96d"/>
      <ellipse cx="196" cy="310" rx="84" ry="48" fill="#a3d59c"/>
      <path d="M92 338C120 378 214 402 288 372" fill="none" stroke="#79b479" stroke-width="2" opacity=".55"/>
    </g>

    <!-- W3 科学计算高原（中下） -->
    <g>
      <path d="M205 452C235 414 318 404 392 416C462 428 512 456 506 494C500 534 424 552 348 544C272 536 200 516 196 486Z"
        fill="#e0cb99" stroke="#c3aa74"/>
      <ellipse cx="350" cy="470" rx="96" ry="44" fill="#eeddaf"/>
      <path d="M228 500C292 524 420 530 488 506" fill="none" stroke="#cdb27e" stroke-width="2" opacity=".7"/>
    </g>

    <!-- W4 天文包星图塔（中央） -->
    <g>
      <path d="M345 262C372 208 458 190 526 208C592 226 632 266 622 306C612 350 536 372 468 358C400 344 342 316 345 282Z"
        fill="#c9b7e6" stroke="#a894cf"/>
      <ellipse cx="492" cy="272" rx="94" ry="46" fill="#d9cbf0"/>
      <path d="M368 300C420 334 540 346 604 310" fill="none" stroke="#b6a2da" stroke-width="2" opacity=".6"/>
    </g>

    <!-- W5 加速熔炉（右下） -->
    <g>
      <path d="M480 486C512 444 592 432 658 446C722 460 768 492 762 528C756 566 686 586 616 574C548 562 480 540 480 512Z"
        fill="#f0b189" stroke="#d9946a"/>
      <ellipse cx="620" cy="500" rx="86" ry="42" fill="#f8c8a5"/>
      <path d="M500 528C570 558 690 558 748 526" fill="none" stroke="#e2a077" stroke-width="2" opacity=".7"/>
    </g>

    <!-- W6 数值方法神殿（右中） -->
    <g>
      <path d="M612 306C644 262 726 248 794 264C858 280 896 312 888 350C880 390 806 410 738 396C670 382 610 354 612 330Z"
        fill="#e8d6b4" stroke="#c9ad82"/>
      <ellipse cx="760" cy="318" rx="88" ry="42" fill="#f3e5c9"/>
      <path d="M632 346C700 376 818 380 872 350" fill="none" stroke="#d5bb92" stroke-width="2" opacity=".65"/>
    </g>

    <!-- W7 信号圣殿（右上） -->
    <g>
      <path d="M664 160C692 112 764 96 826 112C886 128 920 160 912 196C904 234 838 254 774 240C710 226 662 206 664 178Z"
        fill="#a9dcd3" stroke="#84bfb6"/>
      <ellipse cx="792" cy="170" rx="82" ry="40" fill="#bfeae2"/>
      <path d="M686 202C746 232 856 232 900 198" fill="none" stroke="#8fccc2" stroke-width="2" opacity=".6"/>
    </g>

    <!-- W8 深空晕环（右上角） -->
    <g>
      <path d="M760 40C786-6 858-24 916-8C962 5 962 62 948 100C932 144 872 158 820 140C768 122 744 92 760 60Z"
        fill="#4d3b68" stroke="#392a4e"/>
      <ellipse cx="880" cy="46" rx="76" ry="42" fill="#5c4877"/>
      <ellipse cx="900" cy="30" rx="108" ry="24" fill="none" stroke="#9c86c9" stroke-width="1.4" opacity=".7" transform="rotate(-14 900 30)"/>
    </g>
  </g>

  <!-- 左上角装饰：雾丘、池塘、飞鸟（空出的纸面不显得荒） -->
  <g class="map-deco">
    <g fill="#dce8bd" stroke="#b9cb94" stroke-width="2">
      <path d="M48 232c16-30 58-30 74 0z"/>
      <path d="M118 226c13-24 47-24 60 0z"/>
      <path d="M154 236c10-18 35-18 45 0z"/>
    </g>
    <ellipse cx="96" cy="168" rx="54" ry="24" fill="#bcdbe3" stroke="#93bcc8" stroke-width="2"/>
    <ellipse cx="82" cy="163" rx="28" ry="10" fill="#d3ecf0" opacity=".75"/>
    <g stroke="#7fa271" stroke-width="1.8" fill="#9cc487">
      <path d="M212 214l7-16 7 16z"/><path d="M236 220l6-13 6 13z"/>
    </g>
    <g fill="#fffaf0" opacity=".75">
      <ellipse cx="322" cy="96" rx="34" ry="12"/>
      <ellipse cx="340" cy="88" rx="20" ry="10"/>
      <ellipse cx="306" cy="90" rx="18" ry="9"/>
      <ellipse cx="416" cy="132" rx="24" ry="8"/>
    </g>
    <g fill="none" stroke="#a98f6a" stroke-width="1.6" opacity=".55">
      <path d="M258 142q6-7 12 0"/><path d="M274 134q6-7 12 0"/><path d="M292 146q5-6 10 0"/>
    </g>
  </g>

  <!-- 地图内框（细虚线圈，像手绘地图的版框） -->
  <rect x="7" y="7" width="986" height="586" rx="10" fill="none"
    stroke="#c8a86e" stroke-width="1.6" stroke-dasharray="2 8" opacity=".45"/>

  <!-- 河流：森林 → 草原之间的浅水 -->
  <g class="map-river">
    <path d="M300 606 C272 552 292 512 268 472 C252 444 254 428 262 414"
      fill="none" stroke="#a9d9e0" stroke-width="15" stroke-linecap="round" opacity=".55"/>
    <path d="M300 606 C272 552 292 512 268 472 C252 444 254 428 262 414"
      fill="none" stroke="#d6eff3" stroke-width="5" stroke-linecap="round" opacity=".8"/>
  </g>

  <!-- 地形小纹理：草簇 / 沙点 / 星点 / 火星 -->
  <g class="map-texture" fill="none" stroke-linecap="round">
    <g stroke="#79b263" stroke-width="1.6" opacity=".7">
      <path d="M96 520v-7M90 521l-3-6M102 521l3-6"/>
      <path d="M170 566v-6M165 567l-2-5M175 567l2-5"/>
      <path d="M60 488v-6M55 489l-2-5M65 489l2-5"/>
      <path d="M205 360v-6M200 361l-2-5M210 361l2-5"/>
      <path d="M122 374v-6M117 375l-2-5M127 375l2-5"/>
    </g>
    <g fill="#b79a63" opacity=".5">
      <circle cx="300" cy="470" r="1.8"/><circle cx="318" cy="486" r="1.5"/>
      <circle cx="404" cy="466" r="1.7"/><circle cx="436" cy="490" r="1.4"/>
      <circle cx="280" cy="510" r="1.6"/>
    </g>
    <g fill="#8f76c4" opacity=".5">
      <circle cx="408" cy="264" r="1.6"/><circle cx="452" cy="228" r="1.3"/>
      <circle cx="548" cy="238" r="1.5"/><circle cx="576" cy="292" r="1.2"/>
    </g>
    <g fill="#e8683f" opacity=".55">
      <circle cx="640" cy="536" r="1.8"/><circle cx="668" cy="552" r="1.4"/>
    </g>
    <g fill="#ffe9a8" opacity=".9">
      <circle cx="852" cy="52" r="1.5"/><circle cx="890" cy="24" r="1.2"/>
      <circle cx="934" cy="74" r="1.4"/><circle cx="800" cy="88" r="1.1"/>
      <circle cx="958" cy="30" r="1.3"/>
    </g>
  </g>

  <!-- 纸面颗粒 -->
  <rect width="1000" height="600" filter="url(#pq-grain)" opacity=".22" style="mix-blend-mode:multiply"/>

  <!-- 深空星点 -->
  <g fill="#ffe9a8" opacity=".85">
    <circle cx="812" cy="60" r="1.8"/><circle cx="856" cy="18" r="1.4"/>
    <circle cx="884" cy="88" r="1.6"/><circle cx="930" cy="52" r="1.3"/>
    <circle cx="968" cy="96" r="1.7"/><circle cx="836" cy="104" r="1.1"/>
    <circle cx="904" cy="12" r="1.2"/>
  </g>

  <!-- landmark 小图标 -->
  <g class="map-landmarks" filter="url(#pq-soft)">
    <!-- 村庄 -->
    <g transform="translate(252,504)">
      <path d="M-17 4h34v16h-34z" fill="#f7e2b8" stroke="#6b4f2e" stroke-width="2"/>
      <path d="M-22 4L0 -15L22 4z" fill="#e8886f" stroke="#6b4f2e" stroke-width="2"/>
      <rect x="-4" y="8" width="8" height="12" fill="#8a5a3a"/>
    </g>
    <!-- 森林 -->
    <g stroke="#3f6b47" stroke-width="1.6">
      <path d="M300 296l9-20 9 20z" fill="#4f8a5a"/>
      <path d="M296 308l13-26 13 26z" fill="#5b9966"/>
      <path d="M326 314l8-18 8 18z" fill="#4f8a5a"/>
      <path d="M146 318l8-17 8 17z" fill="#4f8a5a" stroke-width="1.5"/>
      <path d="M170 334l7-15 7 15z" fill="#5b9966" stroke-width="1.5"/>
    </g>
    <!-- 高原石台 -->
    <g transform="translate(487,516)">
      <path d="M-24 12h48l-6-14H-18z" fill="#c9ae7a" stroke="#6b4f2e" stroke-width="1.8"/>
      <path d="M-14 12v10M6 12v10" stroke="#6b4f2e" stroke-width="1.6"/>
      <path d="M-6 -2h20l-3-9H-3z" fill="#dcc59b" stroke="#6b4f2e" stroke-width="1.6"/>
    </g>
    <!-- 星图塔 -->
    <g transform="translate(560,240)">
      <path d="M-9 26h18V-8h-18z" fill="#c9b6ea" stroke="#6b4f2e" stroke-width="2"/>
      <path d="M-13 -8L0 -28L13 -8z" fill="#8f76c4" stroke="#6b4f2e" stroke-width="2"/>
      <circle cx="0" cy="-17" r="2.6" fill="#ffd257" stroke="none"/>
      <path d="M0 -28v-6" stroke="#6b4f2e" stroke-width="1.6"/>
    </g>
    <!-- 熔炉 -->
    <circle cx="712" cy="500" r="26" fill="#ffd9b0" opacity=".45"/>
    <g transform="translate(716,508)">
      <path d="M-26 18L-7 -16L10 18z" fill="#c88a68" stroke="#6b4f2e" stroke-width="2"/>
      <path d="M-12 2q7-9 14 0q-7 10-14 0z" fill="#e8683f" stroke="#6b4f2e" stroke-width="1.2"/>
      <circle cx="-18" cy="-24" r="3" fill="#f7c39e" opacity=".9"/>
      <circle cx="-6" cy="-30" r="2.2" fill="#f7c39e" opacity=".8"/>
    </g>
    <!-- 神殿 -->
    <g transform="translate(655,380)">
      <path d="M-20 -6L0 -20L20 -6z" fill="#f0e0c2" stroke="#6b4f2e" stroke-width="1.8"/>
      <rect x="-18" y="-6" width="36" height="4" fill="#d8c3a0" stroke="#6b4f2e" stroke-width="1.4"/>
      <path d="M-14 -2v18M-4 -2v18M6 -2v18" stroke="#6b4f2e" stroke-width="2"/>
      <rect x="-18" y="16" width="36" height="4" fill="#d8c3a0" stroke="#6b4f2e" stroke-width="1.4"/>
    </g>
    <!-- 信号塔 -->
    <g transform="translate(872,214)">
      <path d="M0 22V-12" stroke="#6b4f2e" stroke-width="2.4"/>
      <path d="M-7 22h14" stroke="#6b4f2e" stroke-width="2"/>
      <circle cx="0" cy="-15" r="4" fill="#ffd257" stroke="#6b4f2e" stroke-width="1.5"/>
      <path d="M-10 -4q10-8 20 0M-15 -11q15-12 30 0" fill="none" stroke="#4f9d93" stroke-width="1.8" opacity=".9"/>
    </g>
    <!-- 深空晕环 -->
    <g transform="translate(806,40)" stroke="#ffd257" fill="none" opacity=".9">
      <ellipse rx="23" ry="9" transform="rotate(-18)" stroke-width="1.8"/>
      <ellipse rx="12" ry="4.5" transform="rotate(-18)" stroke-width="1.4"/>
      <circle cx="0" cy="0" r="2.6" fill="#fff3c4" stroke="none"/>
    </g>
  </g>

  <!-- 手绘小注记 -->
  <g class="map-notes" fill="#7d5c2b" font-family="PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif">
    <text x="176" y="448" font-size="12" letter-spacing="1" opacity=".55">低语草原</text>
    <text x="612" y="192" font-size="12" letter-spacing="1" opacity=".5">星陨原野</text>
    <text x="466" y="566" font-size="11" letter-spacing="1" opacity=".45">风蚀台地</text>
  </g>

  <!-- 罗盘 -->
  <g transform="translate(944,546)" opacity=".7">
    <circle r="25" fill="none" stroke="#b98a4e" stroke-width="1.4" stroke-dasharray="3 4"/>
    <path d="M0 -19L5 0L0 19L-5 0z" fill="#c9a06a" stroke="#8a6534" stroke-width="1"/>
    <path d="M-19 0L0 -5L19 0L0 5z" fill="#ecd8b3" stroke="#8a6534" stroke-width="1"/>
    <text x="0" y="-31" font-size="11" text-anchor="middle" fill="#8a6534" opacity=".9">N</text>
  </g>
`;

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

    // 地图按容器宽度整体缩放地标层（美术 SVG 自适应，地标保持同一比例）
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this.pathEl);

    // 像素图标就位（#10 emoji 替换）：标题 🗺️ → 藏宝图，页脚提示 🌀 → 传送准星
    // 写死整段 innerHTML，场景重启重复执行也幂等
    document.querySelector('.map-title').innerHTML = `${ICON.map}冒险地图`;
    document.querySelector('.map-tip').innerHTML = `${ICON.swirl}点击点亮的地标快速传送（通关前一章即解锁）`;
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (this.isOpen) return;
    const s = this.scene;
    // 答题 / 对话 / 转场 / 濒死期间不打开
    if (s.quiz && s.quiz.isOpen) return;
    if (s.dialogue && s.dialogue.isOpen) return;
    if (s.transitioning || transitionRunning() || s.settling) return;
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

  /** 章节解锁规则：第 1 章常开，其余需前一章节通关（跨章规则，不属于章内 Phase） */
  unlocked(id) {
    if (id === 1) return true;
    return phaseOf(id - 1) === PHASE.DONE;
  }

  /** 地标层按 1000×600 设计尺寸绘制，再整体缩放到容器宽度 */
  _fit() {
    const w = this.pathEl.clientWidth;
    if (!w) return;
    this.pathEl.style.setProperty('--map-scale', (w / MAP_W).toFixed(4));
  }

  /** 相邻地标之间的弯曲小径（Catmull-Rom → 三次贝塞尔，逐段生成以区分状态） */
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

  /** 静态地图美术序列化成一个 data URI，只解码一次：矢量层不再每帧参与重绘 */
  _artSrc() {
    if (!this._artURI) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600">${ART}</svg>`;
      this._artURI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    return this._artURI;
  }

  render() {
    const doneCount = CHAPTERS.filter((c) => phaseOf(c.id) === PHASE.DONE).length;
    this.subEl.innerHTML = `P4A 八周旅程<span class="dot-sep"></span>已通关 <b>${doneCount} / ${CHAPTERS.length}</b><span class="dot-sep"></span><kbd>Tab</kbd> 关闭`;

    // 连线：目的地已通关 = 金色实线；已解锁未通关 = 流动金色点线；未解锁 = 暗色虚线
    const segs = CHAPTERS.slice(0, -1).map((ch, i) => {
      const target = CHAPTERS[i + 1];
      return {
        d: this._route(i),
        state: phaseOf(target.id) === PHASE.DONE ? 'done' : this.unlocked(target.id) ? 'open' : 'lock',
      };
    });
    const casings = segs.map((s) => `<path class="route-casing" d="${s.d}"/>`).join('');
    const routes = segs.map((s) => `<path class="route route--${s.state}" d="${s.d}"/>`).join('');

    this.pathEl.innerHTML = `
      <img class="map-art" alt="" draggable="false" src="${this._artSrc()}">
      <svg class="route-layer" viewBox="0 0 1000 600" aria-hidden="true">${casings}${routes}</svg>
      <div class="map-nodes"></div>`;
    const layer = this.pathEl.querySelector('.map-nodes');

    CHAPTERS.forEach((ch) => {
      const p = cp(ch.id);
      const unlocked = this.unlocked(ch.id);
      const here = G.current === ch.id;
      const done = phaseOf(ch.id) === PHASE.DONE;
      const classes = ['map-node'];
      if (!unlocked) classes.push('locked');
      if (done) classes.push('done');
      if (here) classes.push('here');

      // 徽章优先级：锁定 > 当前所在 > 已通关（当前章即使已通关也保留大头针）
      // 🔒 → 像素挂锁，📍 → 像素大头针（icons.js，与爱心/碎片同族）
      const badge = !unlocked ? ICON.lock : (here ? ICON.pin : (done ? '✓' : ''));
      const status = !unlocked
        ? { cls: 'locked', text: '未解锁' }
        : done
          ? { cls: 'done', text: `已通关 · ${p.shards}/${p.shardsNeeded}` }
          : { cls: '', text: `待挑战 · ${p.shards}/${p.shardsNeeded}` };
      const shortName = ch.title.replace(/^第[一二三四五六七八九十]+章\s*·\s*/, '');
      const [x, y] = NODE_POS[ch.id];

      const btn = document.createElement('button');
      btn.className = classes.join(' ');
      btn.dataset.id = ch.id;
      btn.style.setProperty('--x', x);
      btn.style.setProperty('--y', y);
      btn.title = `${ch.title} · ${ch.fieldName} → ${ch.lairName}`;
      btn.setAttribute('aria-label', `${ch.title}，${!unlocked ? '未解锁' : done ? '已通关' : '可传送'}`);
      btn.innerHTML = `
        <span class="mn-pin">
          <span class="mn-disc">${ch.id}</span>
          <span class="mn-badge">${badge}</span>
        </span>
        <span class="mn-plate">
          <span class="mn-week"><span>第 ${ch.week} 周</span>${here ? '<span class="mn-here-tag">当前</span>' : ''}</span>
          <span class="mn-name">${shortName}</span>
          <span class="mn-status ${status.cls}">${status.text}</span>
        </span>`;
      if (unlocked) btn.addEventListener('click', () => this.travel(ch));
      else btn.disabled = true; // 未解锁：不可点击、不进键盘焦点，也不再显示可点击手势
      layer.appendChild(btn);
    });
  }

  /** 快速传送到章节野外（圆形转场 + 传送期间免伤） */
  travel(ch) {
    if (!this.isOpen) return;
    const s = this.scene;
    this.close();
    if (s.transitioning || transitionRunning() || s.settling || s.player.dying) return;
    s.transitioning = true;
    s.player.setVelocity(0, 0);

    sfx.openGate();
    wipeTransition(() => s.scene.start(ch.fieldKey, { spawn: ch.id === 1 ? 'start' : 'fromPrev' }), { onFinish: () => { s.transitioning = false; } });
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
    this._ro.disconnect();
  }
}
