# NLI 方向 A 标杆与补帧准备 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改玩法、碰撞和单帧动画契约的前提下，把 Village 做成 A 河湾前庭标杆，并单独准备可验收的真实补帧输入。

**Architecture:** 先写不变量测试，再改导出器和显示层。新城堡/传送门与衍生岸缘只进显示层。补帧与运行素材隔离，帧自身验收通过前不改 `frameRate`、动画接线或实体几何。

**Tech Stack:** 现有 Python/Pillow、Phaser 3.90、Vite、Playwright。不安装依赖。

**Spec:** `.slim/deepwork/nli-systematic-2026-10-27/approved-direction.md`；Gate 1 见同目录 `gate1-review.md`。用户已确认本计划并选择分任务执行；执行前接口勘误见SDD账本，不扩大玩法或动画范围。

## Global Constraints

- 指定输入只读：`/Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.1.zip`，SHA-256 `ed6820c8f760840f9c547db7a9453e3c3daa71844c18334fe05e510d285fc2c4`。原包、Tiny Swords、包内 Tools 只读，不运行重建工具。
- 保留玩法、题库、进度、存档、`grid/colliding/spawns/portals/qid`。不安装依赖。不提交、不推送、不合并，除非用户另行明确授权。
- 首个标杆只用 `Castle_Medium` 与 `Portal_Blue_Gold`。Small/Large 不进入本计划。画布 1254² 不等于世界尺寸，三座城堡禁止等宽替换。
- 帧未过自身验收前，不改 `src/assets/ts.js` 的一帧契约，不改 `frameRate=1000/dur`，不把静态滑动称为自然行走。
- 衍生岸缘/路肩只进显示层，每块记录来源 hash 与变换，并标记“产品衍生”。视觉高差不改变碰撞。
- 攻击源剑尖是否缺失保持“未证实”。补帧不得宣称已修复。
- 样板 13–20 秒卡顿不是产品性能证据，不得把样板 Canvas 重画方式带进 Phaser。
- 本计划的 commit 步骤全部延后。用户当前禁止提交。

## Review Focus

1. 新地标或新帧改变视觉包围盒后，攻击仍打敌人完整 `getBounds()`，命中矩形不能变大。Task 1 钉住 `Player.js` 的 250×170 / 170×250 与 body `60×26@(66,132)`。
2. 上游混合 manifest 与本地运行 manifest 不是同一schema。Task 2 校验上游旧裁片/独立生成源，运行条目保留真实 `source/crop_xyxy`，新地标用独立来源；组合门、阴影与透明云不能伪造裁片来源。
3. 河湾岸缘若被写成碰撞高差，会改变可走区域。Task 3 断言 Village 的 `grid/colliding/spawns/portals/qid` 与改前一致。
4. 新建筑 y 排序可能与固定 1200–2000 特效层冲突。Task 3 验证前后遮挡与特效相对主体可见，不能把合法世界y值落入某区间当作错误。
5. 补帧若直接写入 `assets/nli-preview/`，会在验收前改变运行角色。Task 4 要求 provisional 帧隔离存放，运行包哈希除获批地标外不变。

## 已知后置，不在本计划实施

- B 类桥岸接头、全向岸角、坡道、崖端头。
- 上下独立朝向、其他角色、受击/死亡帧。
- 帧接线、动画契约修改、全场景推广。1b 未验收则这些不得启动。

---

### Task 1: 不变量测试

**Files:**
- Create: `scripts/check-visual-invariants.mjs`
- Create: `scripts/fixtures/village-logic-before.json`
- Test: `scripts/check-visual-invariants.mjs`
- Read only: `src/entities/Player.js:21,100-101`，`src/scenes/WorldScene.js:527`，`src/assets/ts.js:44-82`

**Interfaces:**
- Consumes: 当前玩家 body、攻击矩形、一帧动画 key、Village 地图结构。
- Produces: `checkVisualInvariants(): Promise<{ok: boolean, failures: string[]}>`。失败时进程退出码 1。

- [ ] **Step 1: 写当前行为的特征测试**

断言：
- 玩家 body 为 `60×26`，offset `(66,132)`。
- 横向攻击矩形 `250×170`，纵向 `170×250`。
- `WorldScene` 对敌人的命中使用 `getBounds()`，不是 body。
- `warrior_idle/run/attack` 仍各为一帧。
- Village builder 的 `grid/colliding/spawns/portals/qid` 可序列化快照，供 Task 3 比较。

- [ ] **Step 2: 运行测试，确认它现在通过**

