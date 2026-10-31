# 项目变更记录

## 外部素材源迁移：运行时入库与 CI 简化（2026-10-30）

- 运行时 NLI 贴图从根 `assets/nli-preview/` 迁移到已入库的 `public/nli-preview/`（70 张 PNG 字节不变），
  浏览器 URL 保持 `/nli-preview/*`；Vite `publicDir` 改为 `public`。
- 根 `assets/` 目录移出本仓库；原始 NLI 素材包位于外部素材仓库（默认同级 `soft-fantasy-arpg-assets`，
  根目录下直接是 `Assets/NLI_SoftFantasy_ARPG/Sprites`，无额外 `NLI_SoftFantasy_ARPG_v0.2` 包装目录，
  可用 `PYQUEST_ASSET_ROOT` 覆盖），仅导出器与素材质量检查需要。旧 Tiny Swords / CC0 包**不在该外部素材仓库**，
  随旧根 `assets/` 保留在外部迁移备份中。开发、构建、游玩与 `check:release` 只消费已入库运行时，不再要求本地完整素材。
- `dist/` 不再把整个 `assets/`（约 1.9 GB 源包/ZIP/Unity 包）复制进构建产物，只含 `public/` 运行时贴图
  （实测约 18 MB）；`check-build.mjs` 原有的 dist <20 MB 与 ZIP/Unity 包排除断言已恢复。
  注意：子目录部署 404（贴图绝对路径 `/nli-preview/*`）仍未修复，check-build 仍不全绿，见 issue 13——
  本次只消除全量打包成因，不改子目录路径模型。
- CI 完整游戏工作流不再把 TinySwords / NLI 包复制进 `assets/`，也不校验 `PYQUEST_ASSET_ROOT`；
  自托管 runner 只需可跑原题校验的 Python 科学计算环境与浏览器。逻辑 CI 不依赖任何私有素材。
- 导出器默认 `--before` 指向 `scripts/inputs/nli/` 的固定技术种子（`ts_shadow.png`，SHA256 固定），
  不再依赖临时快照目录。
- 地形 v4（悬崖切片 + 地表细分）为**迭代版本**：细节更丰富但整体仍偏杂乱，视觉梳理继续迭代，非最终视觉验收。

## 稳定性修复与 NPC 长老试点（2026-10-29）

- 标题页自动保存增加会话保护；重新开始后关页不会把旧进度写回。
- 旧存档先验证再应用；v1 迁移写入失败时保留旧键，并提示保存失败。
- 转场锁覆盖场景切换和揭幕，快速折返不会锁死；结算期间暂停世界并保护玩家。
- Python 题面改为单次分词生成高亮；长题可滚动，奖励按钮可达。
- 玩家直行与斜行速度统一；蛇形 BOSS 改用空间距离跟随轨迹。
- 场景退出清理按钮监听、对话定时器、碎片动画和胜利界面。
- 构建暂以 `publicDir: 'assets'` 打包整个 `assets/`（约 1.9 GB，含 NLI 源包、ZIP、Unity 包）；运行时只加载 `/nli-preview` 清单贴图，且贴图为绝对路径、子目录部署暂不可用——收窄 dist、体积预算与子目录支持待 runtime-assets 管线适配 NLI 路径模型后恢复。
- 长老（及当前全部运行美术）使用 NLI 软绘贴图（`assets/nli-preview/`，长者为 `monk_idle`）；没有 `?art` 外观切换参数。
- 增加逻辑测试、隔离浏览器回归、自动测试服务、生产构建检查与持续检查配置。

运行素材与当前存档格式保持兼容。NLI 原图和素材包位置保持不变；主角动画、地形换肤仍属后续美术接入范围。
