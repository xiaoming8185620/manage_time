# 机械港机车补充转向素材

- 工具：内置 ImageGen，2026-10-01。
- 输入：`public/assets/workshop-train-v2.png`。
- 原始生成文件：`/Users/bailian/.codex/generated_images/01a0cd61-14c5-7602-915b-f943b0106975/exec-7f575b68-0feb-4e61-bfb1-af9d4079cd3f.png`。
- 项目文件：`public/assets/workshop-train-cardinal-v1.png`，2172 × 724，RGBA；保留生成原图，未重绘或切割。
- 提示要求：同一奶白黄铜科幻机车和一节绿色货箱，透明背景，无地面、轨道和文字；固定俯视高度和物理比例，横排提供向右侧视、迎面、向左侧视、背向四个方向，身体保持直立，完整保留车轮。
- 生成结果未遵循等宽格子，因此使用实际透明边界标定裁切；裁切、轮底锚点和八向朝向集中记录在 `shared/workshop-rail.js` 的 `TRAIN_VIEWS`，由 `WorkshopArt` 在浏览器中展示。
- 运行路线：按底图绘制连续三次贝塞尔曲线，预计算屏幕空间弧长，按距离推进；用前后轮轨道连线决定朝向。前景楼梯和右侧花槽遮挡列车，隐藏车头不接收点击。外部回程连续运行，不穿过中央步行区。
