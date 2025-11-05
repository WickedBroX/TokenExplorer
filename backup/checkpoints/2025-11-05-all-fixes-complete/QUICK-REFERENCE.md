# Quick Reference - BZR Token Explorer

## 🚀 Backup Created: November 5, 2025

### Location
`/Users/wickedbro/Desktop/TokenExplorer/backup/checkpoints/2025-11-05-all-fixes-complete/`

### Size
301 MB (complete frontend + backend)

---

## ✅ What's Included

### Backend
- API key load balancing (3 Etherscan keys)
- Rate limiting optimizations
- Smart caching system
- All endpoints working

### Frontend
- Analytics with 500 transfer history
- Page size auto-reset
- Mobile responsive design
- Loading states & error handling
- Cache-busting headers

---

## 🎯 Production Status

**URL**: https://haswork.dev
**Backend**: 159.198.70.88:3001
**Status**: ✅ All Systems Operational

### Verified Working:
- ✅ Total Supply: 55,555,555 BZR
- ✅ Total Holders: 2,993
- ✅ All 4 tabs functional
- ✅ Mobile responsive
- ✅ API key rotation active
- ✅ Smart caching enabled

---

## 📝 Quick Deploy

### Frontend Only
```bash
cd /Users/wickedbro/Desktop/TokenExplorer/bzr-frontend
npm run build
rsync -avz --delete dist/ root@159.198.70.88:/var/www/bzr-frontend/
```

### Backend Only
```bash
rsync -avz bzr-backend/server.js root@159.198.70.88:/var/www/bzr-backend/
ssh root@159.198.70.88 "cd /var/www/bzr-backend && pkill -f 'node server.js' && /root/.nvm/versions/node/v20.19.5/bin/node server.js > /var/log/bzr-backend.log 2>&1 &"
```

### Full Restore
```bash
cd /Users/wickedbro/Desktop/TokenExplorer
rsync -avz backup/checkpoints/2025-11-05-all-fixes-complete/bzr-backend/ root@159.198.70.88:/var/www/bzr-backend/
rsync -avz backup/checkpoints/2025-11-05-all-fixes-complete/bzr-frontend/dist/ root@159.198.70.88:/var/www/bzr-frontend/
```

---

## 🔧 API Keys Configured

### Etherscan (3 keys - load balanced)
- Key 1: I9JQANQB94N685X8EAAM1PDZ35RFXWHTXN
- Key 2: CTC8P9QQ7D1URESC65MHMDN524WMACMTDT
- Key 3: QHFCHIS2DGPF48W8NIBNRG4PXMCMU9ZJ35

### Cronos (2 keys)
- Primary: zfoEWwfiXGimZwH6J36kfZjKO2ID4eZI
- Backup: OAyFepAJ0y0WmnHDARAG8GWLYXXOCRvp

---

## 📊 Performance

- Bundle: 88.6 KB (gzipped: 20.5 KB)
- Load Time: ~1-2 seconds
- API Response: <500ms
- Rate Limit: 500 req/15min

---

## 🐛 If Issues Occur

### Clear All Caches
```bash
# Browser: Hard refresh (Cmd+Shift+R)

# Backend cache
ssh root@159.198.70.88 "cd /var/www/bzr-backend && pkill -f 'node server.js' && sleep 2 && /root/.nvm/versions/node/v20.19.5/bin/node server.js > /var/log/bzr-backend.log 2>&1 &"

# Nginx cache
ssh root@159.198.70.88 "rm -rf /var/cache/nginx/* && nginx -s reload"
```

### Check Backend Logs
```bash
ssh root@159.198.70.88 "tail -100 /var/log/bzr-backend.log"
```

### Test APIs
```bash
curl -s https://haswork.dev/api/info | python3 -m json.tool
curl -s https://haswork.dev/api/stats | python3 -m json.tool
```

---

## 📦 Backup Contents

```
2025-11-05-all-fixes-complete/
├── CHECKPOINT-NOTES.md (detailed documentation)
├── QUICK-REFERENCE.md (this file)
├── bzr-backend/ (complete backend code)
│   ├── server.js
│   ├── .env
│   ├── package.json
│   └── ... (all backend files)
└── bzr-frontend/ (complete frontend code)
    ├── src/
    ├── public/
    ├── dist/ (built files)
    └── ... (all frontend files)
```

---

**Last Updated**: November 5, 2025
**Status**: ✅ Production Ready
**Next Backup**: When significant changes are made
