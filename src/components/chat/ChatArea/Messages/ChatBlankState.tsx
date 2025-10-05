'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import Icon from '@/components/ui/icon'

const ChatBlankState = () => {
  return (
    <section
      className="flex flex-col items-center text-center font-geist"
      aria-label="Welcome message"
    >
      <div className="flex max-w-3xl flex-col gap-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="rounded-full bg-primary/10 p-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome to ChatUI AI Assistant
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Use the text box below to enter your queries. You can also run pre-defined queries using the{' '}
            <span className="inline-flex items-center gap-1">
              <Icon type="file-code" size="xs" />
            </span>{' '}
            button next to the chat input box.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export default ChatBlankState
