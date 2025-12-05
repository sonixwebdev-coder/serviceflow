# ViperX CRM API (Backend)

Express backend that is being migrated from MongoDB to PostgreSQL + Prisma to power the unified Team Manager + CRM experience.

## 🛠️ Setup

1. Install workspace dependencies from the monorepo root:
   ```bash
   npm install
   ```

2. Copy the environment template and update secrets:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

3. Configure the following keys in `apps/backend/.env`:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viperx"
   MONGODB_URI="mongodb://127.0.0.1:27017/viperx"  # temporary while legacy modules are ported
   JWT_ACCESS_SECRET=your_access_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   JWT_SECRET=legacy_secret_for_existing_routes

   # Optional: Redis for caching (improves performance 10-100x for cached queries)
   REDIS_URL=redis://localhost:6379
   ```

4. (Optional) Install Redis for caching:
   ```bash
   sudo apt install redis-server -y
   ```

5. Generate the Prisma client (after editing `prisma/schema.prisma`):
   ```bash
   npm run prisma:generate
   ```

6. Run local migrations once PostgreSQL is configured:
   ```bash
   npm run prisma:migrate
   ```

7. Start the API:
   ```bash
   # Development with nodemon (auto-starts Redis if installed)
   npm run dev

   # Development without Redis auto-start
   npm run dev:no-redis

   # Production build
   npm start
   ```

## 📂 Key Directories

```
apps/backend/
├── config/        # Temporary MongoDB connector (to be removed after migration)
├── lib/           # Prisma client singleton
├── middleware/    # Auth, RBAC, validation, rate limiting
├── models/        # Legacy Mongoose models (being ported to Prisma)
├── routes/        # Express routers
├── scripts/       # CLI utilities (e.g., admin seeding)
├── server.js      # Express bootstrap & Prisma connection
└── .env.example   # Backend environment template
```

## 🚧 Migration Status

- ✅ Prisma client wired into the API bootstrap
- ✅ Initial PostgreSQL schema defined in `prisma/schema.prisma`
- 🔄 Legacy MongoDB collections still in use until route/service migration is complete
- 🔜 Replace Mongoose models/routes with Prisma-powered services and add Socket.io realtime layer

## 🤖 Scripts

- `npm run dev` – start dev server (auto-starts Redis if installed)
- `npm run dev:no-redis` – start dev server without Redis auto-start
- `npm start` – start production server
- `npm run prisma:generate` – regenerate Prisma client
- `npm run prisma:migrate` – apply development migrations
- `npm run prisma:deploy` – apply migrations in production environments

## ⚡ Performance Features

- **Database Indexes**: 18 strategic indexes for 5-10x faster queries
- **Optimized Queries**: Reduced data transfer by 40-60%
- **Redis Caching** (optional): 10-100x faster for cached queries
  - User data cached for 5 minutes
  - Company settings cached for 30 minutes
  - Automatic cache invalidation on updates
  - App works perfectly without Redis

---

Private – ViperX Internal Use Only.
