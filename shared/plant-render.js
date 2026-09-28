// Anchors are measured against the 1487 × 1058 bare scene and 627 px atlas cells.
const LAYOUT = {
  'rail-west': [[.05,.52,.18]], 'rail-front-west': [[.182,.58,.24]],
  'rail-front-middle': [[.326,.649,.24]], 'rail-front-east': [[.645,.619,.26]],
  'rail-east': [[.874,.531,.18]], 'rail-corner': [[.938,.418,.12]],
  'rail-back-east': [[.839,.337,.136]], 'rail-back-low': [[.733,.378,.07]],
  'rail-back-west': [[.675,.30,.11]], 'porch-flowers': [[.087,.474,.13]],
  'door-plant': [[.243,.424,.135]], 'board-planter': [[.386,.374,.065]],
  'bench-planter': [[.498,.39,.09]],
  'east-pots': [[.860,.446,.105],[.824,.489,.10],[.866,.507,.09]],
  'seedling-box': [[.770,.400,.075],[.795,.407,.075],[.815,.414,.065]],
  // Low roof shrubs: even the flowering crown must remain inside the scene.
  'roof-garden': [[.09,.16,.085],[.22,.137,.10]],
  'window-garden': [[.095,.327,.06],[.13,.293,.06],[.212,.339,.075]],
  'shade-tree': [[.536,.161,.25]],
};
const META = {
  foliage: { roots:[[332.7,563],[302.7,563],[329.6,569],[310,571]], bounds:[[175,255,499,563],[104,100,508,563],[104,180,540,569],[80,156,543,571]], scale:[.64,.76,1,1.18] },
  vine: { roots:[[314,134],[314,134],[314,130],[314,124]], bounds:[[248,133,382,377],[234,133,408,480],[204,129,452,573],[158,123,492,597]], scale:[1,1,1,1] },
  canopy: { roots:[[313.5,323],[309.5,327],[319,296.5],[311.5,301.5]], bounds:[[34,148,593,498],[23,146,596,508],[23,116,615,477],[13,111,610,492]], scale:[1,1,1,1] },
};
export const plantLevel = count => Math.max(0, Math.min(3, Math.floor(Number(count) || 0)));
export const plantKind = target => target.id === 'shade-tree' ? 'canopy' : target.style === 'vine' ? 'vine' : 'foliage';
export function plantFrame(kind, count) {
  const level = plantLevel(count), meta = META[kind];
  return { level, root:meta.roots[level], bounds:meta.bounds[level], scale:meta.scale[level], src:`/assets/plant-${kind}-stages-v2.png`, column:level % 2, row:Math.floor(level / 2) };
}
export function plantParts(target, count) {
  const frame = plantFrame(plantKind(target), count);
  const anchors = target.id === 'built-flowerbed' ? [[target.x-.026,target.floorY-.078,.075],[target.x+.014,target.floorY-.065,.08],[target.x+.037,target.floorY-.043,.065]] : LAYOUT[target.id] || [[target.x,target.y,.08]];
  return anchors.map(([x,y,width]) => ({ ...frame, x,y,width:width*frame.scale }));
}
export function plantHitbox(target, count) {
  if (target.id === 'roof-garden') return {x:.246,y:.135,w:.035,h:.025};
  if (target.id === 'shade-tree') return {x:.584,y:.157,w:.13,h:.16};
  const boxes = plantParts(target,count).map(p => {
    const [a,b,c,d] = p.bounds, [rx,ry] = p.root;
    return [p.x+(a-rx)/627*p.width,p.y+(b-ry)/627*p.width*1487/1058,p.x+(c-rx)/627*p.width,p.y+(d-ry)/627*p.width*1487/1058];
  });
  const left=Math.min(...boxes.map(b=>b[0])),top=Math.min(...boxes.map(b=>b[1])),right=Math.max(...boxes.map(b=>b[2])),bottom=Math.max(...boxes.map(b=>b[3]));
  return {x:(left+right)/2,y:(top+bottom)/2,w:right-left+.01,h:bottom-top+.012};
}
