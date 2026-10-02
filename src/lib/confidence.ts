import type {
  Product,
  Store,
  ConfidenceBreakdown,
  ConfidenceLevel,
  StockLevel,
} from '@/types';
import { STORE_TYPE_DECAY } from '@/types';

/**
 * Core Availability Confidence formula.
 * confidence = 100
 *   - (hours since update * decay factor for store type)
 *   - (velocity penalty: fast-selling items decay faster)
 *   - (store rejection history penalty)
 *   - (low stock-level penalty)
 *   + (recent store-confirmation bonus)
 */
export function computeConfidence(
  product: Product,
  store: Store,
): ConfidenceBreakdown {
  const decayFactor = STORE_TYPE_DECAY[store.type] ?? 0.3;
  const hoursSinceUpdate = product.lastStockUpdateHoursAgo;

  // Base score
  const base = 100;

  // Time decay: older updates = less confidence
  const decayPenalty = hoursSinceUpdate * decayFactor;

  // Velocity penalty: fast-selling items lose confidence faster
  // Scale velocity (0.1-1.1) into 0-8 penalty, amplified by hours since update
  const velocityPenalty = product.velocity * 6 * (hoursSinceUpdate / 12);

  // Store rejection history penalty (rejectionRate 0-0.15 → 0-6 penalty)
  const rejectionPenalty = store.rejectionRate * 40;

  // Low stock penalty
  let stockPenalty = 0;
  if (product.stockStatus === 'out') {
    stockPenalty = 35;
  } else if (product.stockStatus === 'low') {
    stockPenalty = 12;
  } else if (product.stockLevel < 10) {
    stockPenalty = 5;
  }

  // Recent confirmation bonus: if store recently confirmed stock, boost score
  const confirmationBonus = product.recentConfirmationBonus;

  let final =
    base -
    decayPenalty -
    velocityPenalty -
    rejectionPenalty -
    stockPenalty +
    confirmationBonus;

  // Clamp 0-100
  final = Math.max(0, Math.min(100, final));

  return {
    base,
    decayPenalty,
    velocityPenalty,
    rejectionPenalty,
    stockPenalty,
    confirmationBonus,
    final: Math.round(final),
  };
}

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export function confidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'low':
      return 'bg-red-100 text-red-800 border-red-300';
  }
}

export function confidenceDot(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'bg-green-500';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
      return 'bg-red-500';
  }
}

export function confidenceTextColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'text-green-700';
    case 'medium':
      return 'text-amber-700';
    case 'low':
      return 'text-red-700';
  }
}

export function confidenceLabel(level: ConfidenceLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Compute cart-level Order Reliability Score.
 * Based on the product of individual item confidences weighted by quantity,
 * with substitution and confirmation flags providing partial recovery.
 */
export function computeCartReliability(
  items: { product: Product; store: Store; quantity: number; autoSubstitute: boolean; confirmWithStore: boolean }[],
): number {
  if (items.length === 0) return 100;

  let totalWeight = 0;
  let totalScore = 0;

  for (const item of items) {
    const breakdown = computeConfidence(item.product, item.store);
    let itemScore = breakdown.final;

    // Confirming with store adds a small boost
    if (item.confirmWithStore) itemScore = Math.min(100, itemScore + 8);

    // Auto-substitute provides a safety net — the effective reliability
    // is higher because a substitute exists if the item is unavailable
    if (item.autoSubstitute) itemScore = Math.min(100, itemScore + 12);

    // Weight by quantity — more of a risky item = more risk
    const weight = item.quantity;
    totalScore += itemScore * weight;
    totalWeight += weight;
  }

  // The probability that ALL items are fulfilled is not just the average —
  // it's lower. We use a multiplicative model: reliability = product of
  // individual probabilities, but blended with the average to avoid
  // over-penalizing carts with many items.
  const avgScore = totalScore / totalWeight;
  const multiplicativeScore =
    items.reduce((acc, item) => {
      let s = computeConfidence(item.product, item.store).final;
      if (item.confirmWithStore) s = Math.min(100, s + 8);
      if (item.autoSubstitute) s = Math.min(100, s + 12);
      return acc * (s / 100);
    }, 1) * 100;

  // Blend: 60% multiplicative (true joint probability), 40% average (readability)
  const blended = 0.6 * multiplicativeScore + 0.4 * avgScore;
  return Math.round(Math.max(0, Math.min(100, blended)));
}

export function stockStatusFromLevel(level: number): StockLevel {
  if (level === 0) return 'out';
  if (level < 5) return 'low';
  return 'in_stock';
}

/**
 * Apply a time advance to all products and stores.
 * Increments hoursSinceUpdate and decays confirmation bonus.
 */
export function applyTimeAdvance(
  products: Product[],
  stores: Store[],
  hours: number,
): { products: Product[]; stores: Store[] } {
  const updatedProducts = products.map((p) => ({
    ...p,
    lastStockUpdateHoursAgo: p.lastStockUpdateHoursAgo + hours,
    recentConfirmationBonus: Math.max(0, p.recentConfirmationBonus - hours * 0.15),
  }));
  const updatedStores = stores.map((s) => ({
    ...s,
    lastStockUpdateHoursAgo: s.lastStockUpdateHoursAgo + hours,
  }));
  return { products: updatedProducts, stores: updatedStores };
}
