import { useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import StockRow from './StockRow';
import { SortKey } from '../types';

const COLUMNS: { key: SortKey; label: string; align: string }[] = [
  { key: 'symbol',        label: 'Symbol',  align: 'text-left' },
  { key: 'price',         label: 'Price',   align: 'text-right' },
  { key: 'change',        label: 'Change',  align: 'text-right' },
  { key: 'changePercent', label: 'Chg %',   align: 'text-right' },
  { key: 'volume',        label: 'Volume',  align: 'text-right' },
  // Mkt Cap and Actions are rendered separately (not sortable via COLUMNS map)
];

export default function StockTable() {
  const stocks      = useStore((s) => s.stocks);
  const watchlist   = useStore((s) => s.watchlist);
  const searchQuery = useStore((s) => s.searchQuery);
  const activeTab   = useStore((s) => s.activeTab);
  const sortKey     = useStore((s) => s.sortKey);
  const sortDir     = useStore((s) => s.sortDirection);
  const setSortKey  = useStore((s) => s.setSortKey);
  const setSortDir  = useStore((s) => s.setSortDirection);

  const visible = useMemo(() => {
    let list = activeTab === 'watchlist'
      ? stocks.filter((s) => watchlist.includes(s.symbol))
      : stocks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let av: number | string = a[sortKey];
      let bv: number | string = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return list;
  }, [stocks, watchlist, searchQuery, activeTab, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <ArrowUpDown size={13} className="opacity-30" />;
    return sortDir === 'asc'
      ? <ArrowUp size={13} className="text-emerald-500" />
      : <ArrowDown size={13} className="text-emerald-500" />;
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm bg-white dark:bg-gray-900">
      {/* Summary bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {visible.length} {visible.length === 1 ? 'stock' : 'stocks'}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Auto-refreshes every 15s
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap ${col.align}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
              {/* Non-sortable columns */}
              <th className="px-4 py-3 text-right font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap hidden md:table-cell">Mkt Cap</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-400 dark:text-gray-600">
                  No stocks found.
                </td>
              </tr>
            ) : (
              visible.map((stock) => (
                <StockRow key={stock.symbol} stock={stock} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
