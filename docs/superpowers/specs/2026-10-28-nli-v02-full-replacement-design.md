结论：全面改用 v0.2 Sprites，以原帧规格内完整画布等比归一化为默认、仅放大地标局部分离显示，保留全部玩法几何与单帧动画契约；自然动画、地形重复质量和实机遮挡仍须验收。

# v0.2 全量视觉替换实施设计

## 1. 范围与证据
- 本轮仅设计；不接旧 Task3B、不重做 A/B/C，不修改产品、脚本、原包、Tiny、冻结样本或依赖，不安装、提交、推送。
- 唯一美术源根 `S=/Users/uranus/Developer/GitHub/pyquest/assets/NLI_SoftFantasy_ARPG_v0.2/Assets/NLI_SoftFantasy_ARPG/Sprites/`。下文路径均相对 S，省略 `.png`。
- 包 README 自称 v0.2.1；224 张的计数、尺寸及 Sprite/Generated/manifest 一致性采用主代理 `v02-parent-preflight.json`，不把哈希当成许可、生成过程或视觉质量证明。
- 审计必须连同 `v02-source-runtime-audit-errata.md` 阅读：21 sheets＋20 images＋6 tilesets＝47 Phaser key，另6 DOM key，共53运行 key；55项输出中的2个地标目前未加载。
- 不使用 `Source/Legacy_Sprites`、`Source_Crops`、v0.1 裁域、mask 或4px边衬假设。4张保留地标虽然字节未变，来源仍登记为新包 Sprites。
- 已实看本目录 `v02-visual-evidence/` 的6张完整画布联系表、角色脚底注册和材质重复研究，以及关键角色/地形原图。新版剑尖、双脚、阔叶树、独立城塔和专用长老可见；不沿用旧包残缺断言。
- 预览仅为只读衍生证据，未改源图。地形研究仍可见镜像花纹，不等于成品无缝验收。全包没有全不透明图；11张地形没有alpha0也不代表alpha255。
- 本文替代旧契约中的“53 PNG不变／只换两地标／仅Village地面”限制；保留 A 的暖光前庭、清楚路径、低对比池湾和蓝金目的地，不承诺原型同镜构图。

## 2. 视觉与不变量
- 奶油石墙、钴蓝屋顶、暖金交互物是主角；草地用灰橄榄绿、水用低饱和蓝绿。怪物保留自身红、绿、紫色身份，不给全场套蓝金滤镜。
- 背景压低对比，角色、门、符文保持原图饱和度与完整轮廓。保留当前中文字体、HUD结构和字号；不引入外部字体、图像、CDN或生成服务。
- 冻结 Phaser、1920×1280画布、0.7常态镜头及既有受击镜头效果；冻结地图、128网格、props逻辑位置、碰撞、出生、传送、题库、进度、存档、AI与随机调用顺序。
- 角色直接换同规格PNG，不给所有实体加视觉子对象。玩家/小怪192²、紫Boss480²、origin、scale、body设置顺序均不动；敌人判伤仍取原载体 `getBounds()`，不是alpha包围盒。
- 玩家body `60×26/offset(66,132)`；横/竖攻击矩形 `250×170/170×250`，方向偏移、340ms冷却、280ms攻击锁定不动。
- BossSlime仍480²、scale1.28、origin `(0.5,136/192)`、body `150×65/offset(165,330)`；BossSnake头scale2.5、体节1.24及全部蓄力形变、轨迹、接触伤害语义不动。
- 树的四种帧宽高及 `body.setSize(104,60).setOffset((w-104)/2,h-72)` 不动；house/gate/crystal的原static body和创建顺序不纠偏，不按新轮廓刷新。
- `heart_full`仍先显示15×13，再建static body，再显示116×100，浮动不refresh。其PNG尺寸本身不会改变这个被显式钉死的拾取体；本方案仍保留30×26输出。
- `TS_ANIMS`全部21项的key、1帧、dur、loop保持；`slash`原3 key/18fps和销毁事件保持。独立静态姿态不能串成“自然跑步”；真实补帧通过后另接动画。

