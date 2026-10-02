import type { ImpactInputs, ImpactOutputs } from '@/types';
import { CANCELLATION_STATS } from '@/types';

/**
 * Business impact simulator.
 * Given slider inputs, computes monthly orders saved, revenue recovered,
 * support tickets avoided, retention uplift, and ROI vs the ₹25L budget.
 */
export function computeImpact(inputs: ImpactInputs): ImpactOutputs {
  const totalCancellations =
    CANCELLATION_STATS.totalOrdersPerMonth * CANCELLATION_STATS.cancellationRate;
  // ~4,235 cancellations/month, of which 35% are stock-related = ~1,482
  const stockCancellations =
    totalCancellations * CANCELLATION_STATS.productUnavailableShare;

  // Orders saved = stock cancellations × reduction % × recovery rate
  const ordersSavedPerMonth = Math.round(
    stockCancellations * (inputs.cancellationReduction / 100) * (inputs.recoveryRate / 100),
  );

  // Revenue recovered = orders saved × AOV × take rate
  const revenueRecoveredPerMonth = Math.round(
    ordersSavedPerMonth * inputs.aov * (inputs.takeRate / 100),
  );

  // Support tickets avoided = inventory tickets × reduction share
  const inventoryTickets =
    CANCELLATION_STATS.supportTicketsPerMonth *
    CANCELLATION_STATS.inventoryTicketShare;
  const supportTicketsAvoidedPerMonth = Math.round(
    inventoryTickets * (inputs.cancellationReduction / 100),
  );

  // Retention uplift: 31% of new users place 2nd order within 30 days.
  // Failed first orders kill retention. With fewer failures, more succeed.
  // Assume 46,000 MAU, ~15% are new users monthly = ~6,900
  const newUsersMonthly = 46000 * 0.15;
  const currentRetentionRate = 0.31;
  const additionalRetainedUsers = Math.round(
    newUsersMonthly * (inputs.retentionUplift / 100),
  );
  // Each retained user places ~1.3 additional orders/month
  const additionalRetentionOrders = Math.round(additionalRetainedUsers * 1.3);
  const retentionRevenue = Math.round(
    additionalRetentionOrders * inputs.aov * (inputs.takeRate / 100),
  );

  const totalRevenueImpact = revenueRecoveredPerMonth + retentionRevenue;
  const paybackMonths =
    totalRevenueImpact > 0
      ? CANCELLATION_STATS.buildBudget / totalRevenueImpact
      : Infinity;
  const roi =
    totalRevenueImpact > 0
      ? ((totalRevenueImpact * 12 - CANCELLATION_STATS.buildBudget) /
          CANCELLATION_STATS.buildBudget) *
        100
      : 0;

  return {
    ordersSavedPerMonth,
    revenueRecoveredPerMonth,
    supportTicketsAvoidedPerMonth,
    additionalRetentionOrders,
    totalRevenueImpact,
    paybackMonths: Math.round(paybackMonths * 10) / 10,
    roi: Math.round(roi),
  };
}

/** Default slider values matching the case study assumptions */
export const DEFAULT_IMPACT_INPUTS: ImpactInputs = {
  cancellationReduction: 50,
  recoveryRate: 85,
  aov: 486,
  takeRate: 14,
  retentionUplift: 8,
};
