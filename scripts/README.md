# Admin Scripts

Scripts for managing users manually (since registration is disabled).

## Add a User

### Method 1: TypeScript Script (Recommended)

**Install tsx first:**
```bash
pnpm install tsx -D
```

**Edit the user data** in `scripts/add-user.ts`, then run:
```bash
pnpm add-user
```

Or manually:
```bash
pnpm tsx scripts/add-user.ts
```

### Method 2: Interactive Shell Script

```bash
./scripts/add-user.sh
```

This will prompt you for:
- Email
- Password
- Name (optional)
- Role (admin/user)

### Method 3: Direct SQL

Generate a password hash first:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('yourpassword', 10).then(console.log)"
```

Then insert into database:
```bash
sqlite3 prisma/dev.db "
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES (
  'u_$(openssl rand -hex 8)',
  'user@example.com',
  'User Name',
  '\$2b\$10\$your_generated_hash_here',
  'user',
  $(date +%s)000
);
"
```

## List Users

```bash
sqlite3 prisma/dev.db "SELECT id, email, name, role FROM users;"
```

## Delete a User

```bash
sqlite3 prisma/dev.db "DELETE FROM users WHERE email='user@example.com';"
```

## View Database in GUI

```bash
pnpm db:studio
```

This opens Prisma Studio at http://localhost:5555

