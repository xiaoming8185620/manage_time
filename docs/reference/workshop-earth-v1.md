# 第三幕全息地球图集 v1

- 生成方式：内置 ImageGen，实际引用用户选定的机械港方案 1。
- 方案参考：`/Users/bailian/.codex/generated_images/01a0cd61-14c5-7602-915b-f943b0106975/exec-4e4f6c2f-78ea-4176-b97d-0a292dd9acf2.png`
- 最终素材：`public/assets/workshop-earth-v1.png`
- 原始生成文件：`/Users/bailian/.codex/generated_images/01a0f61f-3776-7103-a1f2-f4bd21edda43/exec-f99b5547-ec8b-40c4-950a-8c88ce593941.png`
- 原图 1944 × 809，RGBA，三个 648 × 809 等宽格；亚洲太平洋、欧洲非洲、美洲。
- 经检查为真实透明 alpha；alpha 范围 0—254，约 67% 像素全透明。
- 无实体底座、背景、文字；完整轨道环未裁边。首次生成的光环接近边界，因此使用内置 ImageGen 缩小并增加透明留白；未进行脚本栅格编辑。

## 位置与显示建议

以下边界坐标相对于各自格子，右/下为开区间。使用 alpha > 16 判断可见主体，避免极低 alpha 散点影响边界。

| 帧 | 图集格子 | 主体 bbox | 下方光束白色亮点 |
| --- | --- | --- | --- |
| 亚洲太平洋 | x 0—648 | (63, 175, 595, 665) | (326.86, 640.49) |
| 欧洲非洲 | x 648—1296 | (61, 175, 593, 666) | (324.71, 640.53) |
| 美洲 | x 1296—1944 | (56, 175, 584, 665) | (319.16, 640.46) |

球心视觉估计分别为 (327, 387)、(325, 387)、(319, 387)，可见球面半径约 192 像素（不含柔和光晕与光环）。地球尺寸和垂直位置一致，第三帧有约 8 像素的水平偏移；交叉淡入时以光束亮点对齐，第二/三帧相对第一帧分别向右平移 2.15/7.70 个原图像素，避免切换时地球漂移。统一缩放，勿逐帧按主体 bbox 尺寸拉伸。建议共用内容窗 x=48,y=158,w=560,h=518，并保留透明边缘。

## 初始完整提示词

```text
Use case: stylized-concept.
Asset type: production game transparent holographic globe rotation sprite sheet.
Input image 1 is the selected and approved futuristic mechanical workshop scene; use its large central holographic Earth as the exact visual design reference. Create ONLY THE HOLOGRAPHIC EARTH, NOT the workshop.
Primary request: one wide transparent RGBA PNG, 1536x640 or similar wide ratio, THREE equal-size cells in one horizontal row. Exactly one complete globe per cell. These are 3 slowly-crossfaded rotation states of the SAME globe:
LEFT cell: Asia and Pacific Ocean facing viewer.
MIDDLE cell: Europe and Africa facing viewer.
RIGHT cell: North and South America facing viewer.
The spherical Earth must have IDENTICAL sphere radius, sphere center position within the cell, polar axis orientation and perspective in all 3 cells. Fixed elevated three-quarter view matching the input scene. Sphere center in each cell at x=50%,y=43%; sphere radius about32% cell width. Thin cyan latitude and longitude lines, glowing blue oceans, delicate green/ivory landmasses, scattered soft white clouds, fine luminous continent outlines. Translucent glowing cyan atmosphere. One broad thin tilted orbital ellipse around the entire sphere, with EXACTLY THE SAME ORBIT GEOMETRY and placement in all cells; preserve ring full edges inside each cell with8% transparent edge padding. Delicate translucent cyan projection beams converge under the globe into a small narrow bright point at x=50%,y=86% in each cell. All three lower projection anchor points identical.
Style: beautifully detailed hand-painted 2.5D eco science-fiction, warm workshop scene reference translated to cool cyan holographic light. Bright clear continental surfaces, thin line work, gentle glow only near the object.
CRITICAL: real transparent alpha background, not black fill, not white fill, not a checkerboard. Ocean/globe itself semi-transparent (not empty invisible), rings and beam genuinely translucent. No solid pedestal, no projection machinery, no floor, no ceiling, no building, no UI, no text, no numbers, no labels, no frames or grid.
Identical bounding geometry in all3 frames, entire orbit unclipped, each frame centered in its equal cell. Never overlap globes across cell boundaries.
```

## 第二次修订完整提示词

引用首次生成图 `exec-06f3d990-4da0-4133-b97b-3a687f9d22cf.png`，修正图集留白。

```text
Edit this transparent THREE FRAME holographic Earth sprite sheet. Fix ONLY scale and spacing: every complete globe INCLUDING its orbit ring and beam must become smaller, about75% the current linear size, and centered in each of the THREE equal-width columns, to leave generous fully transparent margins and gutters. CRITICAL: none of the three orbital rings may touch the canvas left or right edge, or cross any cell boundary. Leave at least12% of EACH CELL WIDTH transparent on both sides of that cell's whole complete orbit. All3 globes same radius, identical local sphere center and identical beam point baseline. Keep Asia/Pacific in cell1, Europe/Africa in cell2, Americas in cell3. Keep the beautiful existing detailed cyan holographic Earth artwork, tilted bright orbit, geographic shapes, projecting cone and fine lines. The object must be COMPLETE in each frame, NO clipping whatsoever, do not enlarge to fill each cell. Keep transparent background real alpha, not black fill; no labels, no new parts, no scenery. Keep one horizontal row of3 frames and wide aspect ratio.
```
