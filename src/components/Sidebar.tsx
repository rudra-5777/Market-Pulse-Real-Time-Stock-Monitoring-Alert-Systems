import React, { useEffect, useRef } from 'react';
import { WatchlistItem, Alert } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: WatchlistItem[];
  alerts: Alert[];
  onRemoveWatch: (symbol: string) => void;
  onDeleteAlert: (alertId: string) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  watchlist,
  alerts,
  onRemoveWatch,
  onDeleteAlert,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on outside click (mobile overlay)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const activeAlerts = alerts.filter(a => !a.is_triggered);
  const triggeredAlerts = alerts.filter(a => a.is_triggered);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={[
          // Base styles – full height, scrollable
          'fixed lg:static top-0 left-0 z-30 h-full lg:h-auto',
          'w-72 shrink-0 flex flex-col gap-5',
          'overflow-y-auto pb-8',
          'bg-white dark:bg-slate-900',
          'border-r border-slate-200 dark:border-slate-700',
          'transition-transform duration-250 ease-out',
          // Mobile: slide in/out; Desktop: always visible
          'lg:translate-x-0',
          isOpen ? 'translate-x-0 shadow-2xl animate-slide-in' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            📊 Dashboard
          </h2>
          <button
            aria-label="Close sidebar"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Watchlist ──────────────────────────────────────── */}
        <section className="px-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
            <span>⭐</span> Your Watchlist
            <span className="ml-auto bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {watchlist.length}
            </span>
          </h3>

          {watchlist.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
              No stocks added yet.<br />Click ⭐ in the table to watch.
            </p>
          ) : (
            <ul className="space-y-2">
              {watchlist.map(item => (
                <li
                  key={item.symbol}
                  className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/70 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                      {item.symbol}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{item.company_name}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      ${item.current_price.toFixed(2)}
                    </p>
                    <p className={`text-xs font-medium ${item.percent_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {item.percent_change >= 0 ? '+' : ''}{item.percent_change.toFixed(2)}%
                    </p>
                  </div>
                  <button
                    aria-label={`Remove ${item.symbol} from watchlist`}
                    onClick={() => onRemoveWatch(item.symbol)}
                    className="ml-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="border-t border-slate-200 dark:border-slate-700 mx-4" />

        {/* ── Active Alerts ──────────────────────────────────── */}
        <section className="px-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
            <span>🔔</span> Active Alerts
            {activeAlerts.length > 0 && (
              <span className="ml-auto bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {activeAlerts.length}
              </span>
            )}
          </h3>

          {activeAlerts.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
              No active alerts.
            </p>
          ) : (
            <ul className="space-y-2">
              {activeAlerts.map(alert => (
                <li
                  key={alert.id}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 group"
                >
                  <span className="text-base">
                    {alert.alert_type === 'above' ? '🔺' : '🔻'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{alert.symbol}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {alert.alert_type === 'above' ? 'Above' : 'Below'} ${alert.target_price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    aria-label={`Delete alert for ${alert.symbol}`}
                    onClick={() => onDeleteAlert(alert.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-400 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Triggered Alerts ───────────────────────────────── */}
        {triggeredAlerts.length > 0 && (
          <>
            <div className="border-t border-slate-200 dark:border-slate-700 mx-4" />
            <section className="px-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                <span>✅</span> Triggered
                <span className="ml-auto bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {triggeredAlerts.length}
                </span>
              </h3>
              <ul className="space-y-2">
                {triggeredAlerts.map(alert => (
                  <li
                    key={alert.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 opacity-70 group"
                  >
                    <span>✅</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300 line-through">{alert.symbol}</p>
                      <p className="text-xs text-slate-400">
                        {alert.alert_type === 'above' ? 'Above' : 'Below'} ${alert.target_price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      aria-label={`Delete triggered alert for ${alert.symbol}`}
                      onClick={() => onDeleteAlert(alert.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-300 hover:text-red-400 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </aside>
    </>
  );
}
