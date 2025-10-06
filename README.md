# Chat UI with RAG and Local Auth (MIT)

A Next.js chat UI with:
- Ollama or Amazon (JumpStart) backends to run the LLM
- Python FastAPI service for RAG planning (YAML → plan → dummy table results)
- Local email/password auth with SQLite database, role-gated admin controls

## Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind, Sonner, Zustand
- **Backend (Node)**: Next.js API routes with Prisma + SQLite
- **Backend (Python)**: FastAPI RAG service with ChromaDB (optional) and sentence-transformers

## Prerequisites
- **Node.js** 18+ (with pnpm, npm, or yarn)
- **Python** 3.10+ (for RAG service)
- **SQLite** (usually pre-installed on most systems)

### Install pnpm (if not installed):
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## 🚀 Quick Start (Fresh Installation)

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd chat-ui

# Install Node.js dependencies (automatically runs prisma generate)
pnpm install
```

### 2. Setup Database
```bash
# Create database and run migrations
pnpm db:migrate

# The database will be created at: prisma/dev.db
```

### 3. Create Your First User
Since registration is disabled for security, you need to manually create users:

```bash
# Interactive script (recommended)
./scripts/add-user.sh

# Or using TypeScript (edit scripts/add-user.ts first)
pnpm add-user
```

**Example:**
- Email: `admin@example.com`
- Password: `your-secure-password`
- Role: `admin` or `user`

### 4. Start Development Server
```bash
pnpm dev
```

Open `http://localhost:3000` and login with your credentials!

---

## 📁 Project Structure

```
chat-ui/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── dev.db                 # SQLite database (gitignored)
├── scripts/
│   ├── add-user.sh            # Add user (interactive)
│   ├── add-user.ts            # Add user (TypeScript)
│   └── README.md              # User management guide
├── src/
│   ├── app/api/               # API routes
│   ├── lib/server/db.ts       # Database operations (Prisma)
│   └── middleware.ts          # Auth middleware
├── .env                       # Database URL (committed for SQLite)
└── README_PRISMA.md           # Detailed Prisma guide
```

---

## 🔐 Authentication & User Management

### Login
- Navigate to `/login`
- Use email and password created via scripts

### Adding Users
Registration is disabled by default. Admins must add users manually:

**Method 1: Interactive Shell Script**
```bash
./scripts/add-user.sh
```

**Method 2: TypeScript Script**
```bash
# Edit scripts/add-user.ts with user details
pnpm add-user
```

**Method 3: Direct SQL**
```bash
# Generate password hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('password123', 10).then(console.log)"

# Insert user
sqlite3 prisma/dev.db "INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES ('u_admin1', 'admin@example.com', 'Admin', 'PASTE_HASH_HERE', 'admin', $(date +%s)000);"
```

### Roles
- **admin**: Can switch backends, pick models, manage settings
- **user**: Uses default config (Ollama at `http://localhost:11434`, model `gemma3:27b`)

---

## 💾 Database

### Technology
- **Prisma ORM** with **SQLite**
- Database file: `prisma/dev.db`
- Auto-generated TypeScript types

### Useful Commands
```bash
# View database in GUI
pnpm db:studio

# Create new migration after schema changes
pnpm db:migrate

# Reset database (deletes all data!)
pnpm db:reset

# Generate Prisma client
pnpm db:generate
```

### Database Schema
- **Users**: id, email, password_hash, role, name, created_at
- **Chats**: id, user_id, provider, session_name, created_at
- **Messages**: id, chat_session_id, role, content, extra_data, created_at

---

## 💬 Chats and History

- Per-user chat sessions saved to SQLite database
- **Limit**: 6 chats per user (configurable)
- Auto-named as "New Chat 1", "New Chat 2", etc.

### API Endpoints
- `POST /api/chats` - Create new chat
- `GET /api/chats` - List user's chats
- `GET /api/chats/:id/messages` - Get messages
- `POST /api/chats/:id/messages` - Add message
- `PATCH /api/chats/:id` - Rename chat
- `DELETE /api/chats/:id` - Delete chat

---

## 🐍 Python RAG Service

### Setup
```bash
cd rag_service
python -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Optional: configure paths
export RAG_YAML=$(pwd)/app/rag.yaml
export RAG_CHROMA_DIR=$(pwd)/app/chroma

# Start service
uvicorn app.main:app --reload --port 8000
```

### RAG Details
- YAML file at `rag_service/app/rag.yaml` defines queries
- FastAPI `/plan` endpoint builds execution plan
- Semantic search with ChromaDB + sentence-transformers
- Falls back to keyword matching if dependencies unavailable

---

## 🔧 Development

### Clear Next.js Cache
If you encounter issues after updates:
```bash
rm -rf .next
pnpm dev
```

### Environment Variables
The `.env` file contains:
```bash
DATABASE_URL="file:/home/fahad/Dev/chatUI/chat-ui/prisma/dev.db"
```

**Note**: For SQLite, this file is committed to the repo. For production with PostgreSQL, move to `.env.local` and add to `.gitignore`.

### Admin Controls
Admins can:
- Switch between Ollama and Amazon backends
- Select different models
- View all system settings

---

## 🚢 Deployment (New Machine)

### Full Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd chat-ui

# 2. Install dependencies (auto-runs prisma generate)
pnpm install

# 3. Run migrations to create database
pnpm db:migrate

# 4. Create admin user
./scripts/add-user.sh

# 5. Start server
pnpm dev
```

### Production Build
```bash
pnpm build
pnpm start
```

---

## 🐛 Troubleshooting

### "Cannot serialize BigInt" Error
Already fixed! If you see this, restart the dev server:
```bash
rm -rf .next
pnpm dev
```

### "Prisma Client not found"
```bash
pnpm db:generate
```

### Database Connection Issues
Check that `.env` has correct path:
```bash
DATABASE_URL="file:./prisma/dev.db"
```
Or use absolute path:
```bash
DATABASE_URL="file:/absolute/path/to/project/prisma/dev.db"
```

### Login Not Working
1. Verify user exists: `sqlite3 prisma/dev.db "SELECT * FROM users;"`
2. Check password was hashed correctly
3. Clear browser cookies and try again

---

## 📚 Documentation

- **[README_PRISMA.md](./README_PRISMA.md)** - Prisma quick start guide
- **[MIGRATION_NOTES.md](./MIGRATION_NOTES.md)** - Technical details of JSON → SQLite migration
- **[scripts/README.md](./scripts/README.md)** - User management scripts documentation
- **[rag_service/README.md](./rag_service/README.md)** - RAG service details

---

## 🗺️ Roadmap

- ✅ ~~Swap JSON DB → Prisma + SQLite~~ **DONE**
- [ ] Improve auth with proper session tokens (JWT)
- [ ] Add Amazon JumpStart integration
- [ ] Add user profile management
- [ ] Migration to PostgreSQL for production
- [ ] Docker containerization

---

## 📄 License
MIT. See [LICENSE](./LICENSE).

---

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review `README_PRISMA.md` for database-specific questions
3. Check `scripts/README.md` for user management help
4. Open an issue on GitHub

---

**Ready to chat!** 🎉
