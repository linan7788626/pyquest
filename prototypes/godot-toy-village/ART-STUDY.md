# 星溪村 · 蓝瓦院落与小屋内厅

蓝瓦小屋与层次日光扩展为一屏可行走的院落。原创大树参考 Soft Fantasy 自有素材 `Tree_Large.png` 的分叉、扇形根系与深浅叶团，使用平滑三维曲面和顶点颜色。围栏、石座灯柱和花草围绕入口与长凳组织，土路通往可走的石阶。

## 查看

在 Godot 打开 `courtyard-study.tscn` 后按 F6 进入此美术样板。F5 和 `launch.command` 运行课堂试玩「观测台停摆」。

- 1 为正向游戏视角，2 查看树冠或室内墙脚，3 为场景全景，4 跟随主角。
- L：切换原版光照、层次日光、暖光；默认层次日光。
- F：开关景深；默认关闭以清晰观察形体。
- U：隐藏界面；H：显示角色；WASD/方向键移动；R：回当前入口；V：进入旧村庄。
- E：在院落的小屋门前进屋，或在内厅下方门槛返回院落。

内部与截图分辨率均为 2560×1440，窗口默认缩小至 1440×810。

## 本轮变化

主屋顶改成更少、更大的平滑曲面瓦，瓦色统一；木板、窗板、石脚和烟囱简化；圆角与曲面细分提高。当前使用安静的小色板与柔和受光，取消上一版木纹、裂纹及草叶满铺等表面纹理。屋顶为钴蓝，其他部位保留暖墙、木框和绿地的色彩关系。

- `art/cottage-study.blend`：独立组件的可编辑源模型。
- `art/build_cottage.py`：当前模型生成脚本。
- `cottage-study.glb`：运行模型。
- `scripts/cottage_study.gd`：当前配色、相机与查看功能。
- `textures/cottage_ground_clay.gdshader`：柔和地面与土路过渡。
- `art/archive-v3/`：上版手绘材质样板的模型和生成脚本。
- `evidence/cottage-inspection-1440p.png`：当前蓝瓦样例；game/detail 同名前缀为其他视角。
- `evidence/cottage-v4-orange-1440p.png`：换蓝色前的圆润版本。

## 验收状态

移动、落地、房屋碰撞、正向镜头、细节/检查角度与材质配置检查通过，当前截图从 Godot 实际渲染获取。房屋美术质量尚待用户评价。

本轮已修正屋顶交叠、屋脊帽和阁楼收口，并将门窗拱框重建为连续曲面；阴影精度与偏移已调整，大面积细条纹明显减轻。整体美术仍需继续按参考图评价。人物及装饰植物未作为完成资产验收。参考图中的桥、水、树、崖岸等不在本次房屋换色范围。

## 05 版对照

`evidence/cottage-v4-blue-before-1440p.png` 为上一版；`evidence/cottage-v5-inspection-1440p.png`、`cottage-v5-detail-1440p.png` 与 `cottage-v5-game-1440p.png` 为本轮固定截图。117 个屋面零件的闭合性与法线检查见 `art/cottage-roof-audit.json`。

## 06 版光影对照

本轮保留同一个 05 版模型与基础配色。调整主光、补光、天空辐照与反射、地面反光、接触阴影和表面粗糙度。屋瓦增加宽而柔和的高光，墙与石材保持哑光，窗玻璃增加微弱反射与暖色发光。

- `evidence/cottage-v6-lighting-baseline-1440p.png`：原版。
- `evidence/cottage-v6-lighting-daylight-1440p.png`：层次日光，当前默认。
- `evidence/cottage-v6-lighting-warm-1440p.png`：暖光。
- `evidence/cottage-v6-lighting.json`：记录同模型哈希、1440p 尺寸与主要光照参数。

三张图使用同一个三分之四机位，均关闭景深。运行中按 L 可直接比较；1/2/3 仍用于更换查看角度。模型形体与光影分别评价，当前等待用户美术反馈。

生成对照：

```sh
/Applications/Godot.app/Contents/MacOS/Godot --path . res://cottage-study.tscn -- --capture-lighting
```

## 第七版院落

- 配色取自 Soft Fantasy ARPG 的 `House_Blue.png`、`Tree_Large.png`、`Flowered_Ground_Composition.png`、`Wooden_Fence.png` 和 `Lantern_Pillar.png`。院落单独校准了钴蓝瓦、暖木与草地的饱和度。树冠从深青过渡到黄绿，花瓣保留局部高饱和色，石材与墙面维持低饱和。
- `courtyard-study.tscn` 是院落美术样板入口。`cottage-study.tscn` 独立保留第六版小屋光照对照。
- `art/courtyard-tree.blend` 与 `art/courtyard-study.blend` 是可编辑树木与院落道具。两份对应的 `build_courtyard*.py` 可从 Blender 重新导出运行模型。
- 树冠挡住角色时，树冠渐隐，角色头顶显示位置提示。树干依然阻挡角色，离开遮挡后树冠恢复。
- `evidence/courtyard-v7-{game,tree,inspection,occlusion}-1440p.png` 是 Godot 实际运行画面。`evidence/courtyard-v7-verification.json` 为通行和遮挡实测结果。

在本目录使用 Godot `-- --capture-study` 生成四张 1440p 图。`--headless -- --verify-study` 检查移动、台阶和物体碰撞及树冠可见性。

## 第八版主角与步态

依据 Soft Fantasy 原图 `Hero_Row01_Pose01.png`、`Hero_Idle_Four.png` 和四组步行图集重塑主角。保留暖白头盔、月牙冠、开槽面甲、蓝色披风与星纹盾。真实三维模型由 `art/build_courtyard_hero.py` 导出。`art/courtyard-hero.blend` 保留可编辑部件和关节。

步态按屏幕上的实际位移推进。前后左右各自转向，停步保留朝向，遇到障碍后收步。行走时膝盖屈伸、手臂交替摆动，披风随步伐摆动。`-- --capture-hero` 输出四个方向的原生 1440p 行走画面。

## 第九版小屋内厅

室内以 Soft Fantasy 原大厅的浅暖石板、青灰压顶和蓝色门扇为色彩参考。它沿用院落的圆角黏土模型、方向键与正交相机，以及同一位主角。壁灯暖光与蓝窗冷色增加室内层次。

`art/soft-fantasy-palette.json` 记录从参考 PNG 提取的色样、颜色所在区域、HSV 与原图哈希。样本代表 2D 成图的颜色。3D 材质以默认光照下的实际像素为准，结合主光、背光和色调映射校准。

墙脚从后墙连续接到低矮前景墙。两侧墙体缓降，保留完整的底座、内缘和门槛，方便从俯视角观察角色。`art/room-study.blend` 和 `art/build_room_study.py` 对应 `room-study.glb`。`-- --capture-room` 记录实机画面。
