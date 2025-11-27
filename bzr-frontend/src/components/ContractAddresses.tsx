import { useState, useMemo } from "react";
import {
  Box,
  Search,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ContractLink {
  name: string;
  url: string;
  type: "layer1" | "layer2" | "sidechain";
  active: boolean;
  logo: string;
}

interface ContractAddressesProps {
  tokenAddress: string;
}

export const ContractAddresses: React.FC<ContractAddressesProps> = ({
  tokenAddress,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedChain, setCopiedChain] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["layer1", "layer2", "sidechain"])
  );

  // Contract links organized by type
  const contractLinks: ContractLink[] = useMemo(
    () => [
      // Layer 1 Networks
      {
        name: "Ethereum",
        url: `https://etherscan.io/address/${tokenAddress}`,
        type: "layer1",
        active: true,
        logo: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=029",
      },
      {
        name: "BSC",
        url: `https://bscscan.com/address/${tokenAddress}`,
        type: "layer1",
        active: true,
        logo: "https://cryptologos.cc/logos/bnb-bnb-logo.svg?v=029",
      },
      {
        name: "Avalanche",
        url: `https://subnets.avax.network/c-chain/address/${tokenAddress}`,
        type: "layer1",
        active: true,
        logo: "https://cryptologos.cc/logos/avalanche-avax-logo.svg?v=029",
      },
      {
        name: "Cronos",
        url: `https://cronoscan.com/address/${tokenAddress}`,
        type: "layer1",
        active: true,
        logo: "https://cryptologos.cc/logos/cronos-cro-logo.svg?v=029",
      },

      // Layer 2 Solutions
      {
        name: "Polygon",
        url: `https://polygonscan.com/address/${tokenAddress}`,
        type: "layer2",
        active: true,
        logo: "https://cryptologos.cc/logos/polygon-matic-logo.svg?v=029",
      },
      {
        name: "Arbitrum",
        url: `https://arbiscan.io/address/${tokenAddress}`,
        type: "layer2",
        active: true,
        logo: "https://cryptologos.cc/logos/arbitrum-arb-logo.svg?v=029",
      },
      {
        name: "Optimism",
        url: `https://optimistic.etherscan.io/address/${tokenAddress}`,
        type: "layer2",
        active: true,
        logo: "https://cryptologos.cc/logos/optimism-ethereum-op-logo.svg?v=029",
      },
      {
        name: "Base",
        url: `https://basescan.org/address/${tokenAddress}`,
        type: "layer2",
        active: true,
        logo: "https://icons.llamao.fi/icons/chains/rsz_base.jpg",
      },
      {
        name: "zkSync",
        url: `https://explorer.zksync.io/address/${tokenAddress}`,
        type: "layer2",
        active: true,
        logo: "https://icons.llamao.fi/icons/chains/rsz_zksync%20era.jpg",
      },

      // Sidechains / Other
      {
        name: "Mantle",
        url: `https://mantlescan.xyz/address/${tokenAddress}`,
        type: "sidechain",
        active: true,
        logo: "https://icons.llamao.fi/icons/chains/rsz_mantle.jpg",
      },
    ],
    [tokenAddress]
  );

  // Group chains by type
  const groupedChains = useMemo(() => {
    const filtered = contractLinks.filter((link) =>
      link.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      layer1: filtered.filter((link) => link.type === "layer1"),
      layer2: filtered.filter((link) => link.type === "layer2"),
      sidechain: filtered.filter((link) => link.type === "sidechain"),
    };
  }, [contractLinks, searchQuery]);

  const groupTitles = {
    layer1: "Layer 1 Networks",
    layer2: "Layer 2 Solutions",
    sidechain: "Other Networks",
  };

  const groupColors = {
    layer1: "from-blue-500 to-blue-600",
    layer2: "from-purple-500 to-purple-600",
    sidechain: "from-orange-500 to-orange-600",
  };

  const handleCopy = async (chain: string) => {
    try {
      await navigator.clipboard.writeText(tokenAddress);
      setCopiedChain(chain);
      setTimeout(() => setCopiedChain(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const totalChains = contractLinks.length;
  const filteredCount = Object.values(groupedChains).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-6 border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            Contract Addresses
          </h3>
        </div>
        <span className="text-xs md:text-sm text-gray-500 font-medium">
          {filteredCount} of {totalChains} chains
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search blockchains..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 md:py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Address Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
          Token Address
        </span>
        <div className="flex items-center justify-between gap-2">
          <code className="text-xs md:text-sm font-mono text-gray-900 break-all">
            {tokenAddress}
          </code>
          <button
            onClick={() => handleCopy("main")}
            className="flex-shrink-0 p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Copy address"
          >
            {copiedChain === "main" ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Grouped Chain Links */}
      <div className="space-y-3">
        {(Object.keys(groupedChains) as Array<keyof typeof groupedChains>).map(
          (groupKey) => {
            const chains = groupedChains[groupKey];
            if (chains.length === 0) return null;

            const isExpanded = expandedGroups.has(groupKey);

            return (
              <div
                key={groupKey}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full bg-gradient-to-r ${groupColors[groupKey]}`}
                    ></div>
                    <span className="text-sm font-semibold text-gray-900">
                      {groupTitles[groupKey]}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      ({chains.length})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {/* Chain Links */}
                {isExpanded && (
                  <div className="p-2 space-y-1.5 bg-white">
                    {chains.map((link) => (
                      <div
                        key={link.name}
                        className="group flex items-center justify-between p-2.5 md:p-3 rounded-lg bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border border-gray-100 hover:border-blue-200 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0 p-1">
                            <img
                              src={link.logo}
                              alt={`${link.name} logo`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Fallback to initials if logo fails to load
                                const target = e.currentTarget;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.classList.add(
                                    "bg-gradient-to-br",
                                    groupColors[groupKey]
                                  );
                                  const span = document.createElement("span");
                                  span.className =
                                    "text-xs font-bold text-white";
                                  span.textContent = link.name
                                    .substring(0, 2)
                                    .toUpperCase();
                                  parent.appendChild(span);
                                }
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {link.name}
                          </span>
                          {link.active && (
                            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleCopy(link.name)}
                            className="p-1.5 rounded hover:bg-white/80 transition-colors"
                            title="Copy address"
                          >
                            {copiedChain === link.name ? (
                              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-blue-500" />
                            )}
                          </button>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-white/80 transition-colors"
                            title="View on explorer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 group-hover:text-blue-500" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* No Results */}
      {filteredCount === 0 && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No blockchains found matching "{searchQuery}"
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
};
