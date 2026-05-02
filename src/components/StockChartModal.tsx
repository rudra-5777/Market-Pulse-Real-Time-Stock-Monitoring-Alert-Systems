import { useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { X, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TimeRange } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const RANGES: TimeRange[] = ['1D', '5D', '1M', '6M', '1Y'];

function sliceHistory(points: { date: string; close: number; volume: number }[], range: TimeRange) {
  const n = { '1D': 1, '5D': 5, '1M': 22, '6M': 130, '1Y': 365 }[range];
  return points.slice(-n);
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StockChartModal() {
  const stocks         = useStore((s) => s.stocks);
  const selectedSymbol = useStore((s) => s.selectedSymbol);
  const watchlist      = useStore((s) => s.watchlist);
  const timeRange      = useStore((s) => s.timeRange);
  const darkMode       = useStore((s) => s.darkMode);
  const setShowChartModal = useStore((s) => s.setShowChartModal);
  const toggleWatchlist   = useStore((s) => s.toggleWatchlist);
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const setShowAlertModal = useStore((s) => s.setShowAlertModal);
  const setTimeRange   = useStore((s) => s.setTimeRange);

  const chartRef = useRef<ChartJS<'line'>>(null);

  const stock = stocks.find((s) => s.symbol === selectedSymbol);

  const sliced = useMemo(() => {
    if (!stock) return [];
    return sliceHistory(stock.priceHistory, timeRange);
  }, [stock, timeRange]);

  const isUp = (stock?.change ?? 0) >= 0;
  const isWatched = watchlist.includes(selectedSymbol ?? '');

  const chartData = useMemo(() => ({
    labels: sliced.map((p) => p.date),
    datasets: [
      {
        label: selectedSymbol ?? '',
        data: sliced.map((p) => p.close),
        borderColor: isUp ? '#10b981' : '#ef4444',
        backgroundColor: isUp ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
        borderWidth: 2,
        pointRadius: sliced.length > 60 ? 0 : 3,
        tension: 0.3,
        fill: true,
      },
    ],
  }), [sliced, isUp, selectedSymbol]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number } }) => ` $${fmt(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          maxTicksLimit: 8,
          maxRotation: 0,
        },
        grid: { color: darkMode ? '#1f2937' : '#f3f4f6' },
      },
      y: {
        ticks: {
          color: darkMode ? '#9ca3af' : '#6b7280',
          callback: (v: string | number) => `$${Number(v).toFixed(0)}`,
        },
        grid: { color: darkMode ? '#1f2937' : '#f3f4f6' },
      },
    },
  }), [darkMode]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowChartModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowChartModal]);

  if (!stock) return null;

  function downloadChart() {
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${stock!.symbol}-chart.png`;
    a.click();
  }

  function openAlert() {
    setShowChartModal(false);
    setSelectedSymbol(stock!.symbol);
    setShowAlertModal(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setShowChartModal(false)}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{stock.symbol}</h2>
              <span className={`text-sm font-semibold px-2 py-0.5 rounded ${isUp ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'}`}>
                {isUp ? '+' : ''}{fmt(stock.changePercent)}%
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stock.name} · {stock.sector}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-2xl font-bold font-mono">${fmt(stock.price)}</p>
              <p className={`text-sm font-mono ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                {isUp ? <TrendingUp size={13} className="inline mr-0.5" /> : <TrendingDown size={13} className="inline mr-0.5" />}
                {isUp ? '+' : ''}{fmt(stock.change)} today
              </p>
            </div>
            <button
              onClick={() => setShowChartModal(false)}
              className="ml-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-0 border-b border-gray-100 dark:border-gray-800">
          {[
            { label: '52W High', value: `$${fmt(stock.high52w)}` },
            { label: '52W Low',  value: `$${fmt(stock.low52w)}` },
            { label: 'Market Cap', value: stock.marketCap },
            { label: 'Volume',   value: (stock.volume / 1_000_000).toFixed(1) + 'M' },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3 border-r last:border-r-0 border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
              <p className="text-sm font-semibold font-mono">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 px-6 pt-4">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                timeRange === r
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="px-6 pt-2 pb-4 h-64">
          <Line ref={chartRef} data={chartData} options={chartOptions as Parameters<typeof Line>[0]['options']} />
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-6 pb-5">
          <button
            onClick={() => toggleWatchlist(stock.symbol)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              isWatched
                ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-yellow-400 hover:text-yellow-400'
            }`}
          >
            <Star size={14} fill={isWatched ? 'currentColor' : 'none'} />
            {isWatched ? 'Watching' : 'Add to Watchlist'}
          </button>
          <button
            onClick={openAlert}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:text-blue-400 transition-colors"
          >
            Set Alert
          </button>
          <button
            onClick={downloadChart}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Save Chart
          </button>
        </div>
      </div>
    </div>
  );
}
