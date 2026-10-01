# 今日计划场景融合调整

- 终端统一使用已有 ImageGen 透明素材 `public/assets/plan-terminal-v1.png`。
- 第一幕新底图：`public/assets/town-environment-bare-v3.png`，使用内置 ImageGen 编辑 v2；仅删除门边旧计划牌，保留构图、空花箱及植物根部位置。
- 最终提示词：Use case: precise-object-edit. Edit this exact game background, preserving original canvas aspect ratio and every position. Remove ONLY the standing white/teal planning sign kiosk beside the house door, centered at x=44%, y=37%, spanning approximately x40.5%-48%, y27.5%-46%. Remove its foot and cast shadow. Naturally reconstruct the small wooden planter behind it, bare tree trunk, house wall edge and wooden deck underneath. The existing white empty pot on its right stays. Do NOT add plants, text, new objects or replacement sign. Keep house, door, steps, solar roof, empty planters, workbench, glass railings, deck, sky, colors and all other geometry exactly unchanged. This is a surgical background repair, NOT a redesign. Match the existing warm hand-painted 2.5D game art. Output entire original background composition.

## 构图

第一幕：工作台边，脚点 52.7% / 44.4%，宽 5.2%；温室：左侧花坛步道，脚点 19.5% / 59%，宽 5.4%；机械港：右侧控制台，脚点 79.2% / 57.5%，宽 5.6%。左侧终端镜像素材，牌面文字独立保留正向，右侧终端朝向相反。

## 验证

- 三幕实际打开原有「今日计划」面板；温室验证 Enter 键。
- 390px 窄屏检查机械港点击区域为 44×44，中心命中计划按钮；恢复原视口。
- 771px 预览三幕截图：`docs/qa/scene-plan-{town,greenhouse,workshop}-v2.png`。
- `npm test`：51 项通过；`npm run build:family` 成功。仍有既存的主 JS 包大于 500kB 提示，无 CSS 语法警告。
- 真实家庭预览未创建任务、未消费星球币；最终余额仍 14。
