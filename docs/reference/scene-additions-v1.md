# 2026-10-02 附加建设素材

四件独立透明 PNG 使用内置 ImageGen 生成，保存为 1254×1254 RGBA 原图。参照现有 `public/assets/greenhouse-base-v1.png` 和 `public/assets/workshop-supply-base-v1.png` 的手绘 2.5D 风格、俯视三分之四镜头、奶白金属、暖木与黄铜材质。素材未做二次图像编辑；运行时按透明边界裁出展示视口，完整保留主体。

| 建设项 | 文件 | 原始生成 ID |
| --- | --- | --- |
| 露珠生态池 | [greenhouse-dew-pond-v1.png](../../public/assets/greenhouse-dew-pond-v1.png) | baaabd97-d6a8-47f1-9e1d-4d57fdf949e4 |
| 萤光昆虫屋 | [greenhouse-insect-house-v1.png](../../public/assets/greenhouse-insect-house-v1.png) | 5c44240d-acc9-4eb6-a096-22966eff8463 |
| 月岩标本舱 | [workshop-lunar-cabinet-v1.png](../../public/assets/workshop-lunar-cabinet-v1.png) | 0f6132f3-d7a5-4213-9c5d-9138328fb227 |
| 小型星际通讯站 | [workshop-comms-station-v1.png](../../public/assets/workshop-comms-station-v1.png) | 71a8c3ed-2dc9-49f7-a80d-2fad9f3a82b2 |

## 可复用提示词

每件物品单独生成，并附上对应场景底图作为风格参考：

> Create ONE isolated game prop as a production asset. Reference image is a STYLE AND CAMERA reference only, not an edit target. Match its hand-painted 2.5D cozy ecological sci-fi illustration, warm cream and brass materials, elevated three-quarter camera, visible top surfaces and elliptical floor footprint. Whole object entirely visible, centered, generous transparent margins. True transparent RGBA background; no floor tile, environment, text, watermark, variants or frame. Single prop, soft contact shadow, upper-left lighting.

追加具体物件描述：

- **生态池**：A low oval knee-height ecosystem pool, cream metal and warm wood rim with brass trims, clear cyan water, mossy stone, two lily pads, a tiny recirculating water spout. Broad, shallow and inviting, not a tall fountain.
- **昆虫屋**：A compact upright pollinator shelter in cream metal and warm wood, honeycomb wooden cells and bamboo tubes, a small amber lantern on top and a few tiny fireflies. A friendly ecological science prop, not a large building.
- **月岩舱**：A compact museum-like lunar rock specimen exhibit on a short cream and brass pedestal, cylindrical glass cover, grey rock with subtle cyan mineral veins, small articulated brass magnifying arm and soft scanning light. Futuristic but tactile and hand painted.
- **通讯站**：A waist-height compact interstellar communication console, cream and brass base, small satellite dish tilted left, cyan display and amber signal lamp. A friendly futuristic workshop prop with believable mechanical joints, no text on the screen.

## 布局与玩法

定位和价格见 `shared/greenhouse.json`、`shared/workshop.json`；裁切坐标为原始 PNG 像素。温室池位于后侧灌木与开花花坛之间，以远景比例联系花坛水循环，昆虫屋在苔藓花坛左侧；机械港月岩舱靠墨子观测台右侧，通讯站在左前补给港边缘、升降台旁。每项建造 10 币，每日可选打理 2 币，免费互动不依赖后续打理。

`hit` 的 x/y/w/h 是裁切后素材内部的归一化点击范围，运行时以中心对齐并扩展到至少 44×44 CSS 像素。通讯站点击接收台，月岩舱点击玻璃主体；装饰天线与透明边缘不阻挡邻近操作。地面锚点、点击范围和既有路径的回归验证见 `tests/scene-additions.test.mjs`。

花圃位置见 `shared/build-layout.json`。旧位置仅迁移显示锚点，保存 ID 与成长保持兼容；新选址展示初生素材，避免成熟花圃预览造成落地差异。
