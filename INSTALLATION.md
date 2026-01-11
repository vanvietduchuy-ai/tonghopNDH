# Hướng dẫn Cài đặt và Triển khai

## 📦 Cài đặt Dependencies

### 1. Install packages:
```bash
npm install
```

### 2. Thêm dependencies mới (nếu chưa có):
```bash
npm install @netlify/functions @neondatabase/serverless
```

## 🔧 Cấu hình

### 1. Environment Variables

Tạo file `.env` trong root folder:

```env
# Neon Database URL
DATABASE_URL=postgresql://user:password@host/database
# hoặc
NETLIFY_DATABASE_URL=postgresql://user:password@host/database

# TTL Configuration (optional)
TTL_DAYS=3
SYNC_INTERVAL_MINUTES=2
CLEANUP_SCHEDULE="0 2 * * *"
```

### 2. Netlify Configuration

File `netlify.toml` đã được tạo sẵn:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[plugins]]
  package = "@netlify/plugin-nextjs"

# Scheduled cleanup function
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

[build.environment]
  NODE_VERSION = "18"
```

### 3. TypeScript Configuration

File `tsconfig.json` cần include functions:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx"
  },
  "include": [
    "src/**/*",
    "services/**/*",
    "netlify/functions/**/*"
  ]
}
```

## 🚀 Triển khai

### Option 1: Netlify Deploy (Recommended)

#### Bước 1: Kết nối Git Repository
```bash
# Push code lên GitHub/GitLab
git add .
git commit -m "Add sync with TTL"
git push origin main
```

