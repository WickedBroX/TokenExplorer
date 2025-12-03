import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Menu,
  X,
  Loader2,
  Send,
  Globe,
  Twitter,
  BookOpen,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  FileText,
} from "lucide-react";
import {
  validateSearchQuery,
  detectSearchType,
  saveRecentSearch,
  type SearchResult,
} from "../utils/searchUtils";
import { TransactionModal } from "../components/TransactionModal";
import { TokenOverviewHeader } from "../components/TokenOverviewHeader";
import { SOCIAL_LINKS } from "../constants/index";
import type { Transfer } from "../types/api";

const navItems = [
  { label: "Transfers", path: "/" },
  { label: "Holders", path: "/holders" },
  { label: "Info & Contract", path: "/info" },
  { label: "Analytics", path: "/analytics" },
];

const DiscordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    if (!query || !query.trim()) {
      setSearchError("Please enter a search query");
      return;
    }

    const validation = validateSearchQuery(query);
    if (!validation.valid) {
      setSearchError(validation.error || "Invalid search query");
      return;
    }

    setSearchError(null);
    setSearchResult(null);
    setIsSearching(true);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_URL ?? "http://localhost:3001";
      const response = await fetch(
        `${API_BASE_URL}/api/search?query=${encodeURIComponent(query.trim())}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || errorData.error || "Search failed"
        );
      }

      const result: SearchResult = await response.json();
      setSearchResult(result);

      saveRecentSearch({
        query: query.trim(),
        type: detectSearchType(query),
        timestamp: Date.now(),
        found: result.found,
      });

      if (result.searchType === "address" && result.found) {
        navigate(`/?address=${query.trim()}`);
      } else if (result.searchType === "block" && result.found) {
        navigate(`/?block=${query.trim()}`);
      } else if (result.searchType === "transaction" && result.found) {
        // Modal will open automatically via searchResult state
      } else {
        setSearchError("No results found");
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <img
                  src="https://res.cloudinary.com/dhznjbcys/image/upload/v1762175462/BZR-SCAN-V2_iybuqz.png"
                  alt="Bazaars Scan Logo"
                  className="h-8 w-auto sm:h-10"
                />
              </button>
            </div>

            {/* Desktop Search */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchTerm.trim()) handleSearch(searchTerm.trim());
                }}
                className="w-full relative"
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSearchError(null);
                  }}
                  placeholder="Search by Address / Txn Hash / Block / Token..."
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  disabled={isSearching}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                )}
              </form>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setIsNavOpen(!isNavOpen)}
            >
              {isNavOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Mobile Search & Navigation */}
          {isNavOpen && (
            <div className="md:hidden border-t border-gray-200 py-4 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchTerm.trim()) handleSearch(searchTerm.trim());
                }}
                className="px-2"
              >
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </form>
              <nav className="flex flex-col gap-1 px-2">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsNavOpen(false);
                    }}
                    className={`px-4 py-2 text-left text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {searchError && (
            <div className="py-2 text-center text-sm text-red-600 bg-red-50 border-t border-red-100">
              {searchError}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TokenOverviewHeader />
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Logo and Description */}
            <div className="lg:col-span-1">
              <img
                src="https://res.cloudinary.com/dhznjbcys/image/upload/v1762175462/BZR-SCAN-V2_iybuqz.png"
                alt="Bazaars Logo"
                className="h-8 w-auto mb-4"
              />
              <p className="text-sm text-gray-600 leading-relaxed">
                Explore and track BZR token transactions across multiple
                blockchain networks.
              </p>
            </div>

            {/* Markets & Data */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Markets & Data
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://coinmarketcap.com/currencies/bazaars/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      CoinMarketCap
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.coingecko.com/en/coins/bazaars"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      Coingecko
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://etherscan.io/token/0x8d96b4ab6c741a4c8679ae323a100d74f085ba8f"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      Etherscan
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Exchanges */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Exchanges
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://www.bitmart.com/trade/en-US?symbol=BZR_USDT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      Bitmart
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.coinstore.com/#/spot/bzrusdt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      Coinstore
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.mexc.com/exchange/BZR_USDT"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      MEXC
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Community
              </h3>
              <ul className="space-y-3">
                {SOCIAL_LINKS.map((link) => {
                  const IconMap = {
                    Website: Globe,
                    Twitter: Twitter,
                    Telegram: Send,
                    Discord: DiscordIcon,
                    Medium: BookOpen,
                    Facebook: FacebookIcon,
                    Instagram: InstagramIcon,
                    Whitepaper: FileText,
                  } as Record<string, React.ElementType>;

                  const Icon = IconMap[link.name] || Globe;

                  return (
                    <li key={link.name}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="group-hover:translate-x-1 transition-transform">
                          {link.name}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-gray-200">
            <div className="flex justify-center items-center">
              <p className="text-sm text-gray-500">
                © 2025 Bazaars. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Transaction Details Modal */}
      {searchResult && searchResult.searchType === "transaction" && (
        <TransactionModal
          transaction={searchResult.data as unknown as Transfer}
          onClose={() => setSearchResult(null)}
        />
      )}
    </div>
  );
};
