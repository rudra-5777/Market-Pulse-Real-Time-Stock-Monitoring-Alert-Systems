// Shared TypeScript interfaces for MarketPulse

export interface Stock {
  id: string;
  symbol: string;
  company_name: string;
  current_price: number;
  prev_price: number;      // previous tick price – used to determine flash direction
  percent_change: number;
  volume: number;
  market_cap: string;
  sector: string;
}

export interface WatchlistItem {
  symbol: string;
  company_name: string;
  current_price: number;
  percent_change: number;
}

export interface Alert {
  id: string;
  symbol: string;
  target_price: number;
  alert_type: 'above' | 'below';
  is_triggered: boolean;
  /** Price at which the alert condition was met */
  triggered_price?: number;
}

/** A single in-flight popup notification produced by useAlertMonitor */
export interface AlertNotification {
  /** Unique id for this popup instance */
  notifId: string;
  /** Links back to the originating Alert.id */
  alertId: string;
  symbol: string;
  triggered_price: number;
  target_price: number;
  alert_type: 'above' | 'below';
  timestamp: number;
}

export type Theme = 'light' | 'dark';

export type FlashState = 'none' | 'up' | 'down';

export interface OHLCPoint {
  /** Display label for X-axis (e.g. "10:30", "Mon", "Jan 3") */
  date: string;
  /** ISO timestamp – used for CSV export */
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Derived: high − low – used by the stacked-bar candlestick renderer */
  diff: number;
}

export type TimeFrame = '1D' | '5D' | '1M' | '1Y';
export type ChartType = 'line' | 'candlestick';
