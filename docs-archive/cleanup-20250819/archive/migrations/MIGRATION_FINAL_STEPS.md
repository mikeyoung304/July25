# Final Migration Steps

## ✅ Completed by Claude:
- [x] Cleaned up all .env files
  - Removed duplicate client/.env and client/.env.local
  - Removed duplicate VITE_OPENAI_API_KEY from root .env
  - Updated server/.env with cloud DATABASE_URL placeholder
- [x] Fixed port 3002 references in frontend code
  - All WebSocket and API calls now use port 3001
- [x] Removed AI Gateway configuration
  - Environment configuration is clean
- [x] Updated all hardcoded URLs to use port 3001

## 📋 Manual Steps Required:

### 1. Get Your Database URL
1. Go to https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt
2. Click Settings → Database
3. Under "Connection string", select "URI"
4. Copy the entire connection string

### 2. Update server/.env
Replace `DATABASE_URL=REPLACE_WITH_SUPABASE_CLOUD_URL` with your actual connection string.

### 3. Pull Database Schema
```bash
cd /Users/mikeyoung/CODING/rebuild-6.0
supabase db pull --db-url "YOUR_DATABASE_URL"
```

### 4. Verify Everything Works
```bash
npm run dev
```

Test:
- Voice ordering in Kiosk page
- Voice ordering in Drive-thru page
- All API calls should work on port 3001

### 5. Cleanup (Optional)
- Archive or delete `_archive_old_scripts/` directory
- Remove any `.md` files referencing old architecture
- Update `MIGRATION_REPORT.md` as it contains outdated information

## 🎉 Migration Complete!

Once you've added your DATABASE_URL and pulled the schema, your migration to cloud-only Supabase is complete. All services are unified on port 3001, and there are no more references to the old microservices architecture.