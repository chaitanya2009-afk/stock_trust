import { useState, useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { computeConfidence, confidenceLevel, confidenceTextColor } from '@/lib/confidence';
import { findSubstitutes } from '@/lib/substitution';
import { formatINR, truncate } from '@/lib/format';
import type { Product, Store, ConfidenceBreakdown } from '@/types';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  PackageCheck,
  TrendingUp,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

export function CustomerView() {
  const {
    products,
    stores,
    cart,
    addToCart,
    removeFromCart,
    updateCartItem,
    placeOrder,
    clearCart,
    getProductConfidence,
    getStoreById,
    simulateTime,
    demandRequests,
    addDemandRequest,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [showCart, setShowCart] = useState(false);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [explainerProduct, setExplainerProduct] = useState<Product | null>(null);
  const [substituteFor, setSubstituteFor] = useState<Product | null>(null);

  const categories = ['all', 'grocery', 'pharmacy', 'bakery', 'stationery'];
  const cities = ['all', 'Hyderabad', 'Vizag', 'Vijayawada'];

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        const store = getStoreById(p.storeId);
        if (cityFilter !== 'all' && store?.city !== cityFilter) return false;
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .map((p) => {
        const store = getStoreById(p.storeId);
        const breakdown = store ? computeConfidence(p, store) : null;
        return { product: p, store, breakdown };
      })
      .filter((item) => item.store && item.breakdown)
      .sort((a, b) => (b.breakdown!.final - a.breakdown!.final));
  }, [products, categoryFilter, cityFilter, searchQuery, getStoreById]);

  const cartItems = useMemo(() => {
    return cart
      .map((c) => {
        const product = products.find((p) => p.id === c.productId);
        const store = product ? getStoreById(product.storeId) : undefined;
        if (!product || !store) return null;
        const breakdown = computeConfidence(product, store);
        return { ...c, product, store, breakdown };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [cart, products, getStoreById]);

  const cartReliability = useMemo(() => {
    if (cartItems.length === 0) return 100;
    const items = cartItems.map((c) => ({
      product: c.product,
      store: c.store,
      quantity: c.quantity,
      autoSubstitute: c.autoSubstitute,
      confirmWithStore: c.confirmWithStore,
    }));
    // Use the blended reliability from confidence.ts
    let totalWeight = 0;
    let totalScore = 0;
    let multiplicative = 1;
    for (const item of items) {
      let s = computeConfidence(item.product, item.store).final;
      if (item.confirmWithStore) s = Math.min(100, s + 8);
      if (item.autoSubstitute) s = Math.min(100, s + 12);
      totalScore += s * item.quantity;
      totalWeight += item.quantity;
      multiplicative *= s / 100;
    }
    const avg = totalScore / totalWeight;
    const multi = multiplicative * 100;
    return Math.round(0.6 * multi + 0.4 * avg);
  }, [cartItems]);

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const handlePlaceOrder = () => {
    const result = placeOrder();
    if (result.success) {
      setShowCart(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Search and filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            aria-label="Search products"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
          aria-label="Filter by category"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
          aria-label="Filter by city"
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All Cities' : c}
            </option>
          ))}
        </select>
        <button
          onClick={() => simulateTime(6)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          title="Advance time by 6 hours to see confidence decay"
        >
          <Clock className="h-4 w-4" />
          +6h
        </button>
      </div>

      <div className="flex gap-6">
        {/* Product grid */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {filteredProducts.length} products available
            </h2>
            <button
              onClick={() => setShowDemandModal(true)}
              className="text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              + Request an item not available nearby
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map(({ product, store, breakdown }) => {
              const level = confidenceLevel(breakdown!.final);
              const inCart = cart.some((c) => c.productId === product.id);
              return (
                <div
                  key={product.id}
                  className={`rounded-xl border bg-white p-4 transition-shadow hover:shadow-md ${
                    level === 'low' ? 'border-red-200' : level === 'medium' ? 'border-amber-200' : 'border-gray-200'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {store!.name} · {store!.city}
                      </p>
                    </div>
                    <ConfidenceBadge score={breakdown!.final} size="sm" />
                  </div>

                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {formatINR(product.price)}
                    </span>
                    <span className="text-xs text-gray-400">per {product.unit}</span>
                  </div>

                  {/* Low confidence warning */}
                  {level === 'low' && (
                    <div className="mb-3 rounded-lg bg-red-50 p-2">
                      <div className="flex items-center gap-1.5 text-xs text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Low availability — may be unavailable</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {inCart ? (
                      <span className="flex-1 text-center text-sm font-medium text-teal-600">
                        In cart
                      </span>
                    ) : (
                      <button
                        onClick={() => addToCart(product.id)}
                        className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
                      >
                        Add to cart
                      </button>
                    )}
                    <button
                      onClick={() => setExplainerProduct(product)}
                      className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                      aria-label="Why this score?"
                      title="Why this score?"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    {level !== 'high' && (
                      <button
                        onClick={() => setSubstituteFor(product)}
                        className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                        aria-label="View substitutes"
                        title="View substitutes"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <p className="text-gray-500">No products match your filters.</p>
              <button
                onClick={() => setShowDemandModal(true)}
                className="mt-3 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Request this item be made available
              </button>
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <div className="hidden w-80 flex-shrink-0 lg:block">
          <CartPanel
            cartItems={cartItems}
            cartReliability={cartReliability}
            cartTotal={cartTotal}
            onRemove={removeFromCart}
            onUpdate={updateCartItem}
            onPlaceOrder={handlePlaceOrder}
            onClear={clearCart}
            onSubstitutes={setSubstituteFor}
          />
        </div>
      </div>

      {/* Mobile cart toggle */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg lg:hidden"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart ({cart.length}) · {formatINR(cartTotal)}
        </button>
      )}

      {/* Mobile cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCart(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto bg-white p-4 animate-slide-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Your Cart</h2>
              <button onClick={() => setShowCart(false)} aria-label="Close cart">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <CartPanel
              cartItems={cartItems}
              cartReliability={cartReliability}
              cartTotal={cartTotal}
              onRemove={removeFromCart}
              onUpdate={updateCartItem}
              onPlaceOrder={() => { handlePlaceOrder(); setShowCart(false); }}
              onClear={clearCart}
              onSubstitutes={setSubstituteFor}
            />
          </div>
        </div>
      )}

      {/* Explainer modal */}
      {explainerProduct && (
        <ExplainerModal
          product={explainerProduct}
          breakdown={getProductConfidence(explainerProduct)}
          storeName={getStoreById(explainerProduct.storeId)?.name ?? ''}
          onClose={() => setExplainerProduct(null)}
        />
      )}

      {/* Substitution modal */}
      {substituteFor && (
        <SubstitutionModal
          atRiskProduct={substituteFor}
          onClose={() => setSubstituteFor(null)}
        />
      )}

      {/* Demand request modal */}
      {showDemandModal && (
        <DemandModal
          onClose={() => setShowDemandModal(false)}
          onSubmit={(name, cat, city) => {
            addDemandRequest(name, cat, city);
            setShowDemandModal(false);
          }}
          existingRequests={demandRequests}
        />
      )}
    </div>
  );
}

// --- Cart Panel ---

interface CartPanelProps {
  cartItems: { product: Product; store: Store; breakdown: ConfidenceBreakdown; quantity: number; autoSubstitute: boolean; confirmWithStore: boolean }[];
  cartReliability: number;
  cartTotal: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: { autoSubstitute?: boolean; confirmWithStore?: boolean; quantity?: number }) => void;
  onPlaceOrder: () => void;
  onClear: () => void;
  onSubstitutes: (p: Product) => void;
}

function CartPanel({
  cartItems,
  cartReliability,
  cartTotal,
  onRemove,
  onUpdate,
  onPlaceOrder,
  onClear,
  onSubstitutes,
}: CartPanelProps) {
  const reliabilityLevel = confidenceLevel(cartReliability);
  const reliabilityColor =
    reliabilityLevel === 'high' ? 'text-green-700 bg-green-50' :
    reliabilityLevel === 'medium' ? 'text-amber-700 bg-amber-50' :
    'text-red-700 bg-red-50';

  return (
    <div className="sticky top-20 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Your Cart</h2>
        {cartItems.length > 0 && (
          <button onClick={onClear} className="text-xs text-gray-500 hover:text-red-600">
            Clear
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Your cart is empty. Add products to see the Order Reliability Score.
        </p>
      ) : (
        <>
          {/* Reliability score */}
          <div className={`mb-4 rounded-lg p-3 ${reliabilityColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-80">Order Reliability Score</p>
                <p className="text-2xl font-bold">{cartReliability}%</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-60" />
            </div>
            <p className="text-xs mt-1 opacity-80">
              {cartReliability >= 70
                ? 'High chance this order is fulfilled in full'
                : cartReliability >= 45
                ? 'Some items may be unavailable — consider substitutions'
                : 'High risk of partial fulfilment — enable auto-substitute'}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {cartItems.map((item) => {
              const level = confidenceLevel(item.breakdown.final);
              return (
                <div key={item.product.id} className="rounded-lg border border-gray-100 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatINR(item.product.price)} · qty {item.quantity}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(item.product.id)}
                      className="text-gray-400 hover:text-red-600"
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Confidence indicator */}
                  <div className="mt-2 flex items-center gap-2">
                    <ConfidenceBadge score={item.breakdown.final} size="sm" showLabel={false} />
                    {level !== 'high' && (
                      <>
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={item.confirmWithStore}
                            onChange={(e) => onUpdate(item.product.id, { confirmWithStore: e.target.checked })}
                            className="h-3 w-3 rounded"
                          />
                          Confirm with store
                        </label>
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={item.autoSubstitute}
                            onChange={(e) => onUpdate(item.product.id, { autoSubstitute: e.target.checked })}
                            className="h-3 w-3 rounded"
                          />
                          Auto-substitute
                        </label>
                      </>
                    )}
                  </div>

                  {level !== 'high' && (
                    <button
                      onClick={() => onSubstitutes(item.product)}
                      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
                    >
                      <RefreshCw className="h-3 w-3" />
                      View substitutes
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total and checkout */}
          <div className="mt-4 border-t border-gray-100 pt-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatINR(cartTotal)}</span>
            </div>
            <button
              onClick={onPlaceOrder}
              className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
            >
              Place Order
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// --- Explainer Modal ---

function ExplainerModal({
  product,
  breakdown,
  storeName,
  onClose,
}: {
  product: Product;
  breakdown: ConfidenceBreakdown;
  storeName: string;
  onClose: () => void;
}) {
  const level = confidenceLevel(breakdown.final);
  const factors = [
    { label: 'Base score', value: breakdown.base, positive: true },
    { label: 'Time decay penalty', value: -breakdown.decayPenalty, positive: false },
    { label: 'Item velocity penalty', value: -breakdown.velocityPenalty, positive: false },
    { label: 'Store rejection history', value: -breakdown.rejectionPenalty, positive: false },
    { label: 'Low stock penalty', value: -breakdown.stockPenalty, positive: false },
    { label: 'Recent confirmation bonus', value: breakdown.confirmationBonus, positive: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="explainer-title">
      <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl animate-scale-in">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="explainer-title" className="text-lg font-bold text-gray-900">Why this score?</h2>
            <p className="text-sm text-gray-500 mt-0.5">{product.name}</p>
            <p className="text-xs text-gray-400">{storeName}</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Final score */}
        <div className={`mb-4 rounded-xl p-4 text-center ${level === 'high' ? 'bg-green-50' : level === 'medium' ? 'bg-amber-50' : 'bg-red-50'}`}>
          <p className={`text-4xl font-bold ${confidenceTextColor(level)}`}>{breakdown.final}%</p>
          <p className={`text-sm font-medium ${confidenceTextColor(level)} capitalize mt-1`}>{level} confidence</p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score Breakdown</p>
          {factors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-sm text-gray-700">{factor.label}</span>
              <span className={`text-sm font-semibold ${factor.positive ? 'text-green-700' : 'text-red-700'}`}>
                {factor.positive ? '+' : ''}{Math.round(factor.value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-gray-900 px-3 py-2 mt-2">
            <span className="text-sm font-semibold text-white">Final Confidence</span>
            <span className="text-sm font-bold text-white">{breakdown.final}%</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-800">
            <strong>Formula:</strong> 100 - (hours since update × decay factor) - (velocity penalty) - (rejection history) - (low stock penalty) + (confirmation bonus)
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Substitution Modal ---

function SubstitutionModal({
  atRiskProduct,
  onClose,
}: {
  atRiskProduct: Product;
  onClose: () => void;
}) {
  const { products, stores, addToCart, showToast } = useApp();
  const substitutes = useMemo(
    () => findSubstitutes(atRiskProduct, products, stores),
    [atRiskProduct, products, stores],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="sub-title">
      <div className="max-w-lg w-full rounded-2xl bg-white p-6 shadow-2xl animate-scale-in max-h-[80vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="sub-title" className="text-lg font-bold text-gray-900">Smart Substitutions</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Alternatives for <strong>{atRiskProduct.name}</strong> ({formatINR(atRiskProduct.price)})
            </p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {substitutes.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No substitutes found in nearby stores. You can request this item to be stocked.
          </p>
        ) : (
          <div className="space-y-3">
            {substitutes.map((sub, i) => (
              <div key={sub.product.id} className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{sub.product.name}</p>
                      <p className="text-xs text-gray-500">
                        {sub.store.name} · {sub.store.city} · {formatINR(sub.product.price)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceBadge score={sub.confidence} size="sm" showLabel={false} />
                  <button
                    onClick={() => {
                      addToCart(sub.product.id);
                      showToast(`Added substitute: ${sub.product.name}`, 'success');
                      onClose();
                    }}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-lg bg-teal-50 p-3">
          <p className="text-xs text-teal-800">
            <PackageCheck className="inline h-3.5 w-3.5 mr-1" />
            Substitutes are matched by same category, similar price (±30%), and high confidence from nearby stores.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Demand Modal ---

function DemandModal({
  onClose,
  onSubmit,
  existingRequests,
}: {
  onClose: () => void;
  onSubmit: (name: string, category: 'grocery' | 'pharmacy' | 'bakery' | 'stationery', city: 'Hyderabad' | 'Vizag' | 'Vijayawada') => void;
  existingRequests: ReturnType<typeof useApp>['demandRequests'];
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'grocery' | 'pharmacy' | 'bakery' | 'stationery'>('grocery');
  const [city, setCity] = useState<'Hyderabad' | 'Vizag' | 'Vijayawada'>('Hyderabad');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="demand-title">
      <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl animate-scale-in max-h-[80vh] overflow-y-auto">
        <div className="mb-4 flex items-start justify-between">
          <h2 id="demand-title" className="text-lg font-bold text-gray-900">Request an Item</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Can't find what you need? Log the demand and we'll use it to recruit new stores in your area.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Product name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Organic Quinoa 500g"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="grocery">Grocery</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="bakery">Bakery</option>
              <option value="stationery">Stationery</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value as typeof city)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="Hyderabad">Hyderabad</option>
              <option value="Vizag">Vizag</option>
              <option value="Vijayawada">Vijayawada</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => name.trim() && onSubmit(name.trim(), category, city)}
          disabled={!name.trim()}
          className="mt-4 w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Log Demand
        </button>

        {/* Existing requests */}
        {existingRequests.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Existing Requests</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {existingRequests.slice(0, 5).map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{req.productName}</p>
                    <p className="text-[10px] text-gray-400">{req.city} · {req.category}</p>
                  </div>
                  <span className="text-xs font-semibold text-teal-600">{req.count} requests</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
