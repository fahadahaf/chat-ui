import Icon from '@/components/ui/icon'
import MarkdownRenderer from '@/components/ui/typography/MarkdownRenderer'
import { useStore } from '@/store'
import type { ChatMessage } from '@/types/os'
import Videos from './Multimedia/Videos'
import Images from './Multimedia/Images'
import Audios from './Multimedia/Audios'
import { memo, useState } from 'react'
import AgentThinkingLoader from './AgentThinkingLoader'
import { DataTable } from '@/components/ui/typography/MarkdownRenderer'

interface MessageProps {
  message: ChatMessage
}

const AgentMessage = ({ message }: MessageProps) => {
  const { streamingErrorMessage } = useStore()
  const [showReasoning, setShowReasoning] = useState(false)
  let messageContent
  if (message.streamingError) {
    messageContent = (
      <p className="text-destructive">
        Oops! Something went wrong while streaming.{' '}
        {streamingErrorMessage ? (
          <>{streamingErrorMessage}</>
        ) : (
          'Please try refreshing the page or try again later.'
        )}
      </p>
    )
  } else if (message.content || message.extra_data?.table) {
    messageContent = (
      <div className="flex w-full flex-col gap-4">
        {message.extra_data?.table && (
          <div className="rounded-md border border-primary/15 bg-background-secondary p-3">
            {message.extra_data.table.title && (
              <p className="mb-2 text-xs uppercase text-primary">{message.extra_data.table.title}</p>
            )}
            <DataTable columns={message.extra_data.table.columns} rows={message.extra_data.table.rows} />
          </div>
        )}
        {message.extra_data?.reasoning_text && (
          <div className="rounded-md border border-primary/15 bg-background-secondary p-3">
            <button
              className="text-xs uppercase text-primary"
              onClick={() => setShowReasoning((s) => !s)}
            >
              {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
            </button>
            {showReasoning && (
              <div className="mt-2 text-sm text-secondary">
                <MarkdownRenderer>
                  {message.extra_data.reasoning_text}
                </MarkdownRenderer>
              </div>
            )}
          </div>
        )}
        <MarkdownRenderer>{message.content}</MarkdownRenderer>
        {message.videos && message.videos.length > 0 && (
          <Videos videos={message.videos} />
        )}
        {message.images && message.images.length > 0 && (
          <Images images={message.images} />
        )}
        {message.audio && message.audio.length > 0 && (
          <Audios audio={message.audio} />
        )}
      </div>
    )
  } else if (message.response_audio) {
    if (!message.response_audio.transcript) {
      messageContent = (
        <div className="mt-2 flex items-start">
          <AgentThinkingLoader />
        </div>
      )
    } else {
      messageContent = (
        <div className="flex w-full flex-col gap-4">
          <MarkdownRenderer>
            {message.response_audio.transcript}
          </MarkdownRenderer>
          {message.response_audio.content && message.response_audio && (
            <Audios audio={[message.response_audio]} />
          )}
        </div>
      )
    }
  } else {
    messageContent = (
      <div className="mt-2">
        <AgentThinkingLoader />
      </div>
    )
  }

  return (
    <div className="flex flex-row items-start gap-4 font-geist">
      <div className="flex-shrink-0">
        <Icon type="agent" size="sm" />
      </div>
      {messageContent}
    </div>
  )
}

const UserMessage = memo(({ message }: MessageProps) => {
  return (
    <div className="flex items-start gap-4 pt-4 text-start max-md:break-words">
      <div className="flex-shrink-0">
        <Icon type="user" size="sm" />
      </div>
      <div className="text-md rounded-lg font-geist text-secondary">
        {message.content}
      </div>
    </div>
  )
})

AgentMessage.displayName = 'AgentMessage'
UserMessage.displayName = 'UserMessage'
export { AgentMessage, UserMessage }
