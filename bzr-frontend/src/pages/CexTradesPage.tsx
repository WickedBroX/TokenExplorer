import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Building2, Download, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../components';
import { useCexMarkets } from '../hooks/api/useCexMarkets';
import { useCexTrades } from '../hooks/api/useCexTrades';
import { useCexDailyVolume } from '../hooks/api/useCexDailyVolume';
import { exportToCSV } from '../utils/exportUtils';
import { formatUsdValue, timeAgo } from '../utils/formatters';
import type { CexTrade } from '../types/api';

const stableQuotes = new Set(['usd', 'usdt', 'usdc', 'dai']);

const normalizeSymbol = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getQuoteFromPair = (symbol: string) => {
  if (!symbol || !symbol.includes('/')) return null;
  const parts = symbol.split('/');
  return parts[1] ? parts[1].trim() : null;
};

const isStableQuote = (symbol: string) => {
  const quote = getQuoteFromPair(symbol);
  if (!quote) return false;
  return stableQuotes.has(normalizeSymbol(quote));
};

const ExchangeIcon: React.FC<{ exchangeId: string; className?: string }> = ({
  exchangeId,
  className,
}) => {
  const id = String(exchangeId || '').toLowerCase();
  const common = {
    viewBox: '0 0 40 40',
    role: 'img' as const,
    'aria-hidden': true,
    className,
  };

  const Label = ({ children }: { children: string }) => (
    <text
      x="20"
      y="22"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="12"
      fontWeight="700"
      fill="#ffffff"
      fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
    >
      {children}
    </text>
  );

  if (id === 'mexc') {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#00B6A6" />
        <Label>MX</Label>
      </svg>
    );
  }

  if (id === 'kucoin') {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#22C55E" />
        <Label>KC</Label>
      </svg>
    );
  }

  if (id === 'gateio' || id === 'gate') {
    return (
      <svg {...common}>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="#3B82F6" />
        <Label>G</Label>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#6B7280" />
      <Label>{id.slice(0, 2).toUpperCase() || '?'}</Label>
    </svg>
  );
};

const formatNumber = (value: number | null | undefined, decimals = 6) => {
  if (value === null || value === undefined) return '--';
  if (!Number.isFinite(value)) return '--';
  return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
};

