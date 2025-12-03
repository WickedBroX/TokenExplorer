const searchService = require('../services/searchService');

const search = async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/search`);
  
  const { query, type, chainId } = req.query;

  if (!query) {
    return res.status(400).json({ 
      error: 'Missing query parameter',
      message: 'Please provide a query parameter (address, transaction hash, or block number)'
    });
  }

  // Detect or use provided search type
  const searchType = type || searchService.detectSearchType(query);

  if (searchType === 'unknown') {
    return res.status(400).json({
      error: 'Invalid search query',
      message: 'Query must be an Ethereum address (0x + 40 chars), transaction hash (0x + 64 chars), or block number',
      detectedType: searchType,
      query: query
    });
  }

  try {
    let result;

    switch (searchType) {
      case 'address':
        result = await searchService.searchByAddress(query);
        break;

      case 'transaction':
        result = await searchService.searchByTransaction(query);
        break;

      case 'block':
        const blockNum = parseInt(query);
        const chain = chainId ? parseInt(chainId) : null;
        result = await searchService.searchByBlock(blockNum, chain);
        break;

      case 'ens':
        // ENS resolution would go here (future enhancement)
        return res.status(501).json({
          error: 'ENS resolution not yet implemented',
          message: 'ENS domain resolution is coming soon!',
          query: query
        });

      default:
        return res.status(400).json({
          error: 'Unsupported search type',
          detectedType: searchType
        });
    }

    console.log(`-> Search completed: ${searchType} - ${result.found ? 'FOUND' : 'NOT FOUND'}`);
    
    return res.json({
      success: true,
      searchType: searchType,
      query: query,
      ...result
    });

  } catch (error) {
    console.error('X Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: error.message || 'An unexpected error occurred during search'
    });
  }
};

module.exports = {
  search,
};
