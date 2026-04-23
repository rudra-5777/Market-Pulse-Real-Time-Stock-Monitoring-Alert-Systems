import React from 'react';
import { Stock, FlashState } from '../types';

interface StockTableProps {
  stocks: Stock[];
  flashMap: Record<string, FlashState>;
  watchedSymbols: Set<string>;
  onToggleWatch: (stock: Stock) => void;
  onViewChart: (stock: Stock) => void;
  searchQuery: string;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

export default function StockTable({
  stocks,
  flashMap,
  watchedSymbols,
  onToggleWatch,
  onViewChart,
  searchQuery,
}: StockTableProps) {
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? stocks.filter(
        s =>
          s.symbol.toLowerCase().includes(q) ||
          s.company_name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
      )
    : stocks;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-fade-in">
      {/* Table title bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Market Overview
        </h2>
        <span className="text-xs text-slate-400">
          {filtered.length} / {stocks.length} stocks
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-left">
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap w-8"></th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Symbol</th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Company</th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-right">Price</th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-right">Change %</th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-right">Volume</th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap text-right hidden md:table-cell">Mkt Cap</th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap hidden lg:table-cell">Sector</th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  No stocks match "{searchQuery}"
                </td>
              </tr>
            ) : (
              filtered.map(stock => {
                const flash = flashMap[stock.id] ?? 'none';
                const isUp = stock.percent_change >= 0;
                const watched = watchedSymbols.has(stock.symbol);

                // Map flash state to CSS class
                let flashClass = '';
                if (flash === 'up') flashClass = 'row-flash-green';
                else if (flash === 'down') flashClass = 'row-flash-red';

                return (
                  <tr
                    key={stock.id}
                    className={[
                      'group transition-colors duration-75',
                      'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                      'text-slate-700 dark:text-slate-300',
                      flashClass,
                    ].join(' ')}
                  >
                    {/* Watch star */}
                    <td className="px-4 py-3 w-8">
                      <button
                        aria-label={watched ? `Remove ${stock.symbol} from watchlist` : `Add ${stock.symbol} to watchlist`}
                        onClick={() => onToggleWatch(stock)}
                        className={[
                          'text-lg leading-none transition-transform duration-150 hover:scale-125 focus:outline-none',
                          watched
                            ? 'text-amber-400'
                            : 'text-slate-300 dark:text-slate-600 hover:text-amber-300',
                        ].join(' ')}
                      >
                        {watched ? '⭐' : '☆'}
                      </button>
                    </td>

                    {/* Symbol */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 tracking-wide">
                        {stock.symbol}
                      </span>
                    </td>

                    {/* Company name */}
                    <td className="px-4 py-3">
                      <span className="truncate max-w-[180px] block font-medium text-slate-700 dark:text-slate-200">
                        {stock.company_name}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                        ${stock.current_price.toFixed(2)}
                      </span>
                    </td>

                    {/* % change */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={[
                          'inline-flex items-center gap-0.5 font-semibold tabular-nums px-2 py-0.5 rounded text-xs',
                          isUp
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                            : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
                        ].join(' ')}
                      >
                        {isUp ? '▲' : '▼'}
                        {Math.abs(stock.percent_change).toFixed(2)}%
                      </span>
                    </td>

                    {/* Volume */}
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-slate-500 dark:text-slate-400">
                      {formatVolume(stock.volume)}
                    </td>

                    {/* Market cap */}
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-500 dark:text-slate-400 hidden md:table-cell">
                      {stock.market_cap}
                    </td>

                    {/* Sector badge */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {stock.sector}
                      </span>
                    </td>

                    {/* View chart */}
                    <td className="px-2 py-3 text-center">
                      <button
                        aria-label={`View chart for ${stock.symbol}`}
                        onClick={() => onViewChart(stock)}
                        className="p-1.5 rounded-md text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title="View historical chart"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
