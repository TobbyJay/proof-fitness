import { DEFAULT_EQUIPMENT } from './equipmentCatalog.js';

const PLATE_SIZES = [5, 2.5, 1.25, 0.5];

function plateCount(inventory, size) {
  return Number(inventory.plates[String(size)] || 0);
}

export function calculateSymmetricPlateLoading(totalPlateLoadKg, inventory = DEFAULT_EQUIPMENT) {
  if (!Number.isFinite(totalPlateLoadKg) || totalPlateLoadKg < 0) return null;
  const sideTarget = Math.round(totalPlateLoadKg * 50) / 100;
  if (Math.abs(sideTarget * 2 - totalPlateLoadKg) > 1e-9) return null;
  const limits = PLATE_SIZES.map(size => Math.floor(plateCount(inventory, size) / 2));
  let best = null;
  for (let a = 0; a <= limits[0]; a += 1) for (let b = 0; b <= limits[1]; b += 1)
    for (let c = 0; c <= limits[2]; c += 1) for (let d = 0; d <= limits[3]; d += 1) {
      const counts = [a, b, c, d];
      const sideKg = counts.reduce((sum, count, index) => sum + count * PLATE_SIZES[index], 0);
      if (Math.abs(sideKg * 2 - totalPlateLoadKg) > 1e-9) continue;
      const platePairs = counts.reduce((sum, count) => sum + count, 0);
      if (!best || platePairs < best.platePairs) best = { platePairs, counts, sideKg };
    }
  if (!best) return null;
  const perSide = PLATE_SIZES.flatMap((size, index) => Array(best.counts[index]).fill(size));
  return { mode: 'barbell-symmetric', totalPlateLoadKg, perSide, description: perSide.length ? `${perSide.join(' kg + ')} kg per side` : 'No removable plates' };
}

export function calculateMatchedDumbbellLoading(loadPerDumbbellKg, inventory = DEFAULT_EQUIPMENT) {
  if (!Number.isFinite(loadPerDumbbellKg) || loadPerDumbbellKg < 0) return null;
  const endTarget = loadPerDumbbellKg / 2;
  const limits = PLATE_SIZES.map(size => Math.floor(plateCount(inventory, size) / 4));
  let best = null;
  for (let a = 0; a <= limits[0]; a += 1) for (let b = 0; b <= limits[1]; b += 1)
    for (let c = 0; c <= limits[2]; c += 1) for (let d = 0; d <= limits[3]; d += 1) {
      const counts = [a,b,c,d];
      const endKg = counts.reduce((sum,count,index) => sum + count * PLATE_SIZES[index], 0);
      if (Math.abs(endKg - endTarget) > 1e-9) continue;
      const platesPerEnd = counts.reduce((sum,count) => sum + count, 0);
      if (!best || platesPerEnd < best.platesPerEnd) best = { counts, platesPerEnd };
    }
  if (!best) return null;
  const perEnd = PLATE_SIZES.flatMap((size,index) => Array(best.counts[index]).fill(size));
  return {
    mode:'two-dumbbells-matched', loadPerDumbbellKg, perEnd,
    totalPlateLoadKg:loadPerDumbbellKg * 2,
    description:perEnd.length ? `${perEnd.join(' kg + ')} kg on each end of both dumbbells` : 'No removable plates'
  };
}

export function calculatePlateLoading(loadKg, loadingMode, inventory = DEFAULT_EQUIPMENT) {
  if (loadingMode === 'two-dumbbells-matched') return calculateMatchedDumbbellLoading(loadKg, inventory);
  if (loadingMode === 'barbell-symmetric' || loadingMode === 'single-dumbbell') return calculateSymmetricPlateLoading(loadKg, inventory);
  return null;
}

export function isAchievableLoad(loadKg, loadingMode, inventory = DEFAULT_EQUIPMENT) {
  if (['bodyweight', 'bodyweight-assisted', 'timed-bodyweight', 'pull-up-progression'].includes(loadingMode)) return true;
  if (loadingMode === 'barbell-symmetric' || loadingMode === 'single-dumbbell') return Boolean(calculateSymmetricPlateLoading(loadKg, inventory));
  if (loadingMode === 'two-dumbbells-matched') return Boolean(calculateMatchedDumbbellLoading(loadKg, inventory));
  return false;
}

export function nextAchievableLoad(currentKg, loadingMode, inventory = DEFAULT_EQUIPMENT) {
  for (let candidate = Math.round((currentKg + 0.5) * 2) / 2; candidate <= inventory.removablePlateLoadKg; candidate += 0.5) {
    if (isAchievableLoad(candidate, loadingMode, inventory)) return candidate;
  }
  return null;
}
