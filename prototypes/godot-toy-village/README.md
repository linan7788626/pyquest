# PyQuest · 观测台停摆

Python for Astronomy 课堂试玩，设计时长约 5–10 分钟。默认场景是 `observatory-study.tscn`。从院落入口右侧的告示开始，进小屋读手册，在工作台恢复供电，到蓝门前校准曝光，再走进观测台领取猎户座示意星图。

[画面打磨计划与门口到工作台的验收记录](ART-POLISH.md)

## 打开

在 Finder 双击 `launch.command`，或用 Godot 导入本目录的 `project.godot` 后按 F5。

终端一行启动（首次需要等模型导入）：

```sh
/Applications/Godot.app/Contents/MacOS/Godot --path /Users/uranus/Developer/GitHub/pyquest/prototypes/godot-toy-village
```

无需安装额外插件或下载模型。验证环境：Godot 4.7.2、Blender 5.2.4 LTS RC、Apple M1 Max。

## 操作

- 左摇杆、十字键、方向键或 WASD 沿画面方向移动。
- 靠近提示后按手柄 A 或键盘 E 互动。选项用十字键、左摇杆或方向键选择，再按 A 或 Enter 确认。B 或 Esc 返回。
- 手柄菜单键或 Esc 暂停，可保存并返回开场。完成后也可重看星图。按 1 回正向视角，4 跟随主角。
- 关键任务和进出小屋时会保存本地检查点。下次选择「继续观测」从已保存区域的入口继续，变量、门和领取状态会恢复。「重新开始」需要在开场菜单确认。

机关通过选择预设的 Python 语句观察变量变化，适合手柄和课堂演示。此前的美术样板可在 Godot 单独运行 `courtyard-study.tscn`，详见 [ART-STUDY.md](ART-STUDY.md)。下面记录早期村庄和院落的模型与验证。
- R：回到入口；Esc：关闭题目。

桥旁蓝色符文 → 选择数字 `3` → 北门落下 → 过桥沿路穿过北门。答错可重试；本样板不扣血、不写入现有游戏存档。退出后状态重置。

## 文件

- `project.godot`、`village.tscn`：Godot 项目与入口场景。
- `scripts/village.gd`：角色、镜头、碰撞、UI 与示例机关。
- `art/village.blend`：可用 Blender 打开修改的源场景。
- `art/build_village.py`：原创建模脚本，固定种子，未下载第三方模型。具体参考图及哈希见 `art/reference_sources.json`。
- `village.glb`：运行模型；Godot 不需要安装 Blender 即可加载。
- `evidence/village.png`：Godot 实际画面，全景模式。
- `evidence/verification.json`：实际物理与交互检查结果。

本轮按 Soft Fantasy 的 Hero_Row01_Pose01、Tree_Large、House_Orange 原图逐项重建：奶白金边头盔、开槽面甲、月牙饰件与蓝披风；深青至嫩绿的层叠尖叶与张开的树根；橙瓦木框房屋、石脚与屋顶小窗。参考原图路径及 SHA-256 见 `art/reference_sources.json`。这是造型的三维转译，地面与建筑已加入参照原图生成的软绘材质图集，仍待用户评价还原程度。生成提示词和来源见 `textures/GENERATION.md`。

相机侧向旋转为零，村庄主路在画面里保持横平竖直；正交投影避免屏幕边缘的透视斜移。保留向下俯看的倾角呈现立体体积。补偿纵向缩短，让相同按键时长产生相近的屏幕移动距离；斜向输入归一化后也保持一致的屏幕速度。俯仰角固定，近景与全景都不会侧向旋转。

为实现实际近远景虚化，桌面默认改用 Forward+，轻度 SSAO 提供物体接触感。角色附近保持清晰，近远处逐渐虚化；F 可关闭景深。此设置不能直接作为 Compatibility/Web 的画面保证，Web 尚未验证。本轮在 Apple M1 Max 的 Metal Forward+ 实际渲染截图中检查。


## 重新生成模型

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python art/build_village.py
cp art/village.glb village.glb
```

先等待 Blender 成功结束，再复制。`art/.gdignore` 阻止重复导入 Blender 源文件。编辑 Blender 场景后也可手动导出 GLB 替换 `village.glb`。

课堂观测室的可编辑源文件在 `art/observatory-room.blend`。可用同目录的 `art/build_room_study.py` 重新生成。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python art/build_room_study.py -- --observatory
```

## 验证

```sh
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --editor --import
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . --fixed-fps 60 --script res://tests/verify_observatory.gd
/Applications/Godot.app/Contents/MacOS/Godot --headless --path . res://courtyard-study.tscn -- --verify-study
/Applications/Godot.app/Contents/MacOS/Godot --path . res://courtyard-study.tscn -- --capture-study
/Applications/Godot.app/Contents/MacOS/Godot --path . res://courtyard-study.tscn -- --capture-hero
/Applications/Godot.app/Contents/MacOS/Godot --path . res://courtyard-study.tscn -- --capture-room
```

课堂试玩验证使用合成手柄事件跑通机关、门和本地存档重载。图形模式下给相同测试命令加 `-- --capture` 可采集课堂试玩截图。院落场景的 `--verify-study` 检查方向、步态、墙体碰撞、门槛进出和树冠遮挡。早期村庄的 `--verify` 与 `--capture` 可在显式运行 `village.tscn` 时使用。界面字体使用系统字体，换系统应安装中文字体。

待课堂试玩反馈的内容包括题目节奏、错误反馈和手柄实机手感。早期村庄的题目与操作说明适用于独立的 `village.tscn`。
