# Database Migration: JSON → SQLite with Prisma

## Overview
This branch (`feature/sqldb`) migrates the database from a simple JSON file to SQLite using Prisma ORM.

## What Changed

### 1. **Database Backend**
- **Before**: JSON file at `data/db.json`
- **After**: SQLite database at `dev.db` (managed by Prisma)

### 2. **Database Module**
- **Before**: `src/lib/server/db.ts` with `readDB()` and `writeDB()` functions
- **After**: `src/lib/server/db.ts` with individual async functions for each operation
  - `getUserByEmail()`, `getUserById()`, `createUser()`
  - `getChatsByUserId()`, `getChatById()`, `createChat()`, `updateChatSessionName()`, `deleteChat()`
  - `getMessagesByChatId()`, `createMessage()`

### 3. **API Routes Updated**
All API routes now use the new async database functions:
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/me`
- `/api/chats` (GET, POST)
- `/api/chats/[id]` (PATCH, DELETE)
- `/api/chats/[id]/messages` (GET, POST)

### 4. **New Dependencies**
- `@prisma/client@6.16.3`
- `prisma@6.16.3`
- `bcryptjs@3.0.2`

### 5. **Backup Files Created**
- `data/db-backup.json` - Original JSON database
- `src/lib/server/db-json-backup.ts` - Original database module

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### Chats Table
```sql
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  session_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  chat_session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  extra_data TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (chat_session_id) REFERENCES chats(id) ON DELETE CASCADE
);
```

## Prisma Setup

### Location
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Generated client: `src/generated/prisma/` (gitignored)

### Environment Variables
```bash
DATABASE_URL="file:./dev.db"
```

## Development Commands

```bash
# Generate Prisma Client after schema changes
pnpm prisma generate

# Create a new migration
pnpm prisma migrate dev --name <migration_name>

# View database in Prisma Studio
pnpm prisma studio

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset
```

## Testing

To test the migration:

1. **Start the dev server**:
   ```bash
   pnpm dev
   ```

2. **Test user registration**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","role":"user"}'
   ```

3. **Test login**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}' \
     -c cookies.txt
   ```

4. **Test creating a chat**:
   ```bash
   curl -X POST http://localhost:3000/api/chats \
     -H "Content-Type: application/json" \
     -d '{"provider":"ollama"}' \
     -b cookies.txt
   ```

## Benefits of This Migration

1. **Better Performance**: SQLite is faster than reading/writing JSON files
2. **Concurrent Access**: SQLite handles concurrent reads/writes properly
3. **Data Integrity**: Foreign keys and constraints ensure data consistency
4. **Type Safety**: Prisma provides TypeScript types for all database operations
5. **Migrations**: Schema changes are tracked and versioned
6. **Query Flexibility**: Prisma makes complex queries easier to write
7. **Production Ready**: Easy to switch to PostgreSQL/MySQL later if needed

## Notes

- The old JSON database is preserved in `data/db-backup.json`
- No data was migrated - you'll need to create new users/chats
- The API interface remains the same, so frontend code doesn't need changes
- Database file (`dev.db`) is gitignored and should not be committed