Run: `node scripts/check-visual-invariants.mjs`
Expected: PASS，对比固定快照 `scripts/fixtures/village-logic-before.json`。快照仅首次显式采集；普通检查不得创建/覆盖基线。此任务保护现状，不要求修改产品以制造失败，但应证明可抓住行为回归。

- [ ] **Step 3: 不修改 `src/`**

本任务只新增测试与快照。若测试不能在不改产品代码时读取上述值，停止并报告缝隙，不得为了测试去改玩法。

### Task 2: 混合来源导出与两个新地标

**Files:**
- Modify: `scripts/build-nli-preview.py`
- Modify: `scripts/check-nli-quality.py`
- Modify: `assets/nli-preview/manifest.json`
- Modify: `assets/nli-preview/README.md`（生成器同步产物，说明新增范围，不保留“只修18项”作为本阶段结论）
- Create: `assets/nli-preview/castle_medium.png`
- Create: `assets/nli-preview/portal_blue_gold.png`
- Test: `scripts/check-nli-quality.py`

**Interfaces:**
- Consumes: 只读包内 `Sprites/Environment/Buildings_And_Props/Castle_Medium.png` 与 `Portal_Blue_Gold.png`，以及现有 manifest 的 legacy/generated 两种来源。
- Produces: 两个新 key `castle_medium`、`portal_blue_gold`。每项记录 `designPxWidth`、`origin`、`depthRule`、`worldFootprint`。旧 53 个 key 的字节保持不变。

- [ ] **Step 1: 写失败测试**

分别验证两层来源：
- 上游NLI manifest的旧裁片项有实际裁片信息，新增独立图项有 `source_image_path/source_sha256`，与只读文件对应；不能对顶层null字段作统一总图假设。
- 本地运行manifest的53个旧项保留真实来源/组合/技术画布描述；两个新地标声明独立源、1254² RGBA、完整画布直拷、源/输出哈希一致。拒绝缺来源或伪造源的地标，不为阴影/透明云编造裁片。

并断言两个新 key 的源哈希等于只读 PNG，设计宽度不相等，且都不是 1254 世界像素的直接等宽缩放。

- [ ] **Step 2: 运行测试，确认失败**

Run: `python3 scripts/check-nli-quality.py --source .slim/deepwork/nli-systematic-2026-10-27/package --assets assets/nli-preview --trees snow`
Expected: FAIL，因为新 key 尚不存在。

- [ ] **Step 3: 扩展导出器**

只添加独立生成图分支。不紧裁/重编码新图，不把样板模糊重画带入导出。Medium 与 Portal 的具体 `designPxWidth/origin/worldFootprint/depthRule` 必须采用designer的 `village-display-contract.md`，不得由机械实现者猜视觉尺寸。新增条目放在旧53项全部生成之后，避免现有 `random.Random(766 + len(entries))` 改变旧地纹；旧53PNG哈希必须不变。

- [ ] **Step 4: 运行测试，确认通过**

Run: `python3 scripts/check-nli-quality.py --source .slim/deepwork/nli-systematic-2026-10-27/package --assets assets/nli-preview --trees snow`
Expected: PASS。旧 key 哈希不变，新 key 哈希与源一致或与声明的不裁切复制一致。

### Task 3: Village 显示层标杆

**Files:**
- Modify: `src/textures/ground.js`
- Modify: `src/scenes/WorldScene.js`
- Modify: `src/scenes/BootScene.js`
- Modify: `src/assets/ts.js`（仅静态TS_IMAGES接线，TS_SHEETS/TS_ANIMS和frameRate不变；BootScene如无需改变则不动）
- Create: `src/textures/villageGround.js`、`src/display/villageA.js`（designer契约的窄显示模块）
- Modify: `scripts/build-nli-preview.py`、`assets/nli-preview/manifest.json`（仅同步`runtime_derivatives`来源记录；不得改变旧PNG或55项图片计数）
- Test: `scripts/check-visual-invariants.mjs`
- Do not modify: `src/data/maps.js` 的玩法字段，除非测试证明显示层无法挂接；若必须改，先停止并报告。
- Create/Test: `scripts/check-village-a.mjs`（真实Phaser显示/遮挡/门区测试；原Task1脚本保持不变）

**Interfaces:**
- Consumes: `castle_medium`、`portal_blue_gold`，以及 Task 1 的 Village 逻辑快照。
- Display contract: `.slim/deepwork/nli-systematic-2026-10-27/village-display-contract.md`；704/480世界画布宽、原位池湾，不承诺同镜大河或人门1:1。
- Produces: 仅显示层的河湾岸缘、路肩、中央活动空间、中型城堡焦点、侧向传送门；按designer契约适配真实网格，其他15场景渲染不变。地标按脚底排序，并验证与角色/特效的相对遮挡；不为避开固定数值区间而破坏y排序。

