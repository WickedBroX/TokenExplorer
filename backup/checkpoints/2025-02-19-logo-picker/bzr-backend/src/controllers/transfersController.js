const transfersService = require('../services/transfersService');
const { CHAINS, TRANSFERS_DEFAULT_CHAIN_ID } = require('../config/chains');

const TRANSFERS_DEFAULT_PAGE_SIZE = 25;
const TRANSFERS_MAX_PAGE_SIZE = 100;
const TRANSFERS_DATA_SOURCE = process.env.TRANSFERS_DATA_SOURCE || 'upstream';

const normalizePageNumber = (page) => {
  const parsed = parseInt(page, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const clampTransfersPageSize = (size) => {
  const parsed = parseInt(size, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return TRANSFERS_DEFAULT_PAGE_SIZE;
  }
  return Math.min(parsed, TRANSFERS_MAX_PAGE_SIZE);
};

const parseOptionalBlockNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getTransfers = async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/transfers`);

  const forceRefresh = String(req.query.force).toLowerCase() === 'true';
  const chainIdParam = req.query.chainId;
  const requestedChainId = (chainIdParam === 'all' || chainIdParam === '0' || !chainIdParam) 
    ? 0 
    : Number(chainIdParam);
  const requestedPage = normalizePageNumber(req.query.page || 1);
  const requestedPageSize = clampTransfersPageSize(req.query.pageSize || TRANSFERS_DEFAULT_PAGE_SIZE);
  const sortParam = typeof req.query.sort === 'string' ? req.query.sort.toLowerCase() : 'desc';
  const sort = sortParam === 'asc' ? 'asc' : 'desc';
  
  // Support both single 'block' param and startBlock/endBlock range
  let startBlock = parseOptionalBlockNumber(req.query.startBlock);
  let endBlock = parseOptionalBlockNumber(req.query.endBlock);
  
  if (req.query.block) {
    const blockNum = parseOptionalBlockNumber(req.query.block);
    if (blockNum !== undefined) {
      startBlock = blockNum;
      endBlock = blockNum;
    }
  }
  
  // Extract filtering parameters
  const filterAddress = req.query.address ? String(req.query.address).trim() : undefined;
  const filterHash = req.query.hash ? String(req.query.hash).trim() : undefined;
  
  const includeTotals = req.query.includeTotals !== 'false';

  if (typeof startBlock === 'number' && typeof endBlock === 'number' && startBlock > endBlock) {
    return res.status(400).json({
      message: 'startBlock cannot be greater than endBlock',
      startBlock,
      endBlock,
    });
  }

  try {
    let result;
    if ((TRANSFERS_DATA_SOURCE === 'store' || TRANSFERS_DATA_SOURCE === 'persistent') && transfersService.isStoreReady()) {
      result = await transfersService.getPersistentTransfers({
        requestedChainId,
        requestedPage,
        requestedPageSize,
        sort,
        startBlock,
        endBlock,
        filterAddress,
        filterHash,
        includeTotals,
      });
    } else if (requestedChainId === 0) {
      result = await transfersService.handleAggregatedTransfers({
        forceRefresh,
        requestedPage,
        requestedPageSize,
        sort,
        startBlock,
        endBlock,
        filterAddress,
        filterHash,
        includeTotals,
      });
    } else {
      result = await transfersService.getSingleChainTransfers({
        forceRefresh,
        requestedChainId,
        requestedPage,
        requestedPageSize,
        sort,
        startBlock,
        endBlock,
        filterAddress,
        filterHash,
        includeTotals,
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error handling /api/transfers request:', error.message || error);
    res.status(500).json({
      message: 'Failed to fetch transfers',
      error: error.message || String(error),
    });
  }
};

module.exports = {
  getTransfers,
};