#### Bước 2: Deploy trên Netlify
1. Đăng nhập vào [Netlify](https://netlify.com)
2. Click "New site from Git"
3. Chọn repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy site"

#### Bước 3: Enable Neon Integration
1. Vào Site settings → Integrations
2. Tìm "Neon" hoặc add database manually
3. Set environment variable `DATABASE_URL`

#### Bước 4: Enable Scheduled Functions
1. Vào Site settings → Functions
2. Enable "Background Functions"
3. Scheduled function `cleanup-tasks` sẽ tự động chạy

### Option 2: Manual Deploy

```bash
# Build
npm run build

# Deploy manually
netlify deploy --prod

# Hoặc dùng Netlify CLI
netlify init
netlify deploy
```

## 🔨 Development

### 1. Local Development

```bash
# Start dev server
npm run dev

# Hoặc với Netlify CLI (để test functions)
netlify dev
```

### 2. Test Functions Locally

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run local dev server với functions
netlify dev

# Test specific function
curl -X POST http://localhost:8888/.netlify/functions/db-v2 \
  -H "Content-Type: application/json" \
  -d '{"action":"getSyncStats"}'
```

### 3. Environment Variables cho Local

Tạo `.env` file:
```env
DATABASE_URL=postgresql://localhost/taskdb
```

Netlify CLI sẽ tự động load từ `.env`

## ✅ Verification

### 1. Kiểm tra Database Connection

```bash
# Test init
curl -X POST https://your-site.netlify.app/.netlify/functions/db-v2 \
  -H "Content-Type: application/json" \
  -d '{"action":"init"}'

# Expected: {"success":true,"message":"Database initialized"}
```

### 2. Kiểm tra Cleanup Function

```bash
# Test cleanup
curl -X POST https://your-site.netlify.app/.netlify/functions/db-v2 \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup"}'

# Expected: {"success":true,"deletedCount":0,"message":"Cleaned up 0 tasks"}
```

### 3. Kiểm tra Sync Stats

```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/db-v2 \
  -H "Content-Type: application/json" \
  -d '{"action":"getSyncStats"}'

# Expected: {"totalTasks":0,"oldTasks":0,"ttlDays":3,"nextCleanup":"..."}
```

### 4. Kiểm tra Scheduled Function

Vào Netlify Dashboard → Functions → cleanup-tasks
- Status: Enabled
- Schedule: 0 2 * * * (Daily at 2 AM)
- Last run: (timestamp)

## 🔍 Monitoring

### 1. Netlify Functions Logs

```bash
# Xem logs realtime
netlify functions:logs

# Hoặc trên dashboard
# Site → Functions → [function-name] → Logs
```

### 2. Database Monitoring

```sql
-- Kiểm tra số lượng tasks
SELECT COUNT(*) FROM tasks;

-- Kiểm tra tasks sắp hết TTL
SELECT id, title, synced_at, 
       (EXTRACT(EPOCH FROM NOW()) * 1000 - synced_at) / (24 * 60 * 60 * 1000) as days_old
FROM tasks
WHERE synced_at < (EXTRACT(EPOCH FROM NOW()) * 1000 - 2 * 24 * 60 * 60 * 1000)
ORDER BY synced_at;

-- Kiểm tra users
SELECT COUNT(*) FROM users;
```

### 3. Client-side Monitoring

Trong browser console:
```javascript
// Xem sync stats
const stats = SyncDB.getSyncStats();
console.log(stats);

// Force sync và xem kết quả
await SyncDB.bidirectionalSync();

// Kiểm tra LocalStorage
console.log('Tasks:', localStorage.getItem('app_tasks_v2'));
console.log('Users:', localStorage.getItem('app_users_v2'));
```

## 🐛 Troubleshooting

### Lỗi: "DATABASE_URL not configured"

**Nguyên nhân**: Chưa set environment variable

**Giải pháp**:
1. Vào Netlify → Site settings → Environment variables
2. Add `DATABASE_URL` hoặc `NETLIFY_DATABASE_URL`
3. Redeploy site

### Lỗi: "Sync failed"

**Kiểm tra**:
1. Network tab trong DevTools
2. Function logs trên Netlify
3. Database connection

**Giải pháp**:
```javascript
// Clear cache và retry
SyncDB.clearLocalData();
await SyncDB.initialize();
```

### Lỗi: "LocalStorage full"

**Nguyên nhân**: Quá nhiều tasks (>5MB)

**Giải pháp**:
```javascript
// Auto cleanup sẽ chạy
// Hoặc manual cleanup
const tasks = SyncDB.getTasks();
console.log(`Total tasks: ${tasks.length}`);

// Xóa tasks cũ hơn 90 ngày
const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
const cleaned = tasks.filter(t => t.createdAt > cutoff);
localStorage.setItem('app_tasks_v2', JSON.stringify(cleaned));
```

### Lỗi: Scheduled function không chạy

**Kiểm tra**:
1. Netlify → Site settings → Functions → Background functions: Enabled
2. Function file có syntax error không
3. Logs của scheduled function

**Giải pháp**:
- Redeploy site
- Check function syntax
- Manual trigger cleanup:
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/db-v2 \
  -d '{"action":"cleanup"}'
```

## 📊 Performance Tuning

### 1. Giảm Sync Frequency

Trong `syncService.ts`:
```typescript
const SYNC_INTERVAL = 5 * 60 * 1000; // Tăng lên 5 phút
```

### 2. Batch Operations

```typescript
// Thay vì sync từng task
for (const task of tasks) {
  await NeonDB.saveTask(task); // Chậm
}

// Dùng batch
await NeonDB.batchSaveTasks(tasks); // Nhanh hơn
```

### 3. Selective Sync

```typescript
// Chỉ sync tasks mới/updated
const recentTasks = tasks.filter(t => 
  t.createdAt > lastSyncTime
);
await NeonDB.batchSaveTasks(recentTasks);
```

## 🔐 Security Best Practices

### 1. Mã hóa Password

Thêm bcrypt:
```bash
npm install bcryptjs
```

```typescript
import bcrypt from 'bcryptjs';

// Khi tạo user
const hashedPassword = await bcrypt.hash(password, 10);

// Khi login
const isValid = await bcrypt.compare(password, user.password);
```

### 2. Environment Variables

❌ **Không bao giờ** commit `.env` file

✅ Dùng Netlify environment variables

### 3. CORS Configuration

Trong function:
```typescript
const headers = {
  'Access-Control-Allow-Origin': 'https://your-domain.com', // Specific domain
  // Thay vì '*'
};
```

## 🎯 Next Steps

1. ✅ Deploy lên Netlify
2. ✅ Enable Neon integration
3. ✅ Test sync functionality
4. ✅ Monitor logs
5. ✅ Setup alerts
6. 🔄 Optimize performance
7. 🔒 Add security layers

---

**Happy Coding! 🚀**
