// Simple JSON file DB for local auth and chats
// Not for production use. Replace with a real DB later.

import fs from 'fs'
import path from 'path'

export type Role = 'admin' | 'user'

export interface DBUser {
  id: string
  email: string
  name?: string
  password_hash: string
  role: Role
  created_at: number
}

export interface DBChatSession {
  id: string
  user_id: string
  provider: 'ollama' | 'amazon'
  session_name: string
  created_at: number
}

export interface DBChatMessage {
  id: string
  chat_session_id: string
  role: 'user' | 'agent' | 'system' | 'tool'
  content: string
  extra_data?: unknown
  created_at: number
}

interface DBShape {
  users: DBUser[]
  chats: DBChatSession[]
  messages: DBChatMessage[]
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR)
  if (!fs.existsSync(DB_FILE)) {
    const initial: DBShape = { users: [], chats: [], messages: [] }
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2))
  }
}

export function readDB(): DBShape {
  ensureFile()
  const raw = fs.readFileSync(DB_FILE, 'utf8')
  try {
    return JSON.parse(raw) as DBShape
  } catch {
    const initial: DBShape = { users: [], chats: [], messages: [] }
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2))
    return initial
  }
}

export function writeDB(data: DBShape): void {
  ensureFile()
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36)
}


