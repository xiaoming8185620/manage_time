import layout from './build-layout.json' with { type: 'json' };
export const BUILD_SLOTS = layout.slots;
const overlaps = (a, b) => a && b && Math.abs(a.x-b.x)<.11 && Math.abs(a.y-b.y)<.10;
// Legacy slot IDs remain in the save; only their flowerbed's display anchor changes.
export function buildingPosition(building, buildings = []) {
  let id = building?.slot;
  if (building?.itemId === 'flowerbed') {
    if (!layout.flowerSlots.includes(id)) id = id === 'garden' ? 'east-bed' : 'porch-bed';
    const cat = BUILD_SLOTS.find(s => s.id === buildings.find(b => b.itemId === 'cat-tree')?.slot);
    if (overlaps(BUILD_SLOTS.find(s => s.id === id), cat)) {
      id = layout.flowerSlots.find(candidate => !overlaps(BUILD_SLOTS.find(s => s.id === candidate), cat)) ?? id;
    }
  }
  return BUILD_SLOTS.find(s => s.id === id);
}
export function availableBuildSlots(itemId, buildings) {
  if (itemId !== 'cat-tree') return [];
  return BUILD_SLOTS.filter(slot => !slot.itemId
    && !buildings.filter(b => b.itemId === 'cat-tree').some(b => {
      const position = buildingPosition(b, buildings);
      return b.slot === slot.id || overlaps(position, slot);
    }));
}
