# 星球悬浮小镇 · 植物阶段、任务入口与天气验收

日期：2026-09-25。实现：Python 家庭版 http://127.0.0.1:4180/。

**Findings**

- [P2，已修复] 植物原来在底图中已盛放，与 careCount=0 不符。改用同构图的空盆/裸枝底图，藤蔓、盆栽、树冠与建造花圃按保存等级选择四格光栅素材；移除不依赖存档的固定摇叶。证据：evolution-before.jpg / evolution-final.jpg，以及下方初生—盛放局部对照。
- [P2，已修复] 左下大卡片占据场景；现默认只显示“今天的一小步”小按钮，可展开/收起，进入面板自动收起。
- [P2，已修复] 390 px 窄屏中原成长手记/照料按钮遮住右侧植物。移到场景下方独立一行，保留 42 px 触控高度；evolution-mobile.jpg 可见场景完整、页面没有横向溢出。
- [P2，已修复] 按新叶簇边界生成的屋顶热点中心被标题牌盖住。用 elementFromPoint 确认覆盖，改为露出的屋顶叶簇位置，并做 iPad 定位修正；桌面与 768 px 竖屏均实际点击打开了“屋顶的白花绿篱”。其余 26 处（含已建花圃）逐一点击成功。
- 最终无遗留可执行的 P0/P1/P2。幼苗更稀疏、树冠密度变化与收起任务提示均是用户要求的有意变化。

**Visual truth / comparison evidence**

- 原始方向：docs/reference/first-day-approved.png（1487 × 1058）；直接比较源：docs/qa/evolution-before.jpg（用户认可的上一版运行场景）。
- 实现截图：docs/qa/evolution-final.jpg。前后均为 CSS viewport 1280 × 720，工具输出原始 1280 × 720 图像；DPR 2 已由截图输出规范化为 CSS 像素，未做光栅编辑。场景框均为 x=134.02, y=0, width=1011.95, height=719.99。
- 状态：同一正式账号、0 币、无新建建筑；猫窝旁植物保存的照料等级 2 仍保留，其余初生。云层和角色姿态随时间变化，不视为构图漂移。未对正式账号添加任务或金币、未代为付费照料。
- 同一输入全图及局部并排对照：docs/qa/evolution-comparison-final.jpg，由浏览器渲染 docs/qa/evolution-comparison.html 得到。全图缩至同宽；局部使用相同 CSS 背景偏移和 1.15 倍倍率，完整显示藤蔓。
- 局部源：docs/qa/evolution-growth-zero.jpg / evolution-growth-three.jpg，同一隔离存档前栏杆白花藤，careCount 0→3，86→77 币；后者刷新后保存。能辨认新分枝、叶密度、白花和垂藤长度，根部/挂点保持原位。
- 天气：docs/qa/evolution-rain.jpg、evolution-night.jpg 是隔离样例（雨、夜雪），不是杭州当时实况。正式页由实际 Open-Meteo 接口读取，验收返回 status=live。
- iPad CSS viewport 768 × 1024：evolution-ipad.jpg / evolution-ipad-plant.jpg / evolution-weather-stale.jpg。手机 390 × 844：evolution-mobile.jpg。两者无横向溢出；控件与文字可达。仅为浏览器尺寸模拟，未在实体 iPad / Safari 运行。

**Required fidelity surfaces**

| Surface | Result |
| --- | --- |
| Fonts / typography | 延用 Noto Sans SC、PingFang SC、Microsoft YaHei；正式页标题实测 20.4157 px、rgb(68,59,45)，原字重/行高保留。六字新名称完整显示；小按钮/天气 chip 用清晰小字号，面板内容无截断。 |
| Spacing / layout | 平台、太阳能、小屋、栏杆和角色尺寸未漂移。标题和原底部导航保留；任务提示收起明显让出左下方。手机两个次级入口移出场景。 |
| Colors / tokens | 保留奶油白、木棕、鼠尾草绿。天气为低强度蓝灰遮罩、透明云雾与小粒子，HUD 仍清晰。夜晚可识别角色、植物和设施，雷雨无闪烁。 |
| Image / asset fidelity | 新底图和 4 阶段植物均来自 ImageGen 的 PNG；保留透明像素，用图集裁格显示，未用 CSS/SVG 绘制植物。实景和对照未见黑底矩形或明显白边。原人物、英短小乖、建筑身份保持。树冠遮罩避开太阳能前景。 |
| Copy / content | 统一“星球悬浮小镇”和“星球币”。初生/舒展/繁茂/盛放与存档一致。天气固定浙江杭州，展示天气时间、同步时间、模型来源及上次数据状态；不会暗示气象站逐秒观测。 |
| Icons / accessibility | 沿用 Phosphor；天气雨雪使用标准图标作轻粒子。任务按钮含 aria-expanded/controls，天气与植物按钮有可读名称；对话框支持 Escape 与焦点约束，来源链接加入焦点循环。 |

**Interaction / service verification**

- 27 个场景热点实际点击检查（26 处静态目标 + 已建花圃），屋顶修复后桌面/iPad复测通过。
- 独立 SQLite 存档实测三次付币照料、三种后续阶段和刷新保留；达到盛放后收费按钮禁用，浇水入口仍可用。场景素材和照料面板读取同一阶段。
- “今天的一小步”默认收起，点击展开，打开照料面板后自动收起。移动端两个次级入口已复测。
- 天气真实接口返回杭州当前值；隔离服务分别注入雨天、夜间雪天、断网。断网明确显示“同步暂未更新，正在展示上次天气”，保留原天气时间而不更新伪时间。
- 实测暂停动态后所有 weather-particle、plant-cell 的 animationPlayState 都为 paused。系统减少动态与页面隐藏走同一暂停条件；CSS 另关闭减少动态时的雨雪。未做实体设备系统设置测试。
- 控制台 error/warn 为空；最终正式页所有图片 complete 且 naturalWidth > 0。
- npm test：17/17；Python unittest：31/31。包括天气 TTL 缓存、重启读取、失败回退、过期丢弃、恢复、异常模型响应、固定城市接口及不创建用户状态；植物图集选格、挂点稳定、花圃跟随存档位置；既有照料规则、幂等与 JS/Python 一致性保持通过。
- npm run build、npm run build:family 均通过，Sites 构建结构仍在。未修改受保护的 Sites 入口文件，未发布网站。
- 天气使用 Python 标准库；无需额外依赖或 API Key。Mac 需能访问 api.open-meteo.com；静态单机没有该接口时如实显示天气未连接。服务器端天气失败不会修改任务、币或植物。

**Comparison history**

1. 记录旧画面，依据用户反馈将固定成熟花叶换为按状态选择的素材，接入天气并收起任务卡片。
2. iPad/手机检查发现窄屏原按钮覆盖右侧，修复后重新构建并保存手机最终证据。
3. 逐热点检查发现屋顶标题遮挡，修正定位后同尺寸重测成功；最终全景与成长局部在同一对照输入中验收。

**Open Questions**

无。天气为模型当前值而非逐秒气象站观测；外网不可用时按明确的过期策略回退。

**Implementation Checklist**

- [x] 所有可照料植物按当前等级渲染，旧进度兼容。
- [x] 任务提示默认折叠，iPad/窄屏入口可用。
- [x] 杭州天气、昼夜和状态说明，暂停/离线处理。
- [x] 新名称、构建、测试、正式服务与视觉对照。

final result: passed
