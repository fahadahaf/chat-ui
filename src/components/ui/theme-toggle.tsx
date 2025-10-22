'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl border border-primary/15 bg-accent"
      >
        <Icon type="sun" size="xs" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9 rounded-xl border border-primary/15 bg-accent transition-colors hover:bg-accent/80"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Icon type="sun" size="xs" className="text-primary" />
      ) : (
        <Icon type="moon" size="xs" className="text-primary" />
      )}
    </Button>
  )
}

