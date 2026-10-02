import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  Store,
  Product,
  Order,
  CartItem,
  DemandRequest,
  Role,
  StockLevel,
  ImpactInputs,
} from '@/types';
import { generateAllData } from '@/data/generateData';
import {
  computeConfidence,
  applyTimeAdvance,
  stockStatusFromLevel,
} from '@/lib/confidence';
import { autoPickSubstitute } from '@/lib/substitution';
import { DEFAULT_IMPACT_INPUTS } from '@/lib/impact';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface AppContextValue {
  // Data
  stores: Store[];
  products: Product[];
  orders: Order[];
  demandRequests: DemandRequest[];

  // UI state
  role: Role;
  selectedStoreId: string | null;
  cart: CartItem[];
  toasts: Toast[];
  impactInputs: ImpactInputs;
  simulatedHours: number;

  // Actions
  setRole: (role: Role) => void;
  setSelectedStoreId: (id: string | null) => void;

  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  placeOrder: () => { success: boolean; message: string; substitutedItems: string[] };

  updateStock: (productId: string, status: StockLevel) => void;
  bulkMarkUnchanged: (storeIds: string[]) => void;
  respondToOrder: (orderId: string, accept: boolean) => void;

  addDemandRequest: (productName: string, category: DemandRequest['category'], city: DemandRequest['city']) => void;

  simulateTime: (hours: number) => void;
  setImpactInputs: (inputs: ImpactInputs) => void;

  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: number) => void;

  // Computed
  getProductConfidence: (product: Product) => ReturnType<typeof computeConfidence>;
  getStoreById: (id: string) => Store | undefined;
  getProductById: (id: string) => Product | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

