import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Send, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { Card, Button, Input } from '../components/ui'
import clsx from 'clsx'
import { sendMessage, type Message, type AssistantContext } from '../lib/api/services/assistant'
import { useBusinessStore } from '../store/useBusinessStore'
import { useDataStore } from '../store/useDataStore'

const SUGGESTED_QUESTIONS = [
  'What are my top pricing recommendations for this week?',
  'How should I adjust prices based on current weather?',
  'Analyze my recent booking performance',
  'What factors most influence my pricing?',
  'How do I compare to competitor pricing?',
  'Should I increase or decrease prices tomorrow?',
]

export const Assistant = () => {
  const profile = useBusinessStore((state) => state.profile)
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

    setMessages((prev) => [...prev, userMessage])
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

      await sendMessage(
        userMessage.content,
        conversationHistory,
        context,
        {
          onToken: (token) => {
            fullResponse += token
            setStreamingContent(fullResponse)
          },
          onComplete: (response) => {
            const assistantMessage: Message = {
              id: assistantMessageId,
              role: 'assistant',
              content: response,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, assistantMessage])
            setStreamingContent('')
            setIsTyping(false)
          },
          onError: (err) => {
            setError(err.message)
            setIsTyping(false)
            setStreamingContent('')
          },
        }
      )
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
        <h1 className="text-4xl font-bold text-text">AI Assistant</h1>
        <p className="text-muted mt-2">Get help, guidance, and personalized recommendations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <Card variant="default" className="flex flex-col h-[600px]">
            {/* Error Banner */}
            {error && (
              <div className="bg-error/10 border-b border-error/20 px-6 py-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error" />
                <span className="text-sm text-error">{error}</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
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
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
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
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={clsx(
                        'text-xs mt-2',
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
                    <div className="flex-shrink-0 w-8 h-8 bg-elevated rounded-full flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-text" />
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
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="max-w-[80%] bg-elevated rounded-lg px-4 py-3">
                    <div className="text-sm whitespace-pre-wrap text-text">{streamingContent}</div>
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
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-elevated rounded-lg px-4 py-3">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything about Jengu..."
                  className="flex-1 px-4 py-2 bg-elevated border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                >
                  <Send className="w-5 h-5" />
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
              <h3 className="text-lg font-semibold text-text">Suggested Questions</h3>
              <p className="text-sm text-muted mt-1">Click to ask</p>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="w-full text-left px-3 py-2 bg-elevated hover:bg-elevated/80 rounded-lg border border-border transition-colors text-sm text-text"
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
              <h3 className="text-lg font-semibold text-text">Quick Links</h3>
            </Card.Header>
            <Card.Body>
              <div className="space-y-2">
                <a
                  href="/dashboard"
                  className="block px-3 py-2 bg-elevated hover:bg-elevated/80 rounded-lg border border-border transition-colors text-sm text-primary"
                >
                  → Dashboard
                </a>
                <a
                  href="/data"
                  className="block px-3 py-2 bg-elevated hover:bg-elevated/80 rounded-lg border border-border transition-colors text-sm text-primary"
                >
                  → Data Management
                </a>
                <a
                  href="/pricing-engine"
                  className="block px-3 py-2 bg-elevated hover:bg-elevated/80 rounded-lg border border-border transition-colors text-sm text-primary"
                >
                  → Pricing Optimizer
                </a>
                <a
                  href="/insights"
                  className="block px-3 py-2 bg-elevated hover:bg-elevated/80 rounded-lg border border-border transition-colors text-sm text-primary"
                >
                  → View Insights
                </a>
                <a
                  href="/settings"
                  className="block px-3 py-2 bg-elevated hover:bg-elevated/80 rounded-lg border border-border transition-colors text-sm text-primary"
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
