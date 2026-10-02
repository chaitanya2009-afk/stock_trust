import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { generateAllData } from '../src/data/generateData.ts';

const envFile = readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
}

const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['VITE_SUPABASE_ANON_KEY']);

// Map camelCase TS objects to snake_case DB columns
function mapStore(s: ReturnType<typeof generateAllData>['stores'][0]) {
  return {
    id: s.id, name: s.name, type: s.type, city: s.city, area: s.area,
    update_frequency_hours: s.updateFrequencyHours,
    last_stock_update_hours_ago: s.lastStockUpdateHoursAgo,
    rejection_rate: s.rejectionRate,
    response_time_minutes: s.responseTimeMinutes,
    accuracy_score: s.accuracyScore,
    base_search_rank: s.baseSearchRank,
    total_orders: s.totalOrders,
    stock_updates_today: s.stockUpdatesToday,
  };
}

function mapProduct(p: ReturnType<typeof generateAllData>['products'][0]) {
  return {
    id: p.id, name: p.name, category: p.category, price: p.price, unit: p.unit,
    velocity: p.velocity, store_id: p.storeId, stock_level: p.stockLevel,
    last_stock_update_hours_ago: p.lastStockUpdateHoursAgo,
    recent_confirmation_bonus: p.recentConfirmationBonus,
    stock_status: p.stockStatus,
  };
}

function mapOrder(o: ReturnType<typeof generateAllData>['orders'][0]) {
  return {
    id: o.id, customer_id: o.customerId, store_id: o.storeId,
    items: o.items, total: o.total, status: o.status,
    cancellation_reason: o.cancellationReason ?? null,
    placed_hours_ago: o.placedHoursAgo,
    confidence_at_order: o.confidenceAtOrder,
  };
}

function mapDemand(d: ReturnType<typeof generateAllData>['demandRequests'][0]) {
  return {
    id: d.id, product_name: d.productName, category: d.category,
    city: d.city, count: d.count,
  };
}

async function seed() {
  const data = generateAllData();

  const { count: storeCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
  const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: demandCount } = await supabase.from('demand_requests').select('*', { count: 'exact', head: true });
  console.log(`Current: stores=${storeCount}, products=${productCount}, orders=${orderCount}, demand=${demandCount}`);

  if (storeCount === 0) {
    console.log('Inserting stores...');
    const { error } = await supabase.from('stores').insert(data.stores.map(mapStore));
    console.log(error ? `Error: ${error.message}` : `  Inserted ${data.stores.length} stores`);
  }

  if (productCount === 0) {
    console.log('Inserting products in batches...');
    for (let i = 0; i < data.products.length; i += 50) {
      const batch = data.products.slice(i, i + 50).map(mapProduct);
      const { error } = await supabase.from('products').insert(batch);
      console.log(error ? `  Batch ${i} error: ${error.message}` : `  Inserted products ${i + 1}-${i + batch.length}`);
    }
  }

  if (orderCount === 0) {
    console.log('Inserting 200 orders in batches of 50...');
    for (let i = 0; i < data.orders.length; i += 50) {
      const batch = data.orders.slice(i, i + 50).map(mapOrder);
      const { error } = await supabase.from('orders').insert(batch);
      console.log(error ? `  Batch ${i} error: ${error.message}` : `  Inserted orders ${i + 1}-${i + batch.length}`);
    }
  }

  if (demandCount === 0) {
    console.log('Inserting demand requests...');
    const { error } = await supabase.from('demand_requests').insert(data.demandRequests.map(mapDemand));
    console.log(error ? `  Error: ${error.message}` : `  Inserted ${data.demandRequests.length} demand requests`);
  }

  const { count: fS } = await supabase.from('stores').select('*', { count: 'exact', head: true });
  const { count: fP } = await supabase.from('products').select('*', { count: 'exact', head: true });
  const { count: fO } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: fD } = await supabase.from('demand_requests').select('*', { count: 'exact', head: true });
  console.log(`\nFinal: stores=${fS}, products=${fP}, orders=${fO}, demand=${fD}`);
  console.log('Done!');
}

seed().catch(console.error);
