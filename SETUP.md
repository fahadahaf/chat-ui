# Complete Setup Guide

This guide covers setting up the Chat UI application on a fresh machine.

## Prerequisites Check

Before starting, ensure you have:

```bash
# Check Node.js version (need 18+)
node --version

# Check Python version (need 3.10+)
python --version

# Check pnpm (or install it)
pnpm --version

# SQLite is usually pre-installed, check with:
sqlite3 --version
```

---

## Fresh Installation (Step-by-Step)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd chat-ui
```

### Step 2: Install Node Dependencies
```bash
pnpm install
```

**What this does:**
- Installs all npm packages
- Automatically runs `prisma generate` (via postinstall script)
- Creates `node_modules/` directory
- Generates Prisma client in `src/generated/prisma/`

### Step 3: Setup Database
```bash
pnpm db:migrate
```

**What this does:**
- Creates `prisma/dev.db` SQLite database
- Runs all migrations from `prisma/migrations/`
- Creates tables: users, chats, messages
- Your database is now ready!

### Step 4: Create Admin User
```bash
./scripts/add-user.sh
```

Enter when prompted:
- Email: `admin@example.com`
- Password: (your secure password)
- Name: `Admin User` (optional)
- Role: `admin`

### Step 5: Start Development Server
```bash
pnpm dev
```

Open http://localhost:3000 and login!

---

## What Gets Installed

### NPM Dependencies (package.json)
```json
{
  "dependencies": {
    "@prisma/client": "^6.16.3",    // Prisma ORM client
    "prisma": "^6.16.3",             // Prisma CLI
    "bcryptjs": "3.0.2",             // Password hashing
    "next": "15.2.3",                // Next.js framework
    "react": "^18.3.1",              // React
    // ... and more UI libraries
  },
  "devDependencies": {
    "tsx": "^4.20.6",                // TypeScript executor
    "typescript": "^5",              // TypeScript
    // ... and more dev tools
  }
}
```

### Database Setup
When you run `pnpm db:migrate`:
1. Creates `prisma/dev.db` (SQLite database file)
2. Creates `prisma/migrations/` (migration history)
3. Generates `src/generated/prisma/` (TypeScript types)

### Files Created
```
chat-ui/
├── node_modules/          # NPM packages (gitignored)
├── .next/                 # Next.js build cache (gitignored)
├── prisma/
│   ├── dev.db            # SQLite database (gitignored)
│   └── migrations/       # Migration history
└── src/generated/prisma/ # Generated Prisma client (gitignored)
```

---

## Clone on Different Machine

When you clone this repo on a new machine, here's what happens:

### Files Included in Git
✅ **Source code** (`src/`, `prisma/schema.prisma`)
✅ **Configuration** (`.env`, `package.json`, `tsconfig.json`)
✅ **Scripts** (`scripts/add-user.sh`, etc.)
✅ **Documentation** (`README.md`, `README_PRISMA.md`, etc.)
✅ **Migration files** (`prisma/migrations/`)

### Files NOT Included (Generated/Gitignored)
❌ `node_modules/` - Install with `pnpm install`
❌ `prisma/dev.db` - Create with `pnpm db:migrate`
❌ `src/generated/prisma/` - Generate with `prisma generate` (auto-runs)
❌ `.next/` - Build cache, regenerates automatically
❌ User data - Create users with `./scripts/add-user.sh`

### Installation Commands
```bash
# 1. Clone
git clone <repo-url> && cd chat-ui

# 2. Install (this also runs prisma generate automatically)
pnpm install

# 3. Create database
pnpm db:migrate

# 4. Add user
./scripts/add-user.sh

# 5. Run
pnpm dev
```

**That's it!** The app will work exactly the same on any machine.

---

## Production Deployment

### Option 1: Same Machine
```bash
pnpm build
pnpm start
```

### Option 2: Docker (Future)
Coming soon - will include Docker setup for containerized deployment.

### Option 3: Vercel/Netlify
For these platforms:
1. Connect GitHub repository
2. Set build command: `pnpm build`
3. Set start command: `pnpm start`
4. Add environment variables if needed
5. Note: You'll need to switch from SQLite to PostgreSQL for these platforms

---

## Switching to PostgreSQL (Production)

SQLite is great for development but for production, use PostgreSQL:

### 1. Update `.env`
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/chatdb"
```

### 2. Update `prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 3. Create new migration
```bash
pnpm db:migrate
```

Everything else stays the same!

---

## Verifying Installation

### Check Database
```bash
# View database structure
pnpm db:studio
# Opens http://localhost:5555

# Or use sqlite3
sqlite3 prisma/dev.db ".tables"
sqlite3 prisma/dev.db "SELECT * FROM users;"
```

### Check Prisma Client
```bash
# Should show version and success
pnpm db:generate
```

### Check Next.js
```bash
# Should compile without errors
pnpm build
```

---

## Common Installation Issues

### 1. "prisma command not found"
**Solution:** Run `pnpm install` again, Prisma should install globally in your node_modules

### 2. "Cannot find @prisma/client"
**Solution:** 
```bash
pnpm db:generate
rm -rf .next
pnpm dev
```

### 3. "Database file not found"
**Solution:**
```bash
pnpm db:migrate
```

### 4. "postinstall script failed"
**Solution:** This is usually okay - manually run:
```bash
pnpm db:generate
```

---

## Development Workflow

### Daily Development
```bash
pnpm dev              # Start dev server
```

### After Pulling Changes
```bash
pnpm install          # If package.json changed
pnpm db:migrate       # If schema changed
rm -rf .next && pnpm dev  # If having issues
```

### After Schema Changes
```bash
pnpm db:migrate       # Create migration
pnpm db:generate      # Regenerate client
```

---

## Questions?

- **Database issues?** See `README_PRISMA.md`
- **User management?** See `scripts/README.md`
- **General setup?** See `README.md`
- **Migration details?** See `MIGRATION_NOTES.md`

---

**Your app is production-ready with proper database setup!** 🚀