## 3. 导出算法与字段
- `F(W,H,G,A,s0)`：完整源画布尺寸为 `(Sw,Sh)`，源脚点/注册点 `G=(gx,gy)`，输出点 `A=(ax,ay)`；所有坐标均为左上原点像素坐标，不是Unity pivot。
- `s=min(s0,ax/gx,(W-ax)/(Sw-gx),ay/gy,(H-ay)/(Sh-gy))`；平移 `t=A-sG`。分母为0的项忽略，统一等比，不分别取整宽高，不裁透明边距，不删除低alpha像素或柔光。
- 以逆仿射映射一次采样完整RGBA到固定输出画布；先预乘alpha再高质量缩小、最后反预乘，避免黑边。s、t保留至少9位；只在最终8bit通道四舍五入并clamp，勿先整数resize再paste造成脚点漂移。
- `H(n)`表示 `s0=n/(B8.bottom-B8.top)`，`L(n)`表示 `s0=n/max(Sw,Sh)`；B8为新源alpha≥8测量框，仅量光学大小，绝不是裁域。公式封顶优先于期望高度，输出实际s和B8变换范围。
- `C(W,H)`为完整源居中contain，留1输出像素安全边：`s=min((W-2)/Sw,(H-2)/Sh)`，`t=((W-sSw)/2,(H-sSh)/2)`。UI/VFX可用C，不按实体脚点注册。
- 不沿用旧 `rendered_size/offset/source_foot`。manifest每项记录新源相对路径、hash、原尺寸、完整源域、算法版本、F/C参数、实得s/t、输出尺寸/hash；复合图列出每一输入及绘制顺序。
- 以下所有源均1254²；未选的非方形源不得按1254²假定。完整画布适配会使窄长旧框中的物体变小，不能再拉伸补齐；表中明确采用的低位火炬、较矮符文石是视觉决定。
- 除表中另注，原图朝向不翻转、不旋转；实体继续现有flipX，玩家上下移动仍用既有侧身姿态。源左上暖光不为朝向单独重绘。

## 4. 全量映射：角色与场景物
路径简写：`HERO=Characters/Hero_Poses`；`NPC=Characters/NPCs`；`MUSH=Enemies/Mushrooms`；`SLIME=Enemies/Slimes`；`BOSS=Boss`。
`NAT=Environment/Nature_And_Props`；`BLD=Environment/Buildings_And_Props`；`UI=UI/Icons`；`PAN=UI/Panels_And_Buttons`；`LOOT=Items/Loot`；`ITEM=Items/Consumables`；`FX=VFX/Static_Elements`；`TERR=Environment/Terrain_Samples`。

### 4.1 11个角色key
下表写作 `输出；G→A；s0`，全部执行F。角色接地取A，不把剑尖、披风或bbox最低点当靴底；阴影仍使用原逻辑点。
| 现有key（组内逐个输出） | 新源 | 导出参数 | 运行尺度、朝向、接地与depth |
|---|---|---|---|
| warrior_idle | HERO/Hero_Row01_Pose02 | 192²；(704,1145)→(96,136)；87/1008 | scale2，靴底=实体点；可见高约174世界px；depth=y |
| warrior_run | HERO/Hero_Row01_Pose03 | 192²；(720,1168)→(96,136)；87/1081 | 同上；原右向，左向仍flipX；与idle等高，不伪造迈步 |
| warrior_attack | HERO/Hero_Row02_Pose04 | 192²；(544,1091)→(96,136)；87/1008 | scale2，约150高的自然下蹲；剑尖完整，不能拉高到idle |
| monk_idle | NPC/NPC_Elder | 192²；(704,1163)→(96,136)；92/1026 | scale2，约184高；脚=(p.x,p.y+72)，depth=p.y，蓝白长老 |
| pawn_red_idle、pawn_red_run | MUSH/Mushroom_Pose01 | 192²；(639,1021)→(96,134)；H(65) | 同一静态蘑菇，scale2，可见高130；脚=实体点，depth=y |
| warrior_black_idle、warrior_black_run | SLIME/Slime_Pose05 | 192²；(641.5,1039)→(96,134)；H(64) | 小怪scale2/高128；蛇头scale2.5/高160，原origin136使图脚在y−5，保留此差值；depth=y |
| pawn_black_idle | SLIME/Slime_Pose03 | 192²；(631.5,1027)→(96,134)；H(54) | 体节scale1.24/高约67，脚=各节位置，depth=节y；不增body |
| warrior_purple_idle、warrior_purple_run | BOSS/Crimson_Knight_Large_Pose | 480²；(672,928)→(240,340)；H(216) | scale1.28，可见全高约276；靴底=实体点，剑可低于脚；depth=y，王徽沿原轨迹 |
- 8章Boss全部按当前类复用上表：slime类用红甲骑士，snake类用绿色头＋6段史莱姆。保留现有姓名/玩法，这是明确的视觉代理；新包不能提供已验证的连续蛇、牛头怪或幻龙身体。
- 角色并未新增正背四方向或真实动画；真帧路线仍有效，但不在此次贴图接入中用独立pose冒充帧序列。

