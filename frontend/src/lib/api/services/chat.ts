import apiClient from '../client'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  success: boolean
  message: string
  function_call?: {
    name: string
    arguments: Record<string, any>
  }
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  fallback?: boolean
}

export interface SuggestionItem {
  id: string
  title: string
  description: string
  icon: string
  action?: string
  actionParams?: Record<string, any>
  question?: string
}

export interface SuggestionsResponse {
  success: boolean
  suggestions: SuggestionItem[]
  userContext: {
    hasFiles: boolean
    fileCount: number
    hasUnenrichedFiles: boolean
  }
}

/**
 * Send chat message and get AI response
 */
export async function sendChatMessage(params: {
  messages: ChatMessage[]
  currentPage?: string
}): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>('/chat', params)
  return response.data
}

/**
 * Get conversation starter suggestions
 */
export async function getChatSuggestions(): Promise<SuggestionsResponse> {
  const response = await apiClient.get<SuggestionsResponse>('/chat/suggestions')
  return response.data
}

/**
 * Execute a function call from the AI
 */
export async function executeFunctionCall(params: {
  functionName: string
  arguments: Record<string, any>
}): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/chat/execute-function', params)
  return response.data
}
