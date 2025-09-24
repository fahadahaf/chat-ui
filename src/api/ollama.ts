export interface OllamaModel {
  name: string
  model: string
}

export const getOllamaStatus = async (base: string): Promise<number> => {
  try {
    const url = `/api/ollama/tags?base=${encodeURIComponent(base)}`
    const res = await fetch(url, { method: 'GET' })
    return res.ok ? 200 : res.status
  } catch {
    return 503
  }
}

type OllamaTagsResponse = {
  models: Array<{
    name: string
    model?: string
  }>
}

export const getOllamaModels = async (base: string): Promise<OllamaModel[]> => {
  try {
    const url = `/api/ollama/tags?base=${encodeURIComponent(base)}`
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) return []
    const data = (await res.json()) as Partial<OllamaTagsResponse>
    const models = Array.isArray(data?.models) ? data.models : []
    return models.map((m) => ({ name: m.name, model: m.model || m.name }))
  } catch {
    return []
  }
}


