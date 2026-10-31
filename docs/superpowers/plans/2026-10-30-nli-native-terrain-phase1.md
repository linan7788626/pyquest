# NLI 原生地形 Phase 1（Village 试点）实施计划

> **完成后路径迁移（2026-10-30）**：本文步骤保留实施时的旧 `assets/` 路径；当前运行输出为 `public/nli-preview`，原始素材从同级 `soft-fantasy-arpg-assets` / `PYQUEST_ASSET_ROOT` 读取。重跑导出使用 `python3 scripts/build-nli-preview.py`，质量检查使用 `python3 scripts/check-nli-quality.py --trees snow`；默认路径由 `scripts/lib/nli_paths.py` 统一提供，不要重建根 `assets/`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Village 地面由 NLI 原生整块软绘地形渲染，陆格邻水侧自动生长立体崖面，崖前实体被遮挡；玩法零变化。

**Architecture:** 三层——①导出器扩展：从 `Island_Cliff_Composition`/`Terrain_Samples` 切崖面片与调色材质，落 `run/ground/` 补充目录（62 键冻结）；②地面画布：native 门控的整片原生素材渲染（替换底色+半透明+网格线）；③崖面 overlay 画布：透明画布只画崖体，整图 depth 置顶实现遮挡（水格不可入 ⇒ 崖前实体恒在其北侧，整层置顶即正确）。

**Tech Stack:** Phaser 3.90（不新增依赖）、Python PIL 导出管线、node --test 单测、Playwright regression。

**Spec:** `docs/superpowers/specs/2026-10-29-nli-native-terrain-design.md`

## Global Constraints

- 源包 `assets/NLI_SoftFantasy_ARPG_v0.2` 只读；`assets/nli-preview` 62 键质量门冻结：新资产只进 `run/` 补充目录并在 manifest 顶层独立块声明（`run_sheet` 先例），`check-nli-quality.py` 必须保持 `output_count == 62` 全绿。
- 画布/世界 bounds/相机 clamp 不外扩（Village 4608×3072 不变），fixtures 与 94 before 快照零触碰。
- 崖面只长在陆格邻水侧：S 邻水→正面崖（FH=104：8px 草唇压陆格+96px 伸入水格）；E/W 邻水→侧壁窄条；N 邻水→草唇+合成阴影带（无原生北向崖面，如实标注 synthetic）。**（S 几何已于 2026-10-30 修订：LIP 8→64、FH 104→160、REACH 96 不变，recipe v3→v4——见 Task 4 末尾修订块）**
- 显示层调色：向橄榄绿/深蓝收敛（常量取自 `.scratch/nli-terrain-spike/build_spike.py` 原型实测），源素材与 62 键导出像素不改。
- 玩法零变化：碰撞网格、速度 1120、攻击 280/340ms、抽题、双语、存档语义不动；室内场景与**非 Village 户外场景渲染路径本期不变**（native 仅 Village profile）。
- 地面缓存 recipe：`nli02-ground-v2` → `nli02-ground-v3`。
- 全套检查须绿：sampling / quality(--trees snow) / invariants / smoke / parity / build / node --test / regression。

## Review Focus

1. **双面崖与内角**：一格 S+E 都邻水时 bits 必须同时置位、渲染不互相吃掉——Task 2 单测覆盖内角样例。
2. **干边界不产崖**：无水邻接的地图边缘不得长崖（画布不外扩的前提）——Task 2 单测覆盖。
3. **62 键边界**：新资产进 `run/ground/` 独立块，绝不能混入 62 键表——Task 1 与 Task 5 各跑一次 quality 断言。
4. **非 Village 门控**：Forest/SciField/C4F/C7F 必须走旧渲染路径——Task 3 单测断言 profile.native 仅 Village 为 true。
5. **遮挡方向**：崖 overlay depth 必须 > 场景内一切实体 depth（实体 depth ≤ 地图高）——Task 4 regression 浏览器断言。

---

### Task 1: 导出器扩展——崖面切片与调色材质

**Files:**
- Modify: `scripts/build-nli-preview.py`（追加 terrain_cliffs 导出段）
- Create（生成物）: `assets/nli-preview/run/ground/` 下 `terrain_grass.png` `terrain_path.png` `terrain_water.png` `terrain_flower.png` `cliff_s_band.png` `cliff_ew_strip.png` `cliff_n_lip.png`
- Modify（生成物）: `assets/nli-preview/manifest.json`（顶层 `terrain_cliffs` 块）

