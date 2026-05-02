import { useState, useEffect } from 'react';
import { X, Trash2, Bell, BellOff } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function AlertModal() {
  const stocks         = useStore((s) => s.stocks);
  const alerts         = useStore((s) => s.alerts);
  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const addAlert       = useStore((s) => s.addAlert);
  const removeAlert    = useStore((s) => s.removeAlert);
  const setShowAlertModal = useStore((s) => s.setShowAlertModal);

  const [symbol,    setSymbol]    = useState(selectedSymbol ?? stocks[0]?.symbol ?? '');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price,     setPrice]     = useState('');
  const [error,     setError]     = useState('');

  // Sync symbol when modal opens with a pre-selected stock
  useEffect(() => {
    if (selectedSymbol) setSymbol(selectedSymbol);
  }, [selectedSymbol]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAlertModal(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [setShowAlertModal]);

  function handleAdd() {
    const target = parseFloat(price);
    if (isNaN(target) || target <= 0) {
      setError('Please enter a valid price greater than 0.');
      return;
    }
    addAlert(symbol, condition, target);
    setPrice('');
    setError('');
  }

  const stock = stocks.find((s) => s.symbol === symbol);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setShowAlertModal(false)}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-blue-400" />
            <h2 className="text-lg font-bold">Price Alerts</h2>
          </div>
          <button
            onClick={() => setShowAlertModal(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add alert form */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">New Alert</p>
          <div className="flex flex-col gap-3">
            {/* Stock picker */}
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {stocks.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              {/* Condition */}
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="above">Goes above</option>
                <option value="below">Goes below</option>
              </select>

              {/* Price */}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={`$${stock ? stock.price.toFixed(2) : '0.00'}`}
                value={price}
                onChange={(e) => { setPrice(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={handleAdd}
              className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors"
            >
              Add Alert
            </button>
          </div>
        </div>

        {/* Existing alerts */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            Active Alerts ({alerts.filter((a) => !a.triggered).length})
          </p>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-4">No alerts set.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${
                    alert.triggered
                      ? 'border-gray-200 dark:border-gray-700 opacity-50'
                      : 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm">
                    {alert.triggered ? (
                      <BellOff size={14} className="text-gray-400" />
                    ) : (
                      <Bell size={14} className="text-blue-400" />
                    )}
                    <span className="font-semibold">{alert.symbol}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {alert.condition} ${alert.targetPrice.toFixed(2)}
                    </span>
                    {alert.triggered && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500">Triggered</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
