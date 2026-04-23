/**
 * mockHistory
 * ──────────────────────────────────────────────────────────────────────────
 * Generates deterministic synthetic OHLC data for any stock symbol and
 * time-frame.  Uses a seeded LCG pseudo-random number generator so the same
 * symbol always renders the same chart (no flickering on re-render).
 *
 * The random walk is scaled so its final close equals the supplied
 * `basePrice`, keeping the chart consistent with the live dashboard price.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { format } from 'date-fns';
import { OHLCPoint, TimeFrame } from '../types';

// ── Seeded LCG PRNG ──────────────────────────────────────────────────────────

function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Hash a string into a 32-bit unsigned integer seed. */
function hashSymbol(symbol: string): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Per-timeframe config ─────────────────────────────────────────────────────

interface TFConfig {
  /** Number of candles to generate. */
  count: number;
  /** Volatility per candle as a fraction of price. */
  volatility: number;
  /** Intra-candle wick spread fraction (high-low range beyond body). */
  wickSpread: number;
  /** Format string for the X-axis label. */
  labelFormat: string;
  /** ISO date of the earliest candle relative to "now" in minutes. */
  minutesBack: number;
  /** Interval between candles in minutes. */
  intervalMinutes: number;
}

const TF_CONFIG: Record<TimeFrame, TFConfig> = {
  '1D': {
    count: 78,              // 5-min bars × 6.5 h trading session
    volatility: 0.003,
    wickSpread: 0.002,
    labelFormat: 'HH:mm',
    minutesBack: 78 * 5,
    intervalMinutes: 5,
  },
  '5D': {
    count: 65,              // 30-min bars × 13 per day × 5 days
    volatility: 0.006,
    wickSpread: 0.004,
    labelFormat: 'EEE HH:mm',
    minutesBack: 65 * 30,
    intervalMinutes: 30,
  },
  '1M': {
    count: 22,              // daily bars, ~1 calendar month
    volatility: 0.015,
    wickSpread: 0.008,
    labelFormat: 'MMM d',
    minutesBack: 22 * 390,  // 390 min = 1 trading day
    intervalMinutes: 390,
  },
  '1Y': {
    count: 252,             // daily bars, ~1 trading year
    volatility: 0.018,
    wickSpread: 0.01,
    labelFormat: 'MMM d',
    minutesBack: 252 * 390,
    intervalMinutes: 390,
  },
};

// ── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate synthetic OHLC bars ending at `basePrice` for the given
 * `timeframe`.  Output is sorted oldest → newest.
 */
export function generateHistory(
  symbol: string,
  basePrice: number,
  timeframe: TimeFrame
): OHLCPoint[] {
  const cfg = TF_CONFIG[timeframe];
  const rng = makePrng(hashSymbol(symbol + timeframe));

  // ── 1. Build a raw random walk of `count` close prices ────────────────────
  const rawCloses: number[] = new Array(cfg.count);
  rawCloses[0] = basePrice;
  for (let i = 1; i < cfg.count; i++) {
    const pct = (rng() - 0.5) * 2 * cfg.volatility;
    rawCloses[i] = rawCloses[i - 1] * (1 + pct);
  }

  // ── 2. Scale so the last close == basePrice ────────────────────────────────
  const scale = basePrice / rawCloses[cfg.count - 1];
  const closes = rawCloses.map(c => parseFloat((c * scale).toFixed(2)));

  // ── 3. Build OHLC from consecutive close prices ───────────────────────────
  const now = Date.now();
  const points: OHLCPoint[] = [];

  for (let i = 0; i < cfg.count; i++) {
    const tsMs = now - (cfg.count - 1 - i) * cfg.intervalMinutes * 60_000;
    const date = new Date(tsMs);

    const open  = i === 0 ? closes[0] : closes[i - 1];
    const close = closes[i];
    const bodyTop = Math.max(open, close);
    const bodyBot = Math.min(open, close);

    // Wick extends slightly beyond the body
    const wick = cfg.wickSpread * basePrice * rng();
    const high = parseFloat((bodyTop + wick).toFixed(2));
    const low  = parseFloat((bodyBot - wick).toFixed(2));

    // Synthetic volume: base 1 M scaled by a small random factor
    const volume = Math.round((500_000 + rng() * 1_500_000));

    points.push({
      date:      format(date, cfg.labelFormat),
      timestamp: date.toISOString(),
      open,
      high,
      low,
      close,
      volume,
      diff: parseFloat((high - low).toFixed(4)),
    });
  }

  return points;
}