### 4.2 16个植被、建筑、门与物件key
物件允许重新校准**帧内图像脚点**；表外的运行图像位置/origin/displaySize及物理体不改。世界图脚由 `imagePosition+(A−origin×frameSize)×runtimeScale` 计算，不把旧manifest脚点当新源坐标。
| key | 新源 | F参数：输出；G→A；s0 | 显示与接地/depth |
|---|---|---|---|
| tree1 | NAT/Tree_Large | 256²；(632.5,1206)→(128,235)；H(222) | 原256²显示、origin(.5,.92)、y=p.y+81.92；depth=p.y+4；根约p.y+81.4 |
| tree2 | NAT/Tree_Small | 256²；(635.5,1131)→(128,235)；H(210) | 同tree1；完整画布底边封顶s=21/123，可见高168.512（约169）；198.8漏算底边约束，参数不变 |
| tree3 | NAT/Tree_Large | 256×192；(632.5,1206)→(128,177)；H(166) | 原256×192、y=p.y+61.44；depth=p.y+4；根约p.y+61.8 |
| tree4 | NAT/Tree_Small | 256×192；(635.5,1131)→(128,177)；H(150) | 同tree3；封顶后约120高；不再让四棵全是雪松 |
| bush1 | NAT/Bush_01 | 128²；(636.5,977)→(64,108)；H(70) | 原128²、origin(.5,.92)、y=p.y+64；根p.y+54.24；depth=p.y−.5 |
| bush2 | NAT/Bush_02 | 128²；(627,992)→(64,108)；H(72) | 同bush1；不增碰撞 |
| bush3、bush4 | NAT/Bush_03 | 128²；(632.5,1001)→(64,108)；分别H(74)、H(56) | 同bush1；允许小尺寸重复，不冒充不同生长动画 |
| castle | BLD/Castle_Tower | 192×320；(645.5,1191)→(96,310)；H(278) | 原scale2/origin(.5,1)/y=p.y+100，图脚p.y+80；depth=p.y；Village仅作隐藏新图载体 |
| tower | NAT/Standing_Rock | 128×256；(625.5,1091)→(64,224)；H(122) | rune原scale1/脚约p.y−.64；tablet原scale2/脚约p.y−9.28；depth=p.y，石碑非新城塔 |
| crystal | LOOT/Gem_Blue | 40×45；(652.5,1000)→(20,37)；H(34) | 原176×198、origin(.5,.95)，可见约100×93；脚p.y−25.3；depth=p.y；仅接地影移至图脚+4 |
| shroom | NAT/Flowers_Pink | 60²；(629,995)→(30,50)；H(45) | 原112²、origin(.5,.9)，图脚p.y−7.47；depth=p.y−.4；此key继续表示装饰花簇 |
| torch_0 | NAT/Torch | 40×80；(632.5,1182)→(20,75)；H(65) | 原112×224/origin(.5,.9)，图脚p.y+88.4；depth=p.y−6；完整含焰火炬，实得约100高 |
| gate_open | NAT/Stone_Gate | 320²；(633.5,1108)→(160,276.666667)；H(220) | 原384²/中心origin，图脚=p.y+140；depth=p.y+16；开口朝屏幕下方 |
| gate_closed | NAT/Stone_Gate＋BLD/Wooden_Fence | 同gate_open；先画Fence：320²，G(631,838)→A(160,262)，s0=.13；再叠同一Stone_Gate | 尺寸/origin/depth与open完全相同，栅栏位于洞内；不换源裁门、不增加阻挡体 |
| portal_door | BLD/Portal_Blue_Gold | 72²；(633.5,1136)→(36,64)；L(70) | 原300²/origin(.5,1)/y=p.y+48，脚p.y+14.67；door depth=p.y−1，doorlink=p.y+4；Village东门见§5 |
- 小型物件的完整画布封顶是最终导出约束，不得为凑旧可见尺寸擦除低alpha背景。crystal新轮廓较小，但旧body原样；实机须确认不出现新增难辨障碍，失败先交设计调整而非改body。
- torch_0已含完整火焰；`fire`见§6保留透明兼容帧。现有光晕/火星改以Torch源点 `(627,300)` 经同一变换得到的世界位置为发光点；仅显示坐标改，数量、频率、随机调用与生命周期不变。
- 所有树/灌木变体仍消费原来的随机选取调用，不添加新随机；不按章节改地图中的植物数量或位置。道具源图不做季节染色。

