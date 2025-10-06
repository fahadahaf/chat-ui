# Quick Reference Guide

Common commands and operations for daily development.

## 🚀 Start/Stop

```bash
# Start development server
pnpm dev

# Stop server
# Press Ctrl+C in terminal
```

## 👥 User Management

```bash
# Add new user (interactive)
./scripts/add-user.sh

# Add user (TypeScript - edit file first)
pnpm add-user

# List all users
sqlite3 prisma/dev.db "SELECT id, email, role FROM users;"

# Delete user by email
sqlite3 prisma/dev.db "DELETE FROM users WHERE email='user@example.com';"

# Count users
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM users;"
```

## 💾 Database

```bash
# View database in GUI browser
pnpm db:studio
# Opens http://localhost:5555

# Generate Prisma client
pnpm db:generate

# Create migration (after schema changes)
pnpm db:migrate

# Reset database (DELETES ALL DATA!)
pnpm db:reset

# Direct SQL query
sqlite3 prisma/dev.db "SELECT * FROM chats LIMIT 5;"
```

## 🔧 Troubleshooting

```bash
# Clear Next.js cache
rm -rf .next

# Clear cache and restart
rm -rf .next && pnpm dev

# Regenerate Prisma client
pnpm db:generate

# Full reset (if things are broken)
rm -rf node_modules .next
pnpm install
pnpm db:generate
pnpm dev
```

## 📊 Database Queries

```sql
-- List all users
SELECT * FROM users;

-- Count chats per user
SELECT user_id, COUNT(*) as chat_count 
FROM chats 
GROUP BY user_id;

-- Count messages per chat
SELECT chat_session_id, COUNT(*) as message_count 
FROM messages 
GROUP BY chat_session_id;

-- Find user by email
SELECT * FROM users WHERE email = 'admin@example.com';

-- Delete all chats for a user
DELETE FROM chats WHERE user_id = 'u_abc123';

-- View recent chats
SELECT id, session_name, created_at 
FROM chats 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔐 Password Reset

If a user forgets their password:

```bash
# 1. Generate new password hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('newpassword123', 10).then(console.log)"

# 2. Update database
sqlite3 prisma/dev.db "UPDATE users SET password_hash='PASTE_HASH_HERE' WHERE email='user@example.com';"
```

## 📁 File Locations

```
Important Files:
├── .env                              # Database URL
├── prisma/dev.db                     # SQLite database
├── prisma/schema.prisma              # Database schema
├── src/lib/server/db.ts              # Database operations
├── src/middleware.ts                 # Auth middleware
└── scripts/add-user.sh               # Add user script

Generated (gitignored):
├── node_modules/                     # Dependencies
├── .next/                            # Next.js cache
└── src/generated/prisma/             # Prisma client

Documentation:
├── README.md                         # Main documentation
├── SETUP.md                          # Complete setup guide
├── README_PRISMA.md                  # Prisma guide
├── MIGRATION_NOTES.md                # Technical migration details
├── QUICKREF.md                       # This file
└── scripts/README.md                 # User management guide
```

## 🌐 URLs

```
Frontend:          http://localhost:3000
Login:             http://localhost:3000/login
Register:          http://localhost:3000/register (disabled)
Prisma Studio:     http://localhost:5555 (when running)
RAG Service:       http://localhost:8000 (if started)
```

## 🔑 Environment Variables

```bash
# .env file
DATABASE_URL="file:./prisma/dev.db"                    # SQLite (dev)
# DATABASE_URL="postgresql://user:pass@host:5432/db"  # PostgreSQL (prod)
```

## 📦 Installation Commands

```bash
# Full setup on new machine
git clone <repo> && cd chat-ui
pnpm install
pnpm db:migrate
./scripts/add-user.sh
pnpm dev

# Update after git pull
pnpm install            # If dependencies changed
pnpm db:migrate         # If schema changed
rm -rf .next && pnpm dev  # Clear cache
```

## 🐛 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| Cannot serialize BigInt | `rm -rf .next && pnpm dev` |
| Prisma Client not found | `pnpm db:generate` |
| Database locked | Close any open connections, restart |
| Cannot find module | `rm -rf node_modules && pnpm install` |
| params.id error | Already fixed in code |
| Database not found | Check `.env` path, run `pnpm db:migrate` |

## 📊 Monitoring

```bash
# Watch database size
watch -n 2 'ls -lh prisma/dev.db'

# Monitor active connections (if issues)
lsof prisma/dev.db

# Check database integrity
sqlite3 prisma/dev.db "PRAGMA integrity_check;"
```

## 🚢 Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Run both
pnpm build && pnpm start
```

## 🔄 Backup & Restore

```bash
# Backup database
cp prisma/dev.db prisma/dev.db.backup
# Or with timestamp
cp prisma/dev.db "prisma/dev.db.$(date +%Y%m%d_%H%M%S).backup"

# Restore from backup
cp prisma/dev.db.backup prisma/dev.db

# Export to SQL
sqlite3 prisma/dev.db .dump > backup.sql

# Import from SQL
sqlite3 prisma/dev.db < backup.sql
```

## 💡 Tips

- **Development**: Use `pnpm dev` for hot reload
- **Database Changes**: Always run `pnpm db:migrate` after schema edits
- **Cache Issues**: `rm -rf .next` solves 90% of weird issues
- **User Management**: Keep admin credentials safe!
- **Backups**: Regularly backup `prisma/dev.db` before major changes

---

**Pro tip:** Bookmark this file for quick reference! 📌

