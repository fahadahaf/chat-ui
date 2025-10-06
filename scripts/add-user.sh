#!/bin/bash
# Script to add a user to the database
# Usage: ./scripts/add-user.sh

set -e

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root (parent of scripts directory)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Database path
DB_PATH="$PROJECT_ROOT/prisma/dev.db"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Add User to Database ===${NC}\n"

# Prompt for user details
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo
read -p "Name (optional): " NAME
read -p "Role (admin/user) [user]: " ROLE
ROLE=${ROLE:-user}

# Validate email
if [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: Email is required${NC}"
    exit 1
fi

# Validate password
if [ -z "$PASSWORD" ]; then
    echo -e "${RED}Error: Password is required${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Creating user...${NC}"

# Generate user ID
USER_ID="u_$(openssl rand -hex 8)"

# Hash password using Node.js bcrypt
PASSWORD_HASH=$(node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('$PASSWORD', 10).then(hash => console.log(hash));
")

# Get current timestamp in milliseconds
TIMESTAMP=$(date +%s)000

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}Error: Database not found at $DB_PATH${NC}"
    echo -e "Make sure you're running this script from the project root or scripts directory"
    exit 1
fi

# Insert into database
sqlite3 "$DB_PATH" <<SQL
INSERT INTO users (id, email, name, password_hash, role, created_at)
VALUES ('$USER_ID', '$EMAIL', '$NAME', '$PASSWORD_HASH', '$ROLE', $TIMESTAMP);
SQL

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ User created successfully!${NC}"
    echo -e "User ID: $USER_ID"
    echo -e "Email: $EMAIL"
    echo -e "Role: $ROLE"
    echo -e "\n${GREEN}You can now login with:${NC}"
    echo -e "  Email: $EMAIL"
    echo -e "  Password: [the password you entered]"
else
    echo -e "${RED}❌ Error creating user${NC}"
    exit 1
fi

