/**
 * StockChart
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders either a Line chart or a Candlestick chart for the supplied OHLC
 * data using Recharts (already a project dependency).
 *
 * Candlestick technique:
 *   Uses a `ComposedChart` with two stacked `Bar` layers:
 *     1. Invisible base bar from 0 → low (positions the baseline)
 *     2. Custom `CandlestickBar` shape from low → high (draws wick + body)
 *
 * Line chart:
 *   Standard `LineChart` with close price as the data key.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { OHLCPoint, ChartType, TimeFrame, Theme } from '../../types';
import CandlestickBar from './CandlestickBar';

// ── Helpers ───────────────────────────────────────────────────────────────────

function domainPadding(data: OHLCPoint[]): [number, number] {
  if (data.length === 0) return [0, 100];
  const allPrices = data.flatMap(d => [d.high, d.low]);
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const pad = (max - min) * 0.05 || max * 0.01;
  return [
    parseFloat((min - pad).toFixed(2)),
    parseFloat((max + pad).toFixed(2)),
  ];
}

function formatPrice(v: number) {
  return `$${v.toFixed(2)}`;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipPayload {
  payload?: OHLCPoint;
}

function OHLCTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const d = payload[0].payload;
  const isUp = d.close >= d.open;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg px-3 py-2 text-xs space-y-0.5 min-w-[130px]">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{d.date}</p>
      <p className="flex justify-between gap-4">
        <span className="text-slate-400">Open</span>
        <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">{formatPrice(d.open)}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span className="text-slate-400">High</span>
        <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">{formatPrice(d.high)}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span className="text-slate-400">Low</span>
        <span className="tabular-nums font-medium text-red-500 dark:text-red-400">{formatPrice(d.low)}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span className="text-slate-400">Close</span>
        <span className={`tabular-nums font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          {formatPrice(d.close)}
        </span>
      </p>
      <p className="flex justify-between gap-4 pt-0.5 border-t border-slate-100 dark:border-slate-700">
        <span className="text-slate-400">Vol</span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {(d.volume / 1_000_000).toFixed(2)}M
        </span>
      </p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StockChartProps {
  data: OHLCPoint[];
  chartType: ChartType;
  timeframe: TimeFrame;
  theme: Theme;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StockChart({ data, chartType, theme }: StockChartProps) {
  const isDark = theme === 'dark';
  const gridColor  = isDark ? '#334155' : '#e2e8f0';  // slate-700 : slate-200
  const axisColor  = isDark ? '#64748b' : '#94a3b8';  // slate-500 : slate-400
  const [yMin, yMax] = useMemo(() => domainPadding(data), [data]);

  // ── X-axis tick reducer: show at most ~8 labels ───────────────────────────
  const xTickCount = Math.max(1, Math.floor(data.length / Math.ceil(data.length / 8)));
  const xTicks = useMemo(
    () =>
      data
        .filter((_, i) => i % xTickCount === 0)
        .map(d => d.date),
    [data, xTickCount]
  );

  const commonAxisProps = {
    tick: { fill: axisColor, fontSize: 11 },
    axisLine: { stroke: gridColor },
    tickLine: false,
  } as const;

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" ticks={xTicks} {...commonAxisProps} />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={formatPrice}
            width={70}
            {...commonAxisProps}
          />
          <Tooltip content={<OHLCTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // ── Candlestick chart ─────────────────────────────────────────────────────
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" ticks={xTicks} {...commonAxisProps} />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={formatPrice}
          width={70}
          {...commonAxisProps}
        />
        <Tooltip content={<OHLCTooltip />} />

        {/* Invisible base bar that pushes the candlestick up to the `low` level */}
        <Bar dataKey="low" stackId="candle" fill="transparent" isAnimationActive={false} />

        {/* Visible diff bar (high − low) rendered as a full candlestick */}
        <Bar
          dataKey="diff"
          stackId="candle"
          shape={<CandlestickBar />}
          isAnimationActive={false}
          maxBarSize={12}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
