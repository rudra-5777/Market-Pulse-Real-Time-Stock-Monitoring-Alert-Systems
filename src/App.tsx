import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StockTable from './components/StockTable';
import { useTheme } from './hooks/useTheme';
import { useStockData } from './hooks/useStockData';
import { Stock, WatchlistItem, Alert } from './types';

// Sample initial alerts for demo purposes
const DEMO_ALERTS: Alert[] = [
  { id: 'a1', symbol: 'AAPL',  target_price: 200.00, alert_type: 'above', is_triggered: false },
  { id: 'a2', symbol: 'TSLA',  target_price: 230.00, alert_type: 'below', is_triggered: false },
  { id: 'a3', symbol: 'NVDA',  target_price: 900.00, alert_type: 'above', is_triggered: false },
  { id: 'a4', symbol: 'GOOGL', target_price: 170.00, alert_type: 'below', is_triggered: true  },
];

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const { stocks, flashMap } = useStockData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [watchedSymbols, setWatchedSymbols] = useState<Set<string>>(new Set(['AAPL', 'NVDA']));

  const handleToggleWatch = useCallback((stock: Stock) => {
    setWatchedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(stock.symbol)) {
        next.delete(stock.symbol);
      } else {
        next.add(stock.symbol);
      }
      return next;
    });
  }, []);

  const handleRemoveWatch = useCallback((symbol: string) => {
    setWatchedSymbols(prev => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
  }, []);

  // Build watchlist items from live stock data
  const watchlist: WatchlistItem[] = stocks
    .filter(s => watchedSymbols.has(s.symbol))
    .map(s => ({
      symbol: s.symbol,
      company_name: s.company_name,
      current_price: s.current_price,
      percent_change: s.percent_change,
    }));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* ── Header ─────────────────────────────────────────── */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuToggle={() => setSidebarOpen(o => !o)}
      />

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex min-h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          watchlist={watchlist}
          alerts={DEMO_ALERTS}
          onRemoveWatch={handleRemoveWatch}
        />

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 min-w-0">
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total Stocks"
              value={stocks.length.toString()}
              icon="📋"
            />
            <StatCard
              label="Advancing"
              value={stocks.filter(s => s.percent_change > 0).length.toString()}
              valueClass="text-emerald-500"
              icon="▲"
            />
            <StatCard
              label="Declining"
              value={stocks.filter(s => s.percent_change < 0).length.toString()}
              valueClass="text-red-500"
              icon="▼"
            />
            <StatCard
              label="Watchlist"
              value={watchedSymbols.size.toString()}
              icon="⭐"
            />
          </div>

          {/* Stock table */}
          <StockTable
            stocks={stocks}
            flashMap={flashMap}
            watchedSymbols={watchedSymbols}
            onToggleWatch={handleToggleWatch}
            searchQuery={searchQuery}
          />

          <p className="mt-4 text-xs text-center text-slate-400 dark:text-slate-600">
            Data updates every 1.5 s · Prices are simulated for demonstration purposes
          </p>
        </main>
      </div>
    </div>
  );
}

// ── Small helper component ──────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  valueClass?: string;
}

function StatCard({ label, value, icon, valueClass = 'text-slate-800 dark:text-white' }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className={`text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}
