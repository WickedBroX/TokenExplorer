const axios = require('axios');
const path = require('path');
// When deployed on the server, this script lives at /var/www/bzr-backend/scripts.
// The project .env sits one level up at /var/www/bzr-backend/.env.
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TOKEN = process.env.BZR_TOKEN_ADDRESS || '0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242';
const API = process.env.CRONOS_API_BASE_URL || 'https://cronos.org/explorer/api';
const KEY = process.env.CRONOS_API_KEY || '';
const TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const SPAN = Number(process.env.CRONOS_LOG_SCAN_SPAN || 1000);

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchBlockNumber() {
  const { data } = await axios.get(API, {
    params: { module: 'block', action: 'eth_block_number', apikey: KEY },
    timeout: 20000,
  });
  if (typeof data?.result === 'string') return parseInt(data.result, 16);
  throw new Error('block number failed ' + JSON.stringify(data));
}

async function fetchLogs(fromBlock, toBlock) {
  const { data } = await axios.get(API, {
    params: { module: 'logs', action: 'getLogs', fromBlock, toBlock, address: TOKEN, topic0: TOPIC0, apikey: KEY },
    timeout: 30000,
  });
  return data;
}

(async () => {
  if (!KEY) {
    console.error('Cronos API key missing; aborting.');
    process.exit(1);
  }
  const latest = await fetchBlockNumber();
  console.log('Latest block', latest);
  let from = 1;
  let found = 0;
  let scanned = 0;
  while (from <= latest) {
    const to = Math.min(latest, from + SPAN - 1);
    const res = await fetchLogs(from, to);
    const count = Array.isArray(res.result) ? res.result.length : 0;
    if (res.status === '1' && count > 0) {
      found += count;
      console.log(`FOUND logs in block range ${from}-${to}: ${count}`);
    } else if (res.status !== '0' && res.status !== '1') {
      console.log(`Unexpected status ${res.status} in ${from}-${to}:`, res.message || res);
    }
    from = to + 1;
    scanned++;
    if (scanned % 20 === 0) {
      console.log(`Scanned ${scanned} windows, found=${found}, next from=${from}`);
      await sleep(1000);
    }
  }
  console.log('Scan complete. Total logs found:', found);
})();
