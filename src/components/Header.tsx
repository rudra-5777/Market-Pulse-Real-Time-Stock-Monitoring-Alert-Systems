import { Sun, Moon, Bell, Download, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Header() {
  const darkMode = useStore((s) => s.darkMode);
  const searchQuery = useStore((s) => s.searchQuery);
  const alerts = useStore((s) => s.alerts);
  const notifications = useStore((s) => s.notifications);
  const activeTab = useStore((s) => s.activeTab);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const setShowAlertModal = useStore((s) => s.setShowAlertModal);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const exportCSV = useStore((s) => s.exportCSV);

  const activeAlerts = alerts.filter((a) => !a.triggered).length;
  const unreadNotifs = notifications.length;

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <TrendingUp className="text-emerald-500" size={26} />
          <span className="text-xl font-bold tracking-tight">
            Market<span className="text-emerald-500">Pulse</span>
          </span>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-sm font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 transition-colors ${
              activeTab === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            All Stocks
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-4 py-1.5 transition-colors ${
              activeTab === 'watchlist'
                ? 'bg-emerald-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Watchlist
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[180px] max-w-sm">
          <input
            type="text"
            placeholder="Search symbol or company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Alerts button */}
          <button
            onClick={() => setShowAlertModal(true)}
            title="Manage Alerts"
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Bell size={18} />
            {(activeAlerts > 0 || unreadNotifs > 0) && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            title="Export to CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            title="Toggle dark mode"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
