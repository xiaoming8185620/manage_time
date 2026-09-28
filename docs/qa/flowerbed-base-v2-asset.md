# 状态驱动花圃底座 v2

- 方式：内置 ImageGen 精确对象编辑，原始生成字节直接复制，无图像脚本修饰。
- 输入：`public/assets/flowerbed.png`，1254 × 1254 RGBA。
- 输出：`public/assets/flowerbed-bare-v2.png`，1254 × 1254 RGBA。
- 原始生成文件：`/Users/bailian/.codex/generated_images/01a0d684-1f58-7530-9acf-30a354c322a8/exec-9c546bae-8ee4-44c7-a42a-3a1362d72b57.png`。
- SHA-256：`a104e1715181930d2c6b387662635d77caa2ac6a137b12215824d3a4f3b113bf`。
- 透明像素占 62.35%，保留真实 alpha。
- 保留原图未覆盖。

## 提示词

> Use case: precise-object-edit. Edit this exact transparent game sprite, not a new design. Remove EVERY living plant, green leaf, flower, stem, seedling and root from the interior of this raised flowerbed. Fill their former footprints with the same dark brown soil, small rocks, and soil texture. Preserve the exact original wooden frame, cream metal corner guards, screws, perspective, hand-painted 2.5D art style, illumination, shadows, object scale and position on the same square canvas. Do not move, zoom, recenter, resize or redraw the box. This is the bare BASE sprite for independent plant growth overlays. Genuine transparent background with alpha, no black or white fill, no checkerboard pattern baked in. Only the empty flowerbed box containing soil and stones should be visible. Opaque object, transparent exterior. No words, no new objects.

## 视觉检查

- 原来固定盛开的花叶全部移除，土壤和石块补齐。
- 木框、金属护角、螺钉、箱体透视和位置保持一致。
- 无固定白底、黑底或棋盘格；预览黑色区域为透明像素。
- 主线程需按种植区域单独叠加各成长阶段的植物素材。
