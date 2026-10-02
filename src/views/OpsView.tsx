import { useState, useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { BarChart, DonutChart } from '@/components/Charts';
import { computeConfidence, confidenceLevel } from '@/lib/confidence';
import { computeImpact } from '@/lib/impact';
import { formatINR, formatLakhs, formatPct } from '@/lib/format';
import { CANCELLATION_STATS } from '@/types';
import type { ImpactInputs } from '@/types';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  Ticket,
  PackageX,
  Bell,
  Zap,
  BarChart3,
} from 'lucide-react';

export function OpsView() {
  const { stores, products, orders, impactInputs, setImpactInputs, simulateTime, showToast } = useApp();

  // --- KPIs ---
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const cancellationRate = (cancelled / totalOrders) * 100;
    const productUnavailable = orders.filter((o) => o.cancellationReason === 'product_unavailable').length;
    const storeRejected = orders.filter((o) => o.cancellationReason === 'store_rejected').length;

    // Average confidence across all products
    const allConfidences = products.map((p) => {
      const store = stores.find((s) => s.id === p.storeId);
      return store ? computeConfidence(p, store).final : 0;
    });
    const avgConfidence = allConfidences.reduce((a, b) => a + b, 0) / (allConfidences.length || 1);

    // Stores with stale inventory (last update > 24h)
    const staleStores = stores.filter((s) => s.lastStockUpdateHoursAgo > 24).length;

    // Inventory-related support tickets (19% of total)
    const inventoryTickets = Math.round(CANCELLATION_STATS.supportTicketsPerMonth * CANCELLATION_STATS.inventoryTicketShare);

    // Confidence distribution
    const high = allConfidences.filter((c) => c >= 70).length;
    const medium = allConfidences.filter((c) => c >= 45 && c < 70).length;
    const low = allConfidences.filter((c) => c < 45).length;

    return {
      cancellationRate,
      productUnavailable,
      storeRejected,
      avgConfidence,
      staleStores,
      inventoryTickets,
      confidenceDist: { high, medium, low },
      totalOrders,
      cancelled,
    };
  }, [orders, products, stores]);

  // --- Store risk ranking ---
  const storeRisks = useMemo(() => {
    return stores
      .map((store) => {
        const storeProducts = products.filter((p) => p.storeId === store.id);
        const avgConf = storeProducts.length > 0
          ? storeProducts.reduce((sum, p) => sum + computeConfidence(p, store).final, 0) / storeProducts.length
          : 0;
        const staleHours = store.lastStockUpdateHoursAgo;
        const riskScore = (100 - avgConf) * 0.5 + Math.min(staleHours, 72) * 0.3 + store.rejectionRate * 100;
        return { store, avgConf: Math.round(avgConf), staleHours, riskScore: Math.round(riskScore) };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [stores, products]);

  // --- Cancellation reasons breakdown ---
  const cancellationReasons = useMemo(() => {
    const reasons = { product_unavailable: 0, store_rejected: 0, customer_cancelled: 0, delivery_timeout: 0, other: 0 };
    orders.forEach((o) => {
      if (o.cancellationReason) {
        reasons[o.cancellationReason]++;
      }
    });
    return reasons;
  }, [orders]);

  // --- Impact simulation ---
  const impact = useMemo(() => computeImpact(impactInputs), [impactInputs]);

  const handleNudge = (storeName: string) => {
    showToast(`Nudge sent to ${storeName} to update stock inventory`, 'info');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Time simulation */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Operations Dashboard</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => simulateTime(6)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Clock className="h-4 w-4" />
            +6h
          </button>
          <button
            onClick={() => simulateTime(24)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Clock className="h-4 w-4" />
            +24h
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          label="Cancellation Rate"
          value={formatPct(kpis.cancellationRate, 1)}
          icon={TrendingDown}
          color="red"
          subtitle={`${kpis.cancelled} of ${kpis.totalOrders} orders`}
        />
        <KPICard
          label="Product Unavailable"
          value={String(kpis.productUnavailable)}
          icon={PackageX}
          color="red"
          subtitle="cancellations"
        />
        <KPICard
          label="Avg Confidence"
          value={formatPct(kpis.avgConfidence)}
          icon={TrendingUp}
          color={kpis.avgConfidence >= 60 ? 'green' : 'amber'}
          subtitle="across all products"
        />
        <KPICard
          label="Stale Stores"
          value={String(kpis.staleStores)}
          icon={Clock}
          color="amber"
          subtitle=">24h since update"
        />
        <KPICard
          label="Inventory Tickets"
          value={String(kpis.inventoryTickets)}
          icon={Ticket}
          color="amber"
          subtitle="per month (est.)"
        />
        <KPICard
          label="Store Rejections"
          value={String(kpis.storeRejected)}
          icon={AlertTriangle}
          color="red"
          subtitle="in sample data"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cancellation reasons chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Cancellation Reasons (Sample Data)</h3>
          <BarChart
            data={[
              { label: 'Product\nUnavailable', value: cancellationReasons.product_unavailable, color: 'bg-red-500' },
              { label: 'Store\nRejected', value: cancellationReasons.store_rejected, color: 'bg-orange-500' },
              { label: 'Customer\nCancelled', value: cancellationReasons.customer_cancelled, color: 'bg-gray-400' },
              { label: 'Delivery\nTimeout', value: cancellationReasons.delivery_timeout, color: 'bg-amber-400' },
              { label: 'Other', value: cancellationReasons.other, color: 'bg-gray-300' },
            ]}
            height={180}
            ariaLabel="Bar chart of cancellation reasons"
          />
        </div>

        {/* Confidence distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Confidence Distribution</h3>
          <div className="flex items-center justify-around py-4">
            <DonutChart
              segments={[
                { label: 'High (70%+)', value: kpis.confidenceDist.high, color: '#16a34a' },
                { label: 'Medium (45-69%)', value: kpis.confidenceDist.medium, color: '#f59e0b' },
                { label: 'Low (<45%)', value: kpis.confidenceDist.low, color: '#dc2626' },
              ]}
              ariaLabel="Donut chart of confidence distribution"
            />
          </div>
        </div>
      </div>

      {/* Store risk table */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">Store Risk Ranking</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">Store</th>
                <th className="pb-2 pr-4 font-medium">City</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium text-right">Avg Confidence</th>
                <th className="pb-2 pr-4 font-medium text-right">Stale (h)</th>
                <th className="pb-2 pr-4 font-medium text-right">Risk Score</th>
                <th className="pb-2 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {storeRisks.slice(0, 12).map(({ store, avgConf, staleHours, riskScore }) => (
                <tr key={store.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{store.name}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{store.city}</td>
                  <td className="py-2.5 pr-4 text-gray-600 capitalize">{store.type}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className={avgConf >= 70 ? 'text-green-700 font-semibold' : avgConf >= 45 ? 'text-amber-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {avgConf}%
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-600">{staleHours}h</td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className={`font-bold ${riskScore > 50 ? 'text-red-600' : riskScore > 30 ? 'text-amber-600' : 'text-green-600'}`}>
                      {riskScore}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    <button
                      onClick={() => handleNudge(store.name)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
                    >
                      <Bell className="h-3 w-3" />
                      Nudge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Impact Simulator */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-2">
          <Zap className="h-5 w-5 text-teal-600" />
          <h3 className="text-base font-bold text-gray-900">Impact Simulator</h3>
          <span className="text-xs text-gray-500">— adjust sliders to model business impact</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sliders */}
          <div className="space-y-4">
            <Slider
              label="Stock-cancellation reduction"
              value={impactInputs.cancellationReduction}
              min={0}
              max={80}
              suffix="%"
              onChange={(v) => setImpactInputs({ ...impactInputs, cancellationReduction: v })}
            />
            <Slider
              label="Recovery rate"
              value={impactInputs.recoveryRate}
              min={50}
              max={100}
              suffix="%"
              onChange={(v) => setImpactInputs({ ...impactInputs, recoveryRate: v })}
            />
            <Slider
              label="Average Order Value"
              value={impactInputs.aov}
              min={300}
              max={800}
              prefix="₹"
              onChange={(v) => setImpactInputs({ ...impactInputs, aov: v })}
            />
            <Slider
              label="Take rate"
              value={impactInputs.takeRate}
              min={5}
              max={25}
              suffix="%"
              onChange={(v) => setImpactInputs({ ...impactInputs, takeRate: v })}
            />
            <Slider
              label="Retention uplift"
              value={impactInputs.retentionUplift}
              min={0}
              max={20}
              suffix="%"
              onChange={(v) => setImpactInputs({ ...impactInputs, retentionUplift: v })}
            />
          </div>

          {/* Results */}
          <div className="space-y-3">
            <ResultCard
              label="Orders saved / month"
              value={String(impact.ordersSavedPerMonth)}
              icon={PackageX}
              color="teal"
            />
            <ResultCard
              label="Revenue recovered / month"
              value={formatINR(impact.totalRevenueImpact)}
              icon={TrendingUp}
              color="green"
            />
            <ResultCard
              label="Support tickets avoided / month"
              value={String(impact.supportTicketsAvoidedPerMonth)}
              icon={Ticket}
              color="blue"
            />
            <ResultCard
              label="Additional retention orders"
              value={String(impact.additionalRetentionOrders)}
              icon={BarChart3}
              color="teal"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-900 p-4">
                <p className="text-xs text-gray-400">Payback Period</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {isFinite(impact.paybackMonths) ? `${impact.paybackMonths} months` : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-teal-600 p-4">
                <p className="text-xs text-teal-100">Annual ROI</p>
                <p className="text-2xl font-bold text-white mt-1">{impact.roi}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Budget context */}
        <div className="mt-5 rounded-lg bg-gray-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div>
              <span className="text-gray-500">Build budget:</span>{' '}
              <span className="font-bold text-gray-900">{formatINR(CANCELLATION_STATS.buildBudget)}</span>
            </div>
            <div>
              <span className="text-gray-500">Monthly revenue impact:</span>{' '}
              <span className="font-bold text-teal-700">{formatINR(impact.totalRevenueImpact)}</span>
            </div>
            <div>
              <span className="text-gray-500">Annual revenue impact:</span>{' '}
              <span className="font-bold text-teal-700">{formatLakhs(impact.totalRevenueImpact * 12)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: typeof TrendingDown;
  color: 'red' | 'amber' | 'green' | 'blue' | 'teal';
  subtitle?: string;
}) {
  const colors = {
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-80">{label}</span>
        <Icon className="h-4 w-4 opacity-60" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  prefix = '',
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-bold text-teal-700">
          {prefix}{value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof TrendingDown;
  color: 'teal' | 'green' | 'blue';
}) {
  const colors = {
    teal: 'border-teal-200 bg-teal-50',
    green: 'border-green-200 bg-green-50',
    blue: 'border-blue-200 bg-blue-50',
  };
  const textColors = {
    teal: 'text-teal-700',
    green: 'text-green-700',
    blue: 'text-blue-700',
  };
  return (
    <div className={`flex items-center justify-between rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${textColors[color]} opacity-70`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className={`text-xl font-bold ${textColors[color]}`}>{value}</span>
    </div>
  );
}
