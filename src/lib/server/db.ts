// Prisma-based database module
// Maintains the same interface as the old JSON-based db.ts for backward compatibility

import { PrismaClient } from '@/generated/prisma'

// Export types for compatibility
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

// Singleton Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper to generate unique IDs
export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// User operations
export async function getUserByEmail(email: string): Promise<DBUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    password_hash: user.passwordHash,
    role: user.role as Role,
    created_at: Number(user.createdAt)
  }
}

export async function getUserById(id: string): Promise<DBUser | null> {
  const user = await prisma.user.findUnique({
    where: { id }
  })
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    password_hash: user.passwordHash,
    role: user.role as Role,
    created_at: Number(user.createdAt)
  }
}

export async function createUser(data: {
  email: string
  password_hash: string
  name?: string
  role: Role
}): Promise<DBUser> {
  const user = await prisma.user.create({
    data: {
      id: uid('u_'),
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash: data.password_hash,
      role: data.role,
      createdAt: BigInt(Date.now())
    }
  })
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    password_hash: user.passwordHash,
    role: user.role as Role,
    created_at: Number(user.createdAt)
  }
}

// Chat operations
export async function getChatsByUserId(userId: string): Promise<DBChatSession[]> {
  const chats = await prisma.chat.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
  return chats.map((chat) => ({
    id: chat.id,
    user_id: chat.userId,
    provider: chat.provider as 'ollama' | 'amazon',
    session_name: chat.sessionName,
    created_at: Number(chat.createdAt)
  }))
}

export async function getChatById(chatId: string): Promise<DBChatSession | null> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId }
  })
  if (!chat) return null
  return {
    id: chat.id,
    user_id: chat.userId,
    provider: chat.provider as 'ollama' | 'amazon',
    session_name: chat.sessionName,
    created_at: Number(chat.createdAt)
  }
}

export async function createChat(data: {
  user_id: string
  provider: 'ollama' | 'amazon'
  session_name: string
}): Promise<DBChatSession> {
  const chat = await prisma.chat.create({
    data: {
      id: uid('s_'),
      userId: data.user_id,
      provider: data.provider,
      sessionName: data.session_name,
      createdAt: BigInt(Date.now())
    }
  })
  return {
    id: chat.id,
    user_id: chat.userId,
    provider: chat.provider as 'ollama' | 'amazon',
    session_name: chat.sessionName,
    created_at: Number(chat.createdAt)
  }
}

export async function updateChatSessionName(chatId: string, sessionName: string): Promise<void> {
  await prisma.chat.update({
    where: { id: chatId },
    data: { sessionName }
  })
}

export async function deleteChat(chatId: string): Promise<void> {
  // Messages will be deleted automatically due to cascade
  await prisma.chat.delete({
    where: { id: chatId }
  })
}

// Message operations
export async function getMessagesByChatId(chatId: string): Promise<DBChatMessage[]> {
  const messages = await prisma.message.findMany({
    where: { chatSessionId: chatId },
    orderBy: { createdAt: 'asc' }
  })
  return messages.map((msg) => ({
    id: msg.id,
    chat_session_id: msg.chatSessionId,
    role: msg.role as 'user' | 'agent' | 'system' | 'tool',
    content: msg.content,
    extra_data: msg.extraData ? JSON.parse(msg.extraData) : undefined,
    created_at: Number(msg.createdAt)
  }))
}

export async function createMessage(data: {
  chat_session_id: string
  role: 'user' | 'agent' | 'system' | 'tool'
  content: string
  extra_data?: unknown
}): Promise<DBChatMessage> {
  const msg = await prisma.message.create({
    data: {
      id: uid('m_'),
      chatSessionId: data.chat_session_id,
      role: data.role,
      content: data.content,
      extraData: data.extra_data ? JSON.stringify(data.extra_data) : null,
      createdAt: BigInt(Date.now())
    }
  })
  return {
    id: msg.id,
    chat_session_id: msg.chatSessionId,
    role: msg.role as 'user' | 'agent' | 'system' | 'tool',
    content: msg.content,
    extra_data: msg.extraData ? JSON.parse(msg.extraData) : undefined,
    created_at: Number(msg.createdAt)
  }
}

