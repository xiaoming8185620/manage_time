# 环轨机车四方向图集 v1

- 生成工具：内置 ImageGen。未使用后期栅格编辑。
- 依据：已选第三幕方案 1 与 `public/assets/workshop-base-v1.png`，保持奶白金属、黄铜边框、深灰底盘、暖色及青色灯光。
- 项目文件：`docs/reference/workshop-train-v1.png`。
- 首次生成：`/Users/bailian/.codex/generated_images/01a0f61f-5c06-7522-8a3b-f9f3484aa2fd/exec-fb246a25-f2e2-4311-aa23-5af046b8294a.png`。
- 最终透明输出：`/Users/bailian/.codex/generated_images/01a0f61f-5c06-7522-8a3b-f9f3484aa2fd/exec-46b67c24-b4c1-4e49-adb9-46d731fc1e7c.png`。
- 尺寸：2048 × 768，RGBA。横向四格，每格 512 × 768。
- alpha 范围 0—254；分格边界 x=0、512、1024、1536、2047 整列 alpha 均为 0。主体 alpha 约 253，周围底色像素为 alpha 0，可直接叠在场景地面上。

## 透明背景复核

某些图像预览仍会显示透明像素携带的棕色 RGB，应以真实 alpha 合成结果为准。原文件 16 个远离车体的采样点 alpha 均为 0，例如 `(20,200)=(109,81,39,0)`、`(2040,450)=(121,91,56,0)`、`(1500,350)=(66,54,40,0)`。它们不会在正常浏览器 alpha 合成中显示为棕色面板。四个分格实心轮廓紧边界外扩 4 像素之外，alpha > 16 的像素数量也均为 0。

第三次去背景候选只保留在生成目录 `exec-5d53ac7c-840b-4e74-a945-06ec5651c0dd.png`，没有覆盖项目素材；最终是否替换应根据真实浏览器合成检查决定，而非忽略 alpha 的图像预览。

## 渲染坐标

四格物理车体一致，使用同一格尺寸渲染即可保留透视方向造成的投影宽度差异；不要逐格拉伸到相同可见宽度。主体为短机车连接一节货车，后向图可见最近的货车背面。所有坐标右、下端为排他边界。

| 格 | 行驶方向 | 源矩形 x,y,w,h | 格内 alpha ≥ 128 紧边界 | 格内车轮落地锚点建议 |
| --- | --- | --- | --- | --- |
| 0 | 右下 | 0,0,512,768 | 29,181,483,592 | 256,574 |
| 1 | 左下 | 512,0,512,768 | 35,180,486,587 | 256,570 |
| 2 | 右上 | 1024,0,512,768 | 60,179,462,586 | 256,566 |
| 3 | 左上 | 1536,0,512,768 | 61,169,470,581 | 256,561 |

落地锚点是供场景校准的起点，需要按实际轨面位置目检。列车行驶路径应沿轨道，不能以主角可行走空地路径代替。

## 首次完整提示词

Use case: stylized-concept / identity-preserve. Make a transparent production sprite atlas for a 2.5D futuristic workshop game, using both references for exact painting style, same cream ceramic-panel and brass short freight locomotive from the lower-left of reference 1. Reference 2 is the game environment for matching elevated camera pitch, lighting, and rail scale. Final image 2048x768, EXACTLY FOUR EQUAL 512x768 VERTICAL CELLS IN ONE HORIZONTAL ROW, each isolated sprite wholly inside its cell with at least 48px transparent gutters. Each cell contains ONE SAME short locomotive pulling ONE short freight wagon, mechanically coupled, no extra wagon. Compact rounded cream metal engine, charcoal undercarriage, brass trim, cyan and warm amber lights, simple leaf badge with no letters. All four show the SAME train with equal physical dimensions seen from a fixed elevated three-quarter camera, rotated on the GROUND PLANE to face four different diagonal compass directions. Cell 1: engine nose at lower RIGHT, freight wagon behind it toward upper LEFT. Cell 2: engine nose at lower LEFT, wagon behind toward upper RIGHT. Cell 3: engine nose at upper RIGHT, wagon behind toward lower LEFT, so the back of the wagon is nearest viewer and the engine faces away. Cell 4: engine nose at upper LEFT, wagon behind toward lower RIGHT, so the back of wagon is nearest viewer and the engine faces away. Correct three-dimensional visible faces for each direction, not rotating a flat picture, not mirror copies as substitute for rear views. Camera always sees roofs and outer side panels; train wheels stay on an implied ground plane, all wheels and couplings fully included. Direction diagonals should be gentle about 30 degrees from screen horizontal matching the elliptical rail, not near-vertical. Consistent object scale and lighting from upper left across all cells. Art style: richly detailed hand-painted warm science fiction, 2.5D game cutouts, soft painted metal texture with clear edges, identical to references. GENUINELY TRANSPARENT PNG alpha background. No ground, rails, track, environment, people, cast floor shadows, text, labels, grid lines or checkerboard.

## 透明边缘复核编辑提示词

Use case: background-extraction. Edit this exact four-direction train sprite atlas. Keep all four trains EXACTLY in their current positions, current 2048x768 canvas, identities, scale, mechanical forms, angles, colors, textures, sharp edges and solid body opacity. Change ONLY the surrounding pixels: remove ALL haze, tan gradients, glow, light spill and shadows outside the actual metal trains. The background and every gutter must be completely empty alpha 0. Every train must be a precise clean fully opaque cutout with anti-aliased outer edges on GENUINE transparent PNG alpha. No new backdrop, no checkerboard, no dark background, no relighting, no cast shadows, no aura around trains. Include all wheels and couplings. This is for compositing sprites over an existing game floor; any tinted semi-transparent area around the sprites is unacceptable.