## 5. 两个现有未加载key：A地标的局部例外
- `castle_medium → BLD/Castle_Medium`、`portal_blue_gold → BLD/Portal_Blue_Gold`：1254²原字节复制；不经过F/C、不改alpha、不翻转；两项均从新包登记来源。本轮仅定义后续接入，不执行旧Task3B。
- Village house显示Medium：完整画布704²、origin(.40,.94)、锚 `(p.x,p.y+100)=(1024,1444)`、depth1444；无body。原castle载体使用§4新PNG，保留全部静态body创建过程后隐藏，仅此处显示/行为分离。
- Village东侧doorlink显示Portal：完整画布480²、origin(.50,.90)、锚 `(p.x+64,p.y+48)=(4352,1392)`、depth1392；成为 `it.sprite`，原 `it.x/y=(4288,1344)`、锁定220×160矩形、E半径280、tint与解锁不变。不重复画普通portal_door。
- 北gate仍使用gate_open/closed，北出口zone不动；不把蓝门贴在每个gate上。其他15场景door/doorlink统一用§4的300²显示，不随意放大。
- Medium完整范围 `(742.4,782.24,704,704)`；Portal范围 `(4112,960,480,480)`，右缘未越4608。原castle static body的已记录基线 `(848,944,160,180)`须由主代理复核，不能按画面墙体补碰撞。
- 地标接地：castle土垫中心(1088,1424)/半径(320,64)，portal中心(4352,1392)/半径(208,64)；path材质alpha.18、边缘16渐隐，仅非水格。阴影分别600×96/320×64，中心(1088,1432)/(4352,1400)，alpha.18、depth−9。
- 每100ms检查这两个地标与活动玩家/敌人：原主体getBounds与地标完整范围相交且subject.y<图脚y+4时，地标alpha=.45；离开外扩32范围或subject.y≥图脚y+20才恢复1。不改主体、不扩大攻击范围；其他普通门仅在同条件遮住角色时采用同样局部透明规则。
- 源完整性验收用alpha1，透明态另拍；不得用透明掩盖边缘。锁门仍原灰色tint，开放仍静态蓝漩涡；微光只作亮度呼吸，不声称传送动画。
- 接受不可进入地标的压缩门洞比例。大城墙不可能同时全部有实体与旧几何完全相同；若要求真实墙体或人门1:1，需另批几何，不能缩玩家/移路解决。
- Village真实水域仍西南27格；城堡到东门横距3264>镜头2742.86世界px，三个点不能同镜。这不是未完成的“大河布局”，是明确保留的地图约束。

