# 计划：地面可辨度 / 中英双语 / 行走动画（2026-10-29）

承接 `docs/superpowers/specs/2026-10-28-nli-v02-full-replacement-design.md` 之后的三项用户新需求。基线：已推送 `1199423`（origin/preview/nli-soft-fantasy）。诊断证据：`.superpowers/sdd/2026-10-29-ground-i18n-walk/visual-diagnosis/`。

## 用户目标

1. **地面**：游戏里真正看得出最新 v0.2 地面材质（用户反馈"地面纹理未换"）。
2. **双语**：全游戏中文/English，主画面有语言切换按钮；不改题目 ID、答案正确性、槽位、进度、存档。
3. **行走**：走路有可见迈步且节奏舒适。用户已选定方案：**从源包现有静态 Hero 姿态拼接行走循环**（源包无已校准连续帧；拼接姿态间未对齐，须如实标注，不得宣称自然步态）。

## 边界（沿用冻结约束）

- 源包 `/Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.2` 只读，不跑其 Tools；Tiny/旧包/ZIP 只读；不安装依赖；Phaser 不换。
- 保留玩法、碰撞、地图几何、题库内容与正确性、进度、存档语义；移动速度 1120、body 60×26 offset(66,132)、攻击 280ms/冷却 340ms 不变。
- 4 个 fixtures 与 94 before 快照冻结不改；契约变化显式声明，不以覆盖 before 掩盖。
- `check-visual-invariants.mjs` 中"ts_warrior_* 单帧"断言按新多帧 run 契约**显式更新**（改脚本，不改 fixture）；manifest/README 如实记录拼接来源与未校准状态。
- 已授权普通 commit/push 到 origin/preview/nli-soft-fantasy；不合并、不强推、不建 PR。

## Lane A（designer）：步态帧 + 地面权重

写 scope：`scripts/build-nli-preview.py`、`assets/nli-preview/`、`src/assets/ts.js`、`src/textures/nliGroundProfiles.js`、`src/textures/ground.js`、`scripts/check-visual-invariants.mjs`（仅单帧断言改多帧契约）。

1. **步态**：从源包 `Sprites/Characters/Hero_Poses/` 30 个静态姿态中选 3–5 张腿部姿态互异、同装备同角色朝向的图，经既有归一化管线导出为多帧 `warrior_run`（沿用 192×192 帧契约；帧数=姿态数）；`TS_ANIMS.ts_warrior_run` 改 `[sheet, N, cycleMs, true]`，cycleMs 初稿取 600–900ms（用户体验后再调）；manifest 记录每帧源文件与"stitched from static poses, not calibrated"声明。
2. **地面**：`nliGroundProfiles.js` 调高 grass（及必要时其余地形）混合权重为单次预定改动；`ground.js` recipe 升 `nli02-ground-v2` 强制缓存失效；grid、水/路裁边、尺寸/depth、碰撞全部不动。
3. RED→GREEN：先跑 `walk-repro`（帧多样性 gate，当前 RED exit1），实现后同 gate 转 exit0；再产一张固定机位 Village 截图交 observer 看地面可辨度（不自判 PASS）。
4. 自跑：sampling、quality（--trees snow）、invariants（新契约）、smoke、build。

## Lane B（fixer）：i18n

写 scope：`src/core/i18n.js`（新）、`src/data/quizBank-en.js`（新 sidecar）、`src/data/chapters-en.js`（新 sidecar）、`src/ui/`、`src/scenes/ChapterScene.js` 与 `WorldScene.js` 的文字调用点、`index.html`（data-i18n + 按钮容器 + lang 属性切换）、`scripts/check-i18n-parity.mjs`（新）、`scripts/e2e-lang-toggle.mjs`（新）。不改 `src/data/quizBank.js`、`chapters.js`、`maps.js` 原数据。

1. `i18n.js`：`getLang/setLang/t`；语言存独立 localStorage key（如 `pyquest:lang`），不入 save v2、不迁移；`setLang` 触发 HUD 重渲染与自定义 `pyquest:lang` 事件。
2. sidecar：qid→{prompt, explain, options?}（options 同长度同序、answer 索引不变、code 不翻）；chapters→title/npcName/npcLines/extraGreets/门文案；`_hint` 18 条与 chapter 标签同步翻。
3. UI 接线按 explorer 盘点路径:行号；主画面+标题页右上 `中文 | EN` 胶囊按钮（布局细节沿用 i18n-control.md 建议，实现归本 lane）；切换即时生效、不重置场景/抽题/存档。
4. 测试：parity 脚本（190 题覆盖、选项长度/索引/code 未翻）；lang-toggle E2E（zh 流程中途切 en：scene key 不变、answered/qAnswered/runeRolls 不变、重开同题）。

## 验证预算（父代理 owner）

- 步态：walk-repro 帧多样性 GREEN + 采样含 ≥2 独立源帧；节奏仅为初稿待用户体感。
- 地面：固定机位 before/after 截图各一张交 observer 判可辨度；不用 hash 冒称视觉。
- 双语：parity + toggle E2E 原样通过；smoke（zh 基线）不回归。
- 集成：两 lane 回交后父跑五检查 + 新增三项；暂存/提交/推送按 1199423 同标准。

## 明确不做

- 不改移动速度/碰撞/玩法；不把拼接步态称自然动画；不做全场景视觉重审；不重开旧 OPEN 项；不升级 Phaser 或装依赖。
