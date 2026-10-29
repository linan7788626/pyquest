# NLI 游戏素材质量修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复可避免的裁切与分辨率损失，不改变现有玩法、世界显示边界或碰撞。

**Architecture:** 从只读 NLI 源 PNG 直接生成更合适像素密度的派生图，保留原 texture key 与逻辑画布。只对紫 Boss 的帧/局部 body/scale 和爱心的静态 body 创建顺序作必要适配。美术判断由 designer 负责，测试与产品写入范围分离。

**Tech Stack:** 现有 Python/Pillow、Phaser 3.90、Vite、Playwright；不安装依赖。

**Spec:** `.scratch/nli-quality/spec.md`；用户已确认本计划并选择“接受雪树，修18项”（方案A）。

## Global Constraints

- 原 NLI 包、Tiny Swords、地图、题库、状态/存档、依赖文件只读；不运行原包重建工具。
- 不提交、不推送；复用现有 worktree、分支与 `http://127.0.0.1:5186/`。
- 保留53个PNG key、动画名、玩家攻击280ms、dust440ms和slash18fps/结束销毁。
- 世界位置、归一化origin、完整getBounds、物理body及交互半径不变；像素密度改变时scale和局部body参数可相应补偿，不把它们误当世界不变量。
- 原包Tools/Editor加固、完整动画、无缝地形、全新高清美术均为后续阶段，不混入本次。
- 城堡缺损继续明确标记；不拉伸矮房屋冒充高塔，也不声称所有源头问题已解决。

## Review Focus

1. Boss换480帧后切idle/run或受到攻击，body与完整bounds不能变化；Task 1/2动态几何回归覆盖。
2. 爱心初生、上下浮动、满血提示和受伤拾取时，静态15×13范围不能扩大或随显示移动；Task 1/2拾取边界回归覆盖。
3. 开闭门换纹理及doorlink锁定/解锁时显示边界不跳、静态body不刷新放大；Task 1/2状态回归覆盖。
4. mask不能把红披风误删，也不能继续裁银剑；自动裁域/像素密度检查加Task 3源图对照覆盖，不拿alpha数量替代视觉判断。
5. 窄屏、浮点时长、随机树变体和双重缩放可能误导验证；Task 1冻结随机/时序输入，Task 3检查窄屏与真实采样后的画面。

---

## 文件与接口

**唯一产品writer：designer `ses_e88a32eedffeDEbzySRKap3z6T`**

- `scripts/build-nli-preview.py`：固定源域、局部mask、密度与锚点换算；每张图从原生输入直接采样，不放大旧导出图。
- `assets/nli-preview/`：只更新选定PNG与manifest/README，未选PNG哈希不变。
- `src/assets/ts.js`：仅紫Boss帧480×480、dust帧160×160。
- `src/entities/BossSlime.js`：仅显示密度和局部body补偿，不改战斗逻辑。
- `src/scenes/WorldScene.js`：仅爱心创建时明确保留旧静态body，不改其他道具/地图/交互逻辑。

**测试writer：fixer（实施前派发并记录ID）**

- 新建 `scripts/check-nli-quality.py`：CLI `--source <包根> --assets <派生目录> --trees keep|snow`，检查实际PNG、来源、裁域、尺寸与哈希；只读输入，失败退出非零。
- 新建 `.slim/deepwork/nli-preview-2026-10-26/quality-check/geometry-check.mjs`：临时验证工具，`BASE_URL`默认5186，`--capture <json>`生成改前基线，`--compare <json>`比较改后。不得给产品添加诊断接口。
- 新建 `.slim/deepwork/nli-preview-2026-10-26/quality-final/runtime-check.mjs`：为Task3准备的窄范围加载/真实按键/特效检查；素材写入期间只做syntax-check，全部产物稳定后由主代理实跑，不重复geometry与E2E。
- 测试脚本和证据目录不与designer产品写范围重叠；旧`quality-before/`只读。

## designer 已选定的输出参数

下表来源相对原包 `Assets/NLI_SoftFantasy_ARPG/Sprites/`。裁框右下不含，尺寸单位为纹素；k相对旧逻辑画布。