## 6. VFX、物品、HUD与技术纹理：其余26个旧输出key
| key / 明确组 | 新源或技术例外 | 输出、朝向、运行显示与层次 |
|---|---|---|
| dust | FX/Dust_Trail | C(160,160)；原200²、alpha.8、depth=玩家y−.4；保留440ms单帧完成后销毁 |
| fire | 透明兼容帧，焰已在NAT/Torch中 | 64²全透明；保留ts_fire一帧560ms循环及原调用，不叠第二团火、不裁Torch火焰 |
| slash_0、slash_1、slash_2 | FX/Gold_Arc_01 | 各C(84,84)，三张同源静态；原210²/中心origin、18fps；右向弧，原left翻转/up−90°/down90°；depth=玩家depth+10 |
| shard | UI/Gem_03 | C(40,48)；原王徽88²/中心origin、y−292的浮动、depth=y+1；不加拾取或碰撞 |
| heart_full | UI/Heart_Red01 | C(30,26)；中心注册，原拾取创建顺序与116×100显示、浮动不变；固定FX层见§9 |
| ui_heart_full | UI/Heart_Red01 | F(64,64,(627,628.5),(32,32),38/894)，完整源，B8心宽38 |
| ui_heart_empty | UI/Heart_Empty | F(64,64,(631,635),(32,32),38/768)，同光学心宽38，不把空心图当半血 |
| ui_shard | UI/Gem_03 | C(64,64)；HUD碎片、ICON.star及index.html favicon共用同一新PNG |
| ui_map | PAN/Panel_Map02 | C(64,64)；ICON.map，画框完整，不取旧面板内部裁片 |
| ui_key | ITEM/Key | C(64,64)；ICON.key，金钥匙朝向不旋转 |
| ui_stamp | UI/Coin_01 | C(64,64)；ICON.stamp，不改完成状态语义 |
| ground_flowers | NAT/White_Flowers | F(96,96,(635,1067),(48,80),H(70))；原地面76²/原偏移，烘在地面−10，不增加花点 |
| ts_shadow | 程序接触影，非美术替代输入 | 保留192²技术软椭圆与各使用点尺寸/alpha；若重生成须同像素。不得声称是新包或Tiny原图；只表示接地，不装饰场景 |
| cloud1、cloud2、cloud3、cloud4、cloud5 | 透明兼容纹理 | 各576×256全透明；保留原云对象调用/随机消费，无旧云图可见，不编造包内云源 |
- 以上20个可见/兼容输出加6个地形key、2个地标与§4共计55；其中fire、cloud×5、ts_shadow是7项明示技术输出，不伪装成新包美术。
- `particle`不属于55 PNG：保留现有8²径向光点生成器，用于接触反馈、光晕、火星和水光；包内星芒/爆炸不是通用径向核，强行替换会破坏现有tint/scale语义。粒子颜色、时长、数量不改。
- `ground_<scene>`为产品一次性合成缓存，不是额外源美术；VOID填色、岸/路蒙版、技术阴影、交互状态环、镜头flash/wipe为功能绘图，保留并登记理由。
- `pixelArt.js`旧装饰像素图不能在正常运行中作为缺图回退悄悄出现；仅明确隔离的smoke stub可保留。产品缺少必要PNG须报错，不能凭旧图回退宣布全量完成。
- HUD的SVG 64²外壳、CSS尺寸、文字、计数及可访问性不改；关闭旧图的pixelated采样，使用平滑采样。技术SVG仅保留swirl/lock/pin/chevron/hourglass/flag等导航/状态符号，未被使用的MAP/STAMP/KEY/STAR旧绘图不算替换输入。

### 6.1 世界地图装饰也要替换
- `WorldMap.ART`原山水、树、房屋、火山、石台、塔、星环及装饰罗盘退出；不能以“SVG不是PNG”为由漏掉。背景改为平面暖纸色 `#f3e7cc`，不保留旧风景轮廓或铺满虚构新地图。
- 保留1000×600布局、NODE_POS、路线、节点、锁定/完成状态、文本、点击范围、Tab开关和响应式缩放。图片均pointer-events:none、aria-hidden，位于路线/节点/文字下方，原章节文字不重写。
- 下表矩形为SVG画布坐标 `(x,y,w,h)`，完整源contain、无裁切/旋转/投影；均alpha.9。七项新增地图专用PNG用C(256,256)，只为避免放大64²图标，属于55项以外明确新增的显示衍生物。
| 章节装饰 | URL key → 新源 | 完整图显示矩形 |
|---|---|---|
| 村庄 | castle_medium → BLD/Castle_Medium（复用原图） | (204,448,96,96) |
| 森林 | map_forest → NAT/Tree_Large | (280,244,80,80) |
| 高原 | map_highland → NAT/Standing_Rock | (443,464,88,88) |
| 星图塔 | map_tower → BLD/Castle_Tower | (520,184,80,80) |
| 熔炉 | map_forge → NAT/Torch | (676,452,80,80) |
| 神殿 | map_temple → BLD/Stone_Pillars | (611,328,88,88) |
| 信号圣殿 | map_signal → BLD/Banner_Tower | (836,166,72,72) |
| 深空 | map_halo → FX/Gold_Ring | (770,4,72,72) |
- 全图仅章节插画表达主题，不声称真有火山、信号天线或额外可进入建筑；装饰与任一节点标签外框保留至少8设计px，不满足时只缩小该装饰，不挪交互节点。

