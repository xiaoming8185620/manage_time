import React from 'react';

const WALK_FRAMES = [
  ['boy-walk-forward.png', 59, 830, 346, [77, 55, 523, 779]],
  ['boy-walk-forward.png', 60, 837, 914, [718, 56, 381, 785]],
  ['boy-walk-forward.png', 59, 837, 1454, [1271, 55, 384, 786]],
  ['boy-walk-reverse.png', 71, 819, 350, [96, 67, 503, 756]],
  ['boy-walk-reverse.png', 72, 823, 913, [743, 68, 344, 759]],
  ['boy-walk-reverse.png', 72, 824, 1492, [1285, 68, 372, 760]],
].map(([sheet, top, bottom, anchorX, cell]) => ({ sheet, width: 1774, height: 887, top, bottom, anchorX, cell }));

// Anchor each pose at the pelvis horizontally and at its planted shoe vertically.
// Limiting the image to its own cell prevents neighboring frames from leaking in.
export function WalkingSprite() {
  return <span className="player-gait" aria-hidden="true">{WALK_FRAMES.map((frame, index) => {
    const { sheet, width, height, top, bottom, anchorX, cell } = frame;
    const scale = 88 / (bottom - top);
    const [x, y, cellWidth, cellHeight] = cell;
    const style = {
      width: `${width * scale * 1.5}%`,
      left: `${50 - anchorX * scale * 1.5}%`,
      top: `${94 - bottom * scale}%`,
      clipPath: `inset(${y / height * 100}% ${(width - x - cellWidth) / width * 100}% ${(height - y - cellHeight) / height * 100}% ${x / width * 100}%)`,
    };
    return <span className="player-step" key={index} style={{ '--step-index': index }}><img src={`/assets/${sheet}`} alt="" style={style} draggable="false" /></span>;
  })}</span>;
}
