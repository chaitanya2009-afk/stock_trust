import { useState } from 'react';
import { AppProvider, useApp } from '@/store/AppContext';
import { Header } from '@/components/Header';
import { ToastContainer } from '@/components/ToastContainer';
import { GuidedDemo } from '@/components/GuidedDemo';
import { CustomerView } from '@/views/CustomerView';
import { StoreView } from '@/views/StoreView';
import { OpsView } from '@/views/OpsView';

function AppContent() {
  const { role } = useApp();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onGuidedDemo={() => setDemoOpen(true)} />

      <main role="main">
        {role === 'customer' && <CustomerView />}
        {role === 'store' && <StoreView />}
        {role === 'ops' && <OpsView />}
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        StockTrust — Inventory Confidence Engine for NOVA CART · Hackathon Case Study
      </footer>

      <ToastContainer />
      <GuidedDemo open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
