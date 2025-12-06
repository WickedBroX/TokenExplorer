require('dotenv').config();
const axios = require('axios');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const API_KEY = process.env.ETHERSCAN_V2_API_KEY;
const CHAIN_ID = 137; // Polygon

async function testTransfers() {
  console.log('Testing Transfers Fetching...');
  
  const params = {
    chainid: CHAIN_ID,
    apikey: API_KEY,
    module: 'account',
    action: 'tokentx',
    contractaddress: BZR_ADDRESS,
    page: 1,
    offset: 25,
    sort: 'desc'
  };

  try {
    const url = 'https://api.etherscan.io/v2/api';
    console.log(`Fetching from ${url}...`);
    const response = await axios.get(url, { params });
    
    console.log('Status:', response.status);
    
    if (response.data.status === '1' && Array.isArray(response.data.result)) {
      console.log('Transfers Found:', response.data.result.length);
      if (response.data.result.length > 0) {
        console.log('First Transfer:', response.data.result[0]);
      }
    } else {
      console.log('Error/Status:', response.data.status);
      console.log('Message:', response.data.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTransfers();
