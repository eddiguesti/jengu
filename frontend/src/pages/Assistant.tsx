import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Send, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { Card, Button } from '../components/ui'
import clsx from 'clsx'
import { sendMessage, type Message, type AssistantContext } from '../lib/api/services/assistant'
import { useBusinessStore } from '../stores/useBusinessStore'
import { useDataStore } from '../stores/useDataStore'

const SUGGESTED_QUESTIONS = [
  'What are my top pricing recommendations for this week?',
  'How should I adjust prices based on current weather?',
  'Analyze my recent booking performance',
  'What factors most influence my pricing?',
  'How do I compare to competitor pricing?',
  'Should I increase or decrease prices tomorrow?',
]

export const Assistant = () => {
  const profile = useBusinessStore(state => state.profile)
  const { uploadedFiles } = useDataStore()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm Jengu AI, your intelligent pricing assistant. I can analyze your data, provide recommendations, and help you optimize your pricing strategy. What would you like to know?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  // Build context from business profile and uploaded data
  const buildContext = (): AssistantContext => {
    const context: AssistantContext = {}

    if (profile) {
      context.businessName = profile.business_name
      context.location = `${profile.location.city}, ${profile.location.country}`
      context.currency = profile.currency
    }

    // Add data insights if available
    if (uploadedFiles.length > 0) {
      const totalRows = uploadedFiles.reduce((sum, f) => sum + f.rows, 0)
      context.currentData = {
        totalBookings: totalRows,
      }
    }

    return context
  }

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    setStreamingContent('')
    setError(null)

    try {
      const context = buildContext()
      const conversationHistory = messages.slice(1) // Exclude welcome message

      // Stream response
      let fullResponse = ''
      const assistantMessageId = (Date.now() + 1).toString()

      await sendMessage(userMessage.content, conversationHistory, context, {
        onToken: token => {
          fullResponse += token
          setStreamingContent(fullResponse)
        },
        onComplete: response => {
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: response,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, assistantMessage])
          setStreamingContent('')
          setIsTyping(false)
        },
        onError: err => {
          setError(err.message)
          setIsTyping(false)
          setStreamingContent('')
        },
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      setIsTyping(false)
      setStreamingContent('')
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-text text-4xl font-bold">AI Assistant</h1>
        <p className="text-muted mt-2">Get help, guidance, and personalized recommendations</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <Card variant="default" className="flex h-[600px] flex-col">
            {/* Error Banner */}
            {error && (
              <div className="border-error/20 bg-error/10 flex items-center gap-2 border-b px-6 py-3">
                <AlertCircle className="text-error h-4 w-4" />
                <span className="text-error text-sm">{error}</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={clsx(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                      <Sparkles className="text-primary h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={clsx(
                      'max-w-[80%] rounded-lg px-4 py-3',
                      message.role === 'user'
                        ? 'bg-primary text-background'
                        : 'bg-elevated text-text'
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    <div
                      className={clsx(
                        'mt-2 text-xs',
                        message.role === 'user' ? 'text-background/60' : 'text-muted'
                      )}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="bg-elevated flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                      <MessageCircle className="text-text h-4 w-4" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Streaming Response */}
              {isTyping && streamingContent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                    <Sparkles className="text-primary h-4 w-4" />
                  </div>
                  <div className="bg-elevated max-w-[80%] rounded-lg px-4 py-3">
                    <div className="text-text whitespace-pre-wrap text-sm">{streamingContent}</div>
                  </div>
                </motion.div>
              )}

              {/* Typing Indicator (no content yet) */}
              {isTyping && !streamingContent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                    <Sparkles className="text-primary h-4 w-4" />
                  </div>
                  <div className="bg-elevated rounded-lg px-4 py-3">
                    <Loader2 className="text-primary h-4 w-4 animate-spin" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-border border-t p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything about Jengu..."
                  className="border-border bg-elevated text-text placeholder-muted focus:border-primary focus:ring-primary/50 flex-1 rounded-lg border px-4 py-2 focus:outline-none focus:ring-2"
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Questions */}
          <Card variant="default">
            <Card.Header>
              <h3 className="text-text text-lg font-semibold">Suggested Questions</h3>
              <p className="text-muted mt-1 text-sm">Click to ask</p>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="border-border bg-elevated text-text hover:bg-elevated/80 w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </Card.Body>
          </Card>

          {/* Quick Links */}
          <Card variant="default">
            <Card.Header>
              <h3 className="text-text text-lg font-semibold">Quick Links</h3>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2">
                <a
                  href="/dashboard"
                  className="border-border bg-elevated text-primary hover:bg-elevated/80 block rounded-lg border px-3 py-2 text-sm transition-colors"
                >
                  → Dashboard
                </a>
                <a
                  href="/data"
                  className="border-border bg-elevated text-primary hover:bg-elevated/80 block rounded-lg border px-3 py-2 text-sm transition-colors"
                >
                  → Data Management
                </a>
                <a
                  href="/pricing-engine"
                  className="border-border bg-elevated text-primary hover:bg-elevated/80 block rounded-lg border px-3 py-2 text-sm transition-colors"
                >
                  → Pricing Optimizer
                </a>
                <a
                  href="/insights"
                  className="border-border bg-elevated text-primary hover:bg-elevated/80 block rounded-lg border px-3 py-2 text-sm transition-colors"
                >
                  → View Insights
                </a>
                <a
                  href="/settings"
                  className="border-border bg-elevated text-primary hover:bg-elevated/80 block rounded-lg border px-3 py-2 text-sm transition-colors"
                >
                  → Settings
                </a>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
