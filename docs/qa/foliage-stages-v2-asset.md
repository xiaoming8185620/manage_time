# 直立花草四阶段素材

- 用途：按植物保存的成长等级选择真实植物素材；2×2 等格图集，顺序为左上初生、右上舒展、左下繁茂、右下盛放。
- 工具：内置 ImageGen，未使用 CLI；原始生成 PNG 按字节复制，未裁切、去背或重绘。
- 最终资产：`public/assets/plant-foliage-stages-v2.png`
- 参考：`public/assets/town-environment.png`（画风）、`public/assets/care-foliage-v1.png`（植物种类）。
- 原始首版：`/Users/bailian/.codex/generated_images/01a0d684-6498-7d21-be11-85b576f63a2a/exec-18459254-5045-4882-9b3b-92ee3b1b5dab.png`
- 最终原图：`/Users/bailian/.codex/generated_images/01a0d684-6498-7d21-be11-85b576f63a2a/exec-e335faab-d04f-40a9-9e72-413a99eaa752.png`
- SHA256：`d2ddb23d308fb46d35f4fa23e20d3c86cf9f144561ce9a11bc633bf6dfbe3e93`
- PNG：1254×1254，RGBA，76.99% 像素完全透明；每格 627×627。

## 实测布局

使用 alpha≥128 读取边界，根部以最后 4 行不透明像素的平均横坐标估计。所有坐标相对各自 627×627 格子；边界为左、上、右、下，右下不包含。

| 等级 | 边界 | 根部锚点 x,y | CSS 锚点百分比 |
| --- | --- | --- | --- |
| 0 初生 | 175,255,499,563 | 332.7,563 | 53.06%,89.79% |
| 1 舒展 | 104,100,508,563 | 302.7,563 | 48.28%,89.79% |
| 2 繁茂 | 104,180,540,569 | 329.6,569 | 52.57%,90.75% |
| 3 盛放 | 80,156,543,571 | 310.0,571 | 49.44%,91.07% |

视觉检查：四种阶段清楚可辨，幼苗无花、舒展期含花苞、繁茂期有少量花、盛放期增加多朵白黄雏菊。植物间无重叠，各格左右至少约 12% 透明留白；根部并未严格落在完全相同像素，使用上表锚点对齐，不依赖统一 50%/88% 假设。舒展期枝条更直立，后两期更宽密，成长体现为新枝叶和花朵而非单纯放大。最终场景中的配色、尺寸与遮挡仍由主任务浏览器验收。

## 首次生成提示词

Use case: stylized-concept. Asset type: one production game sprite atlas, square transparent RGBA PNG, a precise 2 by 2 grid of equal cells. Input image 1 is STYLE reference only: handpainted 2.5D warm ecological sci-fi floating town. Input image 2 is plant species and texture reference only. Generate ONLY four isolated upright flowering leafy plants, same plant at four growth stages. Cell order: TOP LEFT young seedling, a few fresh olive green leaves, no flowers; TOP RIGHT growing, more branches and leaves, a few closed buds; BOTTOM LEFT lush, broad dense green leaves, a few small white daisies; BOTTOM RIGHT full bloom, dense broad leaves and many small cream white daisies with yellow centers. This is a growth atlas: structural change and new branches, not merely enlarged copies. Maintain matching camera angle and recognizable main stalk. Each cell's stem terminates exactly at horizontal center and 88 percent down its own cell, fixed root anchor in all four cells. The plants grow upward from that root anchor. No pot, no soil, no detached roots, no ground or shadow plane. All foliage remains within its own equal square cell, at least 12 percent margin at left, top and right, bottom root ends at88percent. Soft warm sunlight from upper left, warm olive and deep green handpainted leaves, restrained cream white petals, crisp painterly outline suitable for small rendered game plants. The last plant is widest and fullest, but leave clear transparent gaps between all cells. Genuinely transparent background with alpha, not black or checkerboard; no text, labels, stage numbers, grid lines, border, UI, other objects. Output one complete atlas image.

## 布局校正提示词

Edit only the layout/placement of these four plant sprites, preserving each plant's exact style, species, colors, four distinct growth stages, real transparency, and artwork. This is a precise 2x2 equal-cell square sprite atlas. Each of the four root/stem bottom endpoints MUST be exactly in the horizontal CENTER of its own cell, at 88 percent of cell height. Top-left root at 25% canvas width and44%canvas height. Top-right root at75%canvaswidth and44%canvasheight. Bottom-left root at25%canvaswidth and94%canvasheight. Bottom-right root at75%canvaswidth and94%canvasheight. Reduce last two plant sprites slightly so each cell has at least12percent transparent margin on left/right/top. No element may cross cell boundary. Keep all four plants anchored consistently so switching between cells causes no jump. Retain transparent alpha background with no text, labels, lines, pot, soil, or other objects. Do not add/drop flowers or change the subject. Output only corrected complete transparent atlas.
