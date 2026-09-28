# 垂藤四阶段素材 v2

- 生成方式：内置 ImageGen，透明背景；未使用 CLI/API 兜底。
- 交付：`public/assets/plant-vine-stages-v2.png`，1254 × 1254，RGBA。
- 原图：`/Users/bailian/.codex/generated_images/01a0d684-46af-71b0-806b-07b55a715455/exec-130650c4-32f0-4681-8744-03731cda2d49.png`。
- SHA256：`6da2dbe4d5b73476fd8ac00b3233ca48f63723238916bf7930a18ff8a2754d0f`。
- 原字节直接复制，无缩放、调色、抠图或其他像素加工。
- 透明像素（alpha = 0）：84.53%。四格之间没有植物串入；实际挂点约在格内横向 50%、纵向 21%。
- 风格参考已查看：`public/assets/town-environment.png`、`public/assets/care-vine-v1.png`。最终生成作为新素材，仅在文字里指定已确认的手绘风格。

## atlas 定位

等分为 627 × 627 四格，从左到右、从上到下分别为初生、舒展、繁茂、盛放。以下边界为 alpha > 32 的非透明内容范围，右/下端为 exclusive，坐标相对整张原图；挂点是可见顶部茎干的中心估计值。

| 阶段 | 原图内容边界 (left, top, right, bottom) | 原图挂点 (x, y) | 格内挂点 |
| --- | --- | --- | --- |
| 初生 | 248, 133, 382, 377 | 314, 134 | 314, 134 |
| 舒展 | 861, 133, 1035, 480 | 941, 134 | 314, 134 |
| 繁茂 | 204, 756, 452, 1200 | 314, 757 | 314, 130 |
| 盛放 | 785, 750, 1119, 1224 | 941, 751 | 314, 124 |

各阶段有独立的枝叶与花量，并非放大同一张素材。盛放阶段宽度、垂藤长度和花朵数量增加。UI 可使用完整等分格 + 顶部挂点偏移，或在容器内按上述原图坐标裁切展示。应在实际浅色天空背景上检查边缘；透明区 RGB 中保留了生成器的绿色数据，渲染需使用 PNG 原始 alpha。

## 最终生成提示词

```text
Square transparent RGBA botanical game sprite atlas. FOUR SMALL separate hanging vines, arranged in a PERFECT 2x2 evenly spaced layout, huge empty transparent padding. Each vine MUST fit entirely inside a SMALL rectangle: top-left rectangle from20%width to35%width,15%height to35%height; top-right rectangle from65%width to85%width,15%height to35%height; bottom-left rectangle from15%width to40%width,65%height to85%height; bottom-right rectangle from62%width to88%width,65%height to85%height. ALL FOUR top stems aligned: top row at15% of canvas height, bottom row65%. Canvas horizontal center at50% height must have HUGE empty transparent gap, completely empty from36%height to64%height. Similarly huge empty transparent gap around vertical midpoint. Do not fill the canvas. Subject: same warm hand-painted 2.5D olive/sage hanging vine, same individual leaf sizes, four growth phases. TOP LEFT tiny seedling 10 small leaves,two short sparse vines,no flowers; TOP RIGHT growth 25 leaves,two medium vines,tiny buds; BOTTOM LEFT lush50leaves,three longvines,6white daisies; BOTTOM RIGHT blooming70leaves,four flowingvines,many tiny white/yellowdaisies. Fine warm painterly detail, natural branching. Consistent top attachment anchor at center of eachcell (25%,15%), (75%,15%), (25%,65%),(75%,65%). Plants begin fromtopstem andgrowdown. No pots,planters,ground,background,shadows,labels,text,borders,gridlines. Genuinely transparent alpha background. Fully opaque plant interiors,clean antialiased edges. The key requirement is huge transparent padding and PERFECT TWO BY TWO EQUAL CELLS, absolutely NO foliage crossing cell boundary at50% horizontal orvertical.
```

两次早期候选的底排超出等分格边界，未采用；最终版本通过等分格边界检查。
