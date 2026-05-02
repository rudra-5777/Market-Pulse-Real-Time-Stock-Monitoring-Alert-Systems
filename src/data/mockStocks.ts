import { Stock, PricePoint } from '../types';

// Deterministic seeded pseudo-random for reproducible history
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePriceHistory(basePrice: number, days: number, seed: number): PricePoint[] {
  const rand = seededRand(seed);
  const points: PricePoint[] = [];
  // Start at ~70% of current price so history trends upward
  let price = basePrice * (0.65 + rand() * 0.25);
  const now = new Date('2026-05-02');

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const dateStr = date.toISOString().split('T')[0];
    const drift = (basePrice - price) / (basePrice * 10); // gentle pull toward base
    const change = price * ((rand() * 0.04 - 0.02) + drift);
    const open = price;
    const close = Math.max(0.01, price + change);
    const high = Math.max(open, close) * (1 + rand() * 0.015);
    const low = Math.min(open, close) * (1 - rand() * 0.015);
    const volume = Math.floor(1_000_000 + rand() * 80_000_000);
    points.push({ date: dateStr, open, high, low, close, volume });
    price = close;
  }
  return points;
}

const STOCKS_META = [
  { symbol: 'AAPL',  name: 'Apple Inc.',            basePrice: 189.30,  marketCap: '$2.95T', high52w: 199.62, low52w: 164.08, sector: 'Technology',          seed: 1001 },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',        basePrice: 420.55,  marketCap: '$3.12T', high52w: 468.35, low52w: 309.45, sector: 'Technology',          seed: 1002 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',          basePrice: 171.96,  marketCap: '$2.13T', high52w: 193.31, low52w: 120.21, sector: 'Technology',          seed: 1003 },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',        basePrice: 185.40,  marketCap: '$1.96T', high52w: 201.20, low52w: 118.35, sector: 'Consumer Cyclical',   seed: 1004 },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',           basePrice: 875.39,  marketCap: '$2.16T', high52w: 974.00, low52w: 402.00, sector: 'Technology',          seed: 1005 },
  { symbol: 'TSLA',  name: 'Tesla Inc.',             basePrice: 177.50,  marketCap: '$0.57T', high52w: 299.29, low52w: 138.80, sector: 'Automotive',          seed: 1006 },
  { symbol: 'META',  name: 'Meta Platforms Inc.',    basePrice: 505.00,  marketCap: '$1.28T', high52w: 531.49, low52w: 279.40, sector: 'Technology',          seed: 1007 },
  { symbol: 'NFLX',  name: 'Netflix Inc.',           basePrice: 630.20,  marketCap: '$0.27T', high52w: 700.99, low52w: 344.73, sector: 'Entertainment',       seed: 1008 },
  { symbol: 'AMD',   name: 'Advanced Micro Devices', basePrice: 165.92,  marketCap: '$0.27T', high52w: 227.30, low52w: 96.97,  sector: 'Technology',          seed: 1009 },
  { symbol: 'INTC',  name: 'Intel Corp.',            basePrice: 30.45,   marketCap: '$0.13T', high52w: 51.28,  low52w: 18.51,  sector: 'Technology',          seed: 1010 },
  { symbol: 'PYPL',  name: 'PayPal Holdings Inc.',   basePrice: 63.20,   marketCap: '$0.07T', high52w: 78.21,  low52w: 56.77,  sector: 'Financial Services',  seed: 1011 },
  { symbol: 'BABA',  name: 'Alibaba Group',          basePrice: 77.50,   marketCap: '$0.19T', high52w: 99.36,  low52w: 63.23,  sector: 'Consumer Cyclical',   seed: 1012 },
  { symbol: 'ORCL',  name: 'Oracle Corp.',           basePrice: 120.89,  marketCap: '$0.33T', high52w: 127.54, low52w: 82.46,  sector: 'Technology',          seed: 1013 },
  { symbol: 'IBM',   name: 'IBM Corp.',              basePrice: 190.35,  marketCap: '$0.17T', high52w: 197.39, low52w: 120.55, sector: 'Technology',          seed: 1014 },
  { symbol: 'TSM',   name: 'Taiwan Semiconductor',   basePrice: 145.20,  marketCap: '$0.75T', high52w: 193.47, low52w: 80.02,  sector: 'Technology',          seed: 1015 },
];

export const initialStocks: Stock[] = STOCKS_META.map((s) => {
  const history = generatePriceHistory(s.basePrice, 365, s.seed);
  const prevPoint = history[history.length - 2];
  const lastPoint = history[history.length - 1];
  const previousClose = prevPoint?.close ?? s.basePrice * 0.99;
  const price = lastPoint?.close ?? s.basePrice;
  const change = price - previousClose;
  const changePercent = (change / previousClose) * 100;

  return {
    symbol: s.symbol,
    name: s.name,
    price,
    previousClose,
    change,
    changePercent,
    volume: lastPoint?.volume ?? 5_000_000,
    marketCap: s.marketCap,
    high52w: s.high52w,
    low52w: s.low52w,
    sector: s.sector,
    lastUpdated: new Date(),
    priceHistory: history,
    flashDirection: null,
  };
});
