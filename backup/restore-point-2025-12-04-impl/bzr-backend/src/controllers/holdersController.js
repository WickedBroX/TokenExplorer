const holdersService = require('../services/holdersService');

const getHolders = async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/holders`);
  
  const requestedChainId = Number(req.query.chainId || 1); // Default to Ethereum
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize || 50))); // 10-100, default 50

  try {
    let result;
    if (requestedChainId === 0) {
      result = await holdersService.fetchAggregatedHolders({
        page,
        pageSize,
      });
    } else {
      result = await holdersService.fetchHolders({
        chainId: requestedChainId,
        page,
        pageSize,
      });
    }

    res.json(result);
  } catch (error) {
    if (error.code === 'INVALID_CHAIN_ID') {
      return res.status(400).json({
        message: error.message,
        chainId: requestedChainId,
        availableChains: error.availableChains,
      });
    }

    if (error.code === 'NOT_SUPPORTED') {
      return res.status(501).json({
        message: error.message,
        chainId: requestedChainId,
        chainName: error.chainName,
      });
    }

    if (error.code === 'UPSTREAM_ERROR') {
      return res.status(502).json({
        message: error.message,
        upstreamResponse: error.upstreamResponse,
      });
    }

    res.status(500).json({ message: 'Failed to fetch holders', error: error.message });
  }
};

module.exports = {
  getHolders,
};