**Interfaces:**
- Consumes: 源包 `Island_Cliff_Composition`（正面崖整条 src=(350,405,900,915)，结构：顶面 y≈226..430 / 正面崖 y≈430..880 / 基岩+浪花 y≈880..1100）、`Terrain_Samples`（grass/path/water/flower 材质）、原型调色常量 `.scratch/nli-terrain-spike/build_spike.py`（只读参考）。
- Produces: manifest 顶层块 `terrain_cliffs`：`{"files": {<相对 run/ground/ 的文件名>: {"sha256":…, "size":…, "source": 源图名+切片坐标}}, "display_transform": "recolor toward olive/deep-blue, display-layer only, source pixels untouched", "not_gate_keys": "supplementary assets in run/ground/, NOT part of the 62 quality-gate keys"}`。后续任务按文件名引用：`run/ground/<name>.png`。

- [ ] **Step 1: 实现导出段**

在 build-nli-preview.py 追加：切 `cliff_s_band`（整条正面崖，含草唇/岩壁/基岩/浪花）、`cliff_ew_strip`（东西侧壁）、`cliff_n_lip`（北向草唇）；从 Terrain_Samples 导出 4 张调色材质（调色参数复制原型脚本实测值，py 内注释标明"from spike, display-layer transform"）；全部写入 `run/ground/`，manifest 增 `terrain_cliffs` 块（sha256、来源、display_transform、not_gate_keys 三项声明齐全）。

- [ ] **Step 2: 运行并核验产物**

Run: `python3 scripts/build-nli-preview.py`
Expected: 7 个新文件存在；`python3 -c "import json;m=json.load(open('assets/nli-preview/manifest.json'));b=m['terrain_cliffs'];assert len(b['files'])==7 and 'not_gate_keys' in b"` exit 0；62 键不变（`git status --porcelain assets/nli-preview | grep -v 'run/ground\|manifest'` 为空）。

- [ ] **Step 3: 质量门**

Run: `python3 scripts/check-nli-quality.py --source assets/NLI_SoftFantasy_ARPG_v0.2 --assets assets/nli-preview --trees snow`
Expected: exit 0，`output_count == 62` 依旧成立。

- [ ] **Step 4: Commit**

```bash
git add scripts/build-nli-preview.py assets/nli-preview/run/ground/ assets/nli-preview/manifest.json
git commit -m "feat(terrain): export cliff slices and recolored native materials to run/ground/"
```

### Task 2: 崖面掩码纯逻辑模块（TDD）

**Files:**
- Create: `src/textures/nliCliffs.js`
- Test: `tests/cliffs.test.mjs`

**Interfaces:**
- Consumes: `T`（`src/data/maps.js`，水码 = WATER/WATER2/WATER3）。
- Produces: `export const CLIFF = Object.freeze({ LIP: 8, REACH: 96, FH: 104 })`；`export function computeCliffCells(def)` → `Array<{x:int, y:int, edges:int}>`，edges 位序 W=1,E=2,N=4,S=8（与 ground.js adjacentMask 一致），仅当陆格（非水码、非 DFLOOR/DWALL）在对应方向邻水时置位；`export function isWaterTile(v) -> boolean`。

- [ ] **Step 1: 写失败测试**

