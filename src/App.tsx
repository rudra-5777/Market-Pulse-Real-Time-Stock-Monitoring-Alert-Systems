import { useEffect } from 'react';
import { useStore } from './store/useStore';
import Header from './components/Header';
import StockTable from './components/StockTable';
import AlertBanner from './components/AlertBanner';
import StockChartModal from './components/StockChartModal';
import AlertModal from './components/AlertModal';

const TICK_INTERVAL_MS = 15_000;

export default function App() {
  const darkMode = useStore((s) => s.darkMode);
  const tickPrices = useStore((s) => s.tickPrices);
  const showChartModal = useStore((s) => s.showChartModal);
  const showAlertModal = useStore((s) => s.showAlertModal);

  // Apply dark-mode class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Price simulation every 15 seconds
  useEffect(() => {
    const id = setInterval(tickPrices, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tickPrices]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        <StockTable />
      </main>
      <AlertBanner />
      {showChartModal && <StockChartModal />}
      {showAlertModal && <AlertModal />}
    </div>
  );
}
