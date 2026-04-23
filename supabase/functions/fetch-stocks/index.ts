// Supabase Edge Function – fetch-stocks
// ─────────────────────────────────────────────────────────────────────────────
// Fetches real-time stock quotes from Alpha Vantage, applies the trend
// formula, and upserts the results into the Supabase `stocks` table.
//
// Rate-limit strategy (free-tier: 5 calls / minute):
//   • At most 5 Alpha Vantage requests are issued per invocation.
//   • Symbols are sorted by `last_updated_at ASC` so the stalest data is
//     refreshed first (round-robin across the full symbol list).
//   • A 12-second inter-request delay is enforced between API calls so
//     that repeated invocations never exceed 5 calls/minute.
//   • Symbols whose `last_updated_at` is younger than CACHE_TTL_MS are
//     skipped entirely, preventing redundant upstream requests.
//
// Trend formula (ΔP%):
//   percent_change = ((current_price - prev_price) / prev_price) × 100
//
// Invoke via HTTP POST (or schedule with pg_cron / Supabase cron):
//   curl -X POST \
//     -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
//     https://<PROJECT>.supabase.co/functions/v1/fetch-stocks
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Constants ────────────────────────────────────────────────────────────────

/** Alpha Vantage free tier: max 5 requests per minute */
const MAX_CALLS_PER_BATCH = 5;

/**
 * Minimum inter-request delay in ms.
 * 60 000 ms / 5 calls = 12 000 ms per call.
 */
const INTER_REQUEST_DELAY_MS = 12_000;

/**
 * Minimum age (ms) before a symbol's data is considered stale and worth
 * re-fetching.  Set to 60 s so repeated edge-function invocations within
 * the same minute are no-ops for already-fresh symbols.
 */
const CACHE_TTL_MS = 60_000;

/** Alpha Vantage GLOBAL_QUOTE endpoint base URL */
const AV_BASE = 'https://www.alphavantage.co/query';

// ── Types ────────────────────────────────────────────────────────────────────

interface StockRow {
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

interface AlphaVantageGlobalQuote {
  '01. symbol': string;
  '02. open': string;
  '05. price': string;
  '06. volume': string;
  '09. change': string;
  '10. change percent': string;
}

interface AlphaVantageResponse {
  'Global Quote'?: AlphaVantageGlobalQuote;
  Note?: string;           // rate-limit message
  Information?: string;    // premium-required message
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Delay execution for `ms` milliseconds. */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch a single GLOBAL_QUOTE from Alpha Vantage.
 * Returns null on rate-limit or network error.
 */
async function fetchQuote(
  symbol: string,
  apiKey: string
): Promise<{ price: number; volume: number } | null> {
  const url = `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[fetch-stocks] HTTP ${res.status} for ${symbol}`);
      return null;
    }

    const data: AlphaVantageResponse = await res.json();

    if (data.Note || data.Information) {
      // Rate-limit or premium message received – abort this batch
      console.warn(`[fetch-stocks] Alpha Vantage limit hit: ${data.Note ?? data.Information}`);
      return null;
    }

    const quote = data['Global Quote'];
    if (!quote || !quote['05. price']) {
      console.warn(`[fetch-stocks] Empty quote for ${symbol}`);
      return null;
    }

    return {
      price: parseFloat(quote['05. price']),
      volume: parseInt(quote['06. volume'], 10) || 0,
    };
  } catch (err) {
    console.error(`[fetch-stocks] Fetch error for ${symbol}:`, err);
    return null;
  }
}

/**
 * Calculate the percentage trend change.
 *   ΔP% = ((current - previous) / previous) × 100
 */
function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(4));
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Only accept POST and GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // ── Environment ────────────────────────────────────────────────────────────
  const apiKey        = Deno.env.get('ALPHA_VANTAGE_API_KEY') ?? '';
  const supabaseUrl   = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ALPHA_VANTAGE_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Use the service-role key so RLS is bypassed for writes
  const db = createClient(supabaseUrl, serviceRoleKey);

  // ── Step 1: Load the stalest symbols from Supabase ─────────────────────────
  // Query rows ordered by last_updated_at so we always refresh the oldest first.
  const staleBefore = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data: staleRows, error: queryError } = await db
    .from('stocks')
    .select('symbol, company_name, current_price, prev_price, market_cap, sector, last_updated_at')
    .lt('last_updated_at', staleBefore)
    .order('last_updated_at', { ascending: true })
    .limit(MAX_CALLS_PER_BATCH);

  if (queryError) {
    console.error('[fetch-stocks] DB query error:', queryError);
    return new Response(
      JSON.stringify({ error: queryError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const symbols: StockRow[] = (staleRows ?? []) as StockRow[];

  if (symbols.length === 0) {
    return new Response(
      JSON.stringify({ message: 'All symbols are fresh; nothing to fetch.', refreshed: 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── Step 2: Fetch from Alpha Vantage with inter-request delay ──────────────
  const upsertRows: Partial<StockRow>[] = [];
  let hitRateLimit = false;

  for (let i = 0; i < symbols.length; i++) {
    const row = symbols[i];

    if (hitRateLimit) break;

    // Enforce inter-request delay for every call after the first
    if (i > 0) await sleep(INTER_REQUEST_DELAY_MS);

    const quote = await fetchQuote(row.symbol, apiKey);

    if (quote === null) {
      // null means rate limit was hit – stop processing further symbols
      hitRateLimit = true;
      break;
    }

    const prevPrice    = row.current_price ?? 0;
    const currentPrice = quote.price;

    // ΔP% = ((current - previous) / previous) × 100
    const percentChange = calcPercentChange(currentPrice, prevPrice);

    upsertRows.push({
      symbol:          row.symbol,
      company_name:    row.company_name,
      current_price:   currentPrice,
      prev_price:      prevPrice,
      percent_change:  percentChange,
      volume:          quote.volume,
      market_cap:      row.market_cap,
      sector:          row.sector,
      last_updated_at: new Date().toISOString(),
    });
  }

  // ── Step 3: Upsert refreshed data back into Supabase ──────────────────────
  if (upsertRows.length > 0) {
    const { error: upsertError } = await db
      .from('stocks')
      .upsert(upsertRows, { onConflict: 'symbol' });

    if (upsertError) {
      console.error('[fetch-stocks] Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({
      refreshed:       upsertRows.length,
      rate_limit_hit:  hitRateLimit,
      symbols:         upsertRows.map(r => r.symbol),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
