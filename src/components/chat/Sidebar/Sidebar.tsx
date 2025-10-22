'use client'
import { Button } from '@/components/ui/button'
import { ModeSelector } from '@/components/chat/Sidebar/ModeSelector'
import { EntitySelector } from '@/components/chat/Sidebar/EntitySelector'
import useChatActions from '@/hooks/useChatActions'
import { useStore } from '@/store'
import { getOllamaModels, getOllamaStatus } from '@/api/ollama'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import Icon from '@/components/ui/icon'
import { getProviderIcon } from '@/lib/modelProvider'
import Sessions from './Sessions'
import { OllamaQueries, AmazonQueries } from './Queries'
import { isValidUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { useQueryState } from 'nuqs'
import { truncateText } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const ENDPOINT_PLACEHOLDER = 'NO ENDPOINT ADDED'
const SidebarHeader = () => (
  <div className="flex items-center gap-2">
    <Icon type="agno" size="xs" />
    <span className="text-xs font-medium uppercase text-white">Chat UI</span>
  </div>
)

const LogoutButton = () => {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/login'
    }
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="h-7 rounded-md border border-primary/15 px-2 text-[10px] uppercase text-primary"
    >
      Logout
    </Button>
  )
}

const UserMenu = () => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [changing, setChanging] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return
        const data = await res.json()
        setName(data.name || '')
        setEmail(data.email || '')
      } catch {}
    }
    run()
  }, [])

  const onChangePass = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPass, new_password: newPass })
      })
      if (!res.ok) throw new Error(await res.text())
      setOldPass('')
      setNewPass('')
      setChanging(false)
      alert('Password updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="absolute bottom-2 left-2 right-2">
      <div className="flex items-center justify-between rounded-md border border-primary/15 bg-accent px-2 py-1">
        <button className="text-xs text-primary" onClick={() => setOpen(!open)}>
          {name || email || 'User'}
        </button>
        <LogoutButton />
      </div>
      {open && (
        <div className="mt-2 rounded-md border border-primary/15 bg-background p-3">
          <p className="mb-2 text-xs uppercase text-primary">Settings</p>
          {changing ? (
            <form onSubmit={onChangePass} className="flex flex-col gap-2">
              {error && <p className="text-[11px] text-destructive">{error}</p>}
              <input className="h-8 rounded-md border border-primary/15 bg-accent p-2 text-xs" type="password" placeholder="Current password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
              <input className="h-8 rounded-md border border-primary/15 bg-accent p-2 text-xs" type="password" placeholder="New password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-8 rounded-md bg-primary text-[11px] text-background">Update</Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-md text-[11px]" onClick={() => setChanging(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] text-secondary">{email}</div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 rounded-md bg-primary text-[11px] text-background" onClick={() => setChanging(true)}>Change password</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const NewChatButton = ({
  disabled,
  onClick
}: {
  disabled: boolean
  onClick: () => void
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    size="lg"
    className="h-9 w-full rounded-xl bg-primary text-xs font-medium text-background hover:bg-primary/80"
  >
    <Icon type="plus-icon" size="xs" className="text-background" />
    <span className="uppercase">New Chat</span>
  </Button>
)

const ModelDisplay = ({ model }: { model: string }) => (
  <div className="flex h-9 w-full items-center gap-3 rounded-xl border border-primary/15 bg-accent p-3 text-xs font-medium uppercase text-muted">
    {(() => {
      const icon = getProviderIcon(model)
      return icon ? <Icon type={icon} className="shrink-0" size="xs" /> : null
    })()}
    {model}
  </div>
)

const Endpoint = () => {
  const {
    backend,
    setBackend,
    selectedEndpoint,
    isEndpointActive,
    setIsEndpointActive,
    setSelectedEndpoint,
    ollamaUrl,
    setOllamaUrl,
    ollamaModel,
    setOllamaModel,
    setAgents,
    setSessionsData,
    setMessages,
    userRole
  } = useStore()
  const { initialize } = useChatActions()
  const [isEditing, setIsEditing] = useState(false)
  const [endpointValue, setEndpointValue] = useState('')
  const [ollamaUrlValue, setOllamaUrlValue] = useState('')
  const [ollamaModels, setOllamaModels] = useState<{ name: string; model: string }[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [, setAgentId] = useQueryState('agent')
  const [, setSessionId] = useQueryState('session')

  useEffect(() => {
    setEndpointValue(selectedEndpoint)
    setOllamaUrlValue(ollamaUrl)
    setIsMounted(true)
  }, [selectedEndpoint, ollamaUrl])

  // Auto-load Ollama models when switching to Ollama or URL changes
  useEffect(() => {
    const loadOllama = async () => {
      if (backend !== 'ollama') return
      setIsEndpointActive(false)
      const status = await getOllamaStatus(ollamaUrl)
      if (status === 200) {
        setIsEndpointActive(true)
        const models = await getOllamaModels(ollamaUrl)
        setOllamaModels(models)
        if (!ollamaModel && models.length > 0) {
          setOllamaModel(models[0].name)
        }
      } else {
        setOllamaModels([])
      }
    }
    loadOllama()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, ollamaUrl])

  const getStatusColor = (isActive: boolean) =>
    isActive ? 'bg-positive' : 'bg-destructive'

  const handleSave = async () => {
    if (!isValidUrl(ollamaUrlValue)) {
      toast.error('Please enter a valid URL')
      return
    }
    const clean = ollamaUrlValue.replace(/\/$/, '').trim()
    setOllamaUrl(clean)
    setAgentId(null)
    setSessionId(null)
    setIsEditing(false)
    setIsHovering(false)
    setAgents([])
    setSessionsData([])
    setMessages([])
  }

  const handleCancel = () => {
    setEndpointValue(selectedEndpoint)
    setOllamaUrlValue(ollamaUrl)
    setIsEditing(false)
    setIsHovering(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleRefresh = async () => {
    setIsRotating(true)
    if (backend === 'ollama') {
      const status = await getOllamaStatus(ollamaUrl)
      if (status === 200) {
        const models = await getOllamaModels(ollamaUrl)
        setOllamaModels(models)
      } else {
        setOllamaModels([])
      }
    } else {
      await initialize()
    }
    setTimeout(() => setIsRotating(false), 500)
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {userRole === 'admin' && (
        <>
          <div className="text-xs font-medium uppercase text-primary">Backend</div>
          <div className="flex w-full gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBackend('ollama')}
              className={`rounded-xl text-xs ${
                backend === 'ollama'
                  ? 'bg-primary text-background hover:bg-primary/80'
                  : 'bg-accent text-primary hover:bg-accent/80 border border-primary/15'
              }`}
            >
              Ollama
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBackend('amazon')}
              className={`rounded-xl text-xs ${
                backend === 'amazon'
                  ? 'bg-primary text-background hover:bg-primary/80'
                  : 'bg-accent text-primary hover:bg-accent/80 border border-primary/15'
              }`}
            >
              Amazon
            </Button>
          </div>
          <div className="text-xs font-medium uppercase text-primary">{backend === 'ollama' ? 'Ollama' : 'Amazon'}</div>
        </>
      )}
      {isEditing && userRole === 'admin' ? (
        <div className="flex w-full items-center gap-1">
          {backend === 'ollama' ? (
            <input
              type="text"
              value={ollamaUrlValue}
              onChange={(e) => setOllamaUrlValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex h-9 w-full items-center text-ellipsis rounded-xl border border-primary/15 bg-accent p-3 text-xs font-medium text-muted"
              autoFocus
            />
          ) : (
            <div className="flex w-full gap-2">
              <input
                type="text"
                placeholder="Region (e.g., us-east-1)"
                value={useStore.getState().amazonRegion}
                onChange={(e) => useStore.getState().setAmazonRegion(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex h-9 w-full items-center text-ellipsis rounded-xl border border-primary/15 bg-accent p-3 text-xs font-medium text-muted"
              />
              <input
                type="text"
                placeholder="SageMaker endpoint name"
                value={useStore.getState().amazonEndpoint}
                onChange={(e) => useStore.getState().setAmazonEndpoint(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex h-9 w-full items-center text-ellipsis rounded-xl border border-primary/15 bg-accent p-3 text-xs font-medium text-muted"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="hover:cursor-pointer hover:bg-transparent"
          >
            <Icon type="save" size="xs" />
          </Button>
        </div>
      ) : userRole === 'admin' ? (
        <div className="flex w-full items-center gap-1">
          <motion.div
            className="relative flex h-9 w-full cursor-pointer items-center justify-between rounded-xl border border-primary/15 bg-accent p-3 uppercase"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={() => setIsEditing(true)}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <AnimatePresence mode="wait">
              {isHovering ? (
                <motion.div
                  key="endpoint-display-hover"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-primary">
                    <Icon type="edit" size="xxs" /> EDIT {backend === 'ollama' ? 'OLLAMA' : 'AMAZON'}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="endpoint-display"
                  className="absolute inset-0 flex items-center justify-between px-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-xs font-medium text-muted">
                    {backend === 'ollama'
                      ? isMounted
                        ? truncateText(ollamaUrl, 21) || ENDPOINT_PLACEHOLDER
                        : 'http://localhost:11434'
                      : isMounted
                        ? truncateText(`${useStore.getState().amazonRegion}:${useStore.getState().amazonEndpoint}`, 21) || ENDPOINT_PLACEHOLDER
                        : 'us-east-1:my-endpoint'}
                  </p>
                  <div
                    className={`size-2 shrink-0 rounded-full ${getStatusColor(isEndpointActive)}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="hover:cursor-pointer hover:bg-transparent"
          >
            <motion.div
              key={isRotating ? 'rotating' : 'idle'}
              animate={{ rotate: isRotating ? 360 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <Icon type="refresh" size="xs" />
            </motion.div>
          </Button>
        </div>
      ) : null}
      {userRole === 'admin' && backend === 'ollama' && ollamaModels.length > 0 && (
        <div className="flex w-full items-center gap-2">
          <div className="text-xs font-medium text-primary">Model</div>
          <select
            className="flex h-9 w-full items-center rounded-xl border border-primary/15 bg-accent p-2 text-xs font-medium text-muted"
            value={ollamaModel}
            onChange={(e) => setOllamaModel(e.target.value)}
          >
            <option value="">Select a model</option>
            {ollamaModels.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { clearChat, focusChatInput, initialize } = useChatActions()
  const {
    messages,
    selectedEndpoint,
    isEndpointActive,
    selectedModel,
    hydrated,
    isEndpointLoading,
    mode,
    backend
  } = useStore()
  const userRole = useStore((s) => s.userRole)
  const setOllamaUrl = useStore((s) => s.setOllamaUrl)
  const setOllamaModel = useStore((s) => s.setOllamaModel)
  const setUserRole = useStore((s) => s.setUserRole)
  const setMessages = useStore((s) => s.setMessages)
  const setOllamaSessions = useStore((s) => s.setOllamaSessions)
  const setOllamaSessionMessages = useStore((s) => s.setOllamaSessionMessages)
  const [, setSessionId] = useQueryState('session')
  const [isMounted, setIsMounted] = useState(false)
  const [agentId] = useQueryState('agent')
  const [teamId] = useQueryState('team')

  useEffect(() => {
    setIsMounted(true)

    if (hydrated) initialize()
  }, [selectedEndpoint, initialize, hydrated, mode])

  // Fetch current user and role from server on mount; also clear any in-memory sessions
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setUserRole(data.role === 'admin' ? 'admin' : 'user')
        useStore.setState({ ollamaSessions: [], ollamaSessionMessages: {} })
        useStore.setState({ amazonSessions: [], amazonSessionMessages: {} })
        useStore.getState().setAuthUserId?.(data.id)
      } catch {
        setUserRole('user')
        useStore.setState({ ollamaSessions: [], ollamaSessionMessages: {} })
        useStore.setState({ amazonSessions: [], amazonSessionMessages: {} })
        useStore.getState().setAuthUserId?.(undefined)
      }
    }
    run()
  }, [setUserRole])

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_name: 'New Chat', provider: backend })
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Failed to create chat')
        // notify user (limit or other error)
        try { (await import('sonner')).toast.error(msg || 'Failed to create chat') } catch {}
        return
      }
      const data = await res.json()
      setSessionId(data.id)
      setMessages([])
      if (userRole !== 'admin') {
        setOllamaUrl('http://localhost:11434')
        setOllamaModel('gemma3:27b')
      }
      // Notify session lists to refresh/insert
      try {
        window.dispatchEvent(new CustomEvent('sessions:changed', { detail: data }))
      } catch {}
      focusChatInput()
    } catch (e) {
      try { (await import('sonner')).toast.error('Failed to create chat') } catch {}
      clearChat()
      focusChatInput()
    }
  }

  return (
    <motion.aside
      className="relative flex h-screen shrink-0 grow-0 flex-col overflow-hidden bg-sidebar px-2 py-3 font-dmmono transition-colors duration-200"
      initial={{ width: '16rem' }}
      animate={{ width: isCollapsed ? '2.5rem' : '16rem' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <motion.button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute right-2 top-2 z-10 p-1 text-primary"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        type="button"
        whileTap={{ scale: 0.95 }}
      >
        <Icon
          type="sheet"
          size="xs"
          className={`transform ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
        />
      </motion.button>
      <motion.div
        className="w-60 space-y-5"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -20 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          pointerEvents: isCollapsed ? 'none' : 'auto'
        }}
      >
        <SidebarHeader />
        <NewChatButton
          disabled={messages.length === 0}
          onClick={handleNewChat}
        />
        {isMounted && (
          <>
            <Endpoint />
            {backend === 'ollama' ? (
              <OllamaQueries />
            ) : backend === 'amazon' ? (
              <AmazonQueries />
            ) : isEndpointActive && (
              <>
                <motion.div
                  className="flex w-full flex-col items-start gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  <div className="text-xs font-medium uppercase text-primary">
                    Mode
                  </div>
                  {isEndpointLoading ? (
                    <div className="flex w-full flex-col gap-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton
                          key={index}
                          className="h-9 w-full rounded-xl"
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <ModeSelector />
                      <EntitySelector />
                      {selectedModel && (agentId || teamId) && (
                        <ModelDisplay model={selectedModel} />
                      )}
                    </>
                  )}
                </motion.div>
                <Sessions />
              </>
            )}
          </>
        )}
      </motion.div>
      <UserMenu />
    </motion.aside>
  )
}

export default Sidebar
