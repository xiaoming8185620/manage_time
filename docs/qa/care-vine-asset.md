# SceneCare 垂藤成长素材 v1

- 日期：2026-09-25
- 生成方式：内置 `image_gen`，未使用 CLI、手绘替代或像素后处理。
- 最终素材：`public/assets/care-vine-v1.png`
- 唯一画风和植物参考：`public/assets/town-environment.png`
- 原始最终生成文件：`/Users/bailian/.codex/generated_images/01a0d667-eb95-70f2-939d-3d4a05aa2e9d/exec-38938f62-b622-4fbb-8dd8-c8045055b779.png`
- 初稿路径：`/Users/bailian/.codex/generated_images/01a0d667-eb95-70f2-939d-3d4a05aa2e9d/exec-22251419-e8af-4278-8553-fab6b9f26b40.png`
- 保存方式：原始最终 PNG 逐字节复制，未裁切、重采样、抠图或转换。

## 视觉与 alpha 检查

- 尺寸：1024 × 1536，2:3 纵向。
- 图像模式：RGBA；alpha 范围 0–254。
- 完全透明像素：940827，占 59.82%。
- 藤蔓间隙抽样 alpha=0，背景是真实透明，而非绿色实心底。
- 原始 RGB 通道在透明区域仍保留绿色，忽略 alpha 的查看器可能展示绿黑底；按 alpha 合成时不可见。
- 可见内容范围（alpha>16）：(47, 23)–(973, 1513)，所有可见叶花未裁切。
- 边界共 14 个非零 alpha 像素，最大 alpha=1，属于几乎不可见的生成边缘残余。
- 宽厚黄绿/深绿叶片、白色花和少量黄色花、左上暖光与原图植物相符。
- 密集上冠与三条垂藤完整保留；左侧最短、右侧中等、中央最长。
- 生成器未严格实现 7–8% 留白；可见植物高度接近画布的 97%，集成时可由容器留出空间。
- 本次仅制作素材；未修改页面、服务或运行浏览器。

## 初始生成提示词

```text
Use case: stylized-concept
Asset type: one transparent raster growth overlay for a hand-painted 2.5D floating-town browser game, "SceneCare".
Input image: /Users/bailian/codex_project/manage_time/public/assets/town-environment.png is the ONLY style and botanical reference. It is a style reference, not an image to reproduce.
Primary request: Generate exactly ONE lush trailing flowering vine cluster suitable for draping over an existing railing. Only vegetation should be visible.
Style/medium: Match the reference image's warm hand-painted 2.5D eco-science-fiction illustration, softly painterly shading, clear dark-edged forms, no photorealism. Copy the visual language of the plants growing over the front railing of the reference: small thick oval yellow-green leaves with deep green shaded leaves; white daisy flowers with golden centers and a few small yellow flowers.
Composition/framing: Upright 2:3 portrait canvas, approximately 512 by 768 proportions. The whole plant is isolated, complete and uncut. A compact dense crown of leaves and flowers across the upper quarter, with a concealed root/attachment point horizontally centered at about y=25% of the canvas. Exactly three naturally draping main vine stems of visibly different lengths hang downward from that crown, slightly irregular and gently curved; the middle one longest, the other two shorter. Compact vertical overall silhouette. Plant content fills about 85% of the canvas while retaining transparent padding at all edges. Moderate-sized simplified leaves and flowers, each readable when the asset is displayed 100–160 px wide. No tiny fussy texture.
Lighting: Warm daylight from upper left, dimensional natural light within leaves; no projected ground shadow.
Background: GENUINELY TRANSPARENT background with an actual alpha channel, including all spaces between leaves and stems. Natural clean alpha edges. No white fill, no colored backdrop, no simulated checkerboard.
Constraints: Only the single living plant cluster. No pot, no planter, no railing, no house, no building, no platform, no soil or exposed roots, no landscape, no sky, no framing, no ground, no text, no symbols, no watermark. Do not copy any architecture or background from the reference.
```

## 最终调整提示词

输入图 1 为初稿（编辑目标），输入图 2 为 town-environment.png（唯一画风/植物参考）。

```text
Use case: precise-object-edit
Asset type: one transparent raster flowering vine overlay for SceneCare.
Image 1 is the edit target. Image 2, town-environment.png, remains the ONLY botanical and visual style reference.
Change ONLY the framing and the trailing vine lengths of Image 1: retain exactly three downward main vines, but make their lengths clearly different: viewer-left shortest ending at about 68% of the image height, viewer-right medium ending at about 80%, and center longest ending at about 92%. Center the entire isolated plant within a portrait 2:3 canvas. Keep about 7–8% transparent padding above, below, and at both sides, so the full plant occupies approximately 85% of the canvas. Keep the dense upper crown and its hidden attachment point horizontally centered at about y=25%.
Preserve the same thick yellow-green and dark-green leaves, white daisy flowers with golden centers, a few yellow flowers, clear readable leaf and flower shapes, and warm hand-painted 2.5D illustration lit from upper left.
The output must retain a GENUINELY TRANSPARENT background and real PNG alpha, including every hole between stems and leaves, with clean natural edge antialiasing. No color haze, no opaque backing, no ground shadow.
Only the single plant, fully visible and not cropped. No pot, planter, railing, architecture, sky, landscape, soil, exposed roots, text, frame, or watermark. Preserve the existing plant style and palette; do not make it photorealistic or add objects.
```