## 7. 六个地形key与产品地面配方
- 地形是唯一允许从源图选取**平面材质域**的美术类别；不是角色裁切的先例。下面新域来自已看过的v0.2研究，禁止复用v0.1矩形；不把孤岛、截面土层、悬崖、桥或台阶复制成可走地面。
- 输出仍各512²。研究中的长方裁域先取下表中心正方子域，再等比缩至256²，避免把草叶/石块压扁。alpha先在下表基色上合成，不能假设原样本不透明。
| key | 新源 | 最终源域(left,top,right,bottom)，右下开区间 | 合成基色B0 / 场景叠加强度a |
|---|---|---|---|
| grass | TERR/Terrain_R1_C1 | (480,96,800,416) | #7d9258 / .32 |
| forest | TERR/Terrain_R1_C3 | (480,96,800,416) | #647d52 / .26 |
| path | TERR/Terrain_R1_C2 | (400,96,880,576) | #baa374 / .40 |
| water | TERR/Terrain_R2_C2 | (128,128,1126,1126) | #3e7e88 / .18 |
| floor | TERR/Terrain_R2_C3 | (160,160,1094,1094) | #777583 / .34 |
| wall | TERR/Terrain_R3_C4 | (96,96,1158,1158) | #424651 / .30 |
- 令C为256²已合成材质；构造512² `P=[C,flipX(C);flipY(C),flipXY(C)]`。草/林/路/水再取 `Q(x,y)=.65P(x,y)+.35P((y+173)%512,(511-x+91)%512)`；floor/wall取Q=P，避免叠出双重石缝。RGB按通道线性加权，输出alpha255。
- Q作为该key的512²产品衍生PNG。地面区域先不透明填本场景基色B，再以a叠Q；所有pattern以世界(0,0)同相位repeat，1纹理px=1世界px，无逐格随机旋转。B0、a、镜像/二次相位均登记为产品加工，不冒称原包autotile。
- 这是一份待验的低对比重复配方，不是“新源已无缝”。若仍有显眼四瓣镜像/平铺条带，先在同平面域内调整产品材质；不得用新石头、树或全屏雾盖住问题，更不能改grid。
- 从**最终grid**构造水集合W与PATH并集Pth，水色只填W、陆色不得盖水角；路径内部满格、交叉口不描内边。外侧路肩0–24宽，使用同相位path从alpha.30降至0，只画非水、非阻挡格。
- 沿水/陆共享边：水内0–14宽浅青 `#92b6a5` alpha≤.22；水内距边 `4+2sin(2πs/96)` 的2px波线 `#c2d9bc` alpha.45；陆侧0–12湿土 `#54674a` alpha从.22衰减至0。拐角仅在水内连接、圆角≤12，W的阶形外边界不移动。
- 室内只给DWALL画墙材质和暗值，DFLOOR画地板，VOID为 `#242833`；轮廓忠实原阻挡格，不额外绘制向可走格伸出的立墙、深坑或发光熔岩。墙/地相邻区域平均亮度对比须≥1.5:1。
- ground_flowers仍按原FLOWER位置、76²和确定性偏移绘制；Village中心留白 `(1408,1856,640,896)` 内原花图不画，grid本身不改。不新增装饰点，不消费玩法随机流。
- 保留makeGroundTexture接口和一次构建缓存，key加配方版本/源hash以避免复用旧底图；场景尺寸仍 `def.w×128,def.h×128`、origin(0,0)、depth−10。复用小蒙版，禁止逐帧重绘、逐对象全图模糊或另建全图距离场。

