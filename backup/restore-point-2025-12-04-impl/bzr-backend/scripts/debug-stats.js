require('dotenv').config();
const axios = require('axios');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const API_KEY = process.env.ETHERSCAN_V2_API_KEY;
const CHAIN_ID = 137; // Polygon

async function testStats() {
  console.log('Testing Token Holder Count...');
  
  const params = {
    chainid: CHAIN_ID,
    apikey: API_KEY,
    module: 'token',
    action: 'tokenholdercount',
    contractaddress: BZR_ADDRESS,
  };

  try {
    const url = 'https://api.etherscan.io/v2/api';
    console.log(`Fetching from ${url}...`);
    const response = await axios.get(url, { params });
    
    console.log('Status:', response.status);
    console.log('Data Status:', response.data.status);
    console.log('Data Message:', response.data.message);
    console.log('Result (Count):', response.data.result);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testStats();
