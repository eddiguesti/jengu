import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

const QUICK_ANSWERS: Record<string, string> = {
  upload:
    'Go to Data page and drag-and-drop your CSV/Excel file. Make sure it has date, price, and occupancy columns.',
  enrich:
    'Navigate to Enrichment page and click "Enrich All" to add weather, holidays, and temporal features.',
  insights:
    'Check the Insights page for 6 interactive charts showing weather impact, occupancy patterns, and competitor dynamics.',
  model:
    'Visit Model page, select XGBoost algorithm, choose 4-6 features, and click "Train Model".',
  optimize:
    'Go to Optimize page and click "Generate Recommendations" to get AI-powered pricing suggestions.',
  settings: 'Update your business profile in Settings page - location is used for weather data.',
}

const SUGGESTED_QUESTIONS = [
  { text: 'How do I upload data?', key: 'upload', action: '/data' },
  { text: 'How to enrich my data?', key: 'enrich', action: '/enrichment' },
  { text: 'View insights?', key: 'insights', action: '/insights' },
  { text: 'Train a model?', key: 'model', action: '/model' },
  { text: 'Get pricing recommendations?', key: 'optimize', action: '/optimize' },
  { text: 'Update settings?', key: 'settings', action: '/settings' },
]

export const FloatingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    []
  )
  const [input, setInput] = useState('')
  const navigate = useNavigate()

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage = input.toLowerCase()
    setMessages(prev => [...prev, { role: 'user', content: input }])

    // Find best answer
    let response =
      'I can help with:\n• Uploading data\n• Enrichment\n• Viewing insights\n• Training models\n• Optimizing prices\n• Settings\n\nClick a suggestion below or visit the AI Assistant page for detailed help!'

    for (const [key, answer] of Object.entries(QUICK_ANSWERS)) {
      if (userMessage.includes(key)) {
        response = answer
        break
      }
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    }, 500)

    setInput('')
  }

  const handleQuestionClick = (key: string, action: string) => {
    setMessages([
      { role: 'user', content: SUGGESTED_QUESTIONS.find(q => q.key === key)?.text || '' },
      { role: 'assistant', content: QUICK_ANSWERS[key] },
    ])

    // Navigate after a short delay
    setTimeout(() => {
      navigate(action)
      setIsOpen(false)
    }, 1500)
  }

  const openFullAssistant = () => {
    navigate('/assistant')
    setIsOpen(false)
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'fixed bottom-6 right-6 z-50',
          'h-14 w-14 rounded-full',
          'bg-primary text-background',
          'shadow-elevated hover:shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-110'
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      {/* Chat Bubble */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="border-border bg-card shadow-elevated fixed bottom-24 right-6 z-50 w-96 overflow-hidden rounded-2xl border"
          >
            {/* Header */}
            <div className="border-border bg-elevated border-b p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <Sparkles className="text-primary h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-text text-sm font-semibold">Jengu AI Assistant</h3>
                  <p className="text-muted text-xs">Always here to help</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-card rounded p-1 transition-colors"
                >
                  <X className="text-muted h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="bg-background h-80 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="bg-primary/10 mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full">
                    <Sparkles className="text-primary h-8 w-8" />
                  </div>
                  <p className="text-text mb-1 text-sm font-medium">Hi! How can I help?</p>
                  <p className="text-muted text-xs">Click a suggestion below or ask me anything</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      'flex gap-2',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={clsx(
                        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                        msg.role === 'user' ? 'bg-primary text-background' : 'bg-elevated text-text'
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Suggested Questions */}
            {messages.length === 0 && (
              <div className="border-border bg-card space-y-2 border-t p-4">
                <p className="text-muted mb-2 text-xs font-medium">Quick help:</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button
                      key={q.key}
                      onClick={() => handleQuestionClick(q.key, q.action)}
                      className="border-border bg-elevated text-text hover:bg-elevated/80 rounded border px-2 py-1.5 text-left text-xs transition-colors"
                    >
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-border bg-card border-t p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="border-border bg-elevated text-text placeholder-muted focus:border-primary focus:ring-primary/50 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-primary text-background hover:bg-primary/90 rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={openFullAssistant}
                className="text-primary hover:text-primary/80 mt-2 w-full text-xs transition-colors"
              >
                Open full AI Assistant →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