## 8. 全16场景显示配置
所有场景使用§4–7的新源、同一角色与交互语义；表内只选地面基色/材质，不改chapter、mapDef、ambient值或props。表内路径/水仅在已有对应格上生效；室内不因“野外”名称改画草地。
| scene | 主地表key / B | 路或墙B | 水B / 场景视觉重点 |
|---|---|---|---|
| Village | grass / #7d9258 | path #baa374 | #3e7e88；A前庭、Medium、东蓝门，专用长老 |
| Dungeon | floor / #77717d | wall #42404b | 无新增水；金焰与红甲Boss，门前保留原通路 |
| Forest | forest / #647d52 | path #a59a70 | #3d747c；深绿阔叶、石碑、绿色体节Boss在Cave |
| Cave | floor / #6e786f | wall #3c4744 | 无新增水；青绿石面，绿色头/体节轮廓不可融底 |
| SciField | grass / #8d9565 | path #c2ad7c | #4f858e；较干暖高原，原符文石和蓝晶体 |
| SciLair | floor / #787080 | wall #443d50 | 无新增水；柔紫石面、红甲Boss |
| C4F | grass / #778d71 | path #b1aa88 | #477f89；偏冷平原，不擅改成森林 |
| C4L | floor / #707e8a | wall #374957 | 无新增水；蓝灰神殿、绿色头/体节 |
| C5F | floor / #8a786b | wall #4d4038 | 原本即室内式grid；暖石熔炉，不画可走熔岩 |
| C5L | floor / #79675f | wall #42362f | 无新增水；较深暖石与红甲Boss |
| C6F | floor / #858b7c | wall #454e42 | 原本即室内式grid；明灰绿外庭 |
| C6L | floor / #6f7e73 | wall #35463d | 无新增水；深绿迷宫、绿色头/体节保持高光 |
| C7F | grass / #7b927e | path #b6af8b | #4c8b91；冷绿平原、暖金符文反馈 |
| C7L | floor / #79728b | wall #413b55 | 无新增水；紫灰回廊、红甲Boss |
| C8F | floor / #737f91 | wall #3c465d | 原本即室内式grid；蓝灰深空庭，不重画太空道路 |
| C8L | floor / #676f86 | wall #31394e | 无新增水；最深冷石，绿色头/体节与金色反馈 |
- 相同key不按章改变帧尺寸、anchor或来源；差异来自基色与原props布局。未提供专门怪物的新章节继续明示代理，不用章节名推导不存在的美术。

## 9. 深度、最小实施接口与交付顺序
- 地面−10、地标接地影−9、水光−5；玩家/敌人/体节仍depth=y、脚影y−.5、扬尘y−.4、王徽y+1、斩击y+10；静态物件按§4表。不能规定“地标不得处于1200–2000”。
- 全16场景统一处理旧**固定**反馈层：`FX_BASE=ceil((def.h*128+1024)/1024)*1024`，`fixedFxDepth(d)=FX_BASE+d`。只映射旧1200/1500/1800/1900/2000，使它们在最大世界y上方并保留相互顺序。
- 必须覆盖WorldScene的花粉/火星、透明cloud、heart显示、奖励碎片粒子、floatText，以及Slime.burst和BossSnake断节/死亡两处1800；不能只修Village的WorldScene而漏Boss反馈。水光、局部aura、相对y排序对象不经过此函数。
- 地标遮挡靠§5透明规则，不把所有实体塞进新Layer，也不改变坐标系统。非地标的树前后关系仍服从原depth；不把slash全场置顶，地标近身时须能辨认玩家与挥击。
- 资源流水线仅重建新源元数据和同尺寸衍生PNG；55项原key/URL保留，额外7项仅供WorldMap。loader只补两地标，TS_ANIMS不改。manifest技术例外与 `runtime_derivatives` 独立列出。
- 地面继续一个makeGroundTexture入口，内部读取小型scene profile表和邻接边界绘制；源图处理离线完成，不把裁片/模糊/镜像计算搬进每帧update。
- 显示层只需小型辅助模块提供地标创建/遮挡、fixedFxDepth及图脚投影；WorldScene作局部委托。Player/Slime/BossSlime/BossSnake不改行为构造，仅必要固定FX调用接新深度函数。
- HUD/icons只换新衍生输入；WorldMap只替ART装饰层。保持音频、功能SVG、题目面板、DOM点击和键盘契约，避免趁换肤扩成UI框架重写。
- 主代理冻结源包2917文件及94工作区副本的既有证据继续有效；实施前后按其owner流程复核。旧测试绑定v0.1的源域应由测试lane另定新期望，不能把冻结fixture覆盖成新结果后宣布玩法不变。
- Tiny是symlink且会随Vite publicDir复制进dist；“正常运行不请求旧图”和“构建物不含旧文件”是两件事。本设计要求前者，不删除Tiny/cc0或改打包范围来伪称后者已完成。
- 后续顺序：生成衍生/核覆盖与尺寸 → 最小显示接入 → 主代理核几何与行为 → observer视觉验收 → 直接启动并展示替换后的真实游戏。常规映射、配色无需逐项问用户；失败项先修再展示，不另搭静态展示页代替游戏。