| key | 来源与源域 | 输出画布/有效内容 | 保持事项 |
|---|---|---|---|
| warrior_purple_idle/run | Boss/Crimson_Knight_Large_Pose；(4,4,352,210)，沿主体和银剑轮廓mask去下方邻物 | 480²；约365×216；k2.5 | 源脚点(194,185)→输出(240,340)，不按颜色全局删除 |
| heart_full | UI/Icons/Heart_Red01；(8,10,37,35) | 30×26；30×26；k2 | 显示116×100；body仍15×13 |
| shard | UI/Icons/Gem_03；(14,4,36,40) | 40×48；26×44；k2 | 内容偏移(8,2)，皇冠显示88² |
| crystal | Items/Loot/Gem_Blue；(15,10,48,41) | 40×45；约36×34；k1.25 | 原归一化摆放，脚底41.25，显示176×198 |
| shroom | Environment/Nature_And_Props/Flowers_Pink；(4,4,58,48)，mask去孤立木片 | 60²；57×45；k3 | 偏移(0,9)、脚底54，显示112² |
| torch_0 | 同目录Torch；(4,4,34,69) | 40×80；30×65；k2.5 | 偏移(5,10)、脚底75，显示112×224 |
| gate_open/closed | 同目录Stone_Gate；(4,4,102,68)；closed叠Buildings_And_Props/Wooden_Fence (4,4,146,50) | 两态320²；底图300×195，栅栏约145×47；k5 | 底图脚底305；栅栏左25/底290，保持源宽高比；显示384² |
| portal_door | Stone_Gate完整左侧门框(4,4,62,68)，排除右侧独立柱 | 72²；约63×69；k1.5 | 中心不变，脚底70.5，显示300² |
| slash_0/1/2 | VFX/Static_Elements/Gold_Arc_01；(7,18,66,73)，仅去孤立邻物 | 84²；66×63；k3 | 偏移(9,12)，显示210²，保留透明度序列 |
| dust | 同目录Dust_Trail；(5,9,129,42) | 160²；135×35；k2.5 | 偏移(12.5,72.5)、脚底107.5，显示200² |
| tree1..4（需选择） | Environment/Nature_And_Props/Tree_Snow；透明边内保留针叶树，mask去左侧橙色树与左下石块 | 原256²/256×192；内容高度222/232/166/172 | 原镜像关系；树根(128,235)/(128,177)，保留覆雪颜色，不伪造绿色 |

**选择A：** 接受覆雪针叶树，实施18个key；其余35PNG保持原哈希。

**选择B：** 保留现有绿色树，本轮实施其余14个key；其余39PNG保持原哈希。树冠缺损与城堡缺损列为待补素材，不宣称已修复。

mask的最终顶点由designer根据实际源图确定并写入可复现脚本/manifest，不用未经验证的通用连通域或颜色阈值删除主体。小数落点必须有明确且统一的采样策略；不得将分数坐标直接传给仅接受整数的合成API，也不得累计多次缩放。逻辑锚点保持不变，manifest记录实际变换。

### Task 1: 锁定基线与红色回归检查

**Owner:** fixer；主代理审查失败是否来自真实旧缺陷。

**Consumes:** 上述固定参数、选定tree方案、既有 `quality-before/` 与当前未修改产品。

**Produces:** 两个验证CLI、改前几何JSON、旧版预期失败清单和源文件保护基线。

