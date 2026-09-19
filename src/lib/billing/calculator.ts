// src/lib/billing/calculator.ts

export interface RateBlock {
  min: number;
  max: number | typeof Infinity;
  pricePerUnit: number;
}

export interface BillingResult {
  baseCharge: number;
  variableCharge: number;
  additionalCharges: number;
  total: number;
  breakdown: { block: string; m3: number; cost: number }[];
}

export function calculateWaterBill(
  consumption: number,
  baseCharge: number,
  blocks: RateBlock[],
  additionalCharges: number = 0
): BillingResult {
  let remaining = consumption > 15 ? consumption - 15 : 0;
  let variableCharge = 0;
  const breakdown = [];

  for (const block of blocks) {
    if (remaining <= 0) break;
    const m3InBlock = Math.min(remaining, (block.max === Infinity ? remaining : (block.max as number)) - block.min + 1);
    const cost = m3InBlock * block.pricePerUnit;
    variableCharge += cost;
    breakdown.push({ block: `${block.min}-${block.max}`, m3: m3InBlock, cost });
    remaining -= m3InBlock;
  }

  return {
    baseCharge,
    variableCharge,
    additionalCharges,
    total: baseCharge + variableCharge + additionalCharges,
    breakdown
  };
}
