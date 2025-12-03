const { query } = require('../utils/db');
const tokenService = require('../services/tokenService');
const { getNextApiKey, respondUpstreamFailure } = require('../utils/apiUtils');
const axios = require('axios');
const { PROVIDERS } = require('../config/chains');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const API_V2_BASE_URL = PROVIDERS.etherscan.baseUrl;

/**
 * Get token information (supply, details, etc.)
 * GET /api/info
 */
const getTokenInfo = async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/info`);
  
  // Check if force refresh requested
  const forceRefresh = req.query.force === 'true';
  
  if (!process.env.ETHERSCAN_V2_API_KEY || !BZR_ADDRESS) {
    return res.status(500).json({ message: 'Server is missing ETHERSCAN_V2_API_KEY or BZR_TOKEN_ADDRESS' });
  }

  try {
    // Step 1: Try to get from database (unless force refresh)
    if (!forceRefresh) {
      const dbResult = await query(
        `SELECT 
          token_name, token_symbol, token_decimals,
          total_supply, formatted_total_supply,
          circulating_supply, formatted_circulating_supply,
          updated_at
         FROM token_info 
         WHERE contract_address = $1 
         AND updated_at > NOW() - INTERVAL '1 hour'
         LIMIT 1`,
        [BZR_ADDRESS.toLowerCase()]
      );

      if (dbResult.rows.length > 0) {
        const row = dbResult.rows[0];
        const tokenInfo = {
          tokenName: row.token_name,
          tokenSymbol: row.token_symbol,
          tokenDecimal: row.token_decimals,
          totalSupply: row.total_supply,
          circulatingSupply: row.circulating_supply,
          formattedTotalSupply: row.formatted_total_supply,
          formattedCirculatingSupply: row.formatted_circulating_supply,
          _source: 'database',
          _updatedAt: row.updated_at,
        };
        console.log(`-> Returning token info from database (updated ${row.updated_at})`);
        return res.json(tokenInfo);
      } else {
        console.log('-> No recent token info in database, fetching from upstream...');
      }
    } else {
      console.log('-> Force refresh requested, bypassing database cache');
    }

    // Step 2: Fetch from upstream (either no DB data, stale, or forced)
    const params = {
      chainid: 1, // Ethereum Mainnet
      apikey: getNextApiKey(),
    };

    // Call 1: Get Total Supply
    const supplyParams = {
      ...params,
      module: 'stats',
      action: 'tokensupply',
      contractaddress: BZR_ADDRESS,
    };

    // Call 2: Get token details (name, symbol, decimals) from the last transaction
    const txParams = {
      ...params,
      module: 'account',
      action: 'tokentx',
      contractaddress: BZR_ADDRESS,
      page: 1,
      offset: 1,
      sort: 'desc',
    };

    // Call 3: Get detailed token info including circulating supply
    const tokenInfoParams = {
      ...params,
      module: 'token',
      action: 'tokeninfo',
      contractaddress: BZR_ADDRESS,
    };

    console.log('-> Fetching token info from Etherscan API...');
    const [supplyResponse, txResponse, tokenInfoResponse] = await Promise.all([
      axios.get(API_V2_BASE_URL, { params: supplyParams, timeout: 15000 }),
      axios.get(API_V2_BASE_URL, { params: txParams, timeout: 15000 }),
      axios.get(API_V2_BASE_URL, { params: tokenInfoParams, timeout: 15000 }),
    ]);

    // Check for API errors
    if (supplyResponse.data.status !== '1' || txResponse.data.status !== '1') {
      console.error('Etherscan API Error:', supplyResponse.data.message, txResponse.data.message);
      
      // If upstream fails, try to return stale DB data as fallback
      const fallbackResult = await query(
        `SELECT 
          token_name, token_symbol, token_decimals,
          total_supply, formatted_total_supply,
          circulating_supply, formatted_circulating_supply,
          updated_at
         FROM token_info 
         WHERE contract_address = $1 
         ORDER BY updated_at DESC
         LIMIT 1`,
        [BZR_ADDRESS.toLowerCase()]
      );

      if (fallbackResult.rows.length > 0) {
        const row = fallbackResult.rows[0];
        const tokenInfo = {
          tokenName: row.token_name,
          tokenSymbol: row.token_symbol,
          tokenDecimal: row.token_decimals,
          totalSupply: row.total_supply,
          circulatingSupply: row.circulating_supply,
          formattedTotalSupply: row.formatted_total_supply,
          formattedCirculatingSupply: row.formatted_circulating_supply,
          _source: 'database_fallback',
          _updatedAt: row.updated_at,
          _warning: 'Upstream API unavailable, showing cached data',
        };
        console.log(`-> Upstream failed, returning stale DB data from ${row.updated_at}`);
        return res.json(tokenInfo);
      }

      return respondUpstreamFailure(res, 'Upstream Etherscan API error while fetching token info', {
        supplyError: supplyResponse.data.message,
        txError: txResponse.data.message,
        tokenInfoError: tokenInfoResponse.data.message,
      });
    }

    // --- Parse the data ---
    const totalSupply = supplyResponse.data.result;
    const lastTx = txResponse.data.result[0];
    
    if (!lastTx) {
      return res.status(404).json({ message: 'No transactions found for this token to read info from.' });
    }

    const { tokenName, tokenSymbol, tokenDecimal } = lastTx;
    
    // Data from Token Info call (includes circulating supply)
    let circulatingSupply = null;
    let formattedCirculatingSupply = null;
    if (tokenInfoResponse.data.status === '1' && Array.isArray(tokenInfoResponse.data.result)) {
      const tokenInfoData = tokenInfoResponse.data.result[0];
      if (tokenInfoData && tokenInfoData.circulatingSupply) {
        circulatingSupply = tokenInfoData.circulatingSupply;
        try {
          formattedCirculatingSupply = (BigInt(circulatingSupply) / BigInt(10 ** parseInt(tokenDecimal, 10))).toString();
        } catch (e) {
          console.warn('! Could not format circulating supply:', e.message);
        }
      }
    }
    
    const formattedTotalSupply = (BigInt(totalSupply) / BigInt(10 ** parseInt(tokenDecimal, 10))).toString();
    
    // Step 3: Persist to database
    try {
      await query(
        `INSERT INTO token_info (
          contract_address, chain_id, token_name, token_symbol, token_decimals,
          total_supply, formatted_total_supply,
          circulating_supply, formatted_circulating_supply,
          source_data, last_fetch_success, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())
        ON CONFLICT (contract_address) 
        DO UPDATE SET
          chain_id = EXCLUDED.chain_id,
          token_name = EXCLUDED.token_name,
          token_symbol = EXCLUDED.token_symbol,
          token_decimals = EXCLUDED.token_decimals,
          total_supply = EXCLUDED.total_supply,
          formatted_total_supply = EXCLUDED.formatted_total_supply,
          circulating_supply = EXCLUDED.circulating_supply,
          formatted_circulating_supply = EXCLUDED.formatted_circulating_supply,
          source_data = EXCLUDED.source_data,
          last_fetch_success = true,
          last_fetch_error = NULL,
          updated_at = NOW()`,
        [
          BZR_ADDRESS.toLowerCase(),
          1, // Ethereum Mainnet
          tokenName,
          tokenSymbol,
          parseInt(tokenDecimal, 10),
          totalSupply,
          formattedTotalSupply,
          circulatingSupply,
          formattedCirculatingSupply,
          JSON.stringify({
            supplyResponse: supplyResponse.data,
            txResponse: txResponse.data,
            tokenInfoResponse: tokenInfoResponse.data,
          }),
        ]
      );
      console.log('-> Token info persisted to database');
    } catch (dbError) {
      console.error('! Failed to persist token info to database:', dbError.message);
      // Continue anyway - upstream data is still valid
    }

    // --- Send Response ---
    const tokenInfo = {
      tokenName,
      tokenSymbol,
      tokenDecimal: parseInt(tokenDecimal, 10),
      totalSupply,
      circulatingSupply,
      formattedTotalSupply,
      formattedCirculatingSupply,
      _source: 'upstream',
    };

    console.log('-> Successfully fetched token info from upstream and persisted to DB');
    res.json(tokenInfo);

  } catch (error) {
    console.error('Error in /api/info handler:', error.message);
    
    // Last resort: try to return any DB data we have
    try {
      const emergencyResult = await query(
        `SELECT 
          token_name, token_symbol, token_decimals,
          total_supply, formatted_total_supply,
          circulating_supply, formatted_circulating_supply,
          updated_at
         FROM token_info 
         WHERE contract_address = $1 
         ORDER BY updated_at DESC
         LIMIT 1`,
        [BZR_ADDRESS.toLowerCase()]
      );

      if (emergencyResult.rows.length > 0) {
        const row = emergencyResult.rows[0];
        const tokenInfo = {
          tokenName: row.token_name,
          tokenSymbol: row.token_symbol,
          tokenDecimal: row.token_decimals,
          totalSupply: row.total_supply,
          circulatingSupply: row.circulating_supply,
          formattedTotalSupply: row.formatted_total_supply,
          formattedCirculatingSupply: row.formatted_circulating_supply,
          _source: 'database_emergency',
          _updatedAt: row.updated_at,
          _warning: 'Error occurred, showing last known data',
        };
        console.log(`-> Emergency fallback: returning DB data from ${row.updated_at}`);
        return res.json(tokenInfo);
      }
    } catch (fallbackError) {
      console.error('! Emergency fallback also failed:', fallbackError.message);
    }

    if (error.response?.data) {
      return respondUpstreamFailure(res, 'Failed to fetch token info from Etherscan', {
        upstreamResponse: error.response.data,
      });
    }

    res.status(500).json({ message: 'Failed to fetch token info', error: error.message });
  }
};

/**
 * Get token price
 * GET /api/price
 */
const getTokenPrice = async (req, res) => {
  try {
    const priceData = await tokenService.fetchTokenPrice();
    res.json(priceData);
  } catch (error) {
    console.error('Error fetching token price:', error);
    res.status(500).json({ error: 'Failed to fetch token price' });
  }
};

module.exports = {
  getTokenInfo,
  getTokenPrice,
};
