export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
  high52w: number;
  low52w: number;
  sector: string;
  lastUpdated: Date;
  priceHistory: PricePoint[];
  flashDirection: 'up' | 'down' | null;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  triggered: boolean;
  createdAt: string;
}

export interface TriggeredAlertNotification {
  id: string;
  alertId: string;
  symbol: string;
  stockName: string;
  condition: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  timestamp: string;
}

export type TimeRange = '1D' | '5D' | '1M' | '6M' | '1Y';
export type SortKey = 'symbol' | 'price' | 'change' | 'changePercent' | 'volume';
export type SortDirection = 'asc' | 'desc';
