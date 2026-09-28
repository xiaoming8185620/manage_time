# 状态驱动植物场景底图 v2

- 生成方式：内置 ImageGen，精确对象编辑；没有用 CSS、SVG 或图像脚本重绘。
- 输入：`public/assets/town-environment.png`，1487 × 1058。
- 交付：`public/assets/town-environment-bare-v2.png`，1487 × 1058，原始生成 PNG 字节直接复制。
- 最终原始文件：`/Users/bailian/.codex/generated_images/01a0d684-1f58-7530-9acf-30a354c322a8/exec-5dea5ce7-402f-4d0f-ac4a-fedb96530318.png`。
- SHA-256：`3721facff887d482a1e409ed6adc9da9e8c8fe2a3d704fb3ef9117ec4525f9d3`，原始文件与交付文件一致。
- 原图没有覆盖。

## 提示词

首轮以原场景为唯一编辑目标：

> Use case: precise-object-edit. Asset type: exact stationary background plate for a 2.5D hand-painted game. Input image is the EDIT TARGET, not a loose inspiration. Preserve exact original framing and camera projection, image aspect 1487:1058, all architectural outlines and object locations. Only remove ALL living plants, foliage, flowers, greenery, hanging vines and stray fallen leaves belonging to the central large floating-town platform. Make the railings fully bare, front/back/sides/corners. Remove roof greenery, wall climbing ivy, plants inside visible window, front flowers by cat nest, door pot leaves, workbench pots' leaves, east pot cluster leaves, wood seedbox seedlings, and foliage on the main tree behind solar panel. Keep the main tree's bare trunk and small bare branches only. Keep ALL empty pots, planter boxes, soil, clear glass railing panels, cat nest, lamps, terminal, benches/tools, solar panels, house, door, window furniture, wood deck and mechanical hull exactly in place. Inpaint newly exposed surfaces cleanly and consistently in same warm hand-painted style. Preserve distant tiny floating islands and their greenery, preserve exact blue sky/cloud background and lighting. This will have plant sprites placed back programmatically at their original coordinates, so no redesign, no new objects, no shifted walls or enlarged pots, no added actors or interface. Blank plant-free base. Output a full-color opaque PNG. Keep original source composition unchanged as much as possible.

首轮输出：`/Users/bailian/.codex/generated_images/01a0d684-1f58-7530-9acf-30a354c322a8/exec-e89d73eb-cdc3-48ef-af9c-72482830d794.png`。

检查发现首轮误删门口与猫窝左侧容器，定点修复提示词：

> Precise-object-edit. Image1 is the EDIT TARGET and already excellent bare plant-free game background. Image2 is ORIGINAL REFERENCE used ONLY to restore missing empty plant containers. Keep image1 completely unchanged except two tiny local corrections: restore the large cream-white flower pot with brown soil that stands directly LEFT of the house front steps, at normalized center x=.262,y=.471, matching the original reference pot shape and location (but NO leaves/plant). Restore the small wooden barrel planter with soil that sits LEFT of the cat-nest entrance at normalized center x=.096,y=.508 matching original reference (but NO greenery or flowers). Keep every other pixel, bare tree, empty planters, bare railings, house, window, solar, deck and sky as image1, exact same camera/framing/aspect1487:1058. No living plants added. No further changes. Opaque PNG.

## 视觉检查与集成注意

- 中央平台已没有固定叶片、花朵或藤蔓；后树保留裸干，远景小岛仍有绿色。
- 太阳能板、屋体、终端、工作台、猫窝、玻璃围栏、推进器、主要平台轮廓和天空保持原有构图。
- 图像编辑存在局部重建，不宣称像素完全相同；窗内装饰和原被藤蔓遮挡的表面有合理补绘。
- 门口空白盆土表中心约 `(0.243, 0.424)`；猫窝左侧桶盆土表中心约 `(0.087, 0.474)`。两个容器相较原图轻微偏移，植物根部应按新底图锚定。
- 木箱土表中心约 `(0.786, 0.401)`；东侧三盆分别约 `(0.860, 0.446)`、`(0.824, 0.489)`、`(0.866, 0.507)`。
- 这张底图不能独立作为完整场景验收，需主线程与分级植物素材组合后检查遮挡和扎根位置。
