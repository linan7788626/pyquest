# Tiny Swords 地形复杂度与层次 Implementation Plan

> **For agentic workers:** 使用 subagent-driven-development；designer 负责视觉实现，主代理负责协调与验证。

**Goal:** 使用现有 Tiny Swords 素材增加真实游戏地形的复杂度与层次，保持关卡可玩。
**Architecture:** 在既有地面画布渲染与道具生成管线中增量实现；不替换引擎或素材，不改进度系统。
**Tech Stack:** JavaScript、Phaser 3、Vite、现有 Tiny Swords 本地素材。
**Spec:** 本计划第 1 节记录用户意图；具体设计选择见第 11 节。

- 状态：待修订。用户明确选择“也要高地和台阶”，下文仅地表/装饰的旧方案未获批准，不得直接据此实施；先完成高度/碰撞模型与官方素材用途核查。
- 基线：独立工作区 tinyswords-terrain，detached HEAD @ 44628f4；工作区已获用户批准，build/smoke 基线通过；不自动 commit 或 push
- 本计划由同日「视觉精修」计划收敛而来：**HUD 改版与 sp15 长题溢出修复移出本轮**（证据仍存 `./.slim/deepwork/project-audit-2026-10-24/ui/`，后续另行派工）
- 分工：designer = 地形方案/具体值/视觉验收；主代理 = 工作区管理、diff 与回归复核

## 1. 已批准意图与范围

- 用户原话（上一轮）：「如果确实是这样的结果，那就请基于现有的tinyswords素材对游戏画面进行改进吧。」（保留 Tiny Swords）
- 本轮收窄（最新）：「请根据tinysword的素材把游戏地形添加的更加复杂，有层次感些。」
- 允许：在安全边界内调整地图地形/装饰布局达成地形复杂性。
- 必须保持：出生点、符文/NPC/封印门/传送门/BOSS 位置与全部可达路径；**视觉高差与碰撞/行走规则一致**（水仍不可走；新 solid 道具即碰撞体，无"看得见撞不着"的假高差）。
- 明确不做：替换素材/低细节 SVG、blur/柔光/任何滤镜、题库存档玩法参数。本轮不引入新的可行走高度系统，"层次"= 水岸纵深 + 地表材质变体 + 道具前中后景；图集岸件方向必须先校准，不把未确认的用途判断写成"素材包没有高地件"的结论。

## 2. 素材调查结论（本地实测，全部为未使用资源）

| 资源 | 实测 | 用途 |
|---|---|---|
| `Terrain/Tileset/Water Background color.png` | 64×64，10 色带波纹 | 替换纯色水面 #47aba9 |
| `Terrain/Tileset/Water Foam.png` | 3072×192（48 格岸沫件） | 岸沫点缀 |
| 各 `Tilemap_colorN.png` 行 4-5 | 草↔水岸过渡件（直边+转角，深描边 #161c2e+岸沫） | 岸线自拼 |
| `Tilemap_color2.png` 内部格 | #85b156/#789e5f（黄绿草变体） | T.GRASS2 渲染 |
| `Tilemap_color3.png` 内部格 | #5fab62（深绿） | T.GRASS3 渲染（村庄内深色草斑） |
| `Tilemap_color5.png` 内部格 | #569b8d（青绿苔） | T.GRASS4 渲染 |
| `Terrain/Decorations/Rocks/Rock1-4.png` | 64×64 ×4 | 陆地岩石（solid 道具） |
| `Terrain/Decorations/Rocks in the Water/Water Rocks_01-04.png` | 1024×64 条×4 | 水面岩石（纯装饰） |
| `Terrain/Resources/Wood/Trees/Stump 1-4.png` | 192×256 ×4 | 树桩（装饰） |

关键发现：地图网格已散布 `T.GRASS2/3/4`（约 25-35% 格）与 `T.FLOWER`，但 `ground.js` 渲染时全部按平草处理——**变体是现成数据，只差渲染**。

