/*
# StockTrust — Inventory Confidence Engine Schema

## Purpose
Creates the database backend for the StockTrust quick-commerce inventory
confidence platform. This is a single-tenant demo app (no sign-in screen),
so all policies allow both anon and authenticated roles.

## New Tables

1. **stores** — Partner stores across 3 Indian cities
   - id (text, primary key) — e.g., "store-1"
   - name (text) — store display name
   - type (text) — grocery, pharmacy, bakery, stationery
   - city (text) — Hyderabad, Vizag, Vijayawada
   - area (text) — neighborhood/area within the city
   - update_frequency_hours (int) — how often the store updates stock
   - last_stock_update_hours_ago (int) — hours since last stock update
   - rejection_rate (numeric) — 0.0–1.0, share of orders rejected
   - response_time_minutes (int) — avg time to respond to an order
   - accuracy_score (int) — 0–100, store health score
   - base_search_rank (int) — default search ranking position
   - total_orders (int) — lifetime order count for the store
   - stock_updates_today (int) — how many times stock was updated today

2. **products** — Products carried by stores
   - id (text, primary key)
   - name (text) — product display name
   - category (text) — grocery, pharmacy, bakery, stationery
   - price (numeric) — price in INR
   - unit (text) — e.g., "pack", "bottle", "loose"
   - velocity (numeric) — sales velocity factor (0.1–1.1)
   - store_id (text, foreign key → stores.id)
   - stock_level (int) — current units in stock
   - last_stock_update_hours_ago (int) — hours since this product's stock was updated
   - recent_confirmation_bonus (numeric) — bonus from recent store confirmation
   - stock_status (text) — in_stock, low, out

3. **orders** — Sample past orders with cancellation reasons
   - id (text, primary key)
   - customer_id (text) — identifier for the customer
   - store_id (text, foreign key → stores.id)
   - items (jsonb) — array of { productId, quantity, substituted }
   - total (numeric) — order total in INR
   - status (text) — delivered, cancelled, substituted
   - cancellation_reason (text, nullable) — product_unavailable, store_rejected, etc.
   - placed_hours_ago (int) — how many hours ago the order was placed
   - confidence_at_order (int) — confidence score at time of order

4. **demand_requests** — Customer requests for items not available nearby
   - id (text, primary key)
   - product_name (text) — requested product name
   - category (text) — grocery, pharmacy, bakery, stationery
   - city (text) — city where demand was logged
   - count (int) — number of times this item has been requested

## Security
- RLS enabled on all 4 tables.
- All policies use `TO anon, authenticated` because this is a no-auth demo app.
- SELECT, INSERT, UPDATE, DELETE policies created separately for each table.

## Notes
1. All IDs are text (e.g., "store-1", "prod-1") to match the frontend's deterministic ID generation.
2. The `items` column on `orders` is jsonb to store the array of line items.
3. Indexes added on store_id (products, orders) and category (products) for query performance.
*/

-- ===== Stores =====
CREATE TABLE IF NOT EXISTS stores (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('grocery', 'pharmacy', 'bakery', 'stationery')),
  city text NOT NULL CHECK (city IN ('Hyderabad', 'Vizag', 'Vijayawada')),
  area text NOT NULL,
  update_frequency_hours int NOT NULL DEFAULT 24,
  last_stock_update_hours_ago int NOT NULL DEFAULT 0,
  rejection_rate numeric NOT NULL DEFAULT 0,
  response_time_minutes int NOT NULL DEFAULT 10,
  accuracy_score int NOT NULL DEFAULT 70,
  base_search_rank int NOT NULL DEFAULT 300,
  total_orders int NOT NULL DEFAULT 0,
  stock_updates_today int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_stores" ON stores;
CREATE POLICY "select_stores" ON stores FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_stores" ON stores;
CREATE POLICY "insert_stores" ON stores FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_stores" ON stores;
CREATE POLICY "update_stores" ON stores FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_stores" ON stores;
CREATE POLICY "delete_stores" ON stores FOR DELETE
  TO anon, authenticated USING (true);

-- ===== Products =====
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('grocery', 'pharmacy', 'bakery', 'stationery')),
  price numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'piece',
  velocity numeric NOT NULL DEFAULT 0.5,
  store_id text NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  stock_level int NOT NULL DEFAULT 0,
  last_stock_update_hours_ago int NOT NULL DEFAULT 0,
  recent_confirmation_bonus numeric NOT NULL DEFAULT 0,
  stock_status text NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'low', 'out')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_products" ON products;
CREATE POLICY "insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_products" ON products;
CREATE POLICY "update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_products" ON products;
CREATE POLICY "delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ===== Orders =====
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  customer_id text NOT NULL,
  store_id text NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'cancelled', 'substituted')),
  cancellation_reason text CHECK (cancellation_reason IS NULL OR cancellation_reason IN ('product_unavailable', 'store_rejected', 'customer_cancelled', 'delivery_timeout', 'other')),
  placed_hours_ago int NOT NULL DEFAULT 0,
  confidence_at_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_orders" ON orders;
CREATE POLICY "select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_orders" ON orders;
CREATE POLICY "insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_orders" ON orders;
CREATE POLICY "update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_orders" ON orders;
CREATE POLICY "delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ===== Demand Requests =====
CREATE TABLE IF NOT EXISTS demand_requests (
  id text PRIMARY KEY,
  product_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('grocery', 'pharmacy', 'bakery', 'stationery')),
  city text NOT NULL CHECK (city IN ('Hyderabad', 'Vizag', 'Vijayawada')),
  count int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE demand_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_demand_requests" ON demand_requests;
CREATE POLICY "select_demand_requests" ON demand_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_demand_requests" ON demand_requests;
CREATE POLICY "insert_demand_requests" ON demand_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_demand_requests" ON demand_requests;
CREATE POLICY "update_demand_requests" ON demand_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_demand_requests" ON demand_requests;
CREATE POLICY "delete_demand_requests" ON demand_requests FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_demand_requests_city ON demand_requests(city);
CREATE INDEX IF NOT EXISTS idx_demand_requests_category ON demand_requests(category);