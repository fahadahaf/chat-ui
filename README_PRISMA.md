# Quick Start: SQLite with Prisma

## ✅ Migration Complete!

Your chat application now uses **SQLite with Prisma** instead of the JSON file database.

## 🚀 Getting Started

### 1. Install Dependencies (if not done)
```bash
pnpm install
```

### 2. Generate Prisma Client
```bash
pnpm prisma generate
```

### 3. Start the Development Server
```bash
pnpm dev
```

Your app will be available at: http://localhost:3000

## 📝 Creating Your First User

Since we didn't migrate data from the old JSON database, you'll need to create new users:

### Via the UI
1. Navigate to http://localhost:3000/register
2. Fill in the registration form

### Via API
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "yourpassword",
    "name": "Admin User",
    "role": "admin"
  }'
```

## 🔍 Inspect Database

View your database in Prisma Studio (graphical interface):
```bash
pnpm prisma studio
```

Or use sqlite3 CLI:
```bash
sqlite3 dev.db
.tables           # List tables
.schema users     # View users table schema
SELECT * FROM users;  # Query users
```

## 🛠️ Useful Commands

```bash
# Regenerate Prisma Client after schema changes
pnpm prisma generate

# Create new migration after changing schema
pnpm prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Format Prisma schema
pnpm prisma format
```

## 📂 Important Files

- `prisma/schema.prisma` - Database schema definition
- `src/lib/server/db.ts` - Database operations (Prisma-based)
- `.env` - Contains DATABASE_URL
- `dev.db` - SQLite database file (gitignored)

## 🔄 Switching Back to JSON (if needed)

If you need to revert to the JSON database:
```bash
# Restore old files
mv src/lib/server/db-json-backup.ts src/lib/server/db.ts
mv data/db-backup.json data/db.json

# Uninstall Prisma
pnpm remove prisma @prisma/client

# Remove Prisma files
rm -rf prisma src/generated
```

## 📖 Learn More

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

## 🎯 What's Different?

### Before (JSON)
```typescript
const db = readDB()
const user = db.users.find(u => u.email === email)
writeDB(db)
```

### After (Prisma)
```typescript
const user = await getUserByEmail(email)
// Data is automatically saved
```

**Benefits:**
- ✅ Async operations don't block
- ✅ Type-safe queries
- ✅ Automatic data persistence
- ✅ Better error handling
- ✅ Supports relationships & constraints
- ✅ Easy to migrate to PostgreSQL later

---

**Happy coding! 🎉**