## 3. Task 1 · 水岸系统 + 地表变体渲染（引擎层，全部野外图自动受益）

文件：`src/textures/ground.js`、`src/assets/ts.js`（仅新增 TS_IMAGES/TS_TILESETS 条目，不改既有条目）

**前置校准步**（一次性，产物存 evidence）：脚本渲染 Tilemap_color1 全 54 格编号网格图 → 肉眼标注行 4-5 各格的岸件方向（直边 N/S/E/W、凸角、凹角、草侧/水侧）→ 掩码→格映射表写为 ground.js 常量。

1. 水面：水格平铺 `Water Background color.png`（×2=128px，`imageSmoothing=false` 整数拼接）；`T.WATER`（深水）叠 `rgba(80,106,105,.35)`，`T.WATER2`（现有数据天然撒在岸边）= 浅水不叠 → 水体两阶纵深。
2. 岸线：按 4-bit 邻居掩码（水/陆）blit 岸件替换现有 12px 手画泡沫条；保留少量格内随机波纹。草侧贴图随地图用 color1（村庄/通用）或 color3（森林）的岸件。
3. 地表变体：GRASS2→color2、GRASS3→color3、GRASS4→color5 的无缝内部格 (1,1)（平铺无描边问题）；FLOWER 保留现有程序花。
4. 路径边缘：保留 roundRect 剪裁，加确定性边缘抖动（color4 实测阶 `#77915c`/`#969f64`，3-4px 块伸入草地 0-6px）。
5. 兜底分支（无 tileset 纯色）不动；`makeGroundTexture` 签名/返回 key 不变。

测试先行：新增渲染行为先用真实地图输入建立能失败的断言，再实现；不得只断言新增类名/常量存在。共用管线验收要包含通用巢穴，明确地区分草地/水岸与 DWALL/DFLOOR，不能以 smoke 的纯色兜底证明图集渲染正确。

保持不变：地图 grid/碰撞数据、交互半径、树静态首帧、相机 zoom、室内（地牢/洞窟）渲染、全部玩法数值。

## 4. Task 2 · W1/W2 地形道具层次（数据层）

文件：`src/data/maps.js`（仅 buildVillage/buildForest）、`src/scenes/WorldScene.js`（spawnProp 新 case）、`ts.js`（注册 rock/stump/waterrock）

1. spawnProp 新增：`rock`（Rock1-4 随机，×2 显示 128×128，solid body ≈88×52 + ts_shadow 96×48 α.4）；`stump`（Stump1-4 随机，显示 ×1 起步、截图校准，纯装饰无 body）；`waterrock`（Water Rocks 条取首帧 ×2，放水格，无 body，±3px 缓浮 tween）。
2. W1 村庄：池塘水格内 2-3 处 waterrock；小径旁 3-4 组 rock/stump；树线内圈补 4-6 丛 bush（现有类型）形成"树墙后景—灌木中景—岩石前景"。
3. W2 森林：rock 簇 3-4 组、stump 4-6、bush +4，强化林间空地与路径收束感。
4. 禁放规则（硬约束）：新 solid 道具锚点格不得为 PATH/WATER/FLOWER，不得落在任一 spawn±1 格、符文/NPC/门/传送门 rect±1 格、史莱姆初始格±1 格。
5. W3-W8 通用图本轮不改数据（Task 1 自动带给它们水岸+变体改善）；buildField 加 2-4 个非 solid 装饰列为可选加分项。

## 5. 可达性/碰撞检查（先写测试，后改数据）

`scripts/smoke.mjs` 新增（checkMap 后追加）：
- BFS 护栏必须按实际碰撞足迹建模，明确玩家尺寸和封印门开/关状态；交互对象检查可达的合法交互区域，传送门检查至少一个可进入的重叠区域，不要求被实体占据的中心格或整个 portal rect 都可站立。记录离散网格近似的限制，再用真实浏览器走位验证新障碍旁的路径。
- 顺序：先证明护栏在复制地图中人为堵住关键通道时会失败，再在未改地图上记录基线；不得为使基线通过而将错误降为警告。新增道具实现前添加缺失/非法放置的失败用例，实施后保持基线与新用例全绿。

