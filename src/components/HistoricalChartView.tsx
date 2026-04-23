/**
 * HistoricalChartView
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-page chart view showing historical OHLC price data for a selected stock.
 *
 * Features:
 *  • Stock selector  – switch between any stock in the portfolio
 *  • Chart type      – toggle between Line and Candlestick formats
 *  • Time-frame      – 1D / 5D / 1M / 1Y filter buttons
 *  • Summary bar     – current price, day change, period high / low
 *  • Export CSV      – download historical OHLC data *or* watchlist data
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Stock, WatchlistItem, ChartType, TimeFrame, OHLCPoint, Theme } from '../types';
import { useHistoricalData } from '../hooks/useHistoricalData';
import StockChart from './chart/StockChart';

// ── CSV helpers ───────────────────────────────────────────────────────────────

function triggerDownload(content: string, filename: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportHistoryCSV(symbol: string, data: OHLCPoint[], timeframe: TimeFrame) {
  const rows: string[] = [
    'Symbol,Date,Open,High,Low,Close,Volume',
    ...data.map(d =>
      [symbol, d.timestamp, d.open, d.high, d.low, d.close, d.volume].join(',')
    ),
  ];
  triggerDownload(rows.join('\n'), `${symbol}_${timeframe}_history.csv`);
}

function exportWatchlistCSV(watchlist: WatchlistItem[]) {
  const rows: string[] = [
    'Symbol,Company,Price,Change %',
    ...watchlist.map(w =>
      [w.symbol, `"${w.company_name}"`, w.current_price.toFixed(2), w.percent_change.toFixed(2)].join(',')
    ),
  ];
  triggerDownload(rows.join('\n'), 'watchlist.csv');
}

function exportStocksCSV(stocks: Stock[]) {
  const rows: string[] = [
    'Symbol,Company,Price,Change %,Volume,Market Cap,Sector',
    ...stocks.map(s =>
      [
        s.symbol,
        `"${s.company_name}"`,
        s.current_price.toFixed(2),
        s.percent_change.toFixed(2),
        s.volume,
        s.market_cap,
        s.sector,
      ].join(',')
    ),
  ];
  triggerDownload(rows.join('\n'), 'market_overview.csv');
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TFButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TFButton({ active, onClick, children }: TFButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 text-xs font-semibold rounded-md transition-colors',
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface HistoricalChartViewProps {
  initialSymbol: string;
  stocks: Stock[];
  watchlist: WatchlistItem[];
  theme: Theme;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HistoricalChartView({
  initialSymbol,
  stocks,
  watchlist,
  theme,
  onClose,
}: HistoricalChartViewProps) {
  const [symbol,    setSymbol]    = useState(initialSymbol);
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<TimeFrame>('1M');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const stock = useMemo(
    () => stocks.find(s => s.symbol === symbol) ?? stocks[0],
    [stocks, symbol]
  );

  const data = useHistoricalData(symbol, stock?.current_price ?? 100, timeframe);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const periodHigh = useMemo(() => Math.max(...data.map(d => d.high)), [data]);
  const periodLow  = useMemo(() => Math.min(...data.map(d => d.low)),  [data]);
  const firstClose = data[0]?.close ?? 0;
  const lastClose  = data[data.length - 1]?.close ?? 0;
  const periodChange = firstClose > 0
    ? ((lastClose - firstClose) / firstClose) * 100
    : 0;
  const isPeriodUp = periodChange >= 0;

  const handleExportHistory  = useCallback(() => {
    exportHistoryCSV(symbol, data, timeframe);
    setExportMenuOpen(false);
  }, [symbol, data, timeframe]);

  const handleExportWatchlist = useCallback(() => {
    exportWatchlistCSV(watchlist);
    setExportMenuOpen(false);
  }, [watchlist]);

  const handleExportAllStocks = useCallback(() => {
    exportStocksCSV(stocks);
    setExportMenuOpen(false);
  }, [stocks]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-100 dark:bg-slate-950">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0 flex-wrap gap-y-2">

        {/* Back button */}
        <button
          onClick={onClose}
          aria-label="Back to dashboard"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>

        <span className="text-slate-300 dark:text-slate-600">|</span>

        {/* Stock selector */}
        <select
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          aria-label="Select stock"
          className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded cursor-pointer pr-1"
        >
          {stocks.map(s => (
            <option key={s.symbol} value={s.symbol} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800">
              {s.symbol} – {s.company_name}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Chart type toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {(['line', 'candlestick'] as ChartType[]).map(ct => (
              <button
                key={ct}
                onClick={() => setChartType(ct)}
                aria-pressed={chartType === ct}
                className={[
                  'px-3 py-1 text-xs font-semibold rounded-md transition-colors capitalize',
                  chartType === ct
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
                ].join(' ')}
              >
                {ct === 'candlestick' ? '🕯 Candle' : '📈 Line'}
              </button>
            ))}
          </div>

          {/* Timeframe buttons */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {(['1D', '5D', '1M', '1Y'] as TimeFrame[]).map(tf => (
              <TFButton key={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)}>
                {tf}
              </TFButton>
            ))}
          </div>

          {/* Export CSV dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(o => !o)}
              aria-label="Export data"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            {exportMenuOpen && (
              <>
                {/* Overlay to close menu */}
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 mt-1 z-20 w-52 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg py-1 text-sm">
                  <button
                    onClick={handleExportHistory}
                    className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    📊 {symbol} {timeframe} history
                  </button>
                  <button
                    onClick={handleExportWatchlist}
                    className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    ⭐ Watchlist ({watchlist.length} stocks)
                  </button>
                  <button
                    onClick={handleExportAllStocks}
                    className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    📋 All stocks ({stocks.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary bar ──────────────────────────────────────────────────────── */}
      {stock && (
        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0 flex flex-wrap items-center gap-x-6 gap-y-1">
          <div>
            <span className="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">
              ${stock.current_price.toFixed(2)}
            </span>
            <span className={`ml-2 text-sm font-semibold ${stock.percent_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {stock.percent_change >= 0 ? '▲ +' : '▼ '}{stock.percent_change.toFixed(2)}%
            </span>
          </div>
          <StatPill label="Period change" value={`${isPeriodUp ? '+' : ''}${periodChange.toFixed(2)}%`} valueClass={isPeriodUp ? 'text-emerald-500' : 'text-red-500'} />
          <StatPill label={`${timeframe} High`} value={`$${periodHigh.toFixed(2)}`} valueClass="text-emerald-600 dark:text-emerald-400" />
          <StatPill label={`${timeframe} Low`}  value={`$${periodLow.toFixed(2)}`}  valueClass="text-red-500 dark:text-red-400" />
          <StatPill label="Sector" value={stock.sector} />
          <StatPill label="Market Cap" value={stock.market_cap} />
        </div>
      )}

      {/* ── Chart ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 p-4 sm:p-6">
        <div className="h-full min-h-[320px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
          <StockChart data={data} chartType={chartType} timeframe={timeframe} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

interface StatPillProps {
  label: string;
  value: string;
  valueClass?: string;
}

function StatPill({ label, value, valueClass = 'text-slate-700 dark:text-slate-200' }: StatPillProps) {
  return (
    <div className="text-xs">
      <span className="text-slate-400 dark:text-slate-500">{label} </span>
      <span className={`font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
