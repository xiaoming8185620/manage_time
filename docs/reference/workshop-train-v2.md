# 环轨机车浅斜角图集 v2

- 工具：内置 ImageGen，以选定第三幕原图为参考，重新绘制四方向后进行了两轮机位修正。未使用栅格缩放或平面旋转冒充方向。
- 文件：`public/assets/workshop-train-v2.png`。v1 保留不变。
- 实际尺寸：2159 × 728，RGBA，alpha 0—255。透明区不是实体背景。
- 最终生成文件：`/Users/bailian/.codex/generated_images/01a0f61f-5c06-7522-8a3b-f9f3484aa2fd/exec-0307e495-1a3b-45f4-9a81-3c6b9f1abebd.png`。
- 目标是匹配原图前沿约 26° 的轨道。前向图约 24—26°，后向图约 21—22°，比目标略浅，不能称为四格全部精确 26°；路线落轨仍需实际场景校准。

## 原图坐标

每格并非严格等宽，应使用以下独立源矩形。右、下边界排他，轮底锚点是格内坐标，来自可见近侧车轮接地轮廓，约 ±5 像素，可用于初始轨面校准。前轮指机车最靠近车头的一组可见轮，后轮指货车尾部可见轮；这些是同侧钢轨接地点，不是两轨正中央。

| 行驶方向 | 源矩形 x,y,w,h | 格内 alpha ≥128 bbox | 前轮接地点 | 后轮接地点 | 接地连线角度 |
| --- | --- | --- | --- | --- | --- |
| 右下 | 0,0,557,728 | 29,164,544,508 | 400,485 | 80,345 | 23.6° |
| 左下 | 557,0,498,728 | 15,173,481,512 | 160,483 | 440,348 | 25.7° |
| 右上 | 1055,0,535,728 | 24,197,513,497 | 460,354 | 100,496 | 21.5° |
| 左上 | 1590,0,569,728 | 16,194,518,497 | 60,350 | 440,496 | 21.0° |

列车主体延续奶白金属、黄铜、深色底盘、青/暖灯光。后向两格拥有更窄的货车背面和更长的侧面，修复 v1 约 42° 的陡斜视觉。渲染应保留各格原始宽高比，不应把四个独立源框强行拉到相同宽高。

## 初次提示词

Create a production transparent sprite atlas of the exact lower-left locomotive and one short wagon from the reference workshop. Primary requirement: shallow diagonal train ground axis, ONLY 24 to 28 DEGREES from the screen horizontal, matching the left-front railway direction in the reference. NOT a steep 40-degree isometric diagonal. The train should look elongated horizontally, with a clearly visible long near side and comparatively narrow front, wheels touching a single shallow diagonal ground line. A four-direction turntable of THE SAME cream-and-brass short locomotive and ONE short box freight wagon, connected. Entire train including two car bodies, coupler and complete wheels in each frame. Four equal cells in ONE HORIZONTAL ROW on wide canvas ideally 2560x864. Each 640-wide cell contains a train with approximately 580x340 visible bounding rectangle, centered, clear transparent margins; train long wheel-contact axis must be about twice as long horizontally as vertically, slope absolute value 0.47, with the full object width substantially greater than its height. CELL ONE: engine at lower right, wagon at upper left, wheels rise gently leftwards. CELL TWO: engine at lower left, wagon at upper right, wheels rise gently rightwards. CELL THREE: engine at upper right receding, wagon at lower left nearer viewer, see wagon rear, same shallow negative screen slope. CELL FOUR: engine at upper left receding, wagon at lower right nearer viewer, see wagon rear, same shallow positive screen slope. All four correct physically distinct camera-visible faces, consistent physical scale, fixed elevated 2.5D camera pitch as reference, each facing a different ground direction; do not rotate the flat drawing to fake direction. Match hand-painted high detail, ivory armor panels, brass trims, charcoal undercarriage, teal/cyan and warm amber lamps, simple leaf emblems. GENUINE TRANSPARENT PNG background alpha0 outside train outlines, fully opaque train interiors. No tracks, floor, rails, sky, haze, glow fog, rectangular backdrops, shadows outside bodies, labels, text, grid or checkerboard. Focus on accurate SHALLOW 26-DEGREE ground axis and independent clean sprite silhouettes.

## 第一轮方向修正

Edit this four-direction train sprite atlas for a stricter shallow-angle railway view. Keep exact same four trains, white brass materials, all wheels and couplings, transparent background, and four horizontal cells. Change camera-visible orientation so ALL FOUR long ground axes follow the same shallow slope absolute value 0.47 (25 degrees from horizontal). The LAST TWO rear-facing trains are still too steep; make their long near-side wheel contact lines noticeably more horizontal, NOT 35 degrees. The first two should also be a little flatter, about 25 degrees. Maintain the same elevated 2.5D camera view of the roofs, never rotate the picture in the image plane: wheels remain below upright bodies, vertical edges remain vertical. Present a more broadside view with the long side clearly dominant and narrow front/rear faces. Each isolated entire locomotive plus ONE short wagon should be about 600px wide by 350px high, centered with generous gutters. Final four-cell sheet 2560x864. Left-to-right heading lower-right, lower-left, upper-right, upper-left; last two show wagon rear nearest the viewer. Real transparent alpha0 background, no track, ground, cast shadows, text, labels, grid or haze.

## 第二轮后向修正

Correction to an existing transparent sprite sheet. Keep the first two sprites unchanged. Change ONLY the last two sprites: turn the trains into a significantly MORE BROADSIDE orientation so the long side occupies almost their entire projected width, and the back face of the nearest wagon is much narrower (about half its current width). The slope along visible wheel contact points should be 25 degrees from screen horizontal, not the current roughly33 degrees. The last two train bodies must therefore be much longer horizontally and less deep toward background, like a shallow railway elevation. Maintain upright vertical edges and same elevated camera pitch, showing roofs, never rotate the flat image in image plane. Last-but-one train engine points upper right, last train engine points upper left; both have the rear wagon nearest viewer. Still one short engine and one wagon. Four independent cutouts horizontal row, ample gutters. Can expand canvas to2560x864 and proportionally recenter cells as needed, but keep all trains consistent physical size. Match cream/brass painted metal and teal/amber lamps exactly. Preserve every wheel and coupling and actual transparent PNG alpha background, no environment or shadows.
