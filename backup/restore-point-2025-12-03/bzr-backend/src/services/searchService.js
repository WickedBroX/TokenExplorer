const axios = require('axios');
const { CHAINS, getChainDefinition, getProviderConfigForChain, getProviderKeyForChain } = require('../config/chains');
const { getNextApiKey } = require('../utils/apiUtils');
const { query } = require('../utils/db');

const detectSearchType = (query) => {
  if (!query || typeof query !== 'string') {
    return 'unknown';
  }

  const trimmed = query.trim().toLowerCase();

  // Ethereum address: 0x followed by 40 hex characters
  if (/^0x[a-f0-9]{40}$/i.test(trimmed)) {
    return 'address';
  }

  // Transaction hash: 0x followed by 64 hex characters
  if (/^0x[a-f0-9]{64}$/i.test(trimmed)) {
    return 'transaction';
  }

  // Block number: pure digits
  if (/^\d+$/.test(trimmed)) {
    return 'block';
  }

  // ENS domain: ends with .eth
  if (trimmed.endsWith('.eth')) {
    return 'ens';
  }

  return 'unknown';
};

const searchByTransaction = async (txHash) => {
  console.log(`[SEARCH] Looking for transaction: ${txHash}`);
  
  // First, try to find in our database
  try {
    const dbResult = await query(
      `SELECT 
        tx_hash, block_number, time_stamp, 
        from_address, to_address, value, 
        chain_id
       FROM transfer_events 
       WHERE tx_hash = $1 
       LIMIT 1`,
      [txHash.toLowerCase()]
    );

    if (dbResult.rows.length > 0) {
      const tx = dbResult.rows[0];
      const chain = getChainDefinition(tx.chain_id);
      const chainName = chain ? chain.name : `Chain ${tx.chain_id}`;
      console.log(`-> Found transaction in database on chain ${chainName}`);
      
      // Convert PostgreSQL timestamp to Unix timestamp (seconds)
      const timeStamp = tx.time_stamp 
        ? String(Math.floor(new Date(tx.time_stamp).getTime() / 1000))
        : null;
      
      return {
        source: 'database',
        type: 'transaction',
        found: true,
        data: {
          hash: tx.tx_hash,
          blockNumber: tx.block_number,
          timeStamp: timeStamp,  // Use camelCase to match frontend Transfer type
          from: tx.from_address,
          to: tx.to_address,
          value: tx.value,
          chainId: tx.chain_id,
          chainName: chainName,
        }
      };
    }
  } catch (dbError) {
    console.error('-> Database search error:', dbError.message);
  }

  // If not in database, search across all chains via Etherscan
  console.log('-> Transaction not in database, searching blockchain explorers...');
  
  for (const chain of CHAINS) {
    try {
      const provider = getProviderConfigForChain(chain, { requireApiKey: false });
      const apiKey = getNextApiKey();
      
      const url = `${provider.baseUrl}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`;
      
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.data && response.data.result && response.data.result.blockNumber) {
        const tx = response.data.result;
        console.log(`-> Found transaction on ${chain.name}`);
        
        // Get block details to extract timestamp
        let timeStamp = null;
        try {
          const blockUrl = `${provider.baseUrl}?module=proxy&action=eth_getBlockByNumber&tag=${tx.blockNumber}&boolean=false&apikey=${apiKey}`;
          const blockResponse = await axios.get(blockUrl, { timeout: 5000 });
          if (blockResponse.data && blockResponse.data.result && blockResponse.data.result.timestamp) {
            // Convert hex timestamp to decimal string
            timeStamp = String(parseInt(blockResponse.data.result.timestamp, 16));
          }
        } catch (blockError) {
          console.warn(`-> Could not fetch block timestamp: ${blockError.message}`);
        }
        
        return {
          source: 'blockchain',
          type: 'transaction',
          found: true,
          data: {
            hash: tx.hash,
            blockNumber: parseInt(tx.blockNumber, 16),
            timeStamp: timeStamp,  // Use camelCase to match frontend Transfer type
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gasUsed: tx.gas,
            chainId: chain.id,
            chainName: chain.name,
          }
        };
      }
    } catch (error) {
      // Continue to next chain
      continue;
    }
  }

  console.log('-> Transaction not found on any chain');
  return {
    source: 'none',
    type: 'transaction',
    found: false,
    error: 'Transaction not found on any supported chain'
  };
};

const searchByAddress = async (address) => {
  console.log(`[SEARCH] Address search: ${address}`);
  
  // Validate address exists in our database
  try {
    const dbResult = await query(
      `SELECT COUNT(*) as count, 
              COUNT(DISTINCT chain_id) as chains
       FROM transfer_events 
       WHERE from_address = $1 OR to_address = $1
       LIMIT 1`,
      [address.toLowerCase()]
    );

    const { count, chains } = dbResult.rows[0];
    
    return {
      source: 'database',
      type: 'address',
      found: parseInt(count) > 0,
      data: {
        address: address,
        transferCount: parseInt(count),
        chainCount: parseInt(chains),
        message: parseInt(count) > 0 
          ? `Found ${count} transfers across ${chains} chain(s)` 
          : 'No transfers found for this address'
      }
    };
  } catch (error) {
    console.error('-> Address search error:', error.message);
    return {
      source: 'database',
      type: 'address',
      found: false,
      error: 'Failed to search address'
    };
  }
};

const searchByBlock = async (blockNumber, chainId = null) => {
  console.log(`[SEARCH] Block search: ${blockNumber}${chainId ? ` on chain ${chainId}` : ''}`);
  
  try {
    let queryText;
    let params;
    
    if (chainId) {
      queryText = `SELECT COUNT(*) as count 
               FROM transfer_events 
               WHERE block_number = $1 AND chain_id = $2`;
      params = [blockNumber, chainId];
    } else {
      queryText = `SELECT COUNT(*) as count,
                      COUNT(DISTINCT chain_id) as chains
               FROM transfer_events 
               WHERE block_number = $1`;
      params = [blockNumber];
    }

    const dbResult = await query(queryText, params);
    const { count, chains } = dbResult.rows[0];
    
    return {
      source: 'database',
      type: 'block',
      found: parseInt(count) > 0,
      data: {
        blockNumber: blockNumber,
        chainId: chainId,
        transferCount: parseInt(count),
        chainCount: chains ? parseInt(chains) : 1,
        message: parseInt(count) > 0
          ? `Found ${count} transfers in block ${blockNumber}`
          : `No transfers found in block ${blockNumber}`
      }
    };
  } catch (error) {
    console.error('-> Block search error:', error.message);
    return {
      source: 'database',
      type: 'block',
      found: false,
      error: 'Failed to search block'
    };
  }
};

module.exports = {
  detectSearchType,
  searchByTransaction,
  searchByAddress,
  searchByBlock,
};
