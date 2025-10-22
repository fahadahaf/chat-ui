'use client'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Suspense } from 'react'

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="relative flex h-screen bg-background/80">
        <div className="fixed right-4 top-4 z-50">
          <ThemeToggle />
        </div>
        <Sidebar />
        <ChatArea />
      </div>
    </Suspense>
  )
}