`tests/cliffs.test.mjs`：三个用例——①S 邻水陆格 → edges==8；②S+E 双邻水（内角）→ edges==10；③四邻全陆的边界格 → 不出现在结果里（干边界不产崖）；另断言 PATH 陆格邻水也产崖（路面台地）。

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test tests/cliffs.test.mjs`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 `computeCliffCells(def)`**

纯逻辑：遍历 `def.grid`，对非水格做 4 邻接探测（直接内联 isWaterTile，不 import ground.js 的私有函数）。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test tests/cliffs.test.mjs`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/textures/nliCliffs.js tests/cliffs.test.mjs
git commit -m "feat(terrain): cliff cell masks derived from grid adjacency (TDD)"
```

### Task 3: Village 原生地面渲染 + 合成元素原生化

**Files:**
- Modify: `src/textures/nliGroundProfiles.js`
- Modify: `src/textures/ground.js:38-45,98-135,177-203`（paint()/drawOutdoor()/makeGroundTexture()）
- Modify: `src/scenes/BootScene.js`（preload 追加）

**Interfaces:**
- Consumes: Task 1 的 7 个 `run/ground/` 资产；`T.FLOWER`。
- Produces: `nliGroundProfiles.js` 导出 `NLI_GROUND_RECIPE = 'nli02-ground-v3'`、`NLI_TERRAIN_ASSETS = Object.freeze({ grass:'run/ground/terrain_grass.png', path:'run/ground/terrain_path.png', water:'run/ground/terrain_water.png', flower:'run/ground/terrain_flower.png', cliffS:'run/ground/cliff_s_band.png', cliffEW:'run/ground/cliff_ew_strip.png', cliffN:'run/ground/cliff_n_lip.png' })`、`loadTerrainAssets(scene)`（BootScene.preload 调用）、Village profile 增 `native: true`（其余 profile 无此字段，语义 falsy）；`ground.js` 导出 `groundCacheKey(def) -> string`（从 makeGroundTexture 现有缓存 key 构造中提取，供 regression 断言）。

- [ ] **Step 1: 写失败测试**

`tests/terrain-profile.test.mjs`：断言 `NLI_GROUND_RECIPE==='nli02-ground-v3'`；`Object.keys(NLI_TERRAIN_ASSETS).length===7`；`NLI_GROUND_PROFILES.Village.native===true`；`Forest`、`SciField`、`C4F`、`C7F` 的 `native === undefined`。

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test tests/terrain-profile.test.mjs`
Expected: FAIL。

- [ ] **Step 3: 实施三处**

①`nliGroundProfiles.js`：recipe v3 + NLI_TERRAIN_ASSETS + loadTerrainAssets（`scene.load.image` 循环）+ Village `native:true`。②`ground.js` drawOutdoor：当 `profile.native` 时走新分支——整片铺调色材质（alpha 1.0，不再画底色/网格线；grid 线仅旧分支保留），FLOWER 格铺 `flower`，path/water 区域铺对应调色材质（裁剪逻辑复用现有 clipRegion）；`VILLAGE_GROUND_PADS` 土垫在 native 分支不绘制（城堡周边由原生草/路直接呈现），门口铺路用 path 材质近似（manifest 已如实声明）。③`BootScene.preload`：`loadTSAssets(this)` 后调用 `loadTerrainAssets(this)`。非 native 场景渲染路径逐字不动。

- [ ] **Step 4: 跑测试确认通过 + 冒烟**

Run: `node --test tests/cliffs.test.mjs tests/terrain-profile.test.mjs && node scripts/smoke.mjs`
Expected: 全 PASS（smoke 断言 Village 可玩、无浏览器报错）。

- [ ] **Step 5: Commit**

```bash
git add src/textures/nliGroundProfiles.js src/textures/ground.js src/scenes/BootScene.js tests/terrain-profile.test.mjs
git commit -m "feat(terrain): native material ground for Village (gated), recipe v3, pads/paving nativized"
```

### Task 4: 崖面 overlay 渲染与遮挡接入

**Files:**
- Modify: `src/textures/nliCliffs.js`（追加渲染函数）
- Modify: `src/scenes/WorldScene.js:80` 附近

**Interfaces:**
- Consumes: Task 2 `computeCliffCells`/`CLIFF`、Task 1 切片键 `cliffS/cliffEW/cliffN`（经 `scene.textures.get(NLI_TERRAIN_ASSETS.*).getSourceImage()`）、`groundCacheKey(def)`。
- Produces: `renderCliffOverlay(scene, def) -> {key: string, canvas}`：透明画布 def.w*TILE × def.h*TILE；缓存 key 必须含 recipe v3 与 def 的场景标识段（构造方式与 `groundCacheKey(def)` 保持一致，例如 `'nli02-cliff-v3:' + <场景标识>`，若 def 无现成标识字段就从 groundCacheKey 的既有 key 结构取同一段）；S 崖贴 `cliffS` 条带（底对齐格子下缘，LIP=8px 压陆格、REACH=96px 伸入水格，段号按 (x*3+y*5)%n 换源窗纹理避免重复——沿用原型做法）；E/W 贴 `cliffEW` 窄条；N 贴 `cliffN` 唇 + 合成阴影带（画布内 `rgba(20,44,60,.35)`，注释标 synthetic）。WorldScene：`makeGroundTexture` 后（实体全部创建完成后）`this.add.image(0,0,cliffKey).setOrigin(0,0).setDepth(def.h*128+1)`，仅 `def` 对应 profile `native` 时执行。

