export type Role = 'customer' | 'store' | 'ops';

export type City = 'Hyderabad' | 'Vizag' | 'Vijayawada';

export type StoreType = 'grocery' | 'pharmacy' | 'bakery' | 'stationery';

export type ProductCategory = 'grocery' | 'pharmacy' | 'bakery' | 'stationery';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type StockLevel = 'in_stock' | 'low' | 'out';

export type OrderStatus = 'delivered' | 'cancelled' | 'substituted';

export type CancellationReason =
  | 'product_unavailable'
  | 'store_rejected'
  | 'customer_cancelled'
  | 'delivery_timeout'
  | 'other';

export interface Store {
  id: string;
  name: string;
  type: StoreType;
  city: City;
  area: string;
  updateFrequencyHours: number;
  lastStockUpdateHoursAgo: number;
  rejectionRate: number;
  responseTimeMinutes: number;
  accuracyScore: number;
  baseSearchRank: number;
  totalOrders: number;
  stockUpdatesToday: number;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  unit: string;
  velocity: number;
  storeId: string;
  stockLevel: number;
  lastStockUpdateHoursAgo: number;
  recentConfirmationBonus: number;
  stockStatus: StockLevel;
}

export interface CartItem {
  productId: string;
  quantity: number;
  autoSubstitute: boolean;
  confirmWithStore: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  items: { productId: string; quantity: number; substituted: boolean }[];
  total: number;
  status: OrderStatus;
  cancellationReason?: CancellationReason;
  placedHoursAgo: number;
  confidenceAtOrder: number;
}

export interface DemandRequest {
  id: string;
  productName: string;
  category: ProductCategory;
  city: City;
  count: number;
}

export interface ConfidenceBreakdown {
  base: number;
  decayPenalty: number;
  velocityPenalty: number;
  rejectionPenalty: number;
  stockPenalty: number;
  confirmationBonus: number;
  final: number;
}

export interface SimulatedHour {
  hourOffset: number;
  avgConfidence: number;
  ordersSaved: number;
  cancellations: number;
}

export interface ImpactInputs {
  cancellationReduction: number;
  recoveryRate: number;
  aov: number;
  takeRate: number;
  retentionUplift: number;
}

export interface ImpactOutputs {
  ordersSavedPerMonth: number;
  revenueRecoveredPerMonth: number;
  supportTicketsAvoidedPerMonth: number;
  additionalRetentionOrders: number;
  totalRevenueImpact: number;
  paybackMonths: number;
  roi: number;
}

export const STORE_TYPE_DECAY: Record<StoreType, number> = {
  grocery: 0.35,
  pharmacy: 0.15,
  bakery: 0.45,
  stationery: 0.12,
};

export const CITY_STORES: City[] = ['Hyderabad', 'Vizag', 'Vijayawada'];

export const CANCELLATION_STATS = {
  totalOrdersPerMonth: 38500,
  cancellationRate: 0.11,
  productUnavailableShare: 0.35,
  storeRejectedShare: 0.18,
  supportTicketsPerMonth: 5900,
  inventoryTicketShare: 0.19,
  promoSpendPerMonth: 1700000,
  buildBudget: 2500000,
} as const;
