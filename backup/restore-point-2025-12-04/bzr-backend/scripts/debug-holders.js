require('dotenv').config();
const axios = require('axios');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const API_KEY = process.env.ETHERSCAN_V2_API_KEY;
const CHAIN_ID = 137; // Polygon

async function testHolders() {
  console.log('Testing Holders Fetching...');
  console.log('Token Address:', BZR_ADDRESS);
  console.log('API Key Present:', !!API_KEY);

  if (!API_KEY) {
    console.error('Error: ETHERSCAN_V2_API_KEY is missing in .env');
    return;
  }

  const url = 'https://api.etherscan.io/v2/api';
  const params = {
    chainid: CHAIN_ID,
    apikey: API_KEY,
    module: 'token',
    action: 'tokenholderlist',
    contractaddress: BZR_ADDRESS,
    page: 1,
    offset: 50,
  };

  try {
    console.log(`Fetching from ${url}...`);
    const response = await axios.get(url, { params });
    
    console.log('Status:', response.status);
    console.log('Data Status:', response.data.status);
    console.log('Data Message:', response.data.message);
    
    if (response.data.result && Array.isArray(response.data.result)) {
      console.log('Holders Found:', response.data.result.length);
      if (response.data.result.length > 0) {
        console.log('First Holder:', response.data.result[0]);
      }
    } else {
      console.log('Result:', response.data.result);
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response Data:', error.response.data);
    }
  }
}

testHolders();
