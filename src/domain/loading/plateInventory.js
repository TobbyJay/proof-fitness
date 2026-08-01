export const PLATE_DENOMINATIONS_KG = Object.freeze([5, 2.5, 1.25, 0.5]);

export function normalisePlateInventory(inventory) {
  const plates = {};
  for (const size of PLATE_DENOMINATIONS_KG) {
    const count = Number(inventory?.plates?.[String(size)] ?? 0);
    if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid ${size} kg plate count.`);
    plates[String(size)] = count;
  }
  return Object.freeze({
    plates:Object.freeze(plates),
    removablePlateLoadKg:PLATE_DENOMINATIONS_KG.reduce((sum,size)=>sum+size*plates[String(size)],0)
  });
}

export function plateInventoryKey(inventory) {
  const normalised = normalisePlateInventory(inventory);
  return PLATE_DENOMINATIONS_KG.map(size=>`${size}:${normalised.plates[String(size)]}`).join('|');
}

export function countPlateUsage(stacks) {
  const usage=Object.fromEntries(PLATE_DENOMINATIONS_KG.map(size=>[String(size),0]));
  for(const stack of stacks) for(const plate of stack) usage[String(plate)]=(usage[String(plate)]||0)+1;
  return usage;
}

export function inventoryCanSupply(inventory, stacks) {
  const normalised=normalisePlateInventory(inventory); const usage=countPlateUsage(stacks);
  return PLATE_DENOMINATIONS_KG.every(size=>usage[String(size)]<=normalised.plates[String(size)]);
}
