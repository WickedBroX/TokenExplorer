// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const persistentStore = require('./src/persistentStore');
const transfersService = require('./src/services/transfersService');
const { PROVIDERS: CONFIG_PROVIDERS } = require('./src/config/chains');
const { apiLimiter } = require('./src/middleware/rateLimiters');
const adminController = require('./src/controllers/adminController');
const adminRoutes = require('./src/routes/admin.routes');
const { bootstrapConfig, getTokenAddress, getProviderApiKeys } = require('./src/services/configService');
const { bootstrapAdmin } = require('./src/controllers/adminController');

// --- Routes ---
const infoRoutes = require('./src/routes/info.routes');
const transfersRoutes = require('./src/routes/transfers.routes');
const searchRoutes = require('./src/routes/search.routes');
const statsRoutes = require('./src/routes/stats.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const holdersRoutes = require('./src/routes/holders.routes');
const healthRoutes = require('./src/routes/health.routes');
const marketRoutes = require('./src/routes/market.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Security Middleware ---
// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false,
}));

// Compression for response optimization
app.use(compression());

// CORS with origin restrictions
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  maxAge: 86400 // 24 hours
}));

app.use(express.json());
app.use(cookieParser());

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// --- Route Mounting ---
app.use('/api/admin', adminRoutes);
app.get('/api/config', adminController.publicConfig);
app.use('/api', infoRoutes);
app.use('/api', transfersRoutes);
app.use('/api', searchRoutes);
app.use('/api', statsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/holders', holdersRoutes);
app.use('/api', healthRoutes);
app.use('/api', marketRoutes);

// --- Configuration & Startup Helpers ---
const PROVIDERS = { ...CONFIG_PROVIDERS };
const TRANSFERS_DATA_SOURCE = process.env.TRANSFERS_DATA_SOURCE || 'realtime';
const CACHE_WARM_INTERVAL_MS = Number(process.env.CACHE_WARM_INTERVAL_MS || 300_000);

// --- Start Server ---
app.listen(PORT, async () => {
  console.log(`BZR Backend server listening on http://localhost:${PORT}`);

  await bootstrapAdmin();
  await bootstrapConfig();
  const apiKeys = getProviderApiKeys();

  if (!apiKeys.etherscan?.length) {
    console.warn('---');
    console.warn('WARNING: ETHERSCAN_V2_API_KEY is not set. Configure via .env or admin dashboard.');
    console.warn('---');
  } else {
    const maskedKey = '***' + apiKeys.etherscan[0].slice(-4);
    console.log(`Etherscan API key loaded successfully (${maskedKey}).`);
  }

  if (!apiKeys.cronos) {
    console.warn('---');
    console.warn('WARNING: CRONOS_API_KEY is not set. Configure via .env or admin dashboard.');
    console.warn('---');
  } else {
    const maskedKey = '***' + apiKeys.cronos.slice(-4);
    console.log(`Cronos API key loaded successfully (${maskedKey}).`);
  }

  const tokenAddress = getTokenAddress();
  if (!tokenAddress) {
    console.warn('WARNING: Token address is not configured. Set it in admin dashboard.');
  } else {
    console.log(`Tracking token: ${tokenAddress}`);
  }

  if (TRANSFERS_DATA_SOURCE === 'store' || TRANSFERS_DATA_SOURCE === 'persistent') {
    persistentStore.initPersistentStore().then((status) => {
        if (!status.enabled) {
            console.log('! Persistent store disabled (no database configuration).');
        } else if (!status.ready) {
            console.warn('! Persistent store initialization incomplete. Waiting for ingester to populate snapshots.');
        } else {
            console.log('✓ Persistent store ready for API traffic.');
        }
    }).catch((error) => {
      console.error('X Persistent store initialization failed:', error.message || error);
    });
  } else {
    console.log(`! Persistent store disabled (TRANSFERS_DATA_SOURCE=${TRANSFERS_DATA_SOURCE}).`);
  }

  if (CACHE_WARM_INTERVAL_MS > 0) {
    console.log(`Cache warming enabled (interval ${CACHE_WARM_INTERVAL_MS}ms).`);

    transfersService.triggerTransfersRefresh({ forceRefresh: true }).catch((error) => {
      console.error('X Initial transfers cache warm failed:', error.message || error);
    });

    const interval = setInterval(() => {
      transfersService.triggerTransfersRefresh().catch((error) => {
        console.error('X Scheduled transfers cache warm failed:', error.message || error);
      });
    }, CACHE_WARM_INTERVAL_MS);

    if (typeof interval.unref === 'function') {
      interval.unref();
    }
  }
});