## 10. 可测验收与责任
以下是后续实施门槛，不是本轮已通过的测试。设计决定由designer维护，主代理负责覆盖/实机行为，observer裁定最终画面；任何fail不得用“hash一致”代替视觉通过。
| 检查 | 明确通过条件 | owner |
|---|---|---|
| 覆盖/来源 | 55旧输出逐项有新源或7项技术例外；7地图衍生有来源；正常运行不请求旧包/Tiny/Legacy/Source_Crops，不显示旧pixelArt回退或旧WorldMap风景；新key无404 | 主代理 |
| 帧与变换 | 所有既有帧W/H完全一致；F各源四角经变换均在输出内，sx=sy；注册点误差≤.5输出px；源/成品hash与实得s/t齐全，无v0.1 mask字段继续执行 | 主代理 |
| 核心几何 | 同状态/同位置的player、全部enemy/Boss getBounds与body、树四变体、house/gate/crystal、锁门矩形、portal zone与冻结基线逐字段一致；浮点容差≤1e−6 | 主代理 |
| 判伤/拾取 | 四方向攻击边界内外命中结果不变；蛇头/节接触、断节、召唤、受击和门解锁保持；heart创建后body15×13、放大/浮动后不变；不能只靠截图证明 | 主代理 |
| 动画契约 | 21项一帧dur/loop及slash原3key/18fps不变；攻击280ms、dust440ms及完成销毁路径正常，无用pose列表冒充自然循环 | 主代理 |
| 角色画面 | idle/run实得高174±2世界px、长老184±2、attack约150；帧切换同脚点，左右翻转不侧滑；双脚、剑尖、披风全；蛇头的既有−5脚差明确可见而非漂移bug | observer |
| 物件接地 | 依新A投影对齐地面/接地影，不用画布中心当脚；树根与旧阻挡位置可辨，crystal原body外不可新增明显“空气墙”观感；门开闭石框逐像素不跳，关门确实可见栅栏 | observer＋主代理 |
| 小图/边缘 | 亮底#edf0df与暗底#273c3e各看alpha1：无黑色重采样边、裁脚、白方底；HUD满/空心B8宽均38±1且计数可读；favicon在16/32px可识别金碎片 | observer |
| 地面边界 | W与水底覆盖严格相同，路径仍贯通；陆侧湿岸≤12、水内浅带≤14、路肩≤24；无水色泄入可走格、无孤岛立面重复或新假通路 | 主代理＋observer |
| 重复与明暗 | 4×4材质repeat在100%及实机0.7镜头看不到接缝线；接缝邻列/行RGB均差不超过内部相邻差均值的1.25倍＋1/255；不得出现主导画面的四瓣镜像/棋盘条带；墙地均值对比≥1.5:1 | 主代理量测、observer终判 |
| 遮挡/反馈 | 地标alpha1完整态、.45近身态分别通过；前方角色恢复正常排序，玩家头/武器/脚仍可辨；每章受击/断节/掉落/浮字都高于静态主体且按原时机消失 | observer＋主代理 |
| 全场景/UI | 16场景各有真实游戏图，覆盖入口、门/符文、各Boss；另有HUD、答题、对话、世界地图开/锁状态；当前支持的最窄视口不新增裁切/点击遮挡，标签与地图插画≥8设计px间隔 | observer |
- 基准采集1440×960视口、0.7稳定镜头、保留真实HUD，记录场景、玩家坐标、锁门/护盾状态、时间与seed；测试用隔离状态，不污染用户存档。所有源完整性截图保持正常alpha，不以debug框或透明态替代成品证据。
- Village必须补三机位：前庭玩家(1536,1632)、西南池湾(1664,2496)、东门(4144,1472)的locked/open；再拍前庭近身(1250,1300)遮挡态。它们是冻结真实地图机位，不是复刻原型相机。
- 未支持项：自然行走/四方向帧、真实连续蛇/龙/牛头怪、原包autotile、完整实体城墙、人门1:1及同镜大河城堡门户。默认保留上述明确代理/压缩地标，不阻塞常规新图接入；只有用户要求这些真实几何/专用美术时才升级决策。
- 本轮仅文档、读图、局部像素测量和只读预览；文档已完整回读，203行（≤350）。未运行游戏、浏览器、build/smoke/E2E或包内工具，未实施替换；自然动画、最终材质与实机画面仍为待验，不冒报完成。
