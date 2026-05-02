import { useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useStore } from '../store/useStore';

const AUTO_DISMISS_MS = 6000;

export default function AlertBanner() {
  const notifications     = useStore((s) => s.notifications);
  const dismissNotification = useStore((s) => s.dismissNotification);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (notifications.length === 0) return;
    const oldest = notifications[0];
    const timer = setTimeout(() => dismissNotification(oldest.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notifications, dismissNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.slice(0, 4).map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700 animate-in slide-in-from-bottom-4 duration-300"
        >
          <div className="mt-0.5 p-1.5 rounded-lg bg-blue-500/15">
            <Bell size={14} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Alert Triggered — {n.symbol}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {n.stockName} is now{' '}
              <span className="font-semibold">
                ${n.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {' '}({n.condition} target of{' '}
              <span className="font-semibold">${n.targetPrice.toFixed(2)}</span>)
            </p>
          </div>
          <button
            onClick={() => dismissNotification(n.id)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
