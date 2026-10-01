import React from 'react';

const WALK_FRAMES = [
  ['boy-walk-forward.png', 830, 346, [77, 55, 523, 779]],
  ['boy-walk-forward.png', 837, 914, [718, 56, 381, 785]],
  ['boy-walk-forward.png', 837, 1454, [1271, 55, 384, 786]],
  ['boy-walk-reverse.png', 819, 350, [96, 67, 503, 756]],
  ['boy-walk-reverse.png', 823, 913, [743, 68, 344, 759]],
  ['boy-walk-reverse.png', 824, 1492, [1285, 68, 372, 760]],
].map(([sheet, bottom, anchorX, cell]) => ({ sheet, width: 1774, height: 887, bottom, anchorX, cell }));

// Calibrate the two independently drawn sheets against the standing pose.
// Total-height normalization alone makes the wider head on the first sheet pulse.
// Keep each sheet's vertical scale fixed across poses so lifting a foot never
// rescales the entire character. Width uses the same head landmark as idle.
const SHEET_METRICS = {
  'boy-walk-forward.png': { bodyHeight: 776, headWidth: 272 },
  'boy-walk-reverse.png': { bodyHeight: 750, headWidth: 242 },
};
// Idle hair spans 184px at 600px body height; body box aspect ratio is 2:3.
const STANDING_HEAD_WIDTH = 184 / 600 * 88 * 1.5;

// Anchor each pose at the pelvis horizontally and at its planted shoe vertically.
// Limiting the image to its own cell prevents neighboring frames from leaking in.
export function WalkingSprite() {
  return <span className="player-gait" aria-hidden="true">{WALK_FRAMES.map((frame, index) => {
    const { sheet, width, height, bottom, anchorX, cell } = frame;
    const metrics = SHEET_METRICS[sheet];
    const scaleY = 88 / metrics.bodyHeight;
    const scaleX = STANDING_HEAD_WIDTH / metrics.headWidth;
    const [x, y, cellWidth, cellHeight] = cell;
    const style = {
      width: `${width * scaleX}%`,
      height: `${height * scaleY}%`,
      left: `${50 - anchorX * scaleX}%`,
      top: `${94 - bottom * scaleY}%`,
      clipPath: `inset(${y / height * 100}% ${(width - x - cellWidth) / width * 100}% ${(height - y - cellHeight) / height * 100}% ${x / width * 100}%)`,
    };
    return <span className="player-step" key={index} style={{ '--step-index': index }}><img src={`/assets/${sheet}`} alt="" style={style} draggable="false" /></span>;
  })}</span>;
}
