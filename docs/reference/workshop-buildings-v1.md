# 第三幕建设设备素材 v1

- 工具：内置 ImageGen；输出原样复制，未进行图像后处理。
- 风格参考：`public/assets/workshop-base-v1.png`，已选第三幕方案 1 的清空背景。
- 文件：`public/assets/workshop-buildings-v1.png`
- 生成源：`/Users/bailian/.codex/generated_images/01a0f61f-11d8-7be2-8087-8b4acff78566/exec-35f5a499-faf4-4d17-9594-5c2b883ce492.png`
- 实际尺寸：1774 × 887；RGBA，alpha 范围 0–255，870186 个像素完全透明。
- 图集：左/右两格，单格 887 × 887。左格机器狗充电休息坞，右格无人机检修架；无动物或无人机，无地板、场景、可读文字。
- 已检查：完整轮廓、相同俯视机位、奶白/黄铜/深色金属与青色指示灯、柔和接地阴影。
- 外围存在 alpha ≤ 16 的极淡生成像素，不能用任意非零 alpha 直接推断主体范围。以下范围取 alpha > 16，包含可见接地阴影；不修改原始 alpha。

| 设备 | 单格范围（左上含，右下不含） | 全图范围 | 建议地面锚点（单格） |
| --- | --- | --- | --- |
| 机器狗休息坞 | (63,224)–(881,777) | (63,224)–(881,777) | (470,760) |
| 无人机检修架 | (51,183)–(831,807) | (938,183)–(1718,807) | (425,790) |

建议锚点用于初步布局，是靠近前缘接地的视觉锚点；最终位置与缩放需在场景内验证。主体较不透明范围（alpha > 128）分别为左格 (70,225)–(868,767)、右格 (60,184)–(813,796)。

## 完整提示词

Use case: stylized-concept game sprites. Asset type: single transparent two-cell atlas of two small buildable machines. Image 1 is a STYLE AND CAMERA REFERENCE ONLY: do not reproduce its environment. Create a genuinely TRANSPARENT PNG, 1536 x 768 wide, 2 equal square cells side by side, no borders, no labels. Each object fully inside its own cell, ample transparent margin, consistent scale and approximately 30 degree downward 2.5D perspective like reference, viewed from front-left, with visible top surfaces. Both machines are low-profile floor-standing objects, much lower than a standing person. Hand-painted high-detail cozy hard-scifi, textured warm ivory ceramic panels, brass trim, charcoal gunmetal joints, tiny turquoise indicator lights, warmly sunlit from upper left. Fine bold outlines match reference, soft transparent contact shadow only. LEFT CELL: empty robot-dog charging/rest dock. A low wide rounded rectangular cream-metal bed platform with dark green padded inset, two small brass charging contacts, a short gently curved rear backboard with tiny cyan charging display and a neatly integrated cable, four short feet. Practical inviting little rest platform for a knee-height quadruped robot, no dog or any animal, no tall walls. RIGHT CELL: empty microdrone maintenance stand. A low hexagonal landing-service platform with small cyan inset guidance ring, two thin short articulated repair arms on opposing sides, a compact tilted tool/control panel integrated at rear, tiny stowed tools. Complete apparatus and all arms visible, no drone, no aircraft, no tall tower. Clear silhouette and conservative proportions for a game scene. NO background color, NO checkerboard pattern, NO floor slab, NO environment, NO buildings, NO words, NO people. True alpha transparency outside the two separate fully rendered devices. Do not overlap the two objects or their shadows.
