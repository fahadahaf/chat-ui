# Chat UI with RAG and Local Auth (MIT)

A Next.js chat UI with:
- Ollama or Amazon (JumpStart) backends to run the LLM
- Python FastAPI service for RAG planning (YAML → plan → dummy table results)
- Local email/password auth (JSON DB), role-gated admin controls

## Stack
- Frontend: Next.js 15, TypeScript, Tailwind, Sonner, Zustand
- Backend (Node): Next.js API routes (local JSON DB for users/chats/messages)
- Backend (Python): FastAPI RAG service with ChromaDB (optional) and sentence-transformers

## Prerequisites
- Node 18+
- pnpm (or npm/yarn)
- Python 3.10+

Install pnpm (if not installed):
```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Frontend Setup
```bash
cd <path>/chat-ui
pnpm install
pnpm dev -p 3004
```
Open `http://localhost:3004`.

### Local Auth
- Example for registering user(s) via API (admin-provisioned):
```bash
curl -s -X POST http://localhost:3004/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ta.com","password":"P123","role":"admin"}'
```
- Login at `/login`. Logout via the user menu in the sidebar.
- Data stored in `data/db.json`.

### Admin Controls
- Admins can switch backend (Ollama/Amazon) and pick models.
- Regular users see default config (Ollama http://localhost:11434, model `gemma3:27b`).

### Chats and History
- Per-user sessions/messages saved to JSON DB via:
  - `POST /api/chats` (limit: 6 per user; auto-named “New Chat N”)
  - `GET /api/chats` lists current user sessions
  - `GET/POST /api/chats/:id/messages` load/append messages
  - `PATCH/DELETE /api/chats/:id` rename/delete

## Python RAG Service
```bash
cd <path>/chat-ui/rag_service
python -m venv .venv && source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Optional: configure paths
export RAG_YAML=$(pwd)/app/rag.yaml
export RAG_CHROMA_DIR=$(pwd)/app/chroma

uvicorn app.main:app --reload --port 8000
```

### RAG Details
- YAML file at `rag_service/app/rag.yaml` defines queries with `name`, `description`, and `parameters`.
- FastAPI `/plan` builds a plan with short conversation history, returns a dummy execution table.
- If Chroma + sentence-transformers installed, it builds a semantic index and refreshes when the YAML changes; falls back to keyword matching otherwise.

## Development Notes
- Limit user chats to 6 to avoid JSON DB bloat.
- Table view is continuous (no pagination) with filter, sort, CSV export.
- Sessions update in the sidebar immediately via a `sessions:changed` event.

## Roadmap
- Swap JSON DB → Prisma + SQLite (or Postgres) for production durability.
- Improve auth to real sessions and richer user management.
- Add Amazon JumpStart invocation (replace stub) and model selectors.

## License
MIT. See [LICENSE](./LICENSE).
