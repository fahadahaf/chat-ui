'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { TextArea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import useAIChatStreamHandler from '@/hooks/useAIStreamHandler'
import usePredefinedQueryExecution from '@/hooks/usePredefinedQueryExecution'
import { useQueryState } from 'nuqs'
import Icon from '@/components/ui/icon'
import PredefinedQueryDialog from './PredefinedQueryDialog'

const ChatInput = () => {
  const { chatInputRef } = useStore()
  const backend = useStore((state) => state.backend)
  const ollamaModel = useStore((state) => state.ollamaModel)

  const { handleStreamResponse } = useAIChatStreamHandler()
  const { executePredefinedQuery } = usePredefinedQueryExecution()
  const [selectedAgent] = useQueryState('agent')
  const [teamId] = useQueryState('team')
  const [sessionId] = useQueryState('session')
  const sessionInputs = useStore((state) => state.sessionInputs)
  const setSessionInput = useStore((state) => state.setSessionInput)
  const isStreaming = useStore((state) => state.isStreaming)
  const streamingSessionIds = useStore((state) => state.streamingSessionIds)
  const [isQueryDialogOpen, setIsQueryDialogOpen] = useState(false)
  
  // Local state for when there's no session yet (first time / no chats)
  const [localInputMessage, setLocalInputMessage] = useState('')
  
  // Check if the current session is streaming
  const isCurrentSessionStreaming = sessionId ? streamingSessionIds.has(sessionId) : false
  
  // Get current session's input text (use local state if no session exists)
  const inputMessage = sessionId ? (sessionInputs[sessionId] || '') : localInputMessage
  
  // Update session-specific input text (use local state if no session exists)
  const setInputMessage = (text: string) => {
    if (sessionId) {
      setSessionInput(sessionId, text)
    } else {
      // No session yet, use local state
      setLocalInputMessage(text)
    }
  }
  
  // When session is created, transfer local input to session storage and clear local
  useEffect(() => {
    if (sessionId && localInputMessage) {
      setSessionInput(sessionId, localInputMessage)
      setLocalInputMessage('')
    }
  }, [sessionId, localInputMessage, setSessionInput])

  const handleSubmit = async () => {
    if (!inputMessage.trim()) return

    const currentMessage = inputMessage
    setInputMessage('')

    try {
      await handleStreamResponse(currentMessage)
    } catch (error) {
      toast.error(
        `Error in handleSubmit: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  const handlePredefinedQueryExecute = async (queryName: string, parameters: Record<string, string>) => {
    try {
      await executePredefinedQuery(queryName, parameters)
    } catch (error) {
      toast.error(
        `Error executing predefined query: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  return (
    <>
      <div className="relative mx-auto mb-1 flex w-full max-w-2xl items-end justify-center gap-x-2 font-geist">
        {(backend === 'ollama' || backend === 'amazon') && (
          <Button
            onClick={() => setIsQueryDialogOpen(true)}
            disabled={isCurrentSessionStreaming}
            size="icon"
            className="rounded-xl bg-primary p-5 text-primaryAccent"
            title="Predefined Queries"
          >
            <Icon type="file-code" color="primaryAccent" />
          </Button>
        )}
        <TextArea
          placeholder={'Ask anything'}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              !e.shiftKey &&
              !isCurrentSessionStreaming
            ) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          className="w-full border border-accent bg-primaryAccent px-4 text-sm text-primary focus:border-accent"
          disabled={backend === 'ollama' ? !ollamaModel : false}
          ref={chatInputRef}
        />
        <Button
          onClick={handleSubmit}
          disabled={
            (backend === 'ollama' ? !ollamaModel : false) || 
            !inputMessage.trim() || 
            isCurrentSessionStreaming
          }
          size="icon"
          className="rounded-xl bg-primary p-5 text-primaryAccent"
        >
          <Icon type="send" color="primaryAccent" />
        </Button>
      </div>
      
      <PredefinedQueryDialog
        isOpen={isQueryDialogOpen}
        onClose={() => setIsQueryDialogOpen(false)}
        onExecute={handlePredefinedQueryExecute}
      />
    </>
  )
}

export default ChatInput
