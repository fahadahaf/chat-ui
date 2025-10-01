import { useCallback } from 'react'
import { useStore } from '@/store'
import useChatActions from '@/hooks/useChatActions'
import { useQueryState } from 'nuqs'

const usePredefinedQueryExecution = () => {
  const setMessages = useStore((state) => state.setMessages)
  const { addMessage, focusChatInput } = useChatActions()
  const backend = useStore((state) => state.backend)
  const ragUrl = useStore((state) => state.ragUrl)
  const setIsStreaming = useStore((state) => state.setIsStreaming)
  const [sessionId, setSessionId] = useQueryState('session')
  const setOllamaSessions = useStore((s) => s.setOllamaSessions)
  const setOllamaSessionMessages = useStore((s) => s.setOllamaSessionMessages)
  const ollamaSessions = useStore((s) => s.ollamaSessions)

  const executePredefinedQuery = useCallback(
    async (queryName: string, parameters: Record<string, string>) => {
      setIsStreaming(true)

      // Create a user message describing the query
      const userMessage = `[Predefined Query] ${queryName}: ${JSON.stringify(parameters)}`
      
      addMessage({
        role: 'user',
        content: userMessage,
        created_at: Math.floor(Date.now() / 1000)
      })

      addMessage({
        role: 'agent',
        content: '',
        tool_calls: [],
        streamingError: false,
        created_at: Math.floor(Date.now() / 1000) + 1
      })

      // Ensure an Ollama session exists and has a name
      let effectiveSessionId = sessionId ?? ''
      if (backend === 'ollama' || backend === 'amazon') {
        if (!effectiveSessionId) {
          effectiveSessionId = `${Date.now()}`
          setSessionId(effectiveSessionId)
        }
        const title = `${queryName}`.slice(0, 40) || 'New Query'
        const exists = ollamaSessions.some((s) => s.session_id === effectiveSessionId)
        if (!exists) {
          setOllamaSessions((prev) => [
            { session_id: effectiveSessionId, session_name: title, created_at: Math.floor(Date.now() / 1000) },
            ...prev,
          ])
        } else {
          setOllamaSessions((prev) => prev.map((s) => s.session_id === effectiveSessionId && (s.session_name === 'New Chat' || !s.session_name) ? { ...s, session_name: title } : s))
        }
        // Initialize session messages immediately
        const currentMessages = useStore.getState().messages
        setOllamaSessionMessages((prev) => ({
          ...prev,
          [effectiveSessionId]: currentMessages
        }))
      }

      let newSessionId = sessionId
      try {
        if (backend === 'ollama' || backend === 'amazon') {
          // Ensure server-side chat session exists for current user
          if (!newSessionId) {
            try {
              const createRes = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ provider: backend })
              })
              if (createRes.ok) {
                const created = await createRes.json()
                newSessionId = created.id
                setSessionId(created.id)
                try {
                  window.dispatchEvent(new CustomEvent('sessions:changed', { detail: created }))
                } catch {}
              }
            } catch {}
          }

          // Persist user message
          if (newSessionId) {
            try {
              await fetch(`/api/chats/${newSessionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: 'user', content: userMessage })
              })
            } catch {}
          }

          // Create a plan directly without LLM
          const plan = [
            {
              step: 1,
              name: queryName,
              parameters: parameters
            }
          ]

          // Call gremlin execution via RAG service
          const res = await fetch(`/api/rag/execute?base=${encodeURIComponent(ragUrl)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ plan })
          })

          if (!res.ok) {
            throw new Error(`Execution error: ${res.statusText}`)
          }

          const data = (await res.json()) as { table?: { title?: string; columns: string[]; rows: Array<Record<string, unknown>> } }
          
          // Build table from response
          let columns = ['step', 'name', 'parameters']
          let rows: Array<Record<string, unknown>> = []
          
          if (data.table && Array.isArray(data.table.columns) && Array.isArray(data.table.rows)) {
            columns = data.table.columns
            rows = data.table.rows.map((r) => ({ ...r, parameters: r.parameters ? JSON.stringify(r.parameters) : r.parameters }))
          } else {
            // Fallback to showing plan as table
            rows.push({
              step: 1,
              name: queryName,
              parameters: JSON.stringify(parameters)
            })
          }

          setMessages((prev) => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage && lastMessage.role === 'agent') {
              lastMessage.content = ''
              lastMessage.extra_data = {
                ...lastMessage.extra_data,
                table: {
                  title: data?.table?.title || 'Query Results',
                  columns,
                  rows
                }
              }
            }
            return newMessages
          })

          // Persist agent response with table
          if (newSessionId) {
            try {
              await fetch(`/api/chats/${newSessionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: 'agent', content: '', extra_data: { table: { title: data?.table?.title || 'Query Results', columns, rows } } })
              })
            } catch {}
          }
        }
      } catch (error) {
        console.error('Error executing predefined query:', error)
        setMessages((prevMessages) => {
          const newMessages = [...prevMessages]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage && lastMessage.role === 'agent') {
            lastMessage.streamingError = true
          }
          return newMessages
        })
      } finally {
        focusChatInput()
        setIsStreaming(false)
      }
    },
    [
      setMessages,
      addMessage,
      backend,
      ragUrl,
      setIsStreaming,
      focusChatInput,
      sessionId,
      setSessionId,
      ollamaSessions,
      setOllamaSessions,
      setOllamaSessionMessages
    ]
  )

  return { executePredefinedQuery }
}

export default usePredefinedQueryExecution