## 6. 截图验证（designer 视觉验收）

- 改前基线 + 改后，同状态同视口 1280×720：W1 出生点（含池塘岸线）、W1 池塘特写、W2 十字路口、W3 通用图（验证引擎层收益外溢）。复用 `scripts/design-audit.mjs` 方法（BASE_URL + gotoChapter + teleport 固定位置）。
- 检查点：浏览器实际纹理键存在、源图尺寸与帧正确、无素材请求失败；动画随时间推进、无新增 pageerror。`verify-ts.mjs` 仅输出截图颜色占比，没有失败断言，不得单独充当素材加载门禁。

## 7. 回归命令（实施后，主代理协调）

`npm run build`；`node scripts/smoke.mjs`（含新 BFS）；`node scripts/verify-ts.mjs`；dev server 下 `node scripts/e2e.mjs`（W1）、`node scripts/e2e-ch2.mjs`（W2，本轮改动章）、`node scripts/e2e-ch3.mjs`（W3 代表）。ground.js/WorldScene 为公共层 → 主代理决定是否扩全 8 章 E2E。

## 8. Global Constraints

- 只许改：`src/textures/ground.js`、`src/assets/ts.js`（新增条目）、`src/data/maps.js`（W1/W2 构建器）、`src/scenes/WorldScene.js`（spawnProp 新 case）、`scripts/smoke.mjs`（新增检查）；其余只读。
- 素材本体文件零改动；不装依赖；不动 package.json/锁文件/题库/存档。
- 像素纪律：整数坐标、`imageSmoothingEnabled=false` 沿用、无滤镜无渐变。
- 坐标冻结：全部 spawn/rune/npc/gate/portal/boss 坐标逐字不变；`colliding` 集合语义不变（水不可走）。
- 排除：HUD 改版、sp15 长题修复、其余审计 bug、相机 zoom、菜单换肤。

## 9. Review Focus（主代理）

- diff 落在 5 个许可文件；ts.js 仅新增键；maps.js diff 不触碰任何冻结坐标（spawn/props 关键项/portals）。
- BFS 基线证据（改前全绿）+ 改后全绿；岸件映射表有校准图佐证。
- 截图前后对比：岸线自然、变体色不脏、水岩不遮挡岸线判定；新道具无"浮空/插水"错位。

## 10. 风险与回滚

- R1 岸件映射标错 → 校准图先行 + 池塘特写截图把关；映射表为纯常量可快改。
- R2 变体色阶与底草冲突显脏 → GRASS3/4 渲染加开关常量，截图不过则只保留 GRASS2。
- R3 新 solid 道具挡路 → 禁放规则 + BFS 兜底；出问题单点移除该道具坐标。
- R4 smoke BFS 误报（现有地图本有窄口）→ 核对实际碰撞与交互范围，修正模型；记录现存问题而非降低断言。必要时使用小步走位验证，不以传送替代路径可达性证据。
- 回滚：Task 1/2 文件接近不相交（仅 ts.js 共享新增段），可按任务独立 revert。

## 11. 设计判断归属（designer 选定，非用户指定，可否决）

- 层次感实现路径选"水岸纵深+地表变体+道具前中后景"，属于本轮小范围方案选择，不是对整个素材包能力的断言。
- WATER=深/WATER2=浅的语义分配；GRASS2/3/4 对应 color2/3/5 的映射；路径用抖动边缘而非描边件。
- W1/W2 优先（出场率与代表性），W3-W8 只吃引擎层收益。
- 用户未指定具体色值/道具数量；以上均为本计划为守住"TS 风格统一 + 可达性零回归"所做的取舍。
