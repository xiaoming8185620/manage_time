# 浇水壶素材记录

- 日期：2026-09-25
- 工具：内置 ImageGen；未使用 CLI、SVG、CSS 绘制或 Python 改图。
- 参考：`public/assets/town-environment.png`，生成前已用 `view_image` 查看，提取奶白金属、鼠尾草绿、暖黄铜及手绘 2.5D 质感。
- 最终项目文件：`public/assets/watering-can-v1.png`
- 最终原始输出：`/Users/bailian/.codex/generated_images/01a0d668-3004-7a80-a1a6-869244a73c71/exec-5548056f-4e8a-4394-952d-65bbcc8fa017.png`
- 首版原始输出：`/Users/bailian/.codex/generated_images/01a0d668-3004-7a80-a1a6-869244a73c71/exec-c0e29c4c-ea66-4b21-bbd5-5961337641ac.png`；未进入项目，修正原因是左侧留白偏紧。
- 保存方式：最终原始 PNG 无损原样复制，未缩放、裁切、抠图或修改 alpha。
- SHA-256：`e140330686f4af9b65ad0bb5648cfc933480683d1f49d4d1cd88cc2b6834f68f`；原始输出与项目文件一致。

## 检查结果

- 实际尺寸为 **1254 × 1254**，生成工具未按约 512 × 512 输出；保留原始尺寸，使用端按需要显示。
- 模式为 **RGBA**，alpha 范围 **0–255**，共有 **1,082,793 / 1,572,516** 像素完全透明，背景与把手内孔为真实透明。
- 所有非零 alpha 的边界为 `(43, 103, 1206, 1204)`，含极淡边缘像素。
- alpha ≥ 16 的主体边界为 `(118, 204, 1174, 1140)`，宽占画布 **84.2%**、高占 **74.6%**；主要轮廓完整且不裁切，低透明度像素在外围略有延伸。
- 视觉核验：单个浇水壶，奶白壶身、浅鼠尾草绿把手与边框、少量黄铜连接件；壶身在右、长壶嘴在左下区域、顶部把手清晰、三分之四视角。无水滴、人物、手、植物、地面、背景、文字或 UI。
- 细节量与参考场景相近，主轮廓清楚。75–110 px 的最终场景显示效果由集成页面验证；本素材任务未改页面或运行浏览器。

## 初始提示词

```text
Use case: stylized-concept
Asset type: ONE transparent PNG game prop for a warm hand-painted 2.5D eco-science-fiction floating town, displayed at only 75–110 px wide.
Primary request: a single compact, charming metal watering can, milk-white enamel body with pale sage-green accents and a few restrained warm brass details. It belongs beside rounded white modular houses, solar panels, glass railings and warm timber platforms. Gently painterly edges and warm cel-painted shading, clean readable silhouette, moderate restrained detail, not photorealistic, not pixel art.
Composition: square canvas approximately 512 x 512 pixels. The single watering can occupies 80–85% of the canvas, entirely visible with comfortable margin. Three-quarter view seen slightly from above. Can body on the RIGHT; long narrow spout extends to the LOWER LEFT. The can is slightly tilted in readiness to water. Clear arched carrying handle at the top, visibly open interior space under the handle, coherent physical construction. A small shower rose on the spout is fine. Gentle warm illumination from upper left; shading is on the object only.
Background: genuinely transparent background with actual PNG alpha. All empty canvas must be transparent, including the open handle. No solid white backdrop and no checkerboard pattern painted into the image. No cast ground shadow or ambient background haze.
Constraints: Exactly ONE watering can. NO water drops, NO stream of water, NO splashes, NO hands, NO people, NO cats, NO plants, NO ground, NO pedestal, NO background, NO frame, NO text, NO letters, NO logo, NO user interface. Nothing cropped. Preserve a crisp readable shape at tiny game display size.
```

## 唯一一次定向构图修正提示词

输入为首版浇水壶原始 PNG，仅要求调整留白，保留外观。

```text
Use case: precise-object-edit.
Edit the referenced transparent watering-can asset. Preserve this exact watering can: milk-white body, sage-green handle and trim, warm brass small details, hand-painted 2.5D shading, body on the right and long spout toward lower-left. Preserve the same shape, colors, viewpoint, material and all object details. Change ONLY its scale and placement within the canvas to give generous transparent padding: the complete can including spout should occupy 80% of the square canvas width and at most 84% of height, centered. Leave at least 8% of canvas width completely empty and transparent at each edge. Do not crop any part. One single isolated watering can only. Keep a genuinely transparent PNG alpha background and transparency through the handle; no white background, no checkerboard, no ground shadow, no haze, no extra items, no water or droplets, no people, no hands, no text. Aim for a 512x512 pixel output; if a larger square is necessary, maintain the requested proportions and margins.
```
