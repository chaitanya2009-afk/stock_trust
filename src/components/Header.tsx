import { useApp } from '@/store/AppContext';
import type { Role } from '@/types';
import { ShoppingCart, Store as StoreIcon, LayoutDashboard, Clock, Play } from 'lucide-react';

interface Props {
  onGuidedDemo: () => void;
}

export function Header({ onGuidedDemo }: Props) {
  const { role, setRole, simulatedHours } = useApp();

  const roles: { key: Role; label: string; icon: typeof ShoppingCart }[] = [
    { key: 'customer', label: 'Customer', icon: ShoppingCart },
    { key: 'store', label: 'Store', icon: StoreIcon },
    { key: 'ops', label: 'Ops', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-700">
              <StoreIcon className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-none">StockTrust</h1>
              <p className="text-xs text-gray-500 leading-none mt-0.5">Inventory Confidence Engine</p>
            </div>
          </div>

          {/* Role switcher */}
          <div
            className="flex items-center gap-1 rounded-xl bg-gray-100 p-1"
            role="tablist"
            aria-label="Switch view role"
          >
            {roles.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setRole(key)}
                role="tab"
                aria-selected={role === key}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  role === key
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {simulatedHours > 0 && (
              <span className="hidden md:flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                +{simulatedHours}h simulated
              </span>
            )}
            <button
              onClick={onGuidedDemo}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guided Demo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
