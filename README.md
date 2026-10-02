# StockTrust — Inventory Confidence Engine

A fully functional web application built for the NOVA CART hackathon case study. StockTrust solves the hidden root cause of quality decline — inventory unreliability — by computing a transparent Availability Confidence score for every product and connecting three stakeholder views in one app.

## Problem

NOVA CART's growth masks dropping quality: repeat purchases fell from 41% to 27%, cancellations rose from 6% to 11%, and 61% of churned customers had rated the app 4 stars or higher. The diagnosed root cause is inventory unreliability — 35% of cancellations are because products are unavailable after ordering, and stores update stock only once every 1–3 days.

## Solution

StockTrust computes a live Availability Confidence score per product using a transparent formula:

```
confidence = 100
  - (hours since last stock update × decay factor per store type)
  - (item velocity penalty: fast-selling items decay faster)
  - (store rejection history penalty)
  - (low stock-level penalty)
  + (recent store-confirmation bonus)
```

Three role-based views share the same live state:

1. **Customer View** — product listing with confidence badges, low-confidence warnings, smart substitution picker, cart-level Order Reliability Score, and a "not available nearby" demand tracker.
2. **Store View** — daily Stock Check List of only the top 10–15 risky items (under 30 seconds to complete), one-tap stock updates, Store Health Score with incentive system, and pending order alerts.
3. **Ops Dashboard** — KPIs (cancellation rate, avg confidence, stale stores, inventory tickets), store risk ranking with nudge actions, cancellation reason charts, confidence distribution, and an interactive Impact Simulator with sliders.

## Tech Stack

- **React 18 + TypeScript** — strict mode, fully typed
- **Tailwind CSS** — utility-first styling, mobile-first responsive design
- **Vite** — fast build and dev server
- **Lucide React** — icon system
- All logic runs in the frontend with in-memory React state (no backend, no localStorage)

## Run Steps

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

To build for production:

```bash
npm run build
npm run preview
```

To typecheck:

```bash
npm run typecheck
```

## 2-Minute Demo Script

### 0. Start (15 seconds)
Open the app. You're in the **Customer** view by default. Click the green **"Guided Demo"** button at the top right for a 7-step automated walkthrough, or follow along manually below.

### 1. Customer browses products (30 seconds)
Notice each product has a colored **Availability Confidence badge** — green (High, 70%+), amber (Medium, 45–69%), or red (Low, <45%). Click the **info icon** on any product to see the "Why this score?" explainer showing each factor in the formula.

### 2. Customer adds a low-confidence item (30 seconds)
Find a red/low-confidence product and click **Add to cart**. In the cart sidebar, enable **"Auto-substitute"** for that item. Click **"View substitutes"** to see 2–3 alternatives from nearby stores with high confidence. The cart's **Order Reliability Score** updates live as you toggle options.

### 3. Store updates stock (30 seconds)
Switch to the **Store** view using the top role switcher. You see only the top 10–15 risky items — not the full catalogue. Tap **"In Stock"** on a low-confidence item. The confidence jumps immediately. Notice the **Store Health Score** gauge and the **"Reliable Store" badge**.

### 4. Time simulation (15 seconds)
Click **"+6h"** at the top. All confidence scores decay as time passes since the last stock update. The store's items drop in confidence. This shows why daily updates matter.

### 5. Ops Dashboard (30 seconds)
Switch to the **Ops** view. See live KPIs: cancellation rate, avg confidence, stale stores. The **Store Risk Ranking** table shows which stores need attention — click **"Nudge"** on a high-risk store. Check the cancellation reason bar chart and confidence distribution donut.

### 6. Impact Simulator (30 seconds)
Scroll down to the **Impact Simulator**. The sliders are pre-set to the case study assumptions (50% cancellation reduction, 85% recovery rate, ₹486 AOV, 14% take rate, 8% retention uplift). See the results: ~740 orders saved/month, revenue recovered, support tickets avoided, payback period vs the ₹25L budget, and annual ROI. Move the sliders to model different scenarios.

### Wrap-up (15 seconds)
The key insight: inventory unreliability is the hidden root cause. StockTrust addresses it with a transparent confidence score, a lightweight store workflow, and measurable business impact — paying back the ₹25L build budget in under 4 months.

## Project Structure

```
src/
├── types.ts                    # All TypeScript interfaces and constants
├── data/
│   └── generateData.ts         # Sample data generator (25 stores, 120+ products, 200 orders)
├── lib/
│   ├── confidence.ts           # Core confidence formula + cart reliability
│   ├── substitution.ts         # Smart substitution finder
│   ├── impact.ts               # Business impact simulator logic
│   └── format.ts               # INR formatting, lakhs, percentages
├── store/
│   └── AppContext.tsx          # Central state management with all actions
├── components/
│   ├── Header.tsx              # Top bar with role switcher + guided demo button
│   ├── ConfidenceBadge.tsx     # Reusable confidence badge component
│   ├── Charts.tsx              # Bar chart and donut chart components
│   ├── ToastContainer.tsx      # Notification system
│   └── GuidedDemo.tsx          # 7-step interactive demo walkthrough
├── views/
│   ├── CustomerView.tsx        # Product listing, cart, substitution, demand tracker
│   ├── StoreView.tsx           # Stock check list, health score, order alerts
│   └── OpsView.tsx             # KPIs, store risk table, charts, impact simulator
├── App.tsx                     # Root component with role-based view switching
├── main.tsx                    # Entry point
└── index.css                   # Tailwind + custom animations
```

## Key Features

- **Transparent confidence formula** with per-factor "Why this score?" explainer
- **Live recalculation** when stores update stock, orders are placed, or time is advanced
- **Time simulation** (+6h, +24h) to show confidence decay
- **Place order flow** that updates stock levels and triggers auto-substitution
- **Smart substitution** matching by category, price similarity (±30%), and confidence
- **Cart reliability score** using a blended multiplicative + average model
- **Demand tracker** for items not available nearby
- **Store health scoring** with incentive system (higher score = better ranking + badge)
- **Impact simulator** with 5 interactive sliders and real-time business calculations
- **Guided demo** with 7 automated steps walking through the primary journey
- **Mobile-first responsive design** with accessible ARIA labels throughout
- **Color-coded confidence** (green/amber/red) consistently applied across all views
