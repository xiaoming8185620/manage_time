# 树冠四阶段素材

- 成品：`public/assets/plant-canopy-stages-v2.png`
- 工具：内置 ImageGen，单次生成。未使用 CLI，未裁切、改色或移除透明像素。
- 原始文件：`/Users/bailian/.codex/generated_images/01a0d684-6498-7d21-be11-85b576f63a2a/exec-81400d56-6c64-4db7-9e23-7d903d39215a.png`
- SHA256：`112357bfecfc88d50884012778ba6b4459c21882f1179d8621562bbb5d5332ab`，与原图字节一致。
- 参考：`public/assets/town-environment.png`（原始树冠、色调和笔触）、`public/assets/town-environment-bare-v2.png`（裸树干位置及形态）。
- 尺寸：1254×1254，RGBA，2×2 每格 627×627，60.42% 像素完全透明。

## 各格测量

坐标相对每个 627×627 格子，边界基于 alpha≥128，右下边界不包含。渲染时可按实测中心对齐。

| 阶段 | 左上右下边界 | 边界中心 | 全格不透明覆盖率 |
| --- | --- | --- | --- |
| 0 初生 | 34,148,593,498 | 313.5,323 | 19.61% |
| 1 舒展 | 23,146,596,508 | 309.5,327 | 28.33% |
| 2 繁茂 | 23,116,615,477 | 319,296.5 | 31.68% |
| 3 盛放 | 13,111,610,492 | 311.5,301.5 | 35.12% |

视觉检查：均为横向树冠叶簇，无树干、花盆、文字、背景场景。叶色和小叶笔触接近原始场景；疏叶阶段有透明空隙，后续填入叶簇并增加小白花。实际画面宽度较提示词要求更满，但 alpha≥128 主体均未越过单元格。少量低 alpha 残余像素延伸至格子边缘，未擅自后处理；在场景浅色天空背景上应继续验证边缘。初生约为盛放不透明面积的 56%，密度仍清晰递增，并非精确 40/65/85/100 面积配比。

## 完整提示词

Use case: stylized-concept. Asset type: one transparent RGBA game sprite atlas, square canvas, 2 by 2 equal square cells. Reference image 1 establishes exact painterly style and the original tree behind the cottage: small olive green leaves, warm sunlight, delicate leaf clusters and irregular horizontal tree crown. Reference image 2 shows its bare tree trunk; generate leaf crown layers to overlay that trunk. Output ONLY four isolated foliage CROWNS of the SAME TREE, ordered top-left sparse healthy first growth, top-right growing, bottom-left lush, bottom-right full flowering canopy. These are sideways-spreading natural tree crown silhouettes, NOT upright flowering plant stalks or bouquets. NO tree trunk, NO large branches, NO stem, NO pot, NO ground, NO scene. Each crown has the same visual center and natural full outer footprint, crown width about72percent of its cell and height about54percent, centered in its cell. Progression is leaf coverage and density within that footprint: stage0 airy healthy leaf clusters about40percent coverage with clear transparent gaps; stage1 about65percent leafy coverage; stage2 about85percent dense crown; stage3 fully lush100percent crown with just a few tiny cream-white/yellow flowers. Fine small oval olive and warmgreen leaves with ochre sunlit edges, same leaf scale throughout all4sprites, soft painted darkergreen interior depth, irregular tree canopy outline. Handpainted 2.5D game art matching the reference exactly, warm sun upperleft. Space the four sprites clearly inside their own cells, at least12percent transparent margin, no sprite crosses a cell boundary. Genuinely transparent alpha background, not checkerboard or black. No words, numbers, labels, borders, grid lines, UI or extra objects.
