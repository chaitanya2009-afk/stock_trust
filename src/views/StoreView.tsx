import { useState, useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { computeConfidence, confidenceLevel } from '@/lib/confidence';
import { formatINR } from '@/lib/format';
import type { StockLevel } from '@/types';
import {
  Store as StoreIcon,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Package,
  Clock,
  TrendingUp,
  Award,
  Bell,
  ChevronDown,
} from 'lucide-react';

export function StoreView() {
  const {
    stores,
    products,
    orders,
    selectedStoreId,
    setSelectedStoreId,
    updateStock,
    bulkMarkUnchanged,
    respondToOrder,
    showToast,
  } = useApp();

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? stores[0];

  // Store's products sorted by risk (lowest confidence first) — top 10-15 only
  const stockCheckList = useMemo(() => {
    if (!selectedStore) return [];
    return products
      .filter((p) => p.storeId === selectedStore.id)
      .map((p) => {
        const breakdown = computeConfidence(p, selectedStore);
        return { product: p, breakdown };
      })
      .sort((a, b) => a.breakdown.final - b.breakdown.final)
      .slice(0, 15);
  }, [products, selectedStore]);

  // Pending orders for this store (recent orders that are "pending" — we'll use
  // orders from the last few hours that aren't cancelled/delivered yet)
  const pendingOrders = useMemo(() => {
    if (!selectedStore) return [];
    return orders
      .filter((o) => o.storeId === selectedStore.id && o.placedHoursAgo < 3 && o.status === 'delivered')
      .slice(0, 5);
    // In a real app these would be pending; we simulate by showing recent orders
  }, [orders, selectedStore]);

  // Store health score components
  const healthScore = selectedStore?.accuracyScore ?? 0;
  const isReliable = healthScore >= 75;
  const rejectionWarning = (selectedStore?.rejectionRate ?? 0) > 0.08;

  const handleStockUpdate = (productId: string, status: StockLevel) => {
    updateStock(productId, status);
    const statusLabel = status === 'in_stock' ? 'In Stock' : status === 'low' ? 'Low' : 'Out';
    showToast(`Marked as ${statusLabel}`, 'success');
  };

  const handleBulkMark = () => {
    if (selectedStore) {
      bulkMarkUnchanged([selectedStore.id]);
    }
  };

  if (!selectedStore) {
    return <div className="p-8 text-center text-gray-500">No store selected.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Store selector */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select your store</label>
        <div className="relative">
          <select
            value={selectedStore.id}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium focus:border-teal-500 focus:outline-none"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.city}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Stock check list */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Today's Stock Check List</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Only {stockCheckList.length} items that need attention — takes under 30 seconds
                </p>
              </div>
              <button
                onClick={handleBulkMark}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Mark all unchanged
              </button>
            </div>

            <div className="space-y-2">
              {stockCheckList.map(({ product, breakdown }) => {
                const level = confidenceLevel(breakdown.final);
                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                      level === 'low' ? 'border-red-200 bg-red-50/30' :
                      level === 'medium' ? 'border-amber-200 bg-amber-50/30' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">{formatINR(product.price)}</span>
                        <span className="text-xs text-gray-400">
                          Updated {product.lastStockUpdateHoursAgo}h ago
                        </span>
                        <ConfidenceBadge score={breakdown.final} size="sm" showLabel={false} />
                      </div>
                    </div>

                    {/* One-tap buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleStockUpdate(product.id, 'in_stock')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          product.stockStatus === 'in_stock'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                        aria-label={`Mark ${product.name} as in stock`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        In Stock
                      </button>
                      <button
                        onClick={() => handleStockUpdate(product.id, 'low')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          product.stockStatus === 'low'
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                        aria-label={`Mark ${product.name} as low stock`}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        Low
                      </button>
                      <button
                        onClick={() => handleStockUpdate(product.id, 'out')}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                          product.stockStatus === 'out'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        aria-label={`Mark ${product.name} as out of stock`}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Out
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {stockCheckList.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">No products to check right now.</p>
            )}
          </div>

          {/* Pending orders */}
          {pendingOrders.length > 0 && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900">Pending Order Alerts</h2>
              </div>
              <div className="space-y-2">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Order #{order.id.slice(-6)} · {order.items.length} items · {formatINR(order.total)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Placed {order.placedHoursAgo}h ago
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => respondToOrder(order.id, true)}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondToOrder(order.id, false)}
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Store Health Score */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Store Health Score</h2>

            {/* Score gauge */}
            <div className="relative mb-4 flex items-center justify-center">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="56" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                <circle
                  cx="70"
                  cy="70"
                  r="56"
                  fill="none"
                  stroke={healthScore >= 75 ? '#16a34a' : healthScore >= 50 ? '#f59e0b' : '#dc2626'}
                  strokeWidth="12"
                  strokeDasharray={`${(healthScore / 100) * 351.86} 351.86`}
                  strokeDashoffset="0"
                  transform="rotate(-90 70 70)"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{healthScore}</span>
                <span className="text-xs text-gray-500">/ 100</span>
              </div>
            </div>

            {isReliable && (
              <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-green-50 py-2">
                <Award className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Reliable Store Badge</span>
              </div>
            )}

            {/* Metrics */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Accuracy</span>
                <span className="text-sm font-semibold text-gray-900">{selectedStore.accuracyScore}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Rejection rate</span>
                <span className={`text-sm font-semibold ${(selectedStore.rejectionRate * 100) > 8 ? 'text-red-600' : 'text-gray-900'}`}>
                  {(selectedStore.rejectionRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Response time</span>
                <span className="text-sm font-semibold text-gray-900">{selectedStore.responseTimeMinutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Updates today</span>
                <span className="text-sm font-semibold text-gray-900">{selectedStore.stockUpdatesToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total orders</span>
                <span className="text-sm font-semibold text-gray-900">{selectedStore.totalOrders}</span>
              </div>
            </div>

            {/* Rejection warning */}
            {rejectionWarning && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    Your rejection rate is high. Frequent rejections reduce your search ranking and health score.
                  </p>
                </div>
              </div>
            )}

            {/* Incentive info */}
            <div className="mt-3 rounded-lg bg-teal-50 p-2.5">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-teal-700">
                  Higher health score = higher search ranking + Reliable Store badge. Update stock daily to improve.
                </p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Store Profile</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <StoreIcon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{selectedStore.type.charAt(0).toUpperCase() + selectedStore.type.slice(1)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{selectedStore.area}, {selectedStore.city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Updates every {selectedStore.updateFrequencyHours}h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