export const CexTradesPage: React.FC = () => {
  const [exchangeId, setExchangeId] = useState<string>('all');
  const [symbol, setSymbol] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 350);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const { data: marketsData } = useCexMarkets();
  const markets = marketsData?.data || [];

  const exchanges = useMemo(() => {
    const ids = new Set(markets.map((m) => m.exchangeId));
    return Array.from(ids).sort((a, b) => a.localeCompare(b));
  }, [markets]);

  const availableSymbolsForExchange = useMemo(() => {
    const filtered =
      exchangeId === 'all' ? markets : markets.filter((m) => m.exchangeId === exchangeId);
    const ids = new Set(filtered.map((m) => m.symbol));
    return Array.from(ids).sort((a, b) => a.localeCompare(b));
  }, [markets, exchangeId]);

  useEffect(() => {
    if (symbol !== 'all') return;
    // Keep default as USDT when present.
    if (availableSymbolsForExchange.includes('BZR/USDT')) {
      setSymbol('BZR/USDT');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketsData?.timestamp]);

  const {
    data: tradesData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCexTrades({
    exchangeId: exchangeId === 'all' ? undefined : exchangeId,
    symbol: symbol === 'all' ? undefined : symbol,
    page,
    pageSize,
    sort,
  });

  const { data: volumeData } = useCexDailyVolume({
    exchangeId: exchangeId === 'all' ? undefined : exchangeId,
    symbol: symbol === 'all' ? undefined : symbol,
    days: 30,
  });

  const trades = tradesData?.data || [];
  const pagination = tradesData?.pagination;
  const total = pagination?.total ?? trades.length;
  const totalPages = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const visibleTrades = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return trades;
    return trades.filter((t) => {
      return (
        (t.tradeId || '').toLowerCase().includes(q) ||
        (t.symbol || '').toLowerCase().includes(q) ||
        (t.exchangeId || '').toLowerCase().includes(q)
      );
    });
  }, [trades, debouncedSearchQuery]);

  const handleSortToggle = () => {
    setSort((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  const formatValue = (trade: CexTrade) => {
    if (trade.costQuote == null) return '--';
    const quote = getQuoteFromPair(trade.symbol) || '';
    if (isStableQuote(trade.symbol)) return formatUsdValue(Number(trade.costQuote));
    return `${formatNumber(Number(trade.costQuote), 6)} ${quote}`;
  };

  const exportTrades = () => {
    const rows = visibleTrades.map((t) => ({
      exchange: t.exchangeId,
      symbol: t.symbol,
      tradeId: t.tradeId,
      timeStamp: t.timeStamp ? new Date(t.timeStamp * 1000).toISOString() : '',
      side: t.side || '',
      price: t.price ?? '',
      amountBase: t.amountBase ?? '',
      costQuote: t.costQuote ?? '',
    }));
    exportToCSV(rows, `bzr-cex-trades`);
  };

  const volumeQuote24h = volumeData?.totals?.volumeQuote24h ?? null;
  const trades24h = volumeData?.totals?.trades24h ?? null;

  return (
    <div>
      <div id="cex-trades-title" className="flex items-center gap-3 mb-6 scroll-mt-24">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CEX Trades</h1>
          <p className="text-sm text-gray-500">Recent trades from centralized exchanges</p>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Latest CEX Trades</h3>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs sm:text-sm font-medium text-indigo-700 transition-all hover:bg-indigo-100 disabled:opacity-70"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">{isFetching ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <button
                type="button"
                onClick={exportTrades}
                disabled={visibleTrades.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs sm:text-sm font-medium text-green-700 transition-all hover:bg-green-100 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="hidden xs:inline">Export</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">24h Volume</div>
              <div className="mt-1 text-sm sm:text-base font-semibold text-gray-900">
                {volumeQuote24h == null
                  ? '--'
                  : isStableQuote(symbol === 'all' ? 'BZR/USDT' : symbol)
                    ? formatUsdValue(Number(volumeQuote24h))
                    : formatNumber(Number(volumeQuote24h), 4)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">24h Trades</div>
              <div className="mt-1 text-sm sm:text-base font-semibold text-gray-900">
                {trades24h == null ? '--' : Number(trades24h).toLocaleString('en-US')}
              </div>
            </div>
            <div className="hidden sm:block rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Exchange</div>
              <div className="mt-1 text-sm sm:text-base font-semibold text-gray-900">
                {exchangeId === 'all' ? 'All' : exchangeId}
              </div>
            </div>
            <div className="hidden sm:block rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">Pair</div>
              <div className="mt-1 text-sm sm:text-base font-semibold text-gray-900">
                {symbol === 'all' ? 'All' : symbol}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 sm:p-3 rounded-lg">
            <label className="flex items-center gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">Exchange:</span>
              <select
                value={exchangeId}
                onChange={(e) => {
                  setExchangeId(e.target.value);
                  setPage(1);
                }}
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 py-1 px-2 bg-white"
              >
                <option value="all">All</option>
                {exchanges.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">Pair:</span>
              <select
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setPage(1);
                }}
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 py-1 px-2 bg-white"
              >
                <option value="all">All</option>
                {availableSymbolsForExchange.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="flex-1 sm:flex-none rounded-md border-gray-300 text-xs sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 py-1 px-2 bg-white"
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="font-medium text-gray-500 whitespace-nowrap">Sort:</span>
              <button
                type="button"
                onClick={handleSortToggle}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs sm:text-sm hover:bg-gray-50"
              >
                {sort === 'desc' ? (
                  <>
                    <ArrowDown className="w-3.5 h-3.5" />
                    Newest first
                  </>
                ) : (
                  <>
                    <ArrowUp className="w-3.5 h-3.5" />
                    Oldest first
                  </>
                )}
              </button>
            </label>

            <div className="relative flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Search by trade id / pair / exchange..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-3 text-xs sm:text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="ml-auto text-xs sm:text-sm text-gray-500 whitespace-nowrap hidden sm:block">
              {total.toLocaleString('en-US')} Trades
            </div>
          </div>
        </div>

        {/* Body */}
        <div>
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-500">
              Error loading trades: {error.message}
            </div>
          ) : tradesData && tradesData.enabled === false ? (
            <div className="py-12 text-center text-sm text-gray-500">
              CEX trades are not enabled on the backend.
            </div>
          ) : visibleTrades.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">No trades found.</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {visibleTrades.map((t) => {
                  const age = t.timeStamp ? timeAgo(String(t.timeStamp)) : '--';
                  const quote = getQuoteFromPair(t.symbol) || '';
                  return (
                    <div key={`${t.exchangeId}-${t.symbol}-${t.tradeId}`} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500">{age}</div>
                          <div className="mt-1 font-mono text-sm text-gray-900 truncate">
                            {t.tradeId}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {t.side ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  t.side === 'buy'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {t.side === 'buy' ? 'Buy' : 'Sell'}
                              </span>
                            ) : null}
                            <span className="text-xs text-gray-500">{t.symbol}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white"
                            title={t.exchangeId}
                          >
                            <ExchangeIcon exchangeId={t.exchangeId} className="h-6 w-6" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">Price</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {t.price == null
                              ? '--'
                              : isStableQuote(t.symbol)
                                ? formatUsdValue(Number(t.price))
                                : `${formatNumber(Number(t.price), 8)} ${quote}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">Amount</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {formatNumber(Number(t.amountBase ?? null), 6)}{' '}
                            <span className="text-gray-500">{t.symbol.split('/')[0]}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">Value</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {formatValue(t)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-wide text-gray-400">Exchange</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">{t.exchangeId}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Trade ID</th>
                      <th className="px-4 py-3 text-left">Age</th>
                      <th className="px-4 py-3 text-left">Side</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Value</th>
                      <th className="px-4 py-3 text-left">Exchange</th>
                      <th className="px-4 py-3 text-left">Pair</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleTrades.map((t) => {
                      const age = t.timeStamp ? timeAgo(String(t.timeStamp)) : '--';
                      const quote = getQuoteFromPair(t.symbol) || '';
                      const base = t.symbol.split('/')[0] || '';
                      return (
                        <tr key={`${t.exchangeId}-${t.symbol}-${t.tradeId}`}>
                          <td className="px-4 py-3 font-mono text-gray-900">{t.tradeId}</td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{age}</td>
                          <td className="px-4 py-3">
                            {t.side ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  t.side === 'buy'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {t.side === 'buy' ? 'Buy' : 'Sell'}
                              </span>
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                            {t.price == null
                              ? '--'
                              : isStableQuote(t.symbol)
                                ? formatUsdValue(Number(t.price))
                                : `${formatNumber(Number(t.price), 8)} ${quote}`}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                            <span className="font-medium text-gray-900">
                              {formatNumber(Number(t.amountBase ?? null), 6)}
                            </span>{' '}
                            <span className="text-gray-500">{base}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">{formatValue(t)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white">
                                <ExchangeIcon exchangeId={t.exchangeId} className="h-5 w-5" />
                              </div>
                              <span className="text-gray-700">{t.exchangeId}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{t.symbol}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col xs:flex-row items-center justify-between bg-gray-50 gap-2">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{' '}
            {total.toLocaleString('en-US')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || isFetching}
              className="px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs sm:text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages || isFetching}
              className="px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
