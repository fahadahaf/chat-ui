'use client'

import { useStore } from '@/store'
import { useQueryState } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import Icon from '@/components/ui/icon'
import { cn, truncateText } from '@/lib/utils'

const AmazonQueries = () => {
  const setMessages = useStore((s) => s.setMessages)
  const amazonSessionMessages = useStore((s) => s.amazonSessionMessages)
  const [currentSessionId, setSessionId] = useQueryState('session')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)

  const [sessions, setSessions] = useState<{ id: string; session_name: string; created_at: number }[]>([])

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSessions(data)
    } catch {
      setSessions([])
    }
  }

  useEffect(() => {
    loadSessions()
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; session_name: string; created_at: number }
      if (detail && detail.id) {
        setSessions((prev) => [{ id: detail.id, session_name: detail.session_name || 'New Chat', created_at: detail.created_at || Date.now() }, ...prev])
      } else {
        loadSessions()
      }
    }
    window.addEventListener('sessions:changed', onChanged as EventListener)
    return () => window.removeEventListener('sessions:changed', onChanged as EventListener)
  }, [])

  const handleSelect = async (id: string) => {
    setSessionId(id)
    
    // Check if we have messages in memory first (e.g., from a running query)
    if (amazonSessionMessages[id] && amazonSessionMessages[id].length > 0) {
      setMessages(amazonSessionMessages[id])
      return
    }
    
    // Otherwise load from API
    try {
      const res = await fetch(`/api/chats/${id}/messages`, { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const msgs = (await res.json()) as Array<{
        role: 'user' | 'agent' | 'system' | 'tool'
        content: string
        extra_data?: unknown
        created_at: number
      }>
      setMessages(
        msgs.map((m) => ({
          role: m.role,
          content: m.content,
          created_at: m.created_at,
          ...(m.extra_data ? { extra_data: m.extra_data } : {})
        }))
      )
    } catch {
      setMessages([])
    }
  }

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditValue(name)
  }

  const saveEdit = async () => {
    if (!editingId) return
    const name = editValue.trim() || 'Untitled'
    try {
      const res = await fetch(`/api/chats/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_name: name })
      })
      if (res.ok) setSessions((prev) => prev.map((s) => (s.id === editingId ? { ...s, session_name: name } : s)))
    } finally {
      setEditingId(null)
    }
  }

  const deleteSession = async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (currentSessionId === id) {
        setSessionId(null)
        setMessages([])
      }
    } catch {}
  }

  const clearAll = async () => {
    try {
      await Promise.all(sessions.map((s) => fetch(`/api/chats/${s.id}`, { method: 'DELETE' })))
    } finally {
      setSessions([])
      setSessionId(null)
      setMessages([])
    }
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex w-full items-center justify-between text-xs font-medium uppercase">
        <span>Queries</span>
        {sessions.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setConfirmClearAll(true)}>
            <Icon type="trash" size="xs" />
          </Button>
        )}
      </div>
      <div className="h-[calc(100vh-345px)] overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-primary/15 bg-background-secondary p-3 text-xs text-secondary">
            No queries yet. Start a new chat.
          </div>
        ) : (
          <div className="flex flex-col gap-y-1">
            {sessions.map((s) => {
              const isSelected = currentSessionId === s.id
              const isEditing = editingId === s.id
              return (
                <div
                  key={s.id}
                  className={cn(
                    'group flex h-11 w-full items-center justify-between rounded-lg px-3 py-2 transition-colors duration-200',
                    isSelected ? 'cursor-default bg-primary/10' : 'cursor-pointer bg-background-secondary hover:bg-background-secondary/80'
                  )}
                  onClick={() => !isEditing && handleSelect(s.id)}
                >
                  {isEditing ? (
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                      className="h-7 w-full rounded-md border border-primary/15 bg-accent px-2 text-xs text-muted"
                    />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <h4 className={cn('text-sm font-medium', isSelected && 'text-primary')}>
                        {truncateText(s.session_name || 'Untitled', 22)}
                      </h4>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); saveEdit() }}>
                        <Icon type="save" size="xs" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); startEdit(s.id, s.session_name || '') }}
                      >
                        <Icon type="edit" size="xs" />
                      </Button>
                    )}
                    {!isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id) }}
                      >
                        <Icon type="trash" size="xs" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-secondary">This will permanently delete the selected chat.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteId) deleteSession(confirmDeleteId)
                setConfirmDeleteId(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-secondary">This will clear all chat history.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClearAll(false)}>Cancel</Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { clearAll(); setConfirmClearAll(false) }}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AmazonQueries


