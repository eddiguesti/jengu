import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import clsx from 'clsx'

const QUICK_ANSWERS: Record<string, string> = {
  upload: 'Go to Data page and drag-and-drop your CSV/Excel file. Make sure it has date, price, and occupancy columns.',
  enrich: 'Navigate to Enrichment page and click "Enrich All" to add weather, holidays, and temporal features.',
  insights: 'Check the Insights page for 6 interactive charts showing weather impact, occupancy patterns, and competitor dynamics.',
  model: 'Visit Model page, select XGBoost algorithm, choose 4-6 features, and click "Train Model".',
  optimize: 'Go to Optimize page and click "Generate Recommendations" to get AI-powered pricing suggestions.',
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
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const navigate = useNavigate()

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage = input.toLowerCase()
    setMessages((prev) => [...prev, { role: 'user', content: input }])

    // Find best answer
    let response = "I can help with:\n• Uploading data\n• Enrichment\n• Viewing insights\n• Training models\n• Optimizing prices\n• Settings\n\nClick a suggestion below or visit the AI Assistant page for detailed help!"

    for (const [key, answer] of Object.entries(QUICK_ANSWERS)) {
      if (userMessage.includes(key)) {
        response = answer
        break
      }
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: response }])
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
          'w-14 h-14 rounded-full',
          'bg-primary text-background',
          'shadow-elevated hover:shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-200 hover:scale-110'
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </motion.button>

      {/* Chat Bubble */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-96 bg-card border border-border rounded-2xl shadow-elevated overflow-hidden"
          >
            {/* Header */}
            <div className="bg-elevated p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-text">Jengu AI Assistant</h3>
                  <p className="text-xs text-muted">Always here to help</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-card rounded transition-colors"
                >
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-background">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-text font-medium mb-1">Hi! How can I help?</p>
                  <p className="text-xs text-muted">Click a suggestion below or ask me anything</p>
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
                        msg.role === 'user'
                          ? 'bg-primary text-background'
                          : 'bg-elevated text-text'
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
              <div className="p-4 border-t border-border bg-card space-y-2">
                <p className="text-xs font-medium text-muted mb-2">Quick help:</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q.key}
                      onClick={() => handleQuestionClick(q.key, q.action)}
                      className="text-xs text-left px-2 py-1.5 bg-elevated hover:bg-elevated/80 rounded border border-border transition-colors text-text"
                    >
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border bg-card">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-3 py-2 text-sm bg-elevated border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={openFullAssistant}
                className="w-full mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
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
