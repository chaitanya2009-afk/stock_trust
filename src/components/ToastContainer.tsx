import { useApp } from '@/store/AppContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
          warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
          error: <XCircle className="h-5 w-5 text-red-600" />,
          info: <Info className="h-5 w-5 text-blue-600" />,
        };
        const borders = {
          success: 'border-green-300',
          warning: 'border-amber-300',
          error: 'border-red-300',
          info: 'border-blue-300',
        };
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-lg border bg-white p-3 shadow-lg animate-slide-in ${borders[toast.type]}`}
          >
            {icons[toast.type]}
            <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
