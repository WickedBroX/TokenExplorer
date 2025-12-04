const statsService = require('../services/statsService');
const { respondUpstreamFailure } = require('../utils/apiUtils');

const getStats = async (req, res) => {
  console.log(`[${new Date().toISOString()}] Received request for /api/stats`);
  
  try {
    const stats = await statsService.getAggregatedStats();
    res.json(stats);
  } catch (error) {
    console.error('Error in /api/stats handler:', error.message);
    if (error.response?.data) {
      return respondUpstreamFailure(res, 'Failed to fetch token holder stats from Etherscan', {
        upstreamResponse: error.response.data,
      });
    }

    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

module.exports = {
  getStats,
};
