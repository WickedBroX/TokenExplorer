# Step 1 Quick Reference Card

## 🚀 One-Command Deploy
```bash
cd /Users/wickedbro/Desktop/TokenExplorer && ./deploy-step1.sh
```

## 📋 Manual Deploy (If Script Fails)
```bash
# 1. Create directories
ssh root@159.198.70.88 "mkdir -p /var/www/bzr-backend/migrations /var/www/bzr-backend/scripts"

# 2. Upload files
scp bzr-backend/migrations/001-create-token-info.sql root@159.198.70.88:/var/www/bzr-backend/migrations/
scp bzr-backend/scripts/refresh-token-info.js root@159.198.70.88:/var/www/bzr-backend/scripts/
scp bzr-backend/server.js root@159.198.70.88:/var/www/bzr-backend/

# 3. Run migration
ssh root@159.198.70.88 "cd /var/www/bzr-backend && sudo -u postgres psql -d bzr_transfers -f migrations/001-create-token-info.sql"

# 4. Initial refresh
ssh root@159.198.70.88 "cd /var/www/bzr-backend && node scripts/refresh-token-info.js --force"

# 5. Restart service
ssh root@159.198.70.88 "systemctl restart bzr-backend.service"
```

## ✅ Verify Deployment
```bash
# Test API
curl http://159.198.70.88:3001/api/info | jq '._source'
# Should return: "database"

# Check database
ssh root@159.198.70.88 "sudo -u postgres psql -d bzr_transfers -c 'SELECT token_name, updated_at FROM token_info;'"

# Check service
ssh root@159.198.70.88 "systemctl status bzr-backend.service"
```

## ⏰ Set Up Cron Job
```bash
ssh root@159.198.70.88
mkdir -p /var/log/bzr
crontab -e
# Add: 0 * * * * cd /var/www/bzr-backend && node scripts/refresh-token-info.js >> /var/log/bzr/refresh-token-info.log 2>&1
```

## 🔍 Monitor
```bash
# Backend logs
ssh root@159.198.70.88 "journalctl -u bzr-backend.service -f"

# Refresh logs
ssh root@159.198.70.88 "tail -f /var/log/bzr/refresh-token-info.log"

# Database status
ssh root@159.198.70.88 "sudo -u postgres psql -d bzr_transfers -c 'SELECT * FROM token_info;'"
```

## 🆘 Rollback (If Needed)
```bash
ssh root@159.198.70.88
cd /var/www/bzr-backend
cp server.js.stable server.js  # If you backed it up
systemctl restart bzr-backend.service
sudo -u postgres psql -d bzr_transfers -c "DROP TABLE IF EXISTS token_info;"
```

## 🎯 Success Indicators
- ✅ API returns `"_source": "database"`
- ✅ Response time < 100ms
- ✅ No "temporarily unavailable" errors
- ✅ Service restarts don't break Info tab
- ✅ Cron job runs without errors

## 🔗 Full Documentation
- Complete guide: `STEP-1-DEPLOYMENT-GUIDE.md`
- Implementation details: `STEP-1-IMPLEMENTATION-COMPLETE.md`
