require('dotenv').config();
const axios = require('axios');

const BZR_ADDRESS = process.env.BZR_TOKEN_ADDRESS;
const API_KEY = process.env.ETHERSCAN_V2_API_KEY;

async function checkPrice() {
    console.log('Checking price for:', BZR_ADDRESS);
    
    // 1. Etherscan
    try {
        const url = `https://api.etherscan.io/v2/api?chainid=1&module=token&action=tokeninfo&contractaddress=${BZR_ADDRESS}&apikey=${API_KEY}`;
        const response = await axios.get(url);
        if (response.data.status === '1' && response.data.result.length > 0) {
            console.log('Etherscan Price USD:', response.data.result[0].tokenPriceUSD);
        } else {
            console.log('Etherscan Price: Not found or error', response.data.message);
        }
    } catch (e) {
        console.log('Etherscan Error:', e.message);
    }

    // 2. CoinGecko
    try {
        const cgUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bazaars&vs_currencies=usd';
        const cgResponse = await axios.get(cgUrl);
        console.log('CoinGecko Price:', cgResponse.data);
    } catch (e) {
        console.log('CoinGecko Error:', e.message);
    }
}

checkPrice();
