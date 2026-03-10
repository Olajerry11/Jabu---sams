import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-600 text-white',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Viewport */}
      <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => {
          const Icon = icons[toast.variant];
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border border-white/20 pointer-events-auto animate-in ${styles[toast.variant]}`}
              style={{ animation: 'slideInUp 0.3s ease-out' }}
            >
              <Icon className="w-5 h-5 mt-0.5 shrink-0 opacity-90" />
              <p className="flex-1 text-sm font-semibold leading-snug">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
