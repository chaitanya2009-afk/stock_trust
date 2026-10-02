import type { Product, Store } from '@/types';
import { computeConfidence } from './confidence';

/**
 * Find substitute products for a given at-risk item.
 * Criteria: same category, similar price (within ±30%), high confidence,
 * from the same or nearby stores.
 */
export function findSubstitutes(
  atRiskProduct: Product,
  allProducts: Product[],
  allStores: Store[],
  maxResults = 3,
): { product: Product; store: Store; confidence: number }[] {
  const atRiskStore = allStores.find((s) => s.id === atRiskProduct.storeId);
  const atRiskCity = atRiskStore?.city;

  const candidates = allProducts.filter((p) => {
    if (p.id === atRiskProduct.id) return false;
    if (p.category !== atRiskProduct.category) return false;
    if (p.stockStatus === 'out') return false;

    // Price similarity: within ±30%
    const priceDiff = Math.abs(p.price - atRiskProduct.price) / atRiskProduct.price;
    if (priceDiff > 0.3) return false;

    const store = allStores.find((s) => s.id === p.storeId);
    if (!store) return false;

    // Same city preferred, but allow nearby if not enough
    return atRiskCity ? store.city === atRiskCity : true;
  });

  const scored = candidates.map((p) => {
    const store = allStores.find((s) => s.id === p.storeId)!;
    const breakdown = computeConfidence(p, store);
    return { product: p, store, confidence: breakdown.final };
  });

  // Sort by confidence descending, then by price similarity
  scored.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const aPriceDiff = Math.abs(a.product.price - atRiskProduct.price);
    const bPriceDiff = Math.abs(b.product.price - atRiskProduct.price);
    return aPriceDiff - bPriceDiff;
  });

  return scored.slice(0, maxResults);
}

/**
 * When an item is confirmed out of stock, pick the best substitute.
 * Returns the substitute product if found, null otherwise.
 */
export function autoPickSubstitute(
  atRiskProduct: Product,
  allProducts: Product[],
  allStores: Store[],
): { product: Product; store: Store; confidence: number } | null {
  const subs = findSubstitutes(atRiskProduct, allProducts, allStores, 1);
  return subs[0] ?? null;
}
