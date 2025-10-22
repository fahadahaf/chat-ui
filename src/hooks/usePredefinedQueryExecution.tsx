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
  const addStreamingSession = useStore((state) => state.addStreamingSession)
  const removeStreamingSession = useStore((state) => state.removeStreamingSession)
  const [sessionId, setSessionId] = useQueryState('session')
  const setOllamaSessions = useStore((s) => s.setOllamaSessions)
  const setOllamaSessionMessages = useStore((s) => s.setOllamaSessionMessages)
  const setAmazonSessionMessages = useStore((s) => s.setAmazonSessionMessages)
  const ollamaSessions = useStore((s) => s.ollamaSessions)

  const executePredefinedQuery = useCallback(
    async (queryName: string, parameters: Record<string, string>) => {
      setIsStreaming(true)
      
      // Capture the session ID at the start of execution
      const executionSessionId = sessionId

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

      // Capture messages immediately after adding them, before any async operations
      // This ensures we have the correct messages for THIS session, not messages from 
      // another session if the user switches during execution
      const messagesForThisSession = [...useStore.getState().messages]

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
          
          // Mark this session as streaming
          if (newSessionId) {
            addStreamingSession(newSessionId)
          }
          
          // Ensure session exists in local storage and update title
          if (backend === 'ollama' || backend === 'amazon') {
            const title = `${queryName}`.slice(0, 40) || 'New Query'
            const exists = ollamaSessions.some((s) => s.session_id === newSessionId)
            if (!exists) {
              setOllamaSessions((prev) => [
                { session_id: newSessionId as string, session_name: title, created_at: Math.floor(Date.now() / 1000) },
                ...prev,
              ])
            } else {
              setOllamaSessions((prev) => prev.map((s) => s.session_id === newSessionId && (s.session_name === 'New Chat' || !s.session_name) ? { ...s, session_name: title } : s))
            }
            // Store the messages we captured at the start (not current messages which might be from another session)
            if (backend === 'ollama') {
              setOllamaSessionMessages((prev) => ({
                ...prev,
                [newSessionId as string]: messagesForThisSession
              }))
            } else {
              setAmazonSessionMessages((prev) => ({
                ...prev,
                [newSessionId as string]: messagesForThisSession
              }))
            }
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

          // Update messages for the session where query was executed
          // IMPORTANT: Deep copy to avoid mutating shared object references
          const updateMessagesForSession = (messages: any[]) => {
            return messages.map((msg, index) => {
              // Only update the last agent message
              if (index === messages.length - 1 && msg.role === 'agent') {
                return {
                  ...msg,  // Create new object
                  content: '',
                  extra_data: {
                    ...msg.extra_data,
                    table: {
                      title: data?.table?.title || 'Query Results',
                      columns,
                      rows
                    }
                  }
                }
              }
              // For all other messages, create new objects too
              return { ...msg }
            })
          }

          // Update the session messages in storage
          if (newSessionId) {
            if (backend === 'ollama') {
              setOllamaSessionMessages((prev) => {
                const messagesInStorage = prev[newSessionId as string] || []
                return {
                  ...prev,
                  [newSessionId as string]: updateMessagesForSession(messagesInStorage)
                }
              })
            } else if (backend === 'amazon') {
              setAmazonSessionMessages((prev) => {
                const messagesInStorage = prev[newSessionId as string] || []
                return {
                  ...prev,
                  [newSessionId as string]: updateMessagesForSession(messagesInStorage)
                }
              })
            }
          }
          
          // Only update currently visible messages if user is still viewing the session where query was executed
          // We need to be very defensive here to avoid cross-session contamination
          const getCurrentSessionId = () => {
            const params = new URLSearchParams(window.location.search)
            return params.get('session')
          }
          const currentlyViewingSessionId = getCurrentSessionId()
          
          // Force refresh the currently viewed session to show updated results
          // Check what session the user is currently viewing
          const currentViewingSession = new URLSearchParams(window.location.search).get('session')
          
          if (currentViewingSession === newSessionId && newSessionId) {
            // User is viewing the session where query just completed - refresh it!
            const storage = backend === 'ollama' 
              ? useStore.getState().ollamaSessionMessages 
              : useStore.getState().amazonSessionMessages
            const updatedMessages = storage[newSessionId as string]
            
            if (updatedMessages && updatedMessages.length > 0) {
              // Force refresh visible messages with completed results
              setMessages(updatedMessages.map(msg => ({ ...msg })))
            }
          }
          
          // If user is viewing a different session, results will load when they switch back

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
        // Remove this session from streaming
        if (newSessionId) {
          removeStreamingSession(newSessionId)
        }
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
      addStreamingSession,
      removeStreamingSession,
      focusChatInput,
      sessionId,
      setSessionId,
      ollamaSessions,
      setOllamaSessions,
      setOllamaSessionMessages,
      setAmazonSessionMessages
    ]
  )

  return { executePredefinedQuery }
}

export default usePredefinedQueryExecution

