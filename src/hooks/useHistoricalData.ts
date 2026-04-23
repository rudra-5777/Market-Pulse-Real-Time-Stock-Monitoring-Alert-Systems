import { useMemo } from 'react';
import { OHLCPoint, TimeFrame } from '../types';
import { generateHistory } from '../data/mockHistory';

/**
 * useHistoricalData
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns OHLC price history for a given symbol and time-frame.
 *
 * When Supabase is configured and a `price_history` table exists, this hook
 * should be extended to query that table.  For now it returns deterministic
 * mock data generated from the stock's current price so every symbol renders
 * a realistic-looking chart even without a real data source.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function useHistoricalData(
  symbol: string,
  basePrice: number,
  timeframe: TimeFrame
): OHLCPoint[] {
  // Memoize so the data only regenerates when inputs change
  return useMemo(
    () => generateHistory(symbol, basePrice, timeframe),
    [symbol, basePrice, timeframe]
  );
}
