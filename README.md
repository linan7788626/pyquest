# PyQuest · Python 冒险记 ⚔️

一款**用塞尔达式动作冒险学习 Python 天文应用**的网页游戏。
关卡体系对齐 **P4A@UCAS（Python for Astronomy）八周课程**：一周一章，从 Python 基础一路打到暗物质晕密度轮廓拟合。
画风致敬《塞尔达传说：织梦岛》Switch 重制版 + 欧美 Q 版卡通：俯视角、大头小身比例、
描边卡通渲染（帽子/羽毛/肩带/宝珠等层叠细节）、柔和粉彩配色、无像素马赛克的矢量渲染。
**全部角色以 4 倍尺寸显示**，环境物件按 2.5 倍跟随缩放。
美术以 [Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords)（Pixel Frog · Free Pack，本地素材包）
+ 少量程序化贴图（代码碎片/爱心/传送门等游戏专属元素），第一章长老已接入 NLI 软绘风格静态图。

> [!NOTE]
> **本项目完全由 GLM-5.3 Vibe Coding 而成** —— 从玩法设计、架构搭建、场景/实体实现、
> 题库编写到美术整合与 E2E 测试脚本，全部代码均通过与 [GLM-5.3](https://chat.z.ai)
> 的对话式协作（Vibe Coding）生成，未手写一行代码。

![技术栈](https://img.shields.io/badge/Phaser%203-90.x-green) ![构建](https://img.shields.io/badge/Vite-7.x-purple) ![素材](https://img.shields.io/badge/Art-Tiny%20Swords%20%2B%20程序化-blue) ![开发方式](https://img.shields.io/badge/GLM--5.3-Vibe%20Coding-ff6f00) ![许可证](https://img.shields.io/badge/License-MIT-blue)

## 🎮 运行

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
npm run build      # 产出 dist/，可部署到任意静态托管
npm run preview    # 本地预览构建产物
```

## 🕹️ 操作

| 按键 | 功能 |
| --- | --- |
| 方向键 / WASD | 移动 |
| J / 空格 | 挥剑攻击 |
| E | 交互（符文石 / NPC / 石门） |
| Tab | 世界地图（查看八章进度 / 快速传送已解锁章节） |
| M | 静音开关 |

## 🗺️ 游戏流程（八周课程 = 八章关卡）

游戏由 `src/data/chapters.js` 注册表驱动：每章 = **野外**（碎片符文 + 引导 NPC + 封印门）+ **巢穴**（BOSS 符文破盾 + BOSS 战）。
通关当前章后，野外的「前方传送门」开启，进入下一章；也可随时返回上一章补答符文。

| 章 | 课程周次 | 世界 / BOSS | 知识点 |
| --- | --- | --- | --- |
| 第一章 · 基础村 | Week 1 | 诺瓦村庄 + 数据地牢 / 数据史莱姆王 | 变量、运算符、字符串、print、列表、元组 |
| 第二章 · 函数之森 | Week 2 | 函数之森 + 控制流洞窟 / 巨蟒毕森 | def/参数/return/作用域、字典、if/while/for/break |
| 第三章 · 科学计算高原 | Week 3 | 科学计算高原 + 混沌巢穴 / 混沌曲线魔君 | ndarray、索引切片、广播、向量化、arange/linspace、掩膜、matplotlib、蒙特卡洛估π、quad |
| 第四章 · 天文包星图塔 | Week 4 | 星图塔平原 + FITS 神殿 / 单位术士 | FITS header/data、Astropy units/SkyCoord、healpy、emcee、sklearn |
| 第五章 · 加速熔炉 | Week 5 | 加速熔炉 + 迟缓深渊 / 迟缓巨魔 | 向量化、numba @jit、multiprocessing、mpi4py、KISS 法则 |
| 第六章 · 数值方法神殿 | Week 6 | 数值神殿外庭 + 优化迷宫 / 优化牛头怪 | quad 积分、solve_ivp、curve_fit、brentq 求根、interp1d |
| 第七章 · 信号圣殿 | Week 7 | 信号圣殿平原 + 频域回廊 / 傅里叶魅影 | eig 特征值、cov 协方差、FFT、卷积、sklearn fit/predict |
| 第八章 · 深空晕环 | Week 8 | 深空晕环 + 暗物质核心 / NFW 幻龙 | NFW 轮廓、M₂₀₀、N-body 引力模拟、密度→质量积分 |

> 第一、二章为手工地图（内容已按周次重对齐题池）；第三章为**通用生成器样板章**（完整可玩）；
> 第四至八章为通用生成器关卡，题库已充实至**每章 20 题**（shard/lair/boss 三池式）。

### 单章流程

1. **野外**：阅读引导石碑（或与长老对话）；击败游荡的小怪（掉落爱心）。
2. **碎片符文 ×N**：答对 Python 问题获得本章碎片（**题目从同难度题池随机抽取**，每次遇到的都可能不同）。
3. **封印门**：集齐碎片解锁（按 E 当场解开），进入本章巢穴。
4. **巢穴**：祝福符文（答对回心）+ **BOSS 符文**（答对破除护盾，才能造成伤害）。
5. **击败 BOSS** → 本章结算（用时/谜题数/章节进度）→ 前方传送门通往下一章。

## 💾 存档系统

- 进度**自动保存**到 `localStorage`（键 `pyquest:save:v2`，**v1 旧存档自动迁移**）：
  生命、当前章节、**每章独立进度**（碎片/封印/BOSS 状态）、已答题目与符文抽题记录。
- 标题画面会显示 **「继续冒险 · 第N章」**（按最新通关章节落点）；
  「新的冒险」覆盖存档重新开始（有确认提示）。
- 通关结算中的「重新开始」会清档重置。
- 存档实现：`src/core/save.js`（任何 HUD 数据变化 / 关页 / 切后台时写档）。

## 📖 知识点覆盖（190 题 · 25 个同难度题池 · 对齐 P4A@UCAS 课程）

每块符文石从所属**同难度题池**随机抽题：同池题目 `tier` 一致，
随机但不撞题（同池多块符文不重复、已答过的题不再出现），
同一块符文石在答对之前始终是同一道题。

W4-W8 为**三池式**：每章 `w{N}shard`（野外碎片 ×10 基础）/ `w{N}lair`（巢穴祝福 ×7 进阶）/
`w{N}boss`（BOSS 破盾 ×3 综合）共 20 题，难度 `tier` 11-25 随章递进（W4=11-13 … W8=23-25）。

| 题池 | 题量 | 知识点 |
| --- | --- | --- |
| w1field（W1 村庄 · 碎片） | 13 | 赋值、变量复制、命名、`type`、字符串引号/拼接/重复、`**`、`//` 与 `%`、`/` 返回 float |
| w1lair（W1 地牢 · 祝福） | 17 | print 逗号/f-string、列表索引/负索引/切片/append/pop/`+`/sum/越界、元组不可变/解包/单元素逗号 |
| w1boss（W1 BOSS） | 4 | 列表 append + 索引综合、循环生长、索引覆盖 |
| w2field（W2 森林 · 碎片） | 11 | `def`（填空）、参数传递、`return`、默认参数、局部作用域、多参数、`return` 中断 |
| w2heal（W2 森林 · 祝福） | 5 | 字典存取/更新、`in` 查键、keys() |
| w2lair（W2 洞窟 · 祝福） | 9 | if/elif/else、`!=`、and/or/not、while 递减、while+break、for 遍历、range(起,止) |
| w2boss（W2 BOSS） | 4 | `for + range` 次数、循环累加、字符串累积 |
| w3shard（W3 高原 · 碎片） | 14 | ndarray 索引/shape/ndim、向量化、广播、arange/linspace/zeros、mean/sum、掩膜筛选、argmax、reshape、逐元素乘 |
| w3heal（W3 巢穴 · 祝福） | 9 | plot/scatter/hist/xlabel/savefig、蒙特卡洛估π、random.rand、quad 积分 |
| w3boss（W3 BOSS） | 4 | 平方和、reshape、掩膜+聚合 |
| w4shard（W4 星图塔 · 碎片） | 10 | FITS header 与三类 HDU、`fits.open`/`writeto` overwrite、列 format="D"、500 GB 数据格式选型（HDF5）、healpy 等面积像素/NSIDE、`hp.ma` 掩膜取值、emcee 用途、conda 安装 healpy |
| w4lair（W4 神殿 · 祝福） | 7 | 二进制表列名属性、布尔掩膜选行（NIMG）、EnsembleSampler 召唤、`get_chain(discard/thin/flat)`、均匀先验、`percentile [16,50,84]`、`train_test_split` |
| w4boss（W4 单位术士） | 3 | HDUList append/insert、IMSEP/ZLENS 掩膜列运算、`log_prior` 返回 -inf 时 log_probability |
| w5shard（W5 熔炉 · 碎片） | 10 | 向量化提速、numba `@jit`、KISS 法则/奥卡姆剃刀、GIL 与 multiprocessing、可并行判据、`mpirun` 启动、JAX、热点循环函数调用反模式、quad 一行胜千军 |
| w5lair（W5 深渊 · 祝福） | 7 | `Pool.map`、`comm.Bcast`、复合 Simpson 1-4-1、numba 奇数格循环、ctypes 五步铸剑、OpenMP private 归约、divmod + Scatterv 分发 |
| w5boss（W5 迟缓巨魔） | 3 | Simpson 大 N 拆块、`range(rank, nruns, size)` 任务摊派、八种加速法对比 |
| w6shard（W6 神殿 · 碎片） | 10 | `quad`/`solve_ivp`/`curve_fit`/`interp1d` 各自用途、quad 返 val/err 两件套、odeint 签名陷阱、标量/向量求根两派、`derivative` 有限差分、`np.gradient`、MLE 取对数 |
| w6lair（W6 迷宫 · 祝福） | 7 | brentq、quad `args` 传参、割线法两初值、`curve_fit` bounds、二阶 ODE 降阶、`np.triu` 成对求和、softening 防发散 |
| w6boss（W6 优化牛头怪） | 3 | 广播 + `@` 算两两位置差、dblquad 二重积分、`np.gradient` 双轴梯度 |
| w7shard（W7 圣殿 · 碎片） | 10 | `eig`/`cov`/`fft` 返回值、scipy.linalg 优先、特征方程、fft/ifft 往返、5σ 发现门槛、solve vs inv、matrix_rank/det、随机森林超参 |
| w7lair（W7 回廊 · 祝福） | 7 | PSF=卷积、sklearn fit/predict 流程、FFT 频率轴、convolve2d 边缘提取、混淆矩阵、向量投影 `inner`、`B·inv(A)` 对照修正 |
| w7boss（W7 傅里叶魅影） | 3 | 三纯音 FFT 尖峰、3×3 线性方程组、`inner` vs 逐元素乘 |
| w8shard（W8 深空 · 碎片） | 10 | NFW 轮廓定义与发现、N-body 引力、ρ(Rₛ)=ρ₀/4、外区 r⁻³ 衰减、M(r) 与 ρ 的积分关系、MCMC 要点、逆变换采样、corner 角图、ML→emcee 衔接 |
| w8lair（W8 核心 · 祝福） | 7 | ρ(r) 拟合出 r_s/ρ₀、interp1d 反转 CDF、球面均匀采样 θ/ψ、log-log 拟合、-inf 清洗、自相关时间 τ 与 thin、密度 vs 累积质量两种拟合 |
| w8boss（W8 NFW 幻龙） | 3 | NFW 密度积分→累积质量、M(<R_max) 积分公式、walkers 链 discard/thin 统计 |

## 🏗️ 项目结构

```
src/
├── main.js                  # 游戏入口 + 调试句柄 window.__PYQUEST__（按注册表批量注册 16 个章节场景）
├── core/state.js            # 全局状态：G.progress[章] 多章进度 + 传送门解锁条件解析
├── core/save.js             # localStorage 存档（v2 多章结构 + v1 自动迁移 + 自动存档）
├── data/
│   ├── chapters.js          # 八章注册表：周次/地图/对话/胜利文本/BOSS/题池配置（关卡数据核心）
│   ├── maps.js              # 地图构建器：W1/W2 手工地图 + W3-W8 通用生成器（theme 驱动）
│   └── quizData.js          # Python 题库（190 题 · 25 个同难度题池）+ 语法高亮
├── assets/ts.js             # Tiny Swords 素材清单/加载/动画（素材本体在 assets/TinySwordsFreePack/，未入库）
├── textures/pixelArt.js     # 程序化补充贴图（代码碎片/爱心/传送门/石门等）
├── textures/ground.js       # 整图地面画布（草地 → 水/土路 → 岸沫分层绘制）
├── audio/sfx.js             # WebAudio 程序化 8-bit 音效
├── entities/
│   ├── Player.js            # 玩家：移动/挥剑/受击/死亡（回本章野外重生）
│   ├── Slime.js             # 史莱姆 AI：游荡/追击/掉落（red / crimson 变体）
│   ├── BossSlime.js         # BOSS 之一：护盾/召唤帮手（W1/W3/W5/W7 章）
│   └── BossSnake.js         # BOSS 之二：体节跟随/断尾/突咬（W2/W4/W6/W8 章）
└── scenes/
    ├── BootScene.js         # 生成贴图动画 + 标题画面（继续冒险按最新章节落点）
    ├── WorldScene.js        # 世界基类：地图/交互/传送门封印/答题接线（章节驱动）
    └── ChapterScene.js      # 通用章节场景：FieldScene（野外）+ LairScene（巢穴）+ 工厂
ui/                          # DOM 覆盖层：HUD、对话框、答题面板、结算（章节配置驱动）
scripts/
├── smoke.mjs                # 无头冒烟测试（贴图/八章地图/题库/题池/抽题校验）
├── verify-quiz.mjs          # 题库自动校验（用本机 python3 执行输出确定的题目，比对 stdout）
├── e2e.mjs                  # Playwright E2E：第一章全流程 + 存档
├── e2e-ch2.mjs              # 第二章 E2E（森林/洞窟/巨蟒/进入第三章/读档续玩）
├── e2e-ch3.mjs              # 第三章 E2E（样板章全流程 + 衔接第四章 + 读档续玩）
├── e2e-ch4.mjs              # 第四章 E2E（星图塔/FITS 符文/单位术士/衔接第五章）
├── e2e-ch5.mjs              # 第五章 E2E（加速熔炉/深渊符文/迟缓巨魔/衔接第六章）
├── e2e-ch6.mjs              # 第六章 E2E（数值神殿/迷宫符文/优化牛头怪/衔接第七章）
├── e2e-ch7.mjs              # 第七章 E2E（信号圣殿/回廊符文/傅里叶魅影/衔接第八章）
└── e2e-ch8.mjs              # 第八章 E2E（深空晕环/核心符文/NFW 幻龙/通关结算）
```

## 🎨 画面技术（Tiny Swords 素材 + 程序化补充）

- **主素材**：[Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords)（Pixel Frog · Free Pack，
  本地 `assets/TinySwordsFreePack/`，**许可证禁止再分发 → .gitignore 排除，需自行下载**）——
  角色全套（蓝勇士/僧侣/红小兵/黑勇士/紫勇士）、tileset 地形、树/灌木/云、
  尘土/火焰特效、建筑（修道院/塔）
- **TS 坐标系**：逻辑 tile 64px（相机 1x、单位帧 192×192 原尺寸 1:1 渲染，像素完美）
- 角色映射：勇者=蓝军勇士（待机/奔跑/挥剑动画）、长老=蓝军僧侣、村庄小怪=红小兵、
    森林小怪=黑勇士、第一章 BOSS=紫勇士巨型化+金徽（循环之王）、巨蟒=黑勇士头+黑小兵体节
- 符文石待解状态仅做 ±0.7% 微缩放呼吸（视觉跳动 < 1px），不干扰辨识
- **像素完美渲染**：16px tile × 相机 4x 整数放大，`pixelArt: true`，无插值模糊
- **地形拼接**：`ground.js` 把 tileset 拼成整图画布——野外只取图集无缝中心格平铺
  （草地/土路连续无描边缝，土路连接边贴死、仅外角圆角），水面用官方水底色
  + 沿陆地一侧的连续岸沫条，地牢/洞窟用程序化深色石砖
- **程序化补充**（`textures/pixelArt.js`）：代码碎片/爱心/传送门/水晶/蘑菇/
  石门/火炬等游戏专属元素，与素材同风格（平涂 + `#3f2631` 深紫描边）
- **碰撞与渲染分离**：碰撞由不可见静态矩形承担（`WorldScene.tileBodies`）

## 🔧 如何扩展

- **加一章**：在 `src/data/chapters.js` 的 `CHAPTERS` 里加一个对象（标题/世界名/BOSS/对话/victory 文案/
  theme 主题/题池名），再在 `src/data/quizData.js` 建对应题池——地图/场景/传送门全部自动生成注册。
- **充实 W4-W8 题量**：在 `quizData.js` 的 `QUESTIONS` 里加题（标 `tier` 与所属池一致），
  加进对应 `POOLS`（如 `w4shard` / `w4lair` / `w4boss`）即可，符文槽会自动抽到。
- **改地图主题**：章节配置的 `theme` 字段（palette 草原/地牢、seed、尺寸、怪物密度、氛围色）。
- **改 W1/W2 手工地图**：`src/data/maps.js` 是纯代码构建器，改数字即可挪动池塘、道路、道具。

## 🧪 测试

```bash
npm run dev &                # 先起服务器
node scripts/smoke.mjs       # 数据层冒烟测试（八章地图 + 题库校验）
node scripts/verify-quiz.mjs # 题库自动校验（本机 python3 实跑输出确定的题目比对 stdout）
node scripts/e2e.mjs         # E2E：第一章（答题/开门/BOSS/进第二章/存档）
node scripts/e2e-ch2.mjs     # E2E：第二章（森林/洞窟/巨蟒/进第三章/读档续玩）
node scripts/e2e-ch3.mjs     # E2E：第三章样板章（NumPy 符文/破盾/魔君/衔接第四章/读档）
node scripts/e2e-ch4.mjs     # E2E：第四章（星图塔/FITS 符文/单位术士/衔接第五章）
node scripts/e2e-ch5.mjs     # E2E：第五章（加速熔炉/深渊符文/迟缓巨魔/衔接第六章）
node scripts/e2e-ch6.mjs     # E2E：第六章（数值神殿/迷宫符文/优化牛头怪/衔接第七章）
node scripts/e2e-ch7.mjs     # E2E：第七章（信号圣殿/回廊符文/傅里叶魅影/衔接第八章）
node scripts/e2e-ch8.mjs     # E2E：第八章（深空晕环/核心符文/NFW 幻龙/通关结算）
```

## 🗺️ 路线图（对齐 P4A@UCAS 八周课程）

- [x] ~~八章节架构：数据驱动注册表 + 通用关卡生成器 + v2 多章存档~~ ✅
- [x] ~~W1/W2 内容按周次重对齐（地牢=列表/元组，洞窟=控制流）~~ ✅
- [x] ~~第三章 · 科学计算高原（NumPy/Matplotlib/蒙特卡洛，完整样板章）~~ ✅
- [x] ~~W4-W8 注册为可玩关卡（传送门链 + 起步题池）~~ ✅
- [x] ~~W4-W8 题量充实 · 第一阶段（每章 20 题：shard×10 基础 / lair×7 进阶 / boss×3 综合，tier 11-25）~~ ✅
- [ ] W4-W8 题量进一步充实（可选扩展至每章 40-60 题：FITS 实操、emcee 漫步、NFW 拟合数值题）
- [ ] Pyodide 沙盒：W6-8 真实代码执行判分（跑 numpy/scipy 拟合 NFW）
- [ ] 八个课程 Project 作为通关后「毕业试炼」隐藏关卡
- [ ] 移动端虚拟摇杆；难度曲线（爱心上限/商店金币）

### 第二部（64 学时扩展，详见 `docs/part2-plan.md`）

- [ ] 第九章 · 统计圣所（天文学中的统计学基础，到 MCMC 后验分布为止）
- [ ] 第十章 · 灵思之塔（vibe coding 工具方法论）
- [ ] 第十一章 · 毕业试炼（project-driven study 实战收尾）

## 📄 许可证

- **本项目代码**：[MIT License](LICENSE)
- **`assets/cc0/` 素材**：CC0 公共领域（0x72 / Kenney），可自由商用与再分发
  （当前版本未加载，留作第二部备用素材）
- **Tiny Swords 素材**：仅本地开发使用，许可证禁止再分发（未入库，需自行下载）

## 稳定性修复与 NLI 长老试点

当前实现保护标题页已有存档，并修复快速折返传送、题面高亮、长题布局、结算保护与运动一致性。第一章长老默认使用 NLI 原生透明图；在游戏地址后添加 `?art=tiny` 可切回 Tiny Swords 长老。该试点只包含静态 NPC 展示。

运行素材由 `src/assets/ts.js` 的共享清单选取，开发和构建自动生成 `.cache/pyquest-public/`。`assets/` 下的素材包、ZIP、Unity 包和生成记录仍供创作与预览使用，构建只包含运行资源。资源缺失会列出源文件路径并停止启动。

```bash
npm test                 # 逻辑回归、地图与题库数据
npm run test:e2e          # 自动本机服务、隔离浏览器存储、新增回归与八章流程
npm run check:release     # 全检查、Python题目校验、生产构建及两种部署路径
```

浏览器测试需要先安装 Chromium（`npx playwright install chromium`），完整发布检查还需要可执行原题校验的 Python 科学计算环境。测试证据保存在 `test-results/`，章节日志和失败截图可用于定位。

自动持续检查运行纯逻辑检查。完整游戏工作流通过手动触发，在带 `pyquest-assets` 标签的自托管 runner 运行；其 `PYQUEST_ASSET_ROOT` 必须包含真实的 `TinySwordsFreePack/` 和 `NLI_SoftFantasy_ARPG_v0.2/`。缺少素材时完整检查失败，不使用空白图片代替。

部署时上传 `dist/`，支持站点根目录及 `/pyquest/` 等子目录。发布检查要求当前试点构建总文件体积不超过20MB，并确认资源能够真实解码。
