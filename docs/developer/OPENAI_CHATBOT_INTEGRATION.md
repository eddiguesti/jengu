# OpenAI Chatbot Integration

**Status**: ✅ Backend Complete, Frontend Pending
**Last Updated**: 2025-11-03
**Purpose**: AI-powered chatbot assistant for app navigation and pricing rule implementation

---

## Overview

Integrated OpenAI GPT-4 to power the Jengu chatbot assistant with:

- **App Navigation**: AI can navigate users to different pages
- **Context-Aware Help**: Knows user's current state (uploaded data, current page)
- **Function Calling**: Can execute actions (upload data, run enrichment, create pricing rules)
- **Pricing Strategy Guidance**: Explains analytics and suggests optimizations

## API Key Configuration

**Backend (.env)**:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**⚠️ Security Note**: API key is stored in backend `.env` file only. Frontend never accesses it.

## Architecture

### Backend Components

**1. OpenAI Service** ([backend/services/openaiService.ts](../../backend/services/openaiService.ts))

- Initializes OpenAI client
- Defines 6 function definitions for AI actions:
  - `navigate_to_page` - Navigate to dashboard/data/analytics/pricing/etc.
  - `upload_data` - Guide user to upload pricing data
  - `run_enrichment` - Suggest running data enrichment
  - `get_pricing_recommendations` - Generate ML pricing recommendations
  - `explain_analytics` - Explain metrics (elasticity, demand forecast, etc.)
  - `create_pricing_rule` - Help create custom pricing rules
- Provides system prompt with app context
- Handles chat completions (streaming and non-streaming)

**2. Chat API Routes** ([backend/routes/chat.ts](../../backend/routes/chat.ts))

- `POST /api/chat` - Send message, get AI response
- `GET /api/chat/suggestions` - Get context-aware conversation starters
- `POST /api/chat/execute-function` - Execute AI function calls

**3. Server Registration** ([backend/server.ts](../../backend/server.ts))

```typescript
import chatRouter from './routes/chat.js'
app.use('/api/chat', chatRouter)
```

### Frontend Components

**1. Chat Service** ([frontend/src/lib/api/services/chat.ts](../../frontend/src/lib/api/services/chat.ts))

- `sendChatMessage()` - Send user message to AI
- `getChatSuggestions()` - Get conversation starters
- `executeFunctionCall()` - Execute AI-requested actions

**2. FloatingAssistant Component** (TO BE UPDATED)

- Located at: [frontend/src/components/layout/FloatingAssistant.tsx](../../frontend/src/components/layout/FloatingAssistant.tsx)
- Currently uses mock data
- **TODO**: Replace with real OpenAI integration using chat service

## System Prompt Context

The AI assistant has context about:

- **Application Structure**: 6 main pages (Dashboard, Data, Analytics, Pricing, Competitor Monitor, Assistant)
- **Key Features**: Data enrichment, ML pricing engine, price elasticity, demand forecasting
- **Pricing Strategies**: Conservative (high occupancy), Balanced, Aggressive (max revenue)
- **User State**: Current page, uploaded files count, enrichment status
- **Industry Knowledge**: Camping/outdoor hospitality, capacity-focused pricing

## Function Calling Examples

### Navigate to Page

```json
{
  "name": "navigate_to_page",
  "arguments": {
    "page": "analytics",
    "reason": "User asked to see price elasticity metrics"
  }
}
```

### Create Pricing Rule

```json
{
  "name": "create_pricing_rule",
  "arguments": {
    "ruleType": "weekend-surge",
    "percentage": 15
  }
}
```

### Explain Analytics

```json
{
  "name": "explain_analytics",
  "arguments": {
    "metric": "price-elasticity"
  }
}
```

## API Usage

### Send Chat Message

**Request**:

```typescript
POST /api/chat
Authorization: Bearer <jwt_token>

{
  "messages": [
    { "role": "user", "content": "Show me my pricing analytics" }
  ],
  "currentPage": "dashboard"
}
```

**Response (Text)**:

```json
{
  "success": true,
  "message": "I'll take you to the Analytics page where you can see your price elasticity, demand patterns, and weather impact.",
  "usage": {
    "prompt_tokens": 234,
    "completion_tokens": 45,
    "total_tokens": 279
  }
}
```

**Response (Function Call)**:

```json
{
  "success": true,
  "message": "",
  "function_call": {
    "name": "navigate_to_page",
    "arguments": {
      "page": "analytics",
      "reason": "Show pricing analytics"
    }
  },
  "usage": {...}
}
```

### Get Suggestions

**Request**:

```typescript
GET / api / chat / suggestions
Authorization: Bearer<jwt_token>
```

**Response**:

```json
{
  "success": true,
  "suggestions": [
    {
      "id": "upload-data",
      "title": "Upload Your First Dataset",
      "description": "Get started by uploading historical pricing data",
      "icon": "upload",
      "action": "upload_data"
    },
    {
      "id": "learn-analytics",
      "title": "What is Price Elasticity?",
      "description": "Learn about key pricing analytics",
      "icon": "info",
      "question": "What is price elasticity and why does it matter?"
    }
  ],
  "userContext": {
    "hasFiles": false,
    "fileCount": 0,
    "hasUnenrichedFiles": false
  }
}
```

## Frontend Integration Steps

### 1. Update FloatingAssistant Component

