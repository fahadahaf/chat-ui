import { useCallback } from 'react'
import { toast } from 'sonner'

import { useStore } from '../store'

import { AgentDetails, TeamDetails, type ChatMessage } from '@/types/os'
import { getAgentsAPI, getStatusAPI, getTeamsAPI } from '@/api/os'
import { getOllamaModels, getOllamaStatus } from '@/api/ollama'
import { useQueryState } from 'nuqs'

const useChatActions = () => {
  const { chatInputRef } = useStore()
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const backend = useStore((state) => state.backend)
  const ollamaUrl = useStore((state) => state.ollamaUrl)
  const setOllamaModel = useStore((state) => state.setOllamaModel)
  const [, setSessionId] = useQueryState('session')
  const setMessages = useStore((state) => state.setMessages)
  const setIsEndpointActive = useStore((state) => state.setIsEndpointActive)
  const setIsEndpointLoading = useStore((state) => state.setIsEndpointLoading)
  const setAgents = useStore((state) => state.setAgents)
  const setTeams = useStore((state) => state.setTeams)
  const setSelectedModel = useStore((state) => state.setSelectedModel)
  const setMode = useStore((state) => state.setMode)
  const [agentId, setAgentId] = useQueryState('agent')
  const [teamId, setTeamId] = useQueryState('team')
  const [, setDbId] = useQueryState('db_id')

  const getStatus = useCallback(async () => {
    try {
      if (backend === 'ollama') {
        return await getOllamaStatus(ollamaUrl)
      } else {
        return await getStatusAPI(selectedEndpoint)
      }
    } catch {
      return 503
    }
  }, [selectedEndpoint, backend, ollamaUrl])

  const getAgents = useCallback(async () => {
    try {
      if (backend === 'ollama') {
        // For Ollama, synthesize "agents" from available models
        const models = await getOllamaModels(ollamaUrl)
        return models.map((m) => ({
          id: m.name,
          name: m.name,
          model: { name: m.name, model: m.name, provider: 'ollama' }
        }))
      } else {
        const agents = await getAgentsAPI(selectedEndpoint)
        return agents
      }
    } catch {
      toast.error('Error fetching agents')
      return []
    }
  }, [selectedEndpoint, backend, ollamaUrl])

  const getTeams = useCallback(async () => {
    try {
      if (backend === 'ollama') {
        // No teams concept for Ollama
        return []
      } else {
        const teams = await getTeamsAPI(selectedEndpoint)
        return teams
      }
    } catch {
      toast.error('Error fetching teams')
      return []
    }
  }, [selectedEndpoint, backend])

  const clearChat = useCallback(() => {
    setMessages([])
    setSessionId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusChatInput = useCallback(() => {
    setTimeout(() => {
      requestAnimationFrame(() => chatInputRef?.current?.focus())
    }, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, message])
    },
    [setMessages]
  )

  const initialize = useCallback(async () => {
    setIsEndpointLoading(true)
    try {
      const status = await getStatus()
      let agents: AgentDetails[] = []
      let teams: TeamDetails[] = []
      if (status === 200) {
        setIsEndpointActive(true)
        teams = await getTeams()
        agents = await getAgents()
        console.log(' is active', teams, agents)

        if (!agentId && !teamId) {
          const currentMode = useStore.getState().mode
          console.log('Current mode:', currentMode)

          if (currentMode === 'team' && teams.length > 0) {
            const firstTeam = teams[0]
            setTeamId(firstTeam.id)
            setSelectedModel(firstTeam.model?.provider || '')
            setDbId(firstTeam.db_id || '')
            setAgentId(null)
            setTeams(teams)
          } else if (currentMode === 'agent' && agents.length > 0) {
            const firstAgent = agents[0]
            setMode('agent')
            setAgentId(firstAgent.id)
            setSelectedModel(firstAgent.model?.model || '')
            if (backend === 'ollama') setOllamaModel(firstAgent.model?.model || '')
            setDbId(firstAgent.db_id || '')
            setAgents(agents)
          }
        } else {
          setAgents(agents)
          setTeams(teams)
          if (agentId) {
            const agent = agents.find((a) => a.id === agentId)
            if (agent) {
              setMode('agent')
              setSelectedModel(agent.model?.model || '')
              if (backend === 'ollama') setOllamaModel(agent.model?.model || '')
              setDbId(agent.db_id || '')
              setTeamId(null)
            } else if (agents.length > 0) {
              const firstAgent = agents[0]
              setMode('agent')
              setAgentId(firstAgent.id)
              setSelectedModel(firstAgent.model?.model || '')
              if (backend === 'ollama') setOllamaModel(firstAgent.model?.model || '')
              setDbId(firstAgent.db_id || '')
              setTeamId(null)
            }
          } else if (teamId) {
            const team = teams.find((t) => t.id === teamId)
            if (team) {
              setMode('team')
              setSelectedModel(team.model?.provider || '')
              setDbId(team.db_id || '')
              setAgentId(null)
            } else if (teams.length > 0) {
              const firstTeam = teams[0]
              setMode('team')
              setTeamId(firstTeam.id)
              setSelectedModel(firstTeam.model?.provider || '')
              setDbId(firstTeam.db_id || '')
              setAgentId(null)
            }
          }
        }
      } else {
        setIsEndpointActive(false)
        setMode('agent')
        setSelectedModel('')
        setAgentId(null)
        setTeamId(null)
      }
      return { agents, teams }
    } catch (error) {
      console.error('Error initializing :', error)
      setIsEndpointActive(false)
      setMode('agent')
      setSelectedModel('')
      setAgentId(null)
      setTeamId(null)
      setAgents([])
      setTeams([])
    } finally {
      setIsEndpointLoading(false)
    }
  }, [
    getStatus,
    getAgents,
    getTeams,
    setIsEndpointActive,
    setIsEndpointLoading,
    setAgents,
    setTeams,
    setAgentId,
    setSelectedModel,
    setMode,
    setTeamId,
    setDbId,
    agentId,
    teamId,
    backend,
    setOllamaModel
  ])

  return {
    clearChat,
    addMessage,
    getAgents,
    focusChatInput,
    getTeams,
    initialize
  }
}

export default useChatActions
