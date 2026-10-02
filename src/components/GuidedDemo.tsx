import { useState, useCallback } from 'react';
import { useApp } from '@/store/AppContext';
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface Step {
  title: string;
  description: string;
  action?: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GuidedDemo({ open, onClose }: Props) {
  const { setRole, products, addToCart, updateStock, stores, simulateTime } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: Step[] = [
    {
      title: 'Welcome to StockTrust',
      description: 'StockTrust is an Inventory Confidence Engine for NOVA CART. It solves the hidden root cause of churn: inventory unreliability. Let me walk you through the primary journey in 6 steps.',
    },
    {
      title: 'Step 1: Customer browses products',
      description: 'Each product shows a live Availability Confidence badge — High (green), Medium (amber), or Low (red). This score is computed from how recently the store updated stock, item sales velocity, store rejection history, and current stock levels.',
      action: () => setRole('customer'),
    },
    {
      title: 'Step 2: Customer adds a low-confidence item',
      description: 'When a customer adds a low-confidence item, they see a warning with two options: "Confirm with store" or "Auto-substitute if unavailable". Smart substitution suggests 2-3 alternatives from nearby stores with high confidence.',
      action: () => {
        setRole('customer');
        // Find a low-confidence product and add it
        const lowConfProduct = products.find((p) => p.stockStatus === 'low' || p.lastStockUpdateHoursAgo > 24);
        if (lowConfProduct) addToCart(lowConfProduct.id);
      },
    },
    {
      title: 'Step 3: Store updates stock',
      description: 'Switch to the Store view. The store sees a daily Stock Check List with only the top 10-15 risky items — not the full catalogue. One tap marks each item as In Stock, Low, or Out. This takes under 30 seconds.',
      action: () => {
        setRole('store');
        // Update a product's stock to show confidence change
        const targetProduct = products.find((p) => p.lastStockUpdateHoursAgo > 20);
        if (targetProduct) updateStock(targetProduct.id, 'in_stock');
      },
    },
    {
      title: 'Step 4: Confidence recalculates live',
      description: 'When the store updates stock, the confidence score for that product jumps immediately. The "Why this score?" explainer shows exactly how each factor contributes. Let me advance time to show how confidence decays.',
      action: () => simulateTime(6),
    },
    {
      title: 'Step 5: Ops Dashboard updates',
      description: 'Switch to the Ops view. KPIs like cancellation rate, average confidence, and stores with stale inventory update in real-time. Store risk rankings change based on freshness. The Impact Simulator shows the business case.',
      action: () => setRole('ops'),
    },
    {
      title: 'Step 6: Business Impact',
      description: 'The Impact Simulator shows: with a 50% reduction in stock-related cancellations, NOVA CART saves ~740 orders/month, recovers ₹50K+ monthly revenue, and avoids 560+ support tickets. The ₹25L build budget pays back in under 4 months.',
    },
  ];

  const handleNext = useCallback(() => {
    const step = steps[currentStep];
    if (step.action) step.action();
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  }, [currentStep, steps, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  const handleRestart = useCallback(() => {
    setCurrentStep(0);
  }, []);

  if (!open) return null;

  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="demo-title">
      <div className="max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
              {currentStep + 1}
            </span>
            <h2 id="demo-title" className="text-lg font-bold text-gray-900">
              {steps[currentStep].title}
            </h2>
          </div>
          <button
            onClick={() => { onClose(); setCurrentStep(0); }}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close guided demo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {steps[currentStep].description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? 'w-6 bg-teal-600' : i < currentStep ? 'w-1.5 bg-teal-400' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleRestart}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Restart
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
