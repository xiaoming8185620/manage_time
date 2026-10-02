# 第三幕机器狗步态图集 v1

## 素材来源

- 生成方式：内置 ImageGen，以用户选定的第三幕机械港方案 1 为实际图片参考。
- 参考图：`/Users/bailian/.codex/generated_images/01a0cd61-14c5-7602-915b-f943b0106975/exec-4e4f6c2f-78ea-4176-b97d-0a292dd9acf2.png`
- 生成原图：`/Users/bailian/.codex/generated_images/01a0f61f-3776-7103-a1f2-f4bd21edda43/exec-f9373dbf-02bb-4343-b8fd-bec59538d977.png`
- 项目素材：`public/assets/workshop-dog-walk-v1.png`
- 保存方式：从生成路径直接复制，未进行图片裁剪、抠图、调色或其他脚本栅格编辑。
- 原图实际尺寸：2172 × 724，RGBA，4 个 543 × 724 的等宽格。
- Alpha 范围 0—255；1,181,666 个像素完全透明，确有透明通道。
- 造型为方案 1 中奶白陶瓷装甲、黄铜关节、深灰机械腿、青蓝眼睛的机器狗；均朝右，保留短尾与直立耳朵。

## 四帧裁切与脚点

坐标为原图像素，右、下边界为开区间。图像有极低 alpha 散点，读取 alpha > 0 的边界会将不可见点计入，因此以下主体框使用 alpha > 16。

| 帧（从 0 开始） | 图集格子 (x, y, width, height) | 格内主体 bbox | 格内脚底 y（含软边） | 最低脚掌中心约 x（alpha > 64） |
| --- | --- | --- | --- | --- |
| 0 | (0, 0, 543, 724) | (55, 159, 484, 553) | 553 | 436.03 |
| 1 | (543, 0, 543, 724) | (59, 159, 483, 547) | 547 | 403.77 |
| 2 | (1086, 0, 543, 724) | (51, 159, 484, 571) | 571 | 410.13 |
| 3 | (1629, 0, 543, 724) | (55, 159, 480, 561) | 561 | 410.82 |

最低脚掌中心 x 通过 alpha > 64 主体最下方 7 行的有效像素计算，仅用于检查落脚位置，不应当用作每帧水平居中锚点，否则会造成步态左右抖动。alpha > 64 的脚底 y 分别为 553、547、570、560；与软边值相差不超过 1 像素。

### 渲染建议

- 每格使用相同裁窗 `x=45, y=150, width=445, height=430`，完整包含尾巴、耳朵和四肢。对应图集全局裁窗起点 x 为 45、588、1131、1674。
- 共用固定水平锚点可取原格中心 `x=271.5`，换算到上述裁窗为 `x=226.5`。
- 垂直落脚锚点使用格内 y `[553,547,571,561]`，换算到裁窗为 `[403,397,421,411]`。
- 固定头身缩放比例，按脚点对齐地面；不能按每帧 bbox 总高度各自缩放，以免重新引入忽大忽小。
- 生成的四个姿态存在轻微自然脚高差，不能假定提示词中要求的 y=430 已严格实现；应使用以上实际测量。
- 帧 0 可临时用作停步图，但其本身为迈步接触姿态，并非另行生成的四脚静立图。
- 图集没有额外的独立 idle 帧、阴影或地面背景。

## 完整生成提示词

```text
Use case: stylized-concept.
Asset type: production 2.5D game character walking spritesheet, transparent RGBA PNG.
Input image 1 is the APPROVED scene/style and exact robot dog identity reference. Take ONLY the SMALL IVORY ROBOT DOG near the lower left of the central boy, with ivory ceramic armor, brass mechanical joints, dark articulated four legs, short curling white tipped tail, tiny upright ears, and friendly glowing cyan eyes in a dark visor.
Create one wide 1536x512 image containing FOUR equally spaced animation frames in a SINGLE HORIZONTAL ROW. Each equal cell width384, height512; all four dogs face RIGHT. Render exactly the same robot dog, same elevated three-quarter camera angle and warm hand-painted detailed 2.5D style as the reference.
Frame1: fore left paw forward and rear right paw forward; opposite paws back.
Frame2: passing stance, lifted fore left paw returning under body, opposite fore right paw beginning forward.
Frame3: opposite diagonal contact stance, fore right paw and rear left paw forward.
Frame4: opposite passing stance leading back to frame1.
All FOUR LEGS visible with distinct articulated joint angles. Constant head and torso proportions and height in all frames. NO size oscillation between frames. Foot ground baseline y430 in every cell. Each entire dog including tail and ears must remain inside its own cell with at least8% transparent padding. Body centered in each cell. No text, numbers, frame borders, gridlines or UI. NO floor, background, scenery, ground shadow, extra dog or person.
CRITICAL: output genuinely TRANSPARENT background with alpha channel, not a painted checkerboard and not white fill. Keep transparent negative space between all four independent dogs. Preserve the same attractive ivory/brass robot dog design.
```
