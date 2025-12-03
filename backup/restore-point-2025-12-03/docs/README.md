# TokenExplorer Documentation

Comprehensive documentation for the BZR Token Explorer project.

## Quick Links

- [Project README](../README.md)
- [Deployment Guide](deployment/DEPLOYMENT-GUIDE.md)

## Directory Structure

### `/archive/`

Historical documentation from previous development phases. Useful for understanding project evolution but not needed for current development.

### `/deployment/`

Deployment guides, infrastructure setup, and deployment scripts documentation.

### `/features/`

Feature-specific design documents, implementation plans, and technical specifications.

## Getting Started

1. See main [README.md](../README.md) for project overview
2. Check [DEPLOYMENT-GUIDE.md](deployment/DEPLOYMENT-GUIDE.md) for deployment instructions
3. Review feature docs in `/features/` for specific functionality

## Scripts

Deployment and utility scripts have been moved to `/scripts/` directory:

- `deploy-backend.sh` - Deploy backend to production
- `deploy-frontend.sh` - Deploy frontend to production
- `test-search.sh` - Test search functionality

## Contributing

When adding new documentation:

- Place feature specs in `/features/`
- Place deployment docs in `/deployment/`
- Move completed phase docs to `/archive/`
- Keep the root README.md concise
