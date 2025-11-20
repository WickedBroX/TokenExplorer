# BZR Token Explorer

A comprehensive blockchain explorer for the BZR token across multiple chains (Ethereum, Polygon, BNB Chain, Arbitrum, Base, Avalanche, Optimism, Fantom, Celo, and Cronos).

## Features

- **Multi-chain Support**: Track BZR token across 10+ blockchain networks
- **Real-time Analytics**: View transfers, holders, and token statistics
- **Advanced Search**: Search by address, transaction hash, or block number
- **Interactive Charts**: Visualize token activity and network health
- **Responsive Design**: Optimized for desktop and mobile viewing

## Tech Stack

### Frontend

- React 19 with TypeScript
- Vite (Rolldown) for blazing fast builds
- TailwindCSS for styling
- React Query for data fetching
- Recharts for data visualization

### Backend

- Node.js with Express 5
- PostgreSQL for persistent storage
- Multi-provider architecture (Etherscan, Cronos APIs)
- Response caching and rate limiting

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (optional, for persistent storage)
- API Keys (Etherscan, Cronos)

### Development

**Frontend:**

```bash
cd bzr-frontend
npm install
npm run dev
```

**Backend:**

```bash
cd bzr-backend
cp .env.example .env
# Add your API keys to .env
npm install
npm run migrate
npm run dev
```

## Deployment

See [docs/deployment/DEPLOYMENT-GUIDE.md](docs/deployment/DEPLOYMENT-GUIDE.md) for detailed deployment instructions.

Quick deploy:

```bash
./scripts/deploy-backend.sh
./scripts/deploy-frontend.sh
```

## Documentation

- [Full Documentation](docs/README.md)
- [Deployment Guide](docs/deployment/DEPLOYMENT-GUIDE.md)
- [Feature Documentation](docs/features/)

## Scripts

All deployment and utility scripts are in the `/scripts/` directory.

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the development team.
