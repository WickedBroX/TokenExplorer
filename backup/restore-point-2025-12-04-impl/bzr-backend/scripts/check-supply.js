require('dotenv').config();
const axios = require('axios');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const API_KEY = process.env.ETHERSCAN_V2_API_KEY;

async function checkSupply() {
    console.log('Checking supply for:', BZR_ADDRESS);
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=tokensupply&contractaddress=${BZR_ADDRESS}&apikey=${API_KEY}`;
    
    try {
        const response = await axios.get(url);
        console.log('Raw Response:', response.data);
        if (response.data.status === '1') {
            const rawSupply = response.data.result;
            console.log('Raw Supply:', rawSupply);
            // Assuming 18 decimals
            const formatted = rawSupply / 1e18;
            console.log('Formatted Supply:', formatted);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSupply();