let toastIdCounter = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => generateAllData(), []);
  const [stores, setStores] = useState<Store[]>(initial.stores);
  const [products, setProducts] = useState<Product[]>(initial.products);
  const [orders, setOrders] = useState<Order[]>(initial.orders);
  const [demandRequests, setDemandRequests] = useState<DemandRequest[]>(initial.demandRequests);

  const [role, setRole] = useState<Role>('customer');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
    initial.stores[0]?.id ?? null,
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [impactInputs, setImpactInputs] = useState<ImpactInputs>(DEFAULT_IMPACT_INPUTS);
  const [simulatedHours, setSimulatedHours] = useState(0);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getStoreById = useCallback(
    (id: string) => stores.find((s) => s.id === id),
    [stores],
  );

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );

  const getProductConfidence = useCallback(
    (product: Product) => {
      const store = stores.find((s) => s.id === product.storeId);
      if (!store) {
        return {
          base: 100,
          decayPenalty: 0,
          velocityPenalty: 0,
          rejectionPenalty: 0,
          stockPenalty: 0,
          confirmationBonus: 0,
          final: 0,
        };
      }
      return computeConfidence(product, store);
    },
    [stores],
  );

  const addToCart = useCallback((productId: string, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === productId);
      if (existing) {
        return prev.map((c) =>
          c.productId === productId ? { ...c, quantity: c.quantity + quantity } : c,
        );
      }
      return [...prev, { productId, quantity, autoSubstitute: false, confirmWithStore: false }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }, []);

  const updateCartItem = useCallback((productId: string, updates: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, ...updates } : c)),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const placeOrder = useCallback((): {
    success: boolean;
    message: string;
    substitutedItems: string[];
  } => {
    if (cart.length === 0) {
      return { success: false, message: 'Cart is empty', substitutedItems: [] };
    }

    const substitutedItems: string[] = [];
    let allFulfilled = true;

    // For each cart item, check if it's actually out of stock → trigger substitution
    const newOrderItems: { productId: string; quantity: number; substituted: boolean }[] = [];
    const productUpdates: Record<string, Partial<Product>> = {};

    for (const item of cart) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;

      let effectiveProductId = item.productId;
      let substituted = false;

      // If the product is out of stock and auto-substitute is on, find a substitute
      if (product.stockStatus === 'out' && item.autoSubstitute) {
        const sub = autoPickSubstitute(product, products, stores);
        if (sub) {
          effectiveProductId = sub.product.id;
          substituted = true;
          substitutedItems.push(
            `${product.name} → ${sub.product.name}`,
          );
          // Decrement substitute stock
          productUpdates[sub.product.id] = {
            stockLevel: Math.max(0, sub.product.stockLevel - item.quantity),
            stockStatus: stockStatusFromLevel(Math.max(0, sub.product.stockLevel - item.quantity)),
          };
        } else {
          allFulfilled = false;
        }
      } else if (product.stockStatus === 'out' && !item.autoSubstitute) {
        // Out of stock, no substitution → order fails for this item
        allFulfilled = false;
      } else {
        // Decrement stock for the ordered item
        const newLevel = Math.max(0, product.stockLevel - item.quantity);
        productUpdates[item.productId] = {
          stockLevel: newLevel,
          stockStatus: stockStatusFromLevel(newLevel),
        };
      }

      newOrderItems.push({
        productId: effectiveProductId,
        quantity: item.quantity,
        substituted,
      });
    }

    // Update product stock levels
    setProducts((prev) =>
      prev.map((p) =>
        productUpdates[p.id] ? { ...p, ...productUpdates[p.id] } : p,
      ),
    );

    // Create the order
    const total = newOrderItems.reduce((sum, oi) => {
      const p = products.find((pp) => pp.id === oi.productId);
      return sum + (p ? p.price * oi.quantity : 0);
    }, 0);

    const storeId =
      products.find((p) => p.id === cart[0]?.productId)?.storeId ?? stores[0]?.id ?? '';

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      customerId: 'cust-current',
      storeId,
      items: newOrderItems,
      total: Math.round(total),
      status: allFulfilled ? (substitutedItems.length > 0 ? 'substituted' : 'delivered') : 'cancelled',
      cancellationReason: allFulfilled ? undefined : 'product_unavailable',
      placedHoursAgo: 0,
      confidenceAtOrder: 0, // will be computed by the UI
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);

    if (allFulfilled && substitutedItems.length > 0) {
      return {
        success: true,
        message: `Order placed! Substituted: ${substitutedItems.join(', ')}`,
        substitutedItems,
      };
    } else if (allFulfilled) {
      return { success: true, message: 'Order placed successfully!', substitutedItems: [] };
    } else {
      return {
        success: false,
        message: 'Order could not be fulfilled — some items were out of stock with no substitution enabled.',
        substitutedItems,
      };
    }
  }, [cart, products, stores]);

  const updateStock = useCallback(
    (productId: string, status: StockLevel) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const newLevel =
            status === 'out' ? 0 : status === 'low' ? 3 : 20;
          return {
            ...p,
            stockStatus: status,
            stockLevel: newLevel,
            lastStockUpdateHoursAgo: 0,
            recentConfirmationBonus: 5,
          };
        }),
      );
      // Also update the store's lastStockUpdate
      const product = products.find((p) => p.id === productId);
      if (product) {
        setStores((prev) =>
          prev.map((s) =>
            s.id === product.storeId
              ? {
                  ...s,
                  lastStockUpdateHoursAgo: 0,
                  stockUpdatesToday: s.stockUpdatesToday + 1,
                  accuracyScore: Math.min(100, s.accuracyScore + 1),
                }
              : s,
          ),
        );
      }
    },
    [products],
  );

  const bulkMarkUnchanged = useCallback((storeIds: string[]) => {
    setProducts((prev) =>
      prev.map((p) => {
        const store = stores.find((s) => s.id === p.storeId);
        if (!store || !storeIds.includes(store.id)) return p;
        return {
          ...p,
          lastStockUpdateHoursAgo: 0,
          recentConfirmationBonus: 3,
        };
      }),
    );
    setStores((prev) =>
      prev.map((s) =>
        storeIds.includes(s.id)
          ? { ...s, lastStockUpdateHoursAgo: 0, stockUpdatesToday: s.stockUpdatesToday + 1 }
          : s,
      ),
    );
    showToast('All items marked as unchanged for selected stores', 'success');
  }, [stores, showToast]);

  const respondToOrder = useCallback(
    (orderId: string, accept: boolean) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: accept ? o.status : 'cancelled',
                cancellationReason: accept ? o.cancellationReason : 'store_rejected',
              }
            : o,
        ),
      );
      // If rejected, increase store rejection rate
      if (!accept) {
        const order = orders.find((o) => o.id === orderId);
        if (order) {
          setStores((prev) =>
            prev.map((s) =>
              s.id === order.storeId
                ? {
                    ...s,
                    rejectionRate: Math.min(0.3, s.rejectionRate + 0.02),
                    accuracyScore: Math.max(0, s.accuracyScore - 2),
                  }
                : s,
            ),
          );
        }
        showToast('Order rejected. Frequent rejections reduce your store health score.', 'warning');
      } else {
        showToast('Order accepted!', 'success');
      }
    },
    [orders, showToast],
  );

  const addDemandRequest = useCallback(
    (productName: string, category: DemandRequest['category'], city: DemandRequest['city']) => {
      setDemandRequests((prev) => {
        const existing = prev.find(
          (d) => d.productName.toLowerCase() === productName.toLowerCase() && d.city === city,
        );
        if (existing) {
          return prev.map((d) =>
            d.id === existing.id ? { ...d, count: d.count + 1 } : d,
          );
        }
        return [
          ...prev,
          { id: `demand-${Date.now()}`, productName, category, city, count: 1 },
        ];
      });
      showToast(`Demand logged for "${productName}" in ${city}`, 'success');
    },
    [showToast],
  );

  const simulateTime = useCallback(
    (hours: number) => {
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          lastStockUpdateHoursAgo: p.lastStockUpdateHoursAgo + hours,
          recentConfirmationBonus: Math.max(0, p.recentConfirmationBonus - hours * 0.15),
        })),
      );
      setStores((prev) =>
        prev.map((s) => ({
          ...s,
          lastStockUpdateHoursAgo: s.lastStockUpdateHoursAgo + hours,
        })),
      );
      setSimulatedHours((prev) => prev + hours);
      showToast(`Time advanced by ${hours}h. Confidence scores recalculated.`, 'info');
    },
    [showToast],
  );

  const value: AppContextValue = {
    stores,
    products,
    orders,
    demandRequests,
    role,
    selectedStoreId,
    cart,
    toasts,
    impactInputs,
    simulatedHours,
    setRole,
    setSelectedStoreId,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    placeOrder,
    updateStock,
    bulkMarkUnchanged,
    respondToOrder,
    addDemandRequest,
    simulateTime,
    setImpactInputs,
    showToast,
    dismissToast,
    getProductConfidence,
    getStoreById,
    getProductById,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
