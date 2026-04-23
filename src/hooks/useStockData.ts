import { useState, useEffect, useRef, useCallback } from 'react';
import { Stock, FlashState } from '../types';
import { INITIAL_STOCKS } from '../data/mockStocks';

/** Returns a random price nudge within ±2% of current price */
function nudgePrice(price: number): number {
  const delta = price * (Math.random() * 0.02 - 0.01); // −1% to +1%
  return Math.max(0.01, parseFloat((price + delta).toFixed(2)));
}

export function useStockData() {
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [flashMap, setFlashMap] = useState<Record<string, FlashState>>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const triggerFlash = useCallback((id: string, direction: FlashState) => {
    // Clear any existing timer for this row
    if (flashTimers.current[id]) clearTimeout(flashTimers.current[id]);

    setFlashMap(prev => ({ ...prev, [id]: direction }));

    // Reset flash after animation completes (800 ms matches CSS)
    flashTimers.current[id] = setTimeout(() => {
      setFlashMap(prev => ({ ...prev, [id]: 'none' }));
    }, 900);
  }, []);

  useEffect(() => {
    // Update 3–6 random rows every 1.5 seconds to simulate live feed
    const interval = setInterval(() => {
      const count = Math.floor(Math.random() * 4) + 3; // 3-6 updates

      setStocks(prev => {
        const next = [...prev];
        const indices = new Set<number>();
        while (indices.size < count) {
          indices.add(Math.floor(Math.random() * next.length));
        }

        indices.forEach(i => {
          const stock = next[i];
          const newPrice = nudgePrice(stock.current_price);
          const pctChange = parseFloat(
            (((newPrice - stock.current_price) / stock.current_price) * 100).toFixed(2)
          );
          const direction: FlashState = newPrice > stock.current_price ? 'up' : 'down';

          next[i] = {
            ...stock,
            prev_price: stock.current_price,
            current_price: newPrice,
            percent_change: parseFloat((stock.percent_change + pctChange).toFixed(2)),
            volume: stock.volume + Math.floor(Math.random() * 50_000),
          };

          triggerFlash(stock.id, direction);
        });

        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [triggerFlash]);

  // Cleanup all pending flash timers on unmount
  useEffect(() => {
    const timers = flashTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return { stocks, flashMap };
}