- [x] 快照当前ts.js/BossSlime.js/WorldScene.js至新quality-check证据目录；不得覆盖旧快照。
- [x] 编写 `check-nli-quality.py`：断言全部53PNG存在且与manifest尺寸/hash一致；14个核心key实际有效输出不再小于其保留原生源域；Boss源域包含y=194..209且不是扩大空画布；portal使用完整门框源域；栅栏保持比例；所选树策略匹配。
- [x] 对当前旧版运行该检查，保存明确的预期失败（Boss裁域、heart等有效像素不足、portal来源与栅栏比例）；不能把脚本错误或缺依赖当红灯。fix1后437检查/85预期失败，并补6个heart正负例防旧图插值假绿。
- [x] 编写几何CLI：隔离浏览器上下文，冻结随机种子及采样时序；记录相对对象位置的body矩形、完整bounds、origin、display尺寸，不要求改变密度后的scale或local offset与旧值相等。
- [x] 在产品写入前capture Village/Forest静态物体、玩家/普通敌人、Dungeon Boss的idle/run/受击状态，以及爱心初生/浮动、门开闭和doorlink状态。使用现有seam，不修改产品API。
- [x] 对同一旧版compare一次证明基线可重复；核对玩家120×52/384²、Boss192×83.2/614.4²、heart15×13且左上(x−7.5,y−6.5)，以及原门/水晶/树/房屋body参数。权威v4基线386采样/1009断言；Task1及fix1已独立审查通过。

### Task 2: 修正导出和最小接入

**Owner:** designer；Task 1红灯与基线确认后才能写产品。

**Consumes:** Task 1测试与冻结JSON；上表参数和用户tree选择。

**Produces:** 14或18张更新PNG、准确manifest/README与3处最小接入适配。

- [x] 按上表实现直接源图采样、固定裁域/局部mask及归一化锚点；复用现有辅助函数，避免为此重构整个生成器。
- [x] 更新Boss两帧为480²、dust为160²。Boss scale=1.28，local body150×65、offset(165,330)，origin仍(0.5,136/192)。
- [x] 爱心先以15×13显示尺寸建立静态body，再设置116×100可见尺寸，或采用等价的显式world body定位；由1009项几何回归证明body不随浮动改变，未refreshBody。
- [x] 运行生成命令：`python3 scripts/build-nli-preview.py --source /Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.1`。
- [x] 更新manifest：来源hash、源域、mask、逻辑画布、像素密度、实际输出/内容尺寸、变换与脚底；README准确记录城堡未解决。
- [x] 质量437/437、几何1009/1009通过；主代理重新生成55文件与此前两次哈希一致，35未选PNG不变。两处参照误计邻物已由observer裁定、fixer修正并独立复审，不放宽阈值。
- [x] 复用5186取得8组同镜头前后图、深浅背景素材对照和完整53key联系表；observer已独立查看，无重大新视觉缺陷。

### Task 3: 独立验收与试玩交付

**Owner:** 主代理负责代码/几何/行为，observer原会话负责视觉。

**Consumes:** 实际diff、Task 1/2证据、当前预览及冻结旧截图；不把writer总结当通过证据。

- [x] 主代理读全部新脚本及产品diff，检查仅有授权修改，未越界改地图/玩法/原包；独立代码及测试delta复审Approved。
- [x] 主代理复跑质量与几何CLI；原文件与冻结数据hash验证；`git diff --check`。
- [x] build、smoke、第一章E2E、第二章42断言E2E通过；产品59文件指纹在后续测试修复期间不变，复用有效证据，不重复全套。
- [x] 16场景、真实移动/攻击、特效实际动画delta及销毁通过；爱心与门由几何回归覆盖。水边测试过早采样已修，主代理独立runtime40/40通过；47必需PNG真实浏览器加载正常。
- [x] observer对照Boss剑尖、门框/栅栏、火炬/花草/道具和雪树，查看深浅背景及8组实机图，无重大新视觉缺陷；窄屏HUD无新增重叠，既有黑边/小字保留。
- [x] 全部验证与复审成功；2026-10-27复用5186，HTTP200、53PNG及manifest与验证版本一致，执行`open http://127.0.0.1:5186/`成功。服务/工作区保留，未commit/push；剩余源头限制见最终验收报告。

## 自审与执行门槛

- [x] 问题、产品写范围、验证边界与未解决项均可对应spec；只做第一阶段。
- [x] 测试先于写产品；baseline采集与产品writer有明确依赖，不并行争抢同一状态。
- [x] 测试判定world几何而非必然改变的像素尺寸/scale；视觉完整性保留独立审查。
- [x] 用户确认此计划并选择A：接受覆雪针叶树、修18项。按现有分工委派执行，不再新增实施方式选择。
