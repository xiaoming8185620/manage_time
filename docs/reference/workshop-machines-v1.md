# 第三幕机器图集 v1

- 工具：内置 ImageGen。
- 视觉依据：已选方案 1，`/Users/bailian/.codex/generated_images/01a0cd61-14c5-7602-915b-f943b0106975/exec-4e4f6c2f-78ea-4176-b97d-0a292dd9acf2.png`。
- 原始生成文件：`/Users/bailian/.codex/generated_images/01a0f61f-5c06-7522-8a3b-f9f3484aa2fd/exec-b8414d66-c45f-477c-a52e-679d9529a1d6.png`。
- 项目素材：`public/assets/workshop-machines-v1.png`。
- 实际尺寸：2172 × 724，RGBA，真实透明 alpha 通道，未做后期栅格编辑。

## 图集坐标

虽然提示词要求三个等格，实际无人机右翼超出第二格少量像素。渲染应使用独立源矩形，不使用严格三等分。矩形格式为 x、y、width、height，均为原图像素。

| 对象 | 建议源矩形 | alpha ≥ 128 的紧边界（左、上、右、下） |
| --- | --- | --- |
| 清洁机器人 | 64, 200, 510, 476 | 91, 231, 536, 645 |
| 微型无人机 | 724, 130, 754, 490 | 740, 170, 1454, 589 |
| 智脑头部 | 1495, 40, 650, 635 | 1521, 66, 2114, 642 |

图集占用大小不是三个物件在场景中的物理比例；应分别校准清洁机器人、微型无人机与大型智脑。

## 最终提示词

Use case: background-extraction / stylized-concept. Produce one production game sprite atlas with a GENUINELY TRANSPARENT alpha background, landscape 1536x512, EXACTLY THREE EQUAL SQUARE CELLS IN ONE HORIZONTAL ROW. Reference image is the approved style and exact machine identities. Extract/re-render three individual machines from it as clean isolated high-detail hand-painted 2.5D game sprites matching the same elevated three-quarter camera and warm upper-left illumination. LEFT CELL centered at x256: the reference's lower-right small friendly cleaning robot, rounded cream cuboid body, cyan eyes in black faceplate, tiny wheels and visible dark brush at its front, facing down-left. MIDDLE CELL centered at x768: the reference's upper-left small quadrotor drone, ivory and brass body, cyan eyes in black faceplate, all four rotor assemblies fully visible, small feet, hovering, facing down-right. RIGHT CELL centered at x1280: only the important AI HEAD from the reference right side, cream cuboid head housing with a large amber circular optical lens, brass fasteners and leaf emblem, dark articulated short mounting gimbal attached at the upper/back side, facing down-left toward viewer; no floor stand, no tall column, no computers. Every subject wholly contained within its own 512x512 cell, centered with generous transparent padding and wide empty gutters; similar atlas occupancy not world physical scale. Preserve fine painted metal panel lines, brushed surface, warm shadows within forms, cream/bronze/charcoal color identity and friendly sophisticated future technology. No captions, labels, grid, color blocks, checkerboard, backdrop, cast floor shadow, decorative graphics, additional machines or characters. Real transparent PNG alpha, not a depiction of transparency.
