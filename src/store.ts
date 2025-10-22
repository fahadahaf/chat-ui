import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  AgentDetails,
  SessionEntry,
  TeamDetails,
  type ChatMessage
} from '@/types/os'

interface Store {
  hydrated: boolean
  setHydrated: () => void
  streamingErrorMessage: string
  setStreamingErrorMessage: (streamingErrorMessage: string) => void
  // Backend selection
  backend: 'ollama' | 'amazon'
  setBackend: (backend: 'ollama' | 'amazon') => void
  endpoints: {
    endpoint: string
    id__endpoint: string
  }[]
  setEndpoints: (
    endpoints: {
      endpoint: string
      id__endpoint: string
    }[]
  ) => void
  isStreaming: boolean
  setIsStreaming: (isStreaming: boolean) => void
  // Track which sessions are currently streaming
  streamingSessionIds: Set<string>
  addStreamingSession: (sessionId: string) => void
  removeStreamingSession: (sessionId: string) => void
  isEndpointActive: boolean
  setIsEndpointActive: (isActive: boolean) => void
  isEndpointLoading: boolean
  setIsEndpointLoading: (isLoading: boolean) => void
  messages: ChatMessage[]
  setMessages: (
    messages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])
  ) => void
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>
  selectedEndpoint: string
  setSelectedEndpoint: (selectedEndpoint: string) => void
  // Ollama settings
  ollamaUrl: string
  setOllamaUrl: (url: string) => void
  ollamaModel: string
  setOllamaModel: (model: string) => void
  // Amazon settings
  amazonRegion: string
  setAmazonRegion: (region: string) => void
  amazonEndpoint: string
  setAmazonEndpoint: (endpoint: string) => void
  // RAG settings
  ragUrl: string
  setRagUrl: (url: string) => void
  agents: AgentDetails[]
  setAgents: (agents: AgentDetails[]) => void
  teams: TeamDetails[]
  setTeams: (teams: TeamDetails[]) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  mode: 'agent' | 'team'
  setMode: (mode: 'agent' | 'team') => void
  sessionsData: SessionEntry[] | null
  setSessionsData: (
    sessionsData:
      | SessionEntry[]
      | ((prevSessions: SessionEntry[] | null) => SessionEntry[] | null)
  ) => void
  isSessionsLoading: boolean
  setIsSessionsLoading: (isSessionsLoading: boolean) => void
  // User role (temporary until auth integration)
  userRole: 'admin' | 'user'
  setUserRole: (role: 'admin' | 'user') => void
  authUserId?: string
  setAuthUserId: (id?: string) => void
  // Ollama local sessions
  ollamaSessions: SessionEntry[]
  setOllamaSessions: (
    sessions:
      | SessionEntry[]
      | ((prev: SessionEntry[]) => SessionEntry[])
  ) => void
  ollamaSessionMessages: Record<string, ChatMessage[]>
  setOllamaSessionMessages: (
    updater:
      | Record<string, ChatMessage[]>
      | ((prev: Record<string, ChatMessage[]>) => Record<string, ChatMessage[]>)
  ) => void
  // Amazon local sessions
  amazonSessions: SessionEntry[]
  setAmazonSessions: (
    sessions:
      | SessionEntry[]
      | ((prev: SessionEntry[]) => SessionEntry[])
  ) => void
  amazonSessionMessages: Record<string, ChatMessage[]>
  setAmazonSessionMessages: (
    updater:
      | Record<string, ChatMessage[]>
      | ((prev: Record<string, ChatMessage[]>) => Record<string, ChatMessage[]>)
  ) => void
  // Session-specific input text storage
  sessionInputs: Record<string, string>
  setSessionInput: (sessionId: string, text: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      streamingErrorMessage: '',
      setStreamingErrorMessage: (streamingErrorMessage) =>
        set(() => ({ streamingErrorMessage })),
      backend: 'ollama',
      setBackend: (backend) => set(() => ({ backend })),
      endpoints: [],
      setEndpoints: (endpoints) => set(() => ({ endpoints })),
      isStreaming: false,
      setIsStreaming: (isStreaming) => set(() => ({ isStreaming })),
      streamingSessionIds: new Set<string>(),
      addStreamingSession: (sessionId) => 
        set((state) => {
          const newSet = new Set(state.streamingSessionIds)
          newSet.add(sessionId)
          return { streamingSessionIds: newSet }
        }),
      removeStreamingSession: (sessionId) => 
        set((state) => {
          const newSet = new Set(state.streamingSessionIds)
          newSet.delete(sessionId)
          return { streamingSessionIds: newSet }
        }),
      isEndpointActive: false,
      setIsEndpointActive: (isActive) =>
        set(() => ({ isEndpointActive: isActive })),
      isEndpointLoading: true,
      setIsEndpointLoading: (isLoading) =>
        set(() => ({ isEndpointLoading: isLoading })),
      messages: [],
      setMessages: (messages) =>
        set((state) => ({
          messages:
            typeof messages === 'function' ? messages(state.messages) : messages
        })),
      chatInputRef: { current: null },
      selectedEndpoint: 'http://localhost:7777',
      setSelectedEndpoint: (selectedEndpoint) =>
        set(() => ({ selectedEndpoint })),
      ollamaUrl: 'http://localhost:11434',
      setOllamaUrl: (url) => set(() => ({ ollamaUrl: url })),
      ollamaModel: '',
      setOllamaModel: (model) => set(() => ({ ollamaModel: model })),
      amazonRegion: '',
      setAmazonRegion: (region) => set(() => ({ amazonRegion: region })),
      amazonEndpoint: '',
      setAmazonEndpoint: (endpoint) => set(() => ({ amazonEndpoint: endpoint })),
      ragUrl: 'http://localhost:8000',
      setRagUrl: (url) => set(() => ({ ragUrl: url })),
      agents: [],
      setAgents: (agents) => set({ agents }),
      teams: [],
      setTeams: (teams) => set({ teams }),
      selectedModel: '',
      setSelectedModel: (selectedModel) => set(() => ({ selectedModel })),
      mode: 'agent',
      setMode: (mode) => set(() => ({ mode })),
      sessionsData: null,
      setSessionsData: (sessionsData) =>
        set((state) => ({
          sessionsData:
            typeof sessionsData === 'function'
              ? sessionsData(state.sessionsData)
              : sessionsData
        })),
      isSessionsLoading: false,
      setIsSessionsLoading: (isSessionsLoading) =>
        set(() => ({ isSessionsLoading })),
      userRole: 'user',
      setUserRole: (role) => set(() => ({ userRole: role })),
      authUserId: undefined,
      setAuthUserId: (id) => set(() => ({ authUserId: id })),
      ollamaSessions: [],
      setOllamaSessions: (sessions) =>
        set((state) => ({
          ollamaSessions:
            typeof sessions === 'function' ? sessions(state.ollamaSessions) : sessions
        })),
      ollamaSessionMessages: {},
      setOllamaSessionMessages: (updater) =>
        set((state) => ({
          ollamaSessionMessages:
            typeof updater === 'function'
              ? (updater as (prev: Record<string, ChatMessage[]>) => Record<string, ChatMessage[]>) (
                  state.ollamaSessionMessages
                )
              : updater
        })),
      amazonSessions: [],
      setAmazonSessions: (sessions) =>
        set((state) => ({
          amazonSessions:
            typeof sessions === 'function' ? sessions(state.amazonSessions) : sessions
        })),
      amazonSessionMessages: {},
      setAmazonSessionMessages: (updater) =>
        set((state) => ({
          amazonSessionMessages:
            typeof updater === 'function'
              ? (updater as (prev: Record<string, ChatMessage[]>) => Record<string, ChatMessage[]>) (
                  state.amazonSessionMessages
                )
              : updater
        })),
      // Session-specific input text storage
      sessionInputs: {},
      setSessionInput: (sessionId, text) =>
        set((state) => ({
          sessionInputs: {
            ...state.sessionInputs,
            [sessionId]: text
          }
        }))
    }),
    {
      name: 'endpoint-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedEndpoint: state.selectedEndpoint,
        backend: state.backend,
        ollamaUrl: state.ollamaUrl,
        ollamaModel: state.ollamaModel,
        amazonRegion: state.amazonRegion,
        amazonEndpoint: state.amazonEndpoint,
        // Do not persist per-user sessions/messages to avoid leakage across users
        ragUrl: state.ragUrl
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.()
      }
    }
  )
)
