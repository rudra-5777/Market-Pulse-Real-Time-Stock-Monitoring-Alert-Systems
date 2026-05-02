import { Star, Bell, BarChart2, TrendingUp, TrendingDown } from 'lucide-react';
import { Stock } from '../types';
import { useStore } from '../store/useStore';

interface Props {
  stock: Stock;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtVolume(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function StockRow({ stock }: Props) {
  const watchlist       = useStore((s) => s.watchlist);
  const toggleWatchlist = useStore((s) => s.toggleWatchlist);
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const setShowChartModal = useStore((s) => s.setShowChartModal);
  const setShowAlertModal = useStore((s) => s.setShowAlertModal);

  const isWatched = watchlist.includes(stock.symbol);
  const isUp = stock.change >= 0;

  function openChart() {
    setSelectedSymbol(stock.symbol);
    setShowChartModal(true);
  }

  function openAlert() {
    setSelectedSymbol(stock.symbol);
    setShowAlertModal(true);
  }

  let flashClass = '';
  if (stock.flashDirection === 'up') flashClass = 'animate-flash-up';
  else if (stock.flashDirection === 'down') flashClass = 'animate-flash-down';

  return (
    <tr
      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${flashClass}`}
      onClick={openChart}
    >
      {/* Symbol + name */}
      <td className="px-4 py-3 font-semibold whitespace-nowrap">
        <span className="text-gray-900 dark:text-white">{stock.symbol}</span>
        <p className="text-xs text-gray-400 font-normal hidden sm:block">{stock.name}</p>
      </td>

      {/* Price */}
      <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap text-gray-900 dark:text-white">
        ${fmt(stock.price)}
      </td>

      {/* Change $ */}
      <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
        <span className="inline-flex items-center justify-end gap-0.5">
          {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isUp ? '+' : ''}{fmt(stock.change)}
        </span>
      </td>

      {/* Change % */}
      <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${isUp ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          {isUp ? '+' : ''}{fmt(stock.changePercent)}%
        </span>
      </td>

      {/* Volume */}
      <td className="px-4 py-3 text-right font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {fmtVolume(stock.volume)}
      </td>

      {/* Market Cap (hidden on small screens) */}
      <td className="px-4 py-3 text-right font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap hidden md:table-cell">
        {stock.marketCap}
      </td>      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => toggleWatchlist(stock.symbol)}
            title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            className={`p-1.5 rounded-lg transition-colors ${
              isWatched
                ? 'text-yellow-400 hover:text-yellow-300 bg-yellow-400/10'
                : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
            }`}
          >
            <Star size={15} fill={isWatched ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={openAlert}
            title="Set price alert"
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
          >
            <Bell size={15} />
          </button>
          <button
            onClick={openChart}
            title="View chart"
            className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
          >
            <BarChart2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
