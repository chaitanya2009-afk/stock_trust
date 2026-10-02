import type {
  Store,
  Product,
  Order,
  City,
  StoreType,
  ProductCategory,
  StockLevel,
  OrderStatus,
  CancellationReason,
  DemandRequest,
} from '@/types';
import { STORE_TYPE_DECAY } from '@/types';

// Deterministic PRNG so the sample data is stable across reloads
let seed = 42;
function rand(): number {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const CITY_AREAS: Record<City, string[]> = {
  Hyderabad: ['Gachibowli', 'Madhapur', 'Kondapur', 'Begumpet', 'Ameerpet', 'Kukatpally'],
  Vizag: ['Dwaraka Nagar', 'Gajuwaka', 'Rushikonda', 'Seethammadhara', 'Asilmetta'],
  Vijayawada: ['Benz Circle', 'Labbipet', 'Moghalrajpuram', 'Governorpeta'],
};

const STORE_NAMES: Record<StoreType, string[]> = {
  grocery: ['Sri Lakshmi Super Mart', 'FreshMart Express', 'Daily Needs Store', 'GrocerHub', 'Spice Junction', 'Green Basket', 'QuickGrocer'],
  pharmacy: ['Apollo Pharmacy', 'MediCare Plus', 'HealthFirst Pharmacy', 'Wellness Drug Store', 'LifeLine Pharma'],
  bakery: ['BakeHouse Fresh', 'Sweet Cravings', 'The Daily Bake', ' Oven Stories', 'Crust & Crumb'],
  stationery: ['Pen & Paper Hub', 'Stationery World', 'BookNook Supplies', 'WriteRight Store'],
};

const PRODUCT_NAMES: Record<ProductCategory, { name: string; unit: string; priceRange: [number, number] }[]> = {
  grocery: [
    { name: 'Aashirvaad Atta 5kg', unit: 'pack', priceRange: [240, 280] },
    { name: 'Fortune Sunflower Oil 1L', unit: 'bottle', priceRange: [135, 165] },
    { name: 'Tata Salt 1kg', unit: 'pack', priceRange: [22, 28] },
    { name: 'Basmati Rice 5kg', unit: 'bag', priceRange: [420, 520] },
    { name: 'Toor Dal 1kg', unit: 'pack', priceRange: [140, 180] },
    { name: 'Amul Milk 1L', unit: 'pouch', priceRange: [58, 68] },
    { name: 'Amul Butter 500g', unit: 'pack', priceRange: [255, 285] },
    { name: 'Lays Classic 52g', unit: 'packet', priceRange: [18, 22] },
    { name: 'Maggi Noodles 4-pack', unit: 'pack', priceRange: [52, 62] },
    { name: 'Surf Excel 1kg', unit: 'box', priceRange: [115, 145] },
    { name: 'Colgate Toothpaste 200g', unit: 'tube', priceRange: [85, 105] },
    { name: 'Dabur Honey 250g', unit: 'bottle', priceRange: [95, 125] },
    { name: 'Britannia Marie Gold 250g', unit: 'pack', priceRange: [32, 42] },
    { name: 'Tata Tea Gold 250g', unit: 'pack', priceRange: [130, 160] },
    { name: 'Sugar 1kg', unit: 'loose', priceRange: [42, 52] },
    { name: 'Onion 1kg', unit: 'loose', priceRange: [28, 45] },
    { name: 'Tomato 1kg', unit: 'loose', priceRange: [25, 40] },
    { name: 'Potato 1kg', unit: 'loose', priceRange: [25, 35] },
    { name: 'Banana Robusta 1dz', unit: 'bunch', priceRange: [48, 65] },
    { name: 'Amul Paneer 200g', unit: 'pack', priceRange: [75, 95] },
    { name: 'Nature Valley Granola 400g', unit: 'box', priceRange: [180, 220] },
    { name: 'Dettol Hand Wash 200ml', unit: 'bottle', priceRange: [85, 110] },
    { name: 'Nescafe Classic 100g', unit: 'jar', priceRange: [280, 340] },
    { name: 'Parle-G Biscuit 100g', unit: 'pack', priceRange: [5, 8] },
    { name: 'Fresh Coriander 100g', unit: 'bunch', priceRange: [10, 18] },
    { name: 'Mother Dairy Curd 500g', unit: 'tub', priceRange: [28, 38] },
    { name: 'Aavin Ghee 200ml', unit: 'bottle', priceRange: [145, 175] },
    { name: 'Pigeon Cooker 5L', unit: 'piece', priceRange: [1200, 1500] },
    { name: 'Fortune Besan 500g', unit: 'pack', priceRange: [55, 72] },
    { name: 'MTR Rava Idli Mix 500g', unit: 'pack', priceRange: [95, 120] },
    { name: 'Everest Garam Masala 50g', unit: 'pack', priceRange: [25, 38] },
    { name: 'Lijjat Papad 200g', unit: 'pack', priceRange: [45, 58] },
    { name: 'Fresh Bread Slices 400g', unit: 'loaf', priceRange: [30, 45] },
    { name: 'Amul Cheese Slices 200g', unit: 'pack', priceRange: [115, 135] },
    { name: 'Haldiram Aloo Bhujia 200g', unit: 'pack', priceRange: [48, 62] },
    { name: 'Bournvita 500g', unit: 'jar', priceRange: [230, 270] },
    { name: 'Fortune Rice Bran Oil 1L', unit: 'bottle', priceRange: [145, 175] },
    { name: 'Fresh Eggs 6pc', unit: 'tray', priceRange: [48, 62] },
    { name: 'Coconut Oil 200ml', unit: 'bottle', priceRange: [65, 85] },
  ],
  pharmacy: [
    { name: 'Crocin 650mg 15s', unit: 'strip', priceRange: [30, 38] },
    { name: 'Dolo 650mg 15s', unit: 'strip', priceRange: [30, 35] },
    { name: 'Vitamin C 500mg 30s', unit: 'bottle', priceRange: [120, 160] },
    { name: 'Pudin Hara Pearls 10s', unit: 'strip', priceRange: [18, 25] },
    { name: 'Volini Spray 50g', unit: 'bottle', priceRange: [145, 180] },
    { name: 'Saridon 10s', unit: 'strip', priceRange: [22, 30] },
    { name: 'Digene Antacid 200ml', unit: 'bottle', priceRange: [55, 72] },
    { name: 'Zincovit 30s', unit: 'bottle', priceRange: [85, 110] },
    { name: 'Liveasy Hand Sanitizer 200ml', unit: 'bottle', priceRange: [45, 65] },
    { name: 'N95 Mask 5pc', unit: 'pack', priceRange: [75, 120] },
    { name: 'Glucon-D 200g', unit: 'pack', priceRange: [45, 58] },
    { name: 'Eno Sachet 5g', unit: 'sachet', priceRange: [8, 14] },
    { name: 'Iodex Tube 25g', unit: 'tube', priceRange: [55, 72] },
    { name: 'Otrivin Nasal Spray 10ml', unit: 'bottle', priceRange: [110, 145] },
    { name: 'Strepsils 16s', unit: 'strip', priceRange: [45, 58] },
    { name: 'Paracetamol 500mg 10s', unit: 'strip', priceRange: [12, 20] },
    { name: 'Cetaphil Cleanser 100ml', unit: 'bottle', priceRange: [280, 340] },
    { name: 'Pampers Baby Diapers M-22', unit: 'pack', priceRange: [290, 340] },
    { name: 'Liveasy Whey Protein 500g', unit: 'jar', priceRange: [650, 800] },
    { name: 'Mamaearth Face Wash 100ml', unit: 'tube', priceRange: [180, 230] },
  ],
  bakery: [
    { name: 'Chocolate Truffle Cake 500g', unit: 'cake', priceRange: [350, 500] },
    { name: 'Veg Puff 1pc', unit: 'piece', priceRange: [15, 25] },
    { name: 'Cream Roll 1pc', unit: 'piece', priceRange: [25, 35] },
    { name: 'Veg Pattice 1pc', unit: 'piece', priceRange: [20, 30] },
    { name: 'Chicken Puff 1pc', unit: 'piece', priceRange: [25, 38] },
    { name: 'Banana Bread Loaf 300g', unit: 'loaf', priceRange: [120, 180] },
    { name: 'Croissant 1pc', unit: 'piece', priceRange: [45, 65] },
    { name: 'Donut Chocolate 1pc', unit: 'piece', priceRange: [45, 65] },
    { name: 'Veg Sandwich 1pc', unit: 'piece', priceRange: [40, 60] },
    { name: 'Pizza Margherita 8 inch', unit: 'pizza', priceRange: [180, 250] },
    { name: 'Garlic Bread 200g', unit: 'loaf', priceRange: [80, 120] },
    { name: 'Rusk 200g', unit: 'pack', priceRange: [35, 50] },
    { name: 'Veg Roll 1pc', unit: 'piece', priceRange: [30, 45] },
    { name: 'Birthday Cake 1kg', unit: 'cake', priceRange: [700, 950] },
    { name: 'Burger Veg 1pc', unit: 'burger', priceRange: [50, 80] },
    { name: 'Samosa 1pc', unit: 'piece', priceRange: [12, 20] },
    { name: 'Muffin Blueberry 1pc', unit: 'muffin', priceRange: [35, 55] },
    { name: 'Cookies Oatmeal 200g', unit: 'pack', priceRange: [80, 120] },
    { name: 'Plum Cake 500g', unit: 'cake', priceRange: [250, 350] },
    { name: 'Cheese Pav 6pc', unit: 'pack', priceRange: [40, 60] },
  ],
  stationery: [
    { name: 'Reynolds Ball Pen Blue 5s', unit: 'pack', priceRange: [40, 55] },
    { name: 'Classmate Notebook 200pg', unit: 'notebook', priceRange: [55, 75] },
    { name: 'A4 Sheets 500pc', unit: 'ream', priceRange: [220, 320] },
    { name: 'Camlin Pencil 10s', unit: 'pack', priceRange: [35, 50] },
    { name: 'Eraser 5pc', unit: 'pack', priceRange: [15, 25] },
    { name: 'Fevistick Glue 25g', unit: 'tube', priceRange: [25, 38] },
    { name: 'Geometry Box 1set', unit: 'box', priceRange: [85, 130] },
    { name: 'Sharpener 5pc', unit: 'pack', priceRange: [20, 32] },
    { name: 'Highlighter 5 colors', unit: 'set', priceRange: [60, 90] },
    { name: 'Stapler Small 1pc', unit: 'piece', priceRange: [45, 75] },
    { name: 'Staple Pins 1000pc', unit: 'box', priceRange: [15, 25] },
    { name: 'Scissors 1pc', unit: 'piece', priceRange: [35, 55] },
    { name: 'Sketch Pen 12 colors', unit: 'pack', priceRange: [65, 95] },
    { name: 'File Folder 5pc', unit: 'pack', priceRange: [80, 120] },
    { name: 'Cello Tape 1 inch', unit: 'roll', priceRange: [18, 28] },
    { name: 'Natraj Pencil 10s', unit: 'pack', priceRange: [30, 45] },
    { name: 'Doms Colour Pencil 24s', unit: 'box', priceRange: [80, 120] },
    { name: 'Atlas Diary 2024', unit: 'diary', priceRange: [150, 250] },
    { name: 'Punching Machine 1pc', unit: 'piece', priceRange: [85, 130] },
    { name: 'Register Book 300pg', unit: 'book', priceRange: [120, 180] },
  ],
};

function generateStores(): Store[] {
  const stores: Store[] = [];
  const types: StoreType[] = ['grocery', 'pharmacy', 'bakery', 'stationery'];
  let id = 1;

  for (const city of ['Hyderabad', 'Vizag', 'Vijayawada'] as City[]) {
    const areas = CITY_AREAS[city];
    // ~8-9 stores per city, mix of types
    const numStores = city === 'Hyderabad' ? 10 : city === 'Vizag' ? 8 : 7;
    for (let i = 0; i < numStores; i++) {
      const type = types[i % types.length] === undefined ? pick(types) : types[i % types.length] as StoreType;
      const finalType: StoreType = pick(types);
      const name = `${pick(STORE_NAMES[finalType])} - ${pick(areas)}`;
      // Some stores update hourly (fast), some every 2-3 days (slow)
      const updateFreq = rand() < 0.3 ? 1 : rand() < 0.6 ? randInt(6, 12) : randInt(24, 72);
      stores.push({
        id: `store-${id}`,
        name,
        type: finalType,
        city,
        area: pick(areas),
        updateFrequencyHours: updateFreq,
        lastStockUpdateHoursAgo: updateFreq === 1 ? randInt(0, 2) : randInt(6, updateFreq + 12),
        rejectionRate: rand() * 0.15,
        responseTimeMinutes: randInt(2, 25),
        accuracyScore: randInt(45, 95),
        baseSearchRank: randInt(1, 620),
        totalOrders: randInt(80, 600),
        stockUpdatesToday: randInt(0, 4),
      });
      id++;
    }
  }
  return stores;
}

function generateProducts(stores: Store[]): Product[] {
  const products: Product[] = [];
  let id = 1;

  for (const store of stores) {
    const catalog = PRODUCT_NAMES[store.type];
    // Each store gets 5-7 products from its category
    const numProducts = randInt(5, 7);
    const shuffled = [...catalog].sort(() => rand() - 0.5).slice(0, numProducts);
    for (const item of shuffled) {
      const stockLevel = randInt(0, 50);
      const stockStatus: StockLevel = stockLevel === 0 ? 'out' : stockLevel < 5 ? 'low' : 'in_stock';
      products.push({
        id: `prod-${id}`,
        name: item.name,
        category: store.type,
        price: randInt(item.priceRange[0], item.priceRange[1]),
        unit: item.unit,
        velocity: rand() * 1.0 + 0.1,
        storeId: store.id,
        stockLevel,
        lastStockUpdateHoursAgo: store.lastStockUpdateHoursAgo,
        recentConfirmationBonus: rand() < 0.3 ? rand() * 4 : 0,
        stockStatus,
      });
      id++;
    }
  }
  return products;
}

function generateOrders(
  stores: Store[],
  products: Product[],
  count: number,
): Order[] {
  const orders: Order[] = [];
  let id = 1;

  for (let i = 0; i < count; i++) {
    const store = pick(stores);
    const storeProducts = products.filter((p) => p.storeId === store.id);
    if (storeProducts.length === 0) continue;

    const itemCount = randInt(1, 4);
    const orderItems = [];
    let total = 0;
    let hasSubstitution = false;

    for (let j = 0; j < itemCount; j++) {
      const prod = pick(storeProducts);
      const qty = randInt(1, 3);
      const substituted = rand() < 0.08;
      if (substituted) hasSubstitution = true;
      total += prod.price * qty;
      orderItems.push({ productId: prod.id, quantity: qty, substituted });
    }

    // Cancellation distribution matching the case:
    // 11% cancelled, of which 35% product_unavailable, 18% store_rejected,
    // 25% customer_cancelled, 15% delivery_timeout, 7% other
    let status: OrderStatus = 'delivered';
    let reason: CancellationReason | undefined;

    if (rand() < 0.11) {
      status = 'cancelled';
      const r = rand();
      if (r < 0.35) reason = 'product_unavailable';
      else if (r < 0.53) reason = 'store_rejected';
      else if (r < 0.78) reason = 'customer_cancelled';
      else if (r < 0.93) reason = 'delivery_timeout';
      else reason = 'other';
    } else if (hasSubstitution) {
      status = 'substituted';
    }

    orders.push({
      id: `order-${id}`,
      customerId: `cust-${randInt(1, 500)}`,
      storeId: store.id,
      items: orderItems,
      total: Math.round(total),
      status,
      cancellationReason: reason,
      placedHoursAgo: randInt(1, 720),
      confidenceAtOrder: randInt(40, 95),
    });
    id++;
  }
  return orders;
}

function generateDemandRequests(): DemandRequest[] {
  return [
    { id: 'demand-1', productName: 'Organic Quinoa 500g', category: 'grocery', city: 'Hyderabad', count: 34 },
    { id: 'demand-2', productName: 'Sugar-free Chocolates', category: 'bakery', city: 'Vizag', count: 18 },
    { id: 'demand-3', productName: 'Thermal Flask 1L', category: 'stationery', city: 'Vijayawada', count: 12 },
    { id: 'demand-4', productName: 'Glucometer Strips 50s', category: 'pharmacy', city: 'Hyderabad', count: 45 },
    { id: 'demand-5', productName: 'Vegan Cheese 200g', category: 'grocery', city: 'Vizag', count: 9 },
    { id: 'demand-6', productName: 'Korean Ramen 5-pack', category: 'grocery', city: 'Hyderabad', count: 27 },
  ];
}

export function generateAllData() {
  seed = 42; // reset for determinism
  const stores = generateStores();
  const products = generateProducts(stores);
  const orders = generateOrders(stores, products, 200);
  const demandRequests = generateDemandRequests();
  return { stores, products, orders, demandRequests };
}

export function getStoreName(stores: Store[], storeId: string): string {
  return stores.find((s) => s.id === storeId)?.name ?? 'Unknown Store';
}

export { STORE_TYPE_DECAY };
