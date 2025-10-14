import { useCallback } from 'react'

import { APIRoutes } from '@/api/routes'

import useChatActions from '@/hooks/useChatActions'
import { useStore } from '../store'
import { RunEvent, RunResponseContent, type RunResponse } from '@/types/os'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import useAIResponseStream from './useAIResponseStream'
import { ToolCall } from '@/types/os'
import { useQueryState } from 'nuqs'
import { getJsonMarkdown } from '@/lib/utils'

const useAIChatStreamHandler = () => {
  const setMessages = useStore((state) => state.setMessages)
  const { addMessage, focusChatInput } = useChatActions()
  const [agentId] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [sessionId, setSessionId] = useQueryState('session')
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const backend = useStore((state) => state.backend)
  const ollamaUrl = useStore((state) => state.ollamaUrl)
  const ollamaModel = useStore((state) => state.ollamaModel)
  const ragUrl = useStore((state) => state.ragUrl)
  const mode = useStore((state) => state.mode)
  const setStreamingErrorMessage = useStore(
    (state) => state.setStreamingErrorMessage
  )
  const setIsStreaming = useStore((state) => state.setIsStreaming)
  const setSessionsData = useStore((state) => state.setSessionsData)
  const { streamResponse } = useAIResponseStream()
  const ollamaSessions = useStore((s) => s.ollamaSessions)
  const setOllamaSessions = useStore((s) => s.setOllamaSessions)
  const setOllamaSessionMessages = useStore((s) => s.setOllamaSessionMessages)

  const updateMessagesWithErrorState = useCallback(() => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages]
      const lastMessage = newMessages[newMessages.length - 1]
      if (lastMessage && lastMessage.role === 'agent') {
        lastMessage.streamingError = true
      }
      return newMessages
    })
  }, [setMessages])

  /**
   * Processes a new tool call and adds it to the message
   * @param toolCall - The tool call to add
   * @param prevToolCalls - The previous tool calls array
   * @returns Updated tool calls array
   */
  const processToolCall = useCallback(
    (toolCall: ToolCall, prevToolCalls: ToolCall[] = []) => {
      const toolCallId =
        toolCall.tool_call_id || `${toolCall.tool_name}-${toolCall.created_at}`

      const existingToolCallIndex = prevToolCalls.findIndex(
        (tc) =>
          (tc.tool_call_id && tc.tool_call_id === toolCall.tool_call_id) ||
          (!tc.tool_call_id &&
            toolCall.tool_name &&
            toolCall.created_at &&
            `${tc.tool_name}-${tc.created_at}` === toolCallId)
      )
      if (existingToolCallIndex >= 0) {
        const updatedToolCalls = [...prevToolCalls]
        updatedToolCalls[existingToolCallIndex] = {
          ...updatedToolCalls[existingToolCallIndex],
          ...toolCall
        }
        return updatedToolCalls
      } else {
        return [...prevToolCalls, toolCall]
      }
    },
    []
  )

  /**
   * Processes tool calls from a chunk, handling both single tool object and tools array formats
   * @param chunk - The chunk containing tool call data
   * @param existingToolCalls - The existing tool calls array
   * @returns Updated tool calls array
   */
  const processChunkToolCalls = useCallback(
    (
      chunk: RunResponseContent | RunResponse,
      existingToolCalls: ToolCall[] = []
    ) => {
      let updatedToolCalls = [...existingToolCalls]
      // Handle new single tool object format
      if (chunk.tool) {
        updatedToolCalls = processToolCall(chunk.tool, updatedToolCalls)
      }
      // Handle legacy tools array format
      if (chunk.tools && chunk.tools.length > 0) {
        for (const toolCall of chunk.tools) {
          updatedToolCalls = processToolCall(toolCall, updatedToolCalls)
        }
      }

      return updatedToolCalls
    },
    [processToolCall]
  )

  const handleStreamResponse = useCallback(
    async (input: string | FormData) => {
      setIsStreaming(true)

      const formData = input instanceof FormData ? input : new FormData()
      if (typeof input === 'string') {
        formData.append('message', input)
      }

      setMessages((prevMessages) => {
        if (prevMessages.length >= 2) {
          const lastMessage = prevMessages[prevMessages.length - 1]
          const secondLastMessage = prevMessages[prevMessages.length - 2]
          if (
            lastMessage.role === 'agent' &&
            lastMessage.streamingError &&
            secondLastMessage.role === 'user'
          ) {
            return prevMessages.slice(0, -2)
          }
        }
        return prevMessages
      })

      const userText = (formData.get('message') as string) || ''

      addMessage({
        role: 'user',
        content: userText,
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
      if (backend === 'ollama') {
        if (!effectiveSessionId) {
          effectiveSessionId = `${Date.now()}`
          setSessionId(effectiveSessionId)
        }
        const userPrompt = formData.get('message') as string
        const title = userPrompt?.slice(0, 40) || 'New Chat'
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

      let lastContent = ''
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
                body: JSON.stringify({ role: 'user', content: userText })
              })
            } catch {}
          }

          // RAG pipeline call: send to Python backend to build plan using RAG and chosen provider
          const requestBody: Record<string, unknown> = {
            text: userText,
            history: (() => {
              // Last two prior user queries (exclude current one)
              const all = useStore.getState().messages
              const priorUsers = all.filter((m) => m.role === 'user')
              const withoutCurrent = priorUsers.slice(0, -1)
              return withoutCurrent.slice(-2).map((m) => m.content)
            })(),
            provider: backend,
            provider_config:
              backend === 'ollama'
                ? { base_url: ollamaUrl, model: ollamaModel || agentId || 'llama3' }
                : { region: useStore.getState().amazonRegion, endpoint: useStore.getState().amazonEndpoint }
          }

          const res = await fetch(`/api/rag/plan?base=${encodeURIComponent(ragUrl)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(requestBody)
          })

          if (!res.ok) {
            throw new Error(`RAG backend error: ${res.statusText}`)
          }
          const data = (await res.json()) as { plan?: unknown; raw?: string; table?: { title?: string; columns: string[]; rows: Array<Record<string, unknown>> } }
          
          // Check if this is a missing parameters error or validation error
          const plan = Array.isArray(data.plan) ? data.plan : []
          const hasMissingParams = plan.length > 0 && (plan[0] as any)?.name === 'missing_parameters'
          const hasValidationError = plan.length > 0 && (plan[0] as any)?.name === 'validation_error'
          
          if (hasMissingParams || hasValidationError) {
            // Display error message as content
            const errorMessage = (plan[0] as any)?.message || 'Parameter validation failed'
            setMessages((prev) => {
              const newMessages = [...prev]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage && lastMessage.role === 'agent') {
                lastMessage.content = errorMessage
                lastMessage.extra_data = {
                  ...lastMessage.extra_data
                }
              }
              return newMessages
            })
            
            // Persist error message
            if (newSessionId) {
              try {
                await fetch(`/api/chats/${newSessionId}/messages`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ role: 'agent', content: errorMessage })
                })
              } catch {}
            }
          } else {
            // Normal plan execution - show table
            let columns = ['step', 'name', 'parameters']
            let rows: Array<Record<string, unknown>> = []
            if (data.table && Array.isArray(data.table.columns) && Array.isArray(data.table.rows)) {
              columns = data.table.columns
              rows = data.table.rows.map((r) => ({ ...r, parameters: r.parameters ? JSON.stringify(r.parameters) : r.parameters }))
            } else {
              for (const step of plan as any[]) {
                rows.push({
                  step: (step && step.step) ?? '',
                  name: (step && step.name) ?? '',
                  parameters: (step && step.parameters) ? JSON.stringify(step.parameters) : ''
                })
              }
            }
            setMessages((prev) => {
              const newMessages = [...prev]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage && lastMessage.role === 'agent') {
                lastMessage.content = ''
                lastMessage.extra_data = {
                  ...lastMessage.extra_data,
                  table: {
                    title: (data as any)?.table?.title || 'Execution Plan',
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
                  body: JSON.stringify({ role: 'agent', content: '', extra_data: { table: { title: (data as any)?.table?.title || 'Execution Plan', columns, rows } } })
                })
              } catch {}
            }
          }
        } else {
          const endpointUrl = constructEndpointUrl(selectedEndpoint)

          let RunUrl: string | null = null

          if (mode === 'team' && teamId) {
            RunUrl = APIRoutes.TeamRun(endpointUrl, teamId)
          } else if (mode === 'agent' && agentId) {
            RunUrl = APIRoutes.AgentRun(endpointUrl).replace(
              '{agent_id}',
              agentId
            )
          }

          if (!RunUrl) {
            updateMessagesWithErrorState()
            setStreamingErrorMessage('Please select an agent or team first.')
            setIsStreaming(false)
            return
          }

          formData.append('stream', 'true')
          formData.append('session_id', sessionId ?? '')

          await streamResponse({
            apiUrl: RunUrl,
            requestBody: formData,
            onChunk: (chunk: RunResponse) => {
            if (
              chunk.event === RunEvent.RunStarted ||
              chunk.event === RunEvent.TeamRunStarted ||
              chunk.event === RunEvent.ReasoningStarted ||
              chunk.event === RunEvent.TeamReasoningStarted
            ) {
              newSessionId = chunk.session_id as string
              setSessionId(chunk.session_id as string)
              if (
                (!sessionId || sessionId !== chunk.session_id) &&
                chunk.session_id
              ) {
                const sessionData = {
                  session_id: chunk.session_id as string,
                  session_name: formData.get('message') as string,
                  created_at: chunk.created_at
                }
                setSessionsData((prevSessionsData) => {
                  const sessionExists = prevSessionsData?.some(
                    (session) => session.session_id === chunk.session_id
                  )
                  if (sessionExists) {
                    return prevSessionsData
                  }
                  return [sessionData, ...(prevSessionsData ?? [])]
                })
              }
            } else if (
              chunk.event === RunEvent.ToolCallStarted ||
              chunk.event === RunEvent.TeamToolCallStarted ||
              chunk.event === RunEvent.ToolCallCompleted ||
              chunk.event === RunEvent.TeamToolCallCompleted
            ) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.role === 'agent') {
                  lastMessage.tool_calls = processChunkToolCalls(
                    chunk,
                    lastMessage.tool_calls
                  )
                }
                return newMessages
              })
            } else if (
              chunk.event === RunEvent.RunContent ||
              chunk.event === RunEvent.TeamRunContent
            ) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (
                  lastMessage &&
                  lastMessage.role === 'agent' &&
                  typeof chunk.content === 'string'
                ) {
                  const uniqueContent = chunk.content.replace(lastContent, '')
                  lastMessage.content += uniqueContent
                  lastContent = chunk.content

                  // Handle tool calls streaming
                  lastMessage.tool_calls = processChunkToolCalls(
                    chunk,
                    lastMessage.tool_calls
                  )
                  if (chunk.extra_data?.reasoning_steps) {
                    lastMessage.extra_data = {
                      ...lastMessage.extra_data,
                      reasoning_steps: chunk.extra_data.reasoning_steps
                    }
                  }

                  if (chunk.extra_data?.references) {
                    lastMessage.extra_data = {
                      ...lastMessage.extra_data,
                      references: chunk.extra_data.references
                    }
                  }

                  lastMessage.created_at =
                    chunk.created_at ?? lastMessage.created_at
                  if (chunk.images) {
                    lastMessage.images = chunk.images
                  }
                  if (chunk.videos) {
                    lastMessage.videos = chunk.videos
                  }
                  if (chunk.audio) {
                    lastMessage.audio = chunk.audio
                  }
                } else if (
                  lastMessage &&
                  lastMessage.role === 'agent' &&
                  typeof chunk?.content !== 'string' &&
                  chunk.content !== null
                ) {
                  const jsonBlock = getJsonMarkdown(chunk?.content)

                  lastMessage.content += jsonBlock
                  lastContent = jsonBlock
                } else if (
                  chunk.response_audio?.transcript &&
                  typeof chunk.response_audio?.transcript === 'string'
                ) {
                  const transcript = chunk.response_audio.transcript
                  lastMessage.response_audio = {
                    ...lastMessage.response_audio,
                    transcript:
                      lastMessage.response_audio?.transcript + transcript
                  }
                }
                return newMessages
              })
            } else if (
              chunk.event === RunEvent.ReasoningStep ||
              chunk.event === RunEvent.TeamReasoningStep
            ) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.role === 'agent') {
                  const existingSteps =
                    lastMessage.extra_data?.reasoning_steps ?? []
                  const incomingSteps = chunk.extra_data?.reasoning_steps ?? []
                  lastMessage.extra_data = {
                    ...lastMessage.extra_data,
                    reasoning_steps: [...existingSteps, ...incomingSteps]
                  }
                }
                return newMessages
              })
            } else if (
              chunk.event === RunEvent.ReasoningCompleted ||
              chunk.event === RunEvent.TeamReasoningCompleted
            ) {
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.role === 'agent') {
                  if (chunk.extra_data?.reasoning_steps) {
                    lastMessage.extra_data = {
                      ...lastMessage.extra_data,
                      reasoning_steps: chunk.extra_data.reasoning_steps
                    }
                  }
                }
                return newMessages
              })
            } else if (
              chunk.event === RunEvent.RunError ||
              chunk.event === RunEvent.TeamRunError ||
              chunk.event === RunEvent.TeamRunCancelled
            ) {
              updateMessagesWithErrorState()
              const errorContent =
                (chunk.content as string) ||
                (chunk.event === RunEvent.TeamRunCancelled
                  ? 'Run cancelled'
                  : 'Error during run')
              setStreamingErrorMessage(errorContent)
              if (newSessionId) {
                setSessionsData(
                  (prevSessionsData) =>
                    prevSessionsData?.filter(
                      (session) => session.session_id !== newSessionId
                    ) ?? null
                )
              }
            } else if (
              chunk.event === RunEvent.UpdatingMemory ||
              chunk.event === RunEvent.TeamMemoryUpdateStarted ||
              chunk.event === RunEvent.TeamMemoryUpdateCompleted
            ) {
              // No-op for now; could surface a lightweight UI indicator in the future
            } else if (
              chunk.event === RunEvent.RunCompleted ||
              chunk.event === RunEvent.TeamRunCompleted
            ) {
              setMessages((prevMessages) => {
                const newMessages = prevMessages.map((message, index) => {
                  if (
                    index === prevMessages.length - 1 &&
                    message.role === 'agent'
                  ) {
                    let updatedContent: string
                    if (typeof chunk.content === 'string') {
                      updatedContent = chunk.content
                    } else {
                      try {
                        updatedContent = JSON.stringify(chunk.content)
                      } catch {
                        updatedContent = 'Error parsing response'
                      }
                    }
                    return {
                      ...message,
                      content: updatedContent,
                      tool_calls: processChunkToolCalls(
                        chunk,
                        message.tool_calls
                      ),
                      images: chunk.images ?? message.images,
                      videos: chunk.videos ?? message.videos,
                      response_audio: chunk.response_audio,
                      created_at: chunk.created_at ?? message.created_at,
                      extra_data: {
                        reasoning_steps:
                          chunk.extra_data?.reasoning_steps ??
                          message.extra_data?.reasoning_steps,
                        references:
                          chunk.extra_data?.references ??
                          message.extra_data?.references
                      }
                    }
                  }
                  return message
                })
                return newMessages
              })
            }
            },
            onError: (error) => {
              updateMessagesWithErrorState()
              setStreamingErrorMessage(error.message)
              if (newSessionId) {
                setSessionsData(
                  (prevSessionsData) =>
                    prevSessionsData?.filter(
                      (session) => session.session_id !== newSessionId
                    ) ?? null
                )
              }
            },
            onComplete: () => {}
          })
        }
      } catch (error) {
        updateMessagesWithErrorState()
        setStreamingErrorMessage(
          error instanceof Error ? error.message : String(error)
        )
        if (newSessionId) {
          setSessionsData(
            (prevSessionsData) =>
              prevSessionsData?.filter(
                (session) => session.session_id !== newSessionId
              ) ?? null
          )
        }
      } finally {
        focusChatInput()
        setIsStreaming(false)
      }
    },
    [
      setMessages,
      addMessage,
      updateMessagesWithErrorState,
      selectedEndpoint,
      backend,
      ollamaUrl,
      ollamaModel,
      ragUrl,
      streamResponse,
      agentId,
      teamId,
      mode,
      setStreamingErrorMessage,
      setIsStreaming,
      focusChatInput,
      setSessionsData,
      sessionId,
      setSessionId,
      processChunkToolCalls,
      ollamaSessions,
      setOllamaSessions,
      setOllamaSessionMessages
    ]
  )

  return { handleStreamResponse }
}

export default useAIChatStreamHandler