- [ ] **Step 1: 添加真实Phaser显示契约测试**

断言：
- Village 逻辑快照与 `scripts/fixtures/village-logic-before.json` 一致。
- 玩家位于地标前后及攻击时的相对排序符合显示契约，特效不被错误盖住。
- 衍生岸缘资源名包含 `derived`，并有来源 hash。
- 玩家动画 key 仍是一帧。
- 改前真实Phaser几何基线为SDD目录`village-runtime-before.json`：house世界body `(848,944,160,180)`；东门locked body `(4178,1184,220,160)`；保留隐形旧house物理载体，不按新图大小刷新body。

- [ ] **Step 2: 运行测试，确认新断言失败**

Run: `BASE_URL=http://127.0.0.1:5186 node scripts/check-village-a.mjs`
Expected: FAIL，因为Village尚未放置新地标；环境/语法错误不算RED。原`node scripts/check-visual-invariants.mjs`继续PASS，不能重采基线。

- [ ] **Step 3: 只改显示层**

按 A 组织画面：弯河做边界，中央留活动空间，Medium 城堡做焦点，Portal 做侧向目的地。岸缘和路肩用标注过的衍生显示块。不改碰撞、出生、传送和题目。

- [ ] **Step 4: 运行测试与可玩性检查**

Run: `node scripts/check-visual-invariants.mjs`
Expected: PASS。

Run: `BASE_URL=http://127.0.0.1:5186 node scripts/check-village-a.mjs`
Expected: PASS，隔离context下的显示/旧几何/遮挡/门区行为满足契约；视觉美感另由observer验收。

Run: `node scripts/smoke.mjs`
Expected: 16 张地图结构仍通过；这是Node结构检查，不依赖浏览器服务，也不能当作真实走位验证。

### Task 4: 隔离的补帧准备，不接线

**Files:**
- Create: `.slim/deepwork/nli-systematic-2026-10-27/frames/PROVENANCE.md`
- Create: `.slim/deepwork/nli-systematic-2026-10-27/frames/ACCEPTANCE.md`
- Do not create files in: `assets/nli-preview/`，`src/entities/`，`src/assets/ts.js`

**Interfaces:**
- Consumes: 现有 `Hero_Row01_Pose02/03` 与 `Hero_Row02_Pose04`，只作参考。
- Produces: 一份验收清单，不产生已接入游戏的动画。

- [ ] **Step 1: 写验收清单**

`ACCEPTANCE.md` 必须要求：
- 侧向一个完整步态周期：接地、抬脚、摆腿、回环。
- 攻击关键帧包含完整武器运动范围。
- 统一画布、投影和脚点。
- 明确写“剑尖是否缺失仍未证实”。
- 上下独立朝向、其他角色、受击/死亡帧为后置。

- [ ] **Step 2: 写权利记录模板**

`PROVENANCE.md` 记录生成服务、提示词、日期、条款快照和 `provisional` 标记。没有这些字段，不得把任何新帧复制进运行素材。

- [ ] **Step 3: 确认运行素材未被帧任务改动**

Run: `node scripts/check-visual-invariants.mjs`
Expected: PASS，且一帧契约仍在。

### Task 5: 标杆验收与停止点

**Files:**
- Create: `.slim/deepwork/nli-systematic-2026-10-27/village-benchmark-report.md`
- Read only: 上述测试输出与 Village 截图。

- [ ] **Step 1: 收集证据**

记录质量检查、不变量检查、smoke、`npm run build`、前两章E2E（`BASE_URL=http://127.0.0.1:5186 node scripts/e2e.mjs` 和 `scripts/e2e-ch2.mjs`）及designer指定Village实机镜头。使用隔离浏览器context，不碰真实存档；核真实走位、portal可达性和角色/地标/特效遮挡。observer独立审查截图。截图必须看见Medium城堡、传送门、岸缘和路肩；不得仅凭截图宣称碰撞通过。

- [ ] **Step 2: 写停止结论**

报告必须写明：
- 标杆仍使用单帧角色，自然行走尚未完成。
- 桥岸接头未做，不能称为完整地形集。
- 帧接线未启动。

- [ ] **Step 3: 不提交**

不要 `git add` 或 `git commit`。把变更文件列表交给主代理。
