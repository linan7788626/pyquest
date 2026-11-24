# 《观测台停摆》画面打磨计划

适用于 Python for Astronomy 课程的桌面 Godot 试玩。范围为已经能通关的 5–10 分钟路线，先确定一段微缩模型的画面质量，再把同一标准用到现有院落、内厅和观测台。

## 美术目标

以 2019 年 Switch《塞尔达传说：织梦岛》重制版的微缩比例、材质区分、下脚接触与实机读图为标杆。蓝瓦屋、骑士、草木和陈设延续 Soft Fantasy 的造型与色板。先在关景深的正向游戏镜头里签收造型和光影，再判断适合课堂投影的景深强度。 [任天堂美术访谈](https://www.nintendo.com/en-gb/News/2019/October/Discover-what-graphic-refining-director-Yoshiki-Haruhana-aimed-for-with-the-visual-style-of-The-Legend-of-Zelda-Link-s-Awakening--1656228.html) · [Soft Fantasy 色板](/Users/uranus/Developer/GitHub/pyquest/prototypes/godot-toy-village/art/soft-fantasy-palette.json)

## 迭代与验收

按每周 1–2 次试玩反馈估算，完整打磨约 6–10 周。首个窗口是 1–2 周，先精修从门前院路到室内工作台的一段 20–30 秒动线。后续工期根据第一段实机反馈、模型返工量和复用程度更新。

| 顺序 | 制作范围 | 试玩验收 |
| --- | --- | --- |
| 第 1–2 周 · 门前到工作台 | 草地与土路边缘、石阶、门框、室内门槛、窗光、木桌和少量观测道具。 | 四处 1440p 同机位对照。关闭景深，在实际游戏镜头下走上石阶、进门、到桌前打开变量题。能看清草与石、木与墙的接触，窗口光线能解释画面的亮暗，题面仍然易读。 |
| 第 3–5 周 · 三处统一 | 复用第一段认可的色彩、圆角、受光方式，完善室内外过渡、后墙与观测台视野。 | 走完院落、内厅与观测台，角色轮廓、门槛、墙脚、互动点在各区都清楚。 |
| 第 6–10 周 · 整段收尾 | 检查脚落地、停步、披风、门扇和仪器的反馈、领星图的镜头。 | 以普通课堂投影大小跑完流程，交付无景深录像、画面回归、手柄与存档复测。 |

## 第一段样板

按同一路线记录院路、门阶、进门落点、工作台四个位置。对照使用同一个 Godot 场景、同一个机位和角色落点，课堂流程从工作台任务开始，以隔离要检查的画面。两组场景的光源、几何与材质差异随实际迭代记录。测试使用单独的临时存档位。

### 首轮验收记录

院路增加成簇的矮草、小花和碎石，草地与土路边缘有更自然的起伏，石阶和灯柱脚下加了接触暗部。踏步和进门落点有轻微磨损，门框下有圆角木槛。工作台补了观测笔记、黄铜目镜和擦镜布，右窗的暖色光区延伸到桌面和地板，桌脚和门槛附近补了接触色。

Godot Forward+ 在关闭景深时捕获了四组 2560×1440 原图。两组记录的相机位置、视轴、正交大小和角色位置逐项相同。比较图是对应原图的等范围裁切。录像记录约 20 秒的院路、上阶、进屋、到桌前打开变量题。当前样板用于评审局部材质和光影，整体精致度待试玩验收。

- [四处同机位局部对照](/Users/uranus/Developer/GitHub/pyquest/prototypes/godot-toy-village/evidence/threshold-comparison.png)
- [20 秒 Godot 实机录像](/Users/uranus/Developer/GitHub/pyquest/prototypes/godot-toy-village/evidence/threshold-refined-route.mp4)
- [改前机位记录](/Users/uranus/Developer/GitHub/pyquest/prototypes/godot-toy-village/evidence/threshold-baseline-review.json) · [首轮机位记录](/Users/uranus/Developer/GitHub/pyquest/prototypes/godot-toy-village/evidence/threshold-refined-review.json)
- [院路 Blender 源文件](/Users/uranus/Developer/GitHub/pyquest/prototypes/godot-toy-village/art/observatory-porch.blend) · [工作台 Blender 源文件](/Users/uranus/Developer/GitHub/pyquest/prototypes/godot-toy-village/art/observatory-desk-finish.blend)

Godot 正常运行会加载首轮精修。从本目录可复测相同路线。追加 `-- --baseline` 可用同一脚本重跑改前对照。

```sh
/Applications/Godot.app/Contents/MacOS/Godot --path . --fixed-fps 30 --script res://tests/capture_threshold.gd
```
