import React from 'react';

/**
 * CandlestickBar
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom recharts `Bar` shape that renders a full candlestick (wick + body).
 *
 * Works with a TWO-BAR stacking approach in a `ComposedChart`:
 *   1. An invisible base `Bar` with `dataKey="low"` that positions the bar's
 *      bottom at the candle's low price.
 *   2. This shape on a second `Bar` with `dataKey="diff"` (= high − low) that
 *      stacks on top of the base.  Recharts passes in already-computed
 *      `x, y, width, height` where:
 *        • `y`          = screen y for the top of the range  (= high price)
 *        • `y + height` = screen y for the bottom of the range (= low price)
 *
 * We re-map the open / close values into screen coordinates using the
 * proportion within the [high, low] price range, so no direct axis-scale
 * access is needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface CandlestickBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
}

const MIN_BODY_PX = 1; // minimum body height so doji candles are still visible

export default function CandlestickBar(props: CandlestickBarProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;

  if (!payload || height <= 0 || width <= 0) return null;

  const { open, high, low, close } = payload;
  const range = high - low;

  const isUp    = close >= open;
  const color   = isUp ? '#10b981' : '#ef4444';   // emerald-500 : red-500
  const centerX = x + width / 2;

  let bodyTop: number;
  let bodyHeight: number;

  if (range <= 0) {
    // Doji (open == high == low == close): draw a horizontal line
    bodyTop    = y;
    bodyHeight = MIN_BODY_PX;
  } else {
    // Map price → screen y: higher price = smaller y (SVG coordinates)
    const priceToY = (price: number) => y + ((high - price) / range) * height;

    const yOpen  = priceToY(open);
    const yClose = priceToY(close);
    bodyTop    = Math.min(yOpen, yClose);
    bodyHeight = Math.max(Math.abs(yClose - yOpen), MIN_BODY_PX);
  }

  return (
    <g>
      {/* High-Low wick */}
      <line
        x1={centerX}
        y1={y}
        x2={centerX}
        y2={y + height}
        stroke={color}
        strokeWidth={1}
      />
      {/* Open-Close body */}
      <rect
        x={x + 1}
        y={bodyTop}
        width={Math.max(width - 2, 1)}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
      />
    </g>
  );
}
