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
}

export type Theme = 'light' | 'dark';

export type FlashState = 'none' | 'up' | 'down';
