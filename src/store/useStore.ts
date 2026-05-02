import { create } from 'zustand';
import { Stock, Alert, TriggeredAlertNotification, SortKey, SortDirection, TimeRange } from '../types';
import { initialStocks } from '../data/mockStocks';

interface StoreState {
  stocks: Stock[];
  watchlist: string[];
  alerts: Alert[];
  notifications: TriggeredAlertNotification[];
  darkMode: boolean;
  searchQuery: string;
  selectedSymbol: string | null;
  showChartModal: boolean;
  showAlertModal: boolean;
  sortKey: SortKey;
  sortDirection: SortDirection;
  timeRange: TimeRange;
  activeTab: 'all' | 'watchlist';

  // Actions
  tickPrices: () => void;
  toggleWatchlist: (symbol: string) => void;
  addAlert: (symbol: string, condition: 'above' | 'below', targetPrice: number) => void;
  removeAlert: (id: string) => void;
  dismissNotification: (id: string) => void;
  toggleDarkMode: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  setShowChartModal: (show: boolean) => void;
  setShowAlertModal: (show: boolean) => void;
  setSortKey: (key: SortKey) => void;
  setSortDirection: (dir: SortDirection) => void;
  setTimeRange: (range: TimeRange) => void;
  setActiveTab: (tab: 'all' | 'watchlist') => void;
  exportCSV: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  stocks: initialStocks,
  watchlist: ['AAPL', 'MSFT', 'NVDA'],
  alerts: [],
  notifications: [],
  darkMode: true,
  searchQuery: '',
  selectedSymbol: null,
  showChartModal: false,
  showAlertModal: false,
  sortKey: 'symbol',
  sortDirection: 'asc',
  timeRange: '1M',
  activeTab: 'all',

  tickPrices: () => {
    const { stocks, alerts } = get();
    const newNotifications: TriggeredAlertNotification[] = [];

    const updated = stocks.map((s) => {
      const changeRatio = (Math.random() * 0.012) - 0.006; // ±0.6%
      const newPrice = Math.max(0.01, s.price * (1 + changeRatio));
      const change = newPrice - s.previousClose;
      const changePercent = (change / s.previousClose) * 100;
      const flash: 'up' | 'down' = newPrice >= s.price ? 'up' : 'down';

      // Add new price point to history (intraday tick — reuse today's date)
      const today = new Date().toISOString().split('T')[0];
      const lastPoint = s.priceHistory[s.priceHistory.length - 1];
      const updatedHistory = lastPoint?.date === today
        ? [
            ...s.priceHistory.slice(0, -1),
            {
              ...lastPoint,
              close: newPrice,
              high: Math.max(lastPoint.high, newPrice),
              low: Math.min(lastPoint.low, newPrice),
              volume: lastPoint.volume + Math.floor(Math.random() * 100_000),
            },
          ]
        : [
            ...s.priceHistory,
            {
              date: today,
              open: s.price,
              high: newPrice,
              low: newPrice,
              close: newPrice,
              volume: Math.floor(Math.random() * 10_000_000),
            },
          ];

      return {
        ...s,
        price: newPrice,
        change,
        changePercent,
        volume: s.volume + Math.floor(Math.random() * 50_000),
        lastUpdated: new Date(),
        priceHistory: updatedHistory,
        flashDirection: flash,
      };
    });

    // Check alerts
    const updatedAlerts = alerts.map((alert) => {
      if (alert.triggered) return alert;
      const stock = updated.find((s) => s.symbol === alert.symbol);
      if (!stock) return alert;
      const shouldTrigger =
        (alert.condition === 'above' && stock.price >= alert.targetPrice) ||
        (alert.condition === 'below' && stock.price <= alert.targetPrice);
      if (shouldTrigger) {
        newNotifications.push({
          id: `notif-${Date.now()}-${alert.id}`,
          alertId: alert.id,
          symbol: alert.symbol,
          stockName: stock.name,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currentPrice: stock.price,
          timestamp: new Date().toISOString(),
        });
        return { ...alert, triggered: true };
      }
      return alert;
    });

    set((state) => ({
      stocks: updated,
      alerts: updatedAlerts,
      notifications: [...state.notifications, ...newNotifications],
    }));

    // Clear flash after 800ms
    setTimeout(() => {
      set((state) => ({
        stocks: state.stocks.map((s) => ({ ...s, flashDirection: null })),
      }));
    }, 800);
  },

  toggleWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.includes(symbol)
        ? state.watchlist.filter((s) => s !== symbol)
        : [...state.watchlist, symbol],
    })),

  addAlert: (symbol, condition, targetPrice) =>
    set((state) => ({
      alerts: [
        ...state.alerts,
        {
          id: `alert-${Date.now()}`,
          symbol,
          condition,
          targetPrice,
          triggered: false,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  removeAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setShowChartModal: (show) => set({ showChartModal: show }),
  setShowAlertModal: (show) => set({ showAlertModal: show }),
  setSortKey: (key) => set({ sortKey: key }),
  setSortDirection: (dir) => set({ sortDirection: dir }),
  setTimeRange: (range) => set({ timeRange: range }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  exportCSV: () => {
    const { stocks } = get();
    const header = 'Symbol,Name,Price,Change,Change%,Volume,MarketCap,Sector\n';
    const rows = stocks
      .map(
        (s) =>
          `${s.symbol},"${s.name}",${s.price.toFixed(2)},${s.change.toFixed(2)},${s.changePercent.toFixed(2)},${s.volume},"${s.marketCap}","${s.sector}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketpulse-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
}));
