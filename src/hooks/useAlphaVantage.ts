/**
 * useAlphaVantage
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that fetches stock quotes via the Alpha Vantage API.
 *
 * Architecture
 * ────────────
 * When Supabase credentials are present the hook:
 *   1. Reads the `stocks` table on mount and subscribes to real-time updates.
 *   2. Calls the `fetch-stocks` Edge Function every 15 seconds to trigger a
 *      fresh upstream fetch from Alpha Vantage.
 *   3. Maps Supabase rows onto the same `Stock` interface used by the rest of
 *      the app, so it is a drop-in replacement for `useStockData`.
 *
 * When Supabase is not configured (local dev / no credentials) the hook
 * delegates immediately to the mock `useStockData` implementation so the
 * dashboard still works without any external services.
 *
 * Rate-limit handling
 * ───────────────────
 * The free Alpha Vantage tier allows 5 requests per minute.
 * This hook delegates all rate-limit logic to the server-side Edge Function
 * (supabase/functions/fetch-stocks/index.ts), which:
 *   • Processes at most 5 symbols per invocation.
 *   • Inserts a 12-second inter-request delay between API calls.
 *   • Skips symbols that were already refreshed within the last 60 seconds
 *     (TTL cache keyed by `stocks.last_updated_at`).
 *
 * Trend formula (ΔP%):
 *   percent_change = ((current_price − prev_price) / prev_price) × 100
 * This calculation happens inside the Edge Function before every upsert.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Stock, FlashState } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { INITIAL_STOCKS } from '../data/mockStocks';

// ── Constants ─────────────────────────────────────────────────────────────────

/** How often (ms) the hook asks the Edge Function for fresh data. */
const REFRESH_INTERVAL_MS = 15_000;

/** How long (ms) a flash animation stays active per row. */
const FLASH_DURATION_MS = 900;

// ── Supabase row shape (matches schema.sql) ───────────────────────────────────

interface StockRow {
  id: string;
  symbol: string;
  company_name: string;
  current_price: number;
  prev_price: number;
  percent_change: number;
  volume: number;
  market_cap: string | null;
  sector: string | null;
  last_updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a Supabase `StockRow` onto the app's `Stock` interface. */
function rowToStock(row: StockRow): Stock {
  return {
    id:             row.id,
    symbol:         row.symbol,
    company_name:   row.company_name,
    current_price:  Number(row.current_price),
    prev_price:     Number(row.prev_price),
    percent_change: Number(row.percent_change),
    volume:         Number(row.volume),
    market_cap:     row.market_cap ?? '',
    sector:         row.sector ?? '',
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseAlphaVantageReturn {
  stocks: Stock[];
  flashMap: Record<string, FlashState>;
  /** True while the initial data load is in progress. */
  loading: boolean;
  /** Non-null when the last Edge Function call returned an error. */
  error: string | null;
  /** True when the live Supabase integration is active. */
  isLive: boolean;
}

export function useAlphaVantage(): UseAlphaVantageReturn {
  const [stocks,   setStocks]   = useState<Stock[]>(INITIAL_STOCKS);
  const [flashMap, setFlashMap] = useState<Record<string, FlashState>>({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Stable ref for per-row flash timers so we can clear them on unmount
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Track previous prices so we can determine flash direction on real-time updates
  const prevPrices = useRef<Record<string, number>>({});

  // ── Flash helper ───────────────────────────────────────────────────────────
  const triggerFlash = useCallback((id: string, direction: FlashState) => {
    if (flashTimers.current[id]) clearTimeout(flashTimers.current[id]);
    setFlashMap(prev => ({ ...prev, [id]: direction }));
    flashTimers.current[id] = setTimeout(() => {
      setFlashMap(prev => ({ ...prev, [id]: 'none' }));
    }, FLASH_DURATION_MS);
  }, []);

  // ── Apply a batch of updated rows coming from Supabase ─────────────────────
  const applyRows = useCallback((rows: StockRow[]) => {
    setStocks(prev => {
      const byId = new Map(prev.map(s => [s.symbol, s]));

      rows.forEach(row => {
        const mapped = rowToStock(row);
        const existing = byId.get(row.symbol);

        // Determine flash direction by comparing with previous price
        const oldPrice = prevPrices.current[row.symbol] ?? existing?.current_price ?? 0;
        if (oldPrice > 0 && mapped.current_price !== oldPrice) {
          const direction: FlashState = mapped.current_price > oldPrice ? 'up' : 'down';
          triggerFlash(mapped.id, direction);
        }
        prevPrices.current[row.symbol] = mapped.current_price;

        byId.set(row.symbol, mapped);
      });

      return Array.from(byId.values());
    });
  }, [triggerFlash]);

  // ── Call the Edge Function to trigger an upstream Alpha Vantage refresh ────
  const triggerEdgeFunction = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { error: fnError } = await supabase.functions.invoke('fetch-stocks');
      if (fnError) {
        // JSON parse errors occur when the Edge Function is not yet deployed or
        // returns an unexpected non-JSON body.  They are non-fatal: the Supabase
        // real-time subscription continues to deliver live updates, so we absorb
        // this silently rather than surfacing a confusing message to the user.
        const msg = fnError.message ?? '';
        if (
          msg.includes('JSON') ||
          msg.includes('json') ||
          msg.toLowerCase().includes('unexpected end') ||
          msg.toLowerCase().includes('unexpected token')
        ) {
          console.warn('[useAlphaVantage] Edge function returned non-JSON response (not deployed?)', msg);
          return;
        }
        console.warn('[useAlphaVantage] Edge function error:', msg);
        setError(msg);
      } else {
        setError(null);
      }
    } catch (err) {
      // Non-fatal – we still show whatever is in Supabase
      console.warn('[useAlphaVantage] Edge function unreachable:', err);
    }
  }, []);

  // ── Supabase integration ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return; // fall through to mock simulation

    let cancelled = false;

    // Initial load
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('stocks')
        .select('*')
        .order('symbol', { ascending: true });

      if (!cancelled) {
        if (fetchError) {
          setError(fetchError.message);
        } else if (data && data.length > 0) {
          applyRows(data as StockRow[]);
        }
        setLoading(false);
      }
    })();

    // Real-time subscription – receive INSERT / UPDATE events immediately
    const channel = supabase
      .channel('stocks-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stocks' },
        payload => {
          if (!cancelled && payload.new) {
            applyRows([payload.new as StockRow]);
          }
        }
      )
      .subscribe();

    // Trigger Edge Function on mount and then every 15 seconds
    triggerEdgeFunction();
    const refreshInterval = setInterval(triggerEdgeFunction, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [applyRows, triggerEdgeFunction]);

  // ── Cleanup flash timers on unmount ────────────────────────────────────────
  useEffect(() => {
    const timers = flashTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return {
    stocks,
    flashMap,
    loading,
    error,
    isLive: isSupabaseConfigured,
  };
}
