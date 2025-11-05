# Quick Reference - Page Size & Fixes Update

**Backup Created**: November 5, 2025  
**Location**: `/Users/wickedbro/Desktop/TokenExplorer/backup/checkpoints/2025-11-05-page-size-and-fixes/`  
**Size**: 301 MB

---

## 🎯 What's New

### 1. Page Size Changes ✅
- **Default**: 25 → **10** items per page
- **Maximum**: 25 (removed 50 & 100 options)
- **Applies to**: Transfers & Holders tabs

### 2. Info Tab Robustness ✅
- **Fixed**: Total Supply not showing
- **Added**: Self-healing fetch mechanism
- **Added**: Auto-refresh on tab switch
- **Added**: Manual retry button
- **Added**: Cache-busting headers

### 3. Search Icon Fix ✅
- **Fixed**: Vertical centering alignment
- **Improved**: Visual consistency

---

## 🚀 Quick Commands

### Deploy Frontend
```bash
cd /Users/wickedbro/Desktop/TokenExplorer/bzr-frontend
npm run build
rsync -avz --delete ./dist/ root@159.198.70.88:/var/www/bzr-frontend/
```

### Restore from Backup
```bash
cd /Users/wickedbro/Desktop/TokenExplorer/backup/checkpoints/2025-11-05-page-size-and-fixes/bzr-frontend
npm install
npm run build
rsync -avz --delete ./dist/ root@159.198.70.88:/var/www/bzr-frontend/
```

### Test API
```bash
curl -s "https://haswork.dev/api/info" | python3 -m json.tool
```

---

## ✅ Current Status

**URL**: https://haswork.dev

### Working Features
- ✅ Total Supply: 55,555,555 BZR
- ✅ Total Holders: ~2,993
- ✅ Page Size: Default 10, Max 25
- ✅ Analytics: Auto-loads 500 transfers
- ✅ Info Tab: Self-healing with retry
- ✅ Search Icon: Properly centered

### Configuration
- **3 Etherscan API Keys** (load-balanced)
- **2 Cronos API Keys** (active + backup)
- **Rate Limits**: 500 req/15min, 30 req/min strict
- **Backend**: Node v20.19.5 on port 3001

---

## 📦 Backup Contents

```
2025-11-05-page-size-and-fixes/
├── CHECKPOINT-NOTES.md (detailed documentation)
├── QUICK-REFERENCE.md (this file)
├── bzr-backend/ (complete backend)
└── bzr-frontend/ (complete frontend)
```

---

## 🔧 Key File Changes

### Frontend
- `src/hooks/useTokenData.ts`: Default page sizes 10
- `src/App.tsx`: Page options [10, 25], info retry, search icon

### Backend
- No changes (stable)

---

## 📊 Performance

- **Bundle**: 90.08 KB (gzipped: 20.72 KB)
- **Load Time**: ~1-2 seconds
- **API Response**: <500ms

---

**Status**: ✅ Production Ready  
**Last Deployed**: November 5, 2025  
**Next Backup**: After significant changes