> **修订块（2026-10-30，用户批准的 display-only 几何修订，Task 4 范围内字面量同步）**：
> 本段与 Step 1 中的 v3 字面量（`'nli02-cliff-v3:'`、`nli02-cliff-v3:Village`）已随修订升为
> **`nli02-cliff-v4`**；S 崖几何 **LIP=8px→64px、REACH=96px 不变、FH 104→160**（`= LIP+REACH`）。
> 动因：旧 LIP=8 在南水缘真实碰撞停靠处 0px 可见遮挡（碰撞体底低于脚锚 44px ⇒ 38px 死区，
> task5 三拍法实测），Task 5 验收的「可达遮挡」不可交付。修订仅动 `src/textures/nliCliffs.js`
> 的 CLIFF/CLIFF_RECIPE 常量与注释；masks/colliders/画布/E/W/N 几何不动。行为证据：
> `.superpowers/sdd/2026-10-30-nli-native-terrain-phase1/verification/final-visual/`。

- [ ] **Step 1: regression 浏览器断言（先红）**

`scripts/regression.mjs` 追加两项检查：①`window.__PYQUEST__.active()` 场景中 `scene.textures.exists('nli02-cliff-v3:Village')`（键名格式按 Produces 定义；2026-10-30 修订起为 `nli02-cliff-v4:Village`，见上方修订块）；②崖 overlay image 的 `depth > player.depth`。

Run: `node scripts/test-game.mjs --regression-only`
Expected: FAIL（overlay 尚不存在）。

- [ ] **Step 2: 实现 renderCliffOverlay + WorldScene 接入**

按 Interfaces 实现；画布缓存（同 key 直接复用）。

- [ ] **Step 3: regression 转绿**

Run: `node scripts/test-game.mjs --regression-only`
Expected: exit 0，新增两项 checks 绿。

- [ ] **Step 4: Commit**

```bash
git add src/textures/nliCliffs.js src/scenes/WorldScene.js scripts/regression.mjs
git commit -m "feat(terrain): auto-grown cliff overlay with entity occlusion (Village)"
```

### Task 5: 契约更新与全套验证

**Files:**
- Modify: `scripts/check-visual-invariants.mjs`
- Modify: `assets/nli-preview/README.md`

**Interfaces:**
- Consumes: Task 1-4 全部产物。
- Produces: invariants 新断言——`NLI_GROUND_RECIPE` 常量检查更新为 v3；Village `computeCliffCells(def)` 针对真实 Village 网格输出**确定性快照断言**（首次运行记录 N 格崖格与位组合分布，写入断言并注明"explicit contract change per 2026-10-29 spec, fixtures untouched"）。

- [ ] **Step 1: invariants 契约更新**

按 Produces 更新断言；跑 `node scripts/check-visual-invariants.mjs` 确认 Village grid/colliding/spawns/portals/qid 与既有 fixture 比对**零变化**（崖面为渲染层，不触网格）。

- [ ] **Step 2: README 声明**

`assets/nli-preview/README.md` 追加 terrain_cliffs 段：原生切片清单、display_transform 声明、N 向唇+阴影为 synthetic、土垫/门口铺路的原生化决策。

- [ ] **Step 3: 全套验证（逐条 exit 0）**

Run: `node --test tests/*.test.mjs && node scripts/smoke.mjs && node scripts/check-visual-invariants.mjs && python3 scripts/check-nli-sampling.py && python3 scripts/check-nli-quality.py --source assets/NLI_SoftFantasy_ARPG_v0.2 --assets assets/nli-preview --trees snow && node scripts/check-i18n-parity.mjs && npm run build && node scripts/test-game.mjs --regression-only`
Expected: 全绿。

- [ ] **Step 4: 目测留证**

同机位 Village before/after 截图各一（after 含崖前角色被遮挡画面）→ 交 observer 目测 + 用户过目。

- [ ] **Step 5: Commit**

```bash
git add scripts/check-visual-invariants.mjs assets/nli-preview/README.md
git commit -m "test(terrain): cliff contract assertions and docs for native ground v3"
```