```typescript
import { useState } from 'react'
import { sendChatMessage, getChatSuggestions } from '@/lib/api/services/chat'
import type { ChatMessage } from '@/lib/api/services/chat'

export const FloatingAssistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await sendChatMessage({
        messages: [...messages, userMessage],
        currentPage: window.location.pathname.replace('/', ''),
      })

      // Handle function call
      if (response.function_call) {
        executeFunctionFromAI(response.function_call)

        // Add assistant message explaining the action
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `I'll ${response.function_call.name.replace(/_/g, ' ')} for you.`,
        }])
      } else {
        // Add assistant text response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.message,
        }])
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const executeFunctionFromAI = (functionCall: { name: string; arguments: any }) => {
    switch (functionCall.name) {
      case 'navigate_to_page':
        window.location.href = `/${functionCall.arguments.page}`
        break
      case 'upload_data':
        window.location.href = '/data'
        // Could also open upload modal directly
        break
      case 'run_enrichment':
        window.location.href = '/data'
        // Trigger enrichment for specific file
        break
      case 'get_pricing_recommendations':
        window.location.href = '/pricing'
        break
      case 'explain_analytics':
        // Show explanation modal or navigate to analytics
        window.location.href = '/analytics'
        break
      case 'create_pricing_rule':
        // Open pricing rule builder
        console.log('Create rule:', functionCall.arguments)
        break
    }
  }

  return (
    // ... existing UI code
  )
}
```

### 2. Add Conversation Starters

```typescript
const { data: suggestions } = useQuery({
  queryKey: ['chat-suggestions'],
  queryFn: getChatSuggestions,
})

// Render suggestion chips
{suggestions?.suggestions.map(suggestion => (
  <button
    key={suggestion.id}
    onClick={() => {
      if (suggestion.question) {
        setInput(suggestion.question)
      } else if (suggestion.action) {
        // Execute action directly
      }
    }}
  >
    {suggestion.title}
  </button>
))}
```

## Quick Responses (Fallback)

If OpenAI API fails, the system falls back to predefined quick responses:

- `hello` - Greeting and capabilities overview
- `help` - List of what the assistant can do
- `upload-data` - Guide to uploading data
- `analytics` - Explanation of analytics page
- `pricing` - Explanation of pricing engine

## Model Configuration

**Model**: `gpt-4-turbo-preview`

- More accurate than GPT-3.5
- Better function calling
- Can switch to `gpt-3.5-turbo` for cost savings

**Settings**:

- Temperature: 0.7 (balanced creativity/consistency)
- Max Tokens: 500 (concise responses)
- Functions: Auto-called when appropriate

## Cost Estimate

**GPT-4 Turbo Pricing** (as of 2024):

- Input: $0.01 / 1K tokens
- Output: $0.03 / 1K tokens

**Typical Chat Interaction**:

- System prompt: ~600 tokens
- User message: ~50 tokens
- Assistant response: ~100 tokens
- **Total**: ~750 tokens = $0.0075 per message

**Monthly Usage** (example):

- 1000 messages/month = ~$7.50
- 10,000 messages/month = ~$75

## Testing

### Manual Testing

**1. Test Basic Chat**:

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is price elasticity?"}
    ],
    "currentPage": "dashboard"
  }'
```

**2. Test Function Calling**:

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Show me my analytics"}
    ]
  }'
```

**3. Test Suggestions**:

```bash
curl http://localhost:3001/api/chat/suggestions \
  -H "Authorization: Bearer <token>"
```

### Expected Behaviors

**User**: "How do I upload data?"
**AI**: Provides step-by-step guide + function call to navigate to Data page

**User**: "What's my price elasticity?"
**AI**: Explains concept + function call to navigate to Analytics page

**User**: "Set up weekend surge pricing"
**AI**: Function call to create weekend-surge rule with suggested 15% increase

**User**: "Show me pricing recommendations"
**AI**: Function call to navigate to Pricing Engine page

## Implementation Checklist

### Backend ✅

- [x] OpenAI SDK installed
- [x] API key configured in `.env`
- [x] OpenAI service created with function definitions
- [x] Chat API routes created
- [x] Routes registered in server
- [x] Error handling and fallbacks

### Frontend ⏳

- [x] Chat service API client created
- [ ] FloatingAssistant updated to use OpenAI
- [ ] Function call execution implemented
- [ ] Conversation starters UI added
- [ ] Message history state management
- [ ] Loading states and error handling
- [ ] Typing indicators
- [ ] Message timestamps

## Next Steps

1. **Update FloatingAssistant.tsx**:
   - Replace mock data with real API calls
   - Add function call execution logic
   - Implement conversation starters from suggestions API

2. **Add UI Enhancements**:
   - Typing indicator while AI is thinking
   - Message timestamps
   - Conversation history persistence
   - Clear conversation button

3. **Implement Pricing Rule Builder**:
   - Modal/page for creating custom pricing rules
   - Called when AI suggests `create_pricing_rule` function

4. **Add Analytics**:
   - Track which questions users ask most
   - Monitor function call success rates
   - Measure user satisfaction

5. **Optimize Costs**:
   - Consider switching to GPT-3.5 for simple questions
   - Implement response caching for common questions
   - Add conversation history limit (e.g., last 10 messages)

## Troubleshooting

**Issue**: "OpenAI API key not configured"
**Solution**: Ensure `OPENAI_API_KEY` is set in backend `.env` file

**Issue**: Function calls not executing
**Solution**: Check `executeFunctionFromAI` implementation in FloatingAssistant

**Issue**: High API costs
**Solution**: Switch model to `gpt-3.5-turbo` or add response caching

**Issue**: Slow responses
**Solution**: Use streaming responses for better UX

## Security Notes

- ✅ API key stored server-side only
- ✅ All endpoints require authentication
- ✅ User context fetched from authenticated user ID
- ✅ Function calls validated before execution
- ⚠️ Rate limit chat endpoint to prevent abuse (TODO)
- ⚠️ Add content filtering for inappropriate requests (TODO)

---

**Ready to activate**: Backend is fully functional. Frontend integration requires updating FloatingAssistant component.
