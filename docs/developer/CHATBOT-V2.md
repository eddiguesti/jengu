# Jengu AI Chatbot V2 - Smart Pricing Assistant

**Status**: ✅ Complete - GPT-5 Powered with Database Context
**Last Updated**: 2025-11-03
**Model**: GPT-5 (August 2025 release)

---

## What Makes This Chatbot Special

### 🧠 **Context-Aware Intelligence**
The chatbot has **direct access to the user's actual data**:
- Knows exactly what files they've uploaded
- Sees their average prices and occupancy rates
- Understands if data is enriched or not
- Tracks their latest data points

**Example:**
```
User: "What's my average price?"
Bot: "Your average price is €45 across 1,200 records. That's pretty solid for this season!"
```

### ⚡ **GPT-5 Powered**
- **Smarter**: Better reasoning than GPT-4o
- **Faster**: Lower latency responses
- **Cheaper**: $1.25/M input tokens (50% cheaper than GPT-4o)
- **More natural**: Higher temperature (0.8) for conversational responses

### 🎯 **Simplified Tools**
Reduced from 6 complex functions to 2 powerful tools:
1. **navigate()** - Takes user to the right page
2. **take_action()** - Executes app actions

**Why fewer tools?** GPT-5 is smart enough to understand intent without overly specific functions.

### 📊 **Database-Connected**
Every chat request includes:
```typescript
{
  dataStats: {
    totalFiles: 2,
    enrichedFiles: 1,
    totalRecords: 1200,
    avgPrice: 45,
    avgOccupancy: 78,
    latestDate: "2025-10-28",
    hasEnrichedData: true
  },
  files: [
    { name: "summer-2024.csv", enriched: true, rows: 800 },
    { name: "fall-2024.csv", enriched: false, rows: 400 }
  ]
}
```

---

## System Architecture

### Request Flow
```
User message → Frontend → /api/chat endpoint
                             ↓
              Database query (files + pricing data)
                             ↓
              Build context with real data
                             ↓
              GPT-5 API call with tools
                             ↓
              Smart response + optional function call
                             ↓
              Frontend executes action & displays response
```

### Key Files

**Backend:**
- `backend/services/openaiService.ts` - GPT-5 integration, system prompt, tools
- `backend/routes/chat.ts` - API endpoints, database context fetching
- `backend/server.ts` - Route registration

**Frontend:**
- `frontend/src/lib/api/services/chat.ts` - Chat API client
- `frontend/src/components/layout/FloatingAssistant.tsx` - Chat UI (TO BE UPDATED)

---

## System Prompt Design

### Core Personality
```
You are Jengu, an expert pricing assistant for campgrounds.

Personality:
- Concise (2-3 sentences max)
- Proactive (always suggest next step)
- Smart (use context to infer needs)
- Friendly (casual but professional)
```

### Expert Knowledge Base
The bot understands:
- Revenue management for outdoor hospitality
- How weather/seasonality drive camping demand
- Price elasticity and forecasting
- Competitive pricing strategies

### App Context Document
Comprehensive guide included in system prompt:
- What each page does
- User journey (first-time vs returning)
- Analytics explained simply
- Pricing strategies (conservative/balanced/aggressive)
- Industry-specific context

**Example from context:**
```
Price Elasticity = "How sensitive are customers to price changes?"
- High elasticity: Lower price → Much more demand
- Low elasticity: Price changes don't affect demand much
- Sweet spot: Find the max price before demand drops
```

---

## Tool Definitions

### 1. navigate()
```typescript
{
  name: 'navigate',
  description: 'Navigate user to a page when they want to see/do something',
  parameters: {
    page: 'dashboard' | 'data' | 'analytics' | 'pricing' | 'competitor-monitor'
  }
}
```

**When to use:**
- "show me analytics" → navigate('analytics')
- "I want to upload data" → navigate('data')
- "take me to pricing" → navigate('pricing')

### 2. take_action()
```typescript
{
  name: 'take_action',
  description: 'Execute an action when user wants to DO something',
  parameters: {
    action: 'upload_data' | 'enrich_data' | 'get_recommendations' |
            'view_elasticity' | 'check_weather_impact',
    context: string // Why this action helps
  }
}
```

**When to use:**
- "enrich my data" → take_action('enrich_data')
- "get recommendations" → take_action('get_recommendations')
- "upload pricing history" → take_action('upload_data')

---

## Database Context Integration

### What Gets Fetched
Every chat request queries:

**1. User's Files**
```sql
SELECT id, name, enrichmentStatus, actualRows, uploadedAt
FROM properties
WHERE userId = ?
ORDER BY uploadedAt DESC
```

**2. Recent Pricing Data**
```sql
SELECT price, occupancy, date
FROM pricing_data
WHERE propertyId IN (user's files)
ORDER BY date DESC
LIMIT 100
```

### Calculated Insights
```typescript
{
  totalFiles: count of files,
  enrichedFiles: files with enrichmentStatus = 'completed',
  totalRecords: total pricing records,
  avgPrice: average of recent 100 prices,
  avgOccupancy: average of recent 100 occupancy rates,
  latestDate: most recent data point,
  hasEnrichedData: at least one file enriched
}
```

### Smart Context Building
The context adapts to user's state:

**No data uploaded:**
```
- No data uploaded yet (suggest uploading data)
```

**Has data, not enriched:**
```
- Files: 1 uploaded, 0 enriched
- Records: 500 pricing records
- Average price: €42
- ⚠️ Data not enriched yet (suggest enrichment)
```

**Fully set up:**
```
- Files: 2 uploaded, 2 enriched
- Records: 1200 pricing records
- Average price: €45
- Average occupancy: 78%
- Latest data: 2025-10-28
```

---

## Response Strategy

### Conciseness Examples

❌ **Bad** (too verbose):
```
The Analytics page is a comprehensive dashboard that displays various
metrics including price elasticity, demand patterns, and weather impact.
You can access it by clicking on the Analytics tab in the sidebar. Once
there, you'll be able to see detailed charts and graphs...
```

✅ **Good** (concise + actionable):
```
I'll take you to Analytics where you can see your price elasticity
and demand patterns.
[Calls navigate('analytics')]
```

### Personalization Examples

❌ **Generic**:
```
You should upload some pricing data to get started.
```

✅ **Personalized** (uses database context):
```
I see you have "summer-2024.csv" with 800 records, but it's not
enriched yet. Let me add weather and holiday data to unlock better
recommendations.
[Calls take_action('enrich_data')]
```

### Proactive Guidance

Every response should include:
1. **Answer** - Direct response to question
2. **Action** - What to do next
3. **Value** - Why it matters

**Example:**
```
User: "What is price elasticity?"

Bot: "It shows how sensitive your customers are to price changes.
Your elasticity is -1.2, meaning a 10% price drop would boost demand
by 12%. Want to see which days have the most elastic pricing?
[Calls navigate('analytics')]"
```

---

## API Usage

### Send Chat Message

**Request:**
```typescript
POST /api/chat
Authorization: Bearer <jwt_token>

{
  "messages": [
    { "role": "user", "content": "What's my average price?" }
  ],
  "currentPage": "dashboard"
}
```

**Response (Text):**
```json
{
  "success": true,
  "message": "Your average price is €45 across 1,200 records. That's solid for this season! Your occupancy is at 78%, which is great for balanced pricing.",
  "usage": {
    "prompt_tokens": 450,
    "completion_tokens": 35,
    "total_tokens": 485
  }
}
```

**Response (Function Call):**
```json
{
  "success": true,
  "message": "I'll take you to Analytics to see your price trends.",
  "function_call": {
    "name": "navigate",
    "arguments": { "page": "analytics" }
  },
  "usage": { ... }
}
```

### Get Conversation Starters

**Request:**
```typescript
GET /api/chat/suggestions
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "id": "get-recommendations",
      "title": "Get Pricing Recommendations",
      "description": "ML-powered prices for the next 30 days",
      "icon": "trending-up",
      "action": "get_pricing_recommendations"
    },
    {
      "id": "view-analytics",
      "title": "View Analytics Dashboard",
      "description": "See demand patterns and weather impact",
      "icon": "bar-chart",
      "action": "navigate_to_page",
      "actionParams": { "page": "analytics" }
    }
  ],
  "userContext": {
    "hasFiles": true,
    "fileCount": 2,
    "hasUnenrichedFiles": false
  }
}
```

---

## Cost Analysis

### GPT-5 Pricing (2025)
- **Input**: $1.25 per million tokens
- **Output**: $10 per million tokens

### Typical Chat Costs

**Simple question:**
```
System prompt: ~500 tokens ($0.000625)
User context: ~150 tokens ($0.0001875)
User message: ~20 tokens ($0.000025)
Bot response: ~50 tokens ($0.0005)
Total: ~720 tokens ≈ $0.0015 per message
```

**Complex question with context:**
```
System prompt: ~500 tokens
User context: ~200 tokens
Conversation history: ~300 tokens
Bot response: ~100 tokens
Total: ~1100 tokens ≈ $0.0025 per message
```

### Monthly Cost Estimates
- **100 messages/month** = ~$0.15 - $0.25
- **1,000 messages/month** = ~$1.50 - $2.50
- **10,000 messages/month** = ~$15 - $25

**GPT-5 is 50% cheaper than GPT-4o on input tokens!**

---

## Testing Examples

### Test 1: New User (No Data)
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "How do I get started?"}],
    "currentPage": "dashboard"
  }'
```

**Expected:** Bot suggests uploading data and calls `take_action('upload_data')`

### Test 2: User with Unenriched Data
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What should I do next?"}]
  }'
```

**Expected:** Bot mentions their file by name and suggests enrichment

### Test 3: Question About Their Data
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is my average price?"}]
  }'
```

**Expected:** Bot responds with actual number: "Your average price is €45"

---

## Frontend Integration (TODO)

### Update FloatingAssistant Component

```typescript
import { sendChatMessage } from '@/lib/api/services/chat'

const handleSend = async () => {
  const response = await sendChatMessage({
    messages: [...messages, userMessage],
    currentPage: window.location.pathname.replace('/', '')
  })

  if (response.function_call) {
    executeFunctionCall(response.function_call)
  }

  setMessages(prev => [...prev, {
    role: 'assistant',
    content: response.message
  }])
}

const executeFunctionCall = (call: { name: string; arguments: any }) => {
  if (call.name === 'navigate') {
    navigate(`/${call.arguments.page}`)
  } else if (call.name === 'take_action') {
    switch (call.arguments.action) {
      case 'upload_data':
        navigate('/data')
        break
      case 'enrich_data':
        // Trigger enrichment for user's files
        break
      case 'get_recommendations':
        navigate('/pricing')
        break
    }
  }
}
```

---

## Best Practices

### 1. Keep Conversation History Short
Only send last 5-10 messages to GPT-5 to reduce costs and stay focused.

### 2. Use Context Effectively
The bot already has database context - don't make it ask for information it already knows.

### 3. Fallback Gracefully
If OpenAI API fails, show quick response from `quickResponses` object.

### 4. Log Interactions
Track which questions are asked most to improve system prompt.

### 5. Rate Limiting
Implement per-user rate limits to prevent API cost abuse.

---

## Troubleshooting

### Issue: Bot doesn't mention user's data
**Cause:** Database context not being passed correctly
**Fix:** Check that `userContext.dataStats` is populated in chat.ts

### Issue: "OpenAI API key not configured"
**Cause:** OPENAI_API_KEY missing from .env
**Fix:** Add key to `backend/.env`

### Issue: Function calls not executing
**Cause:** Frontend not handling function_call response
**Fix:** Update FloatingAssistant to execute actions

### Issue: Responses too long/verbose
**Cause:** Temperature or max_tokens set incorrectly
**Fix:** Keep temperature at 0.8, max_tokens at 400

---

## Security Considerations

✅ **API key stored server-side only**
✅ **All endpoints require authentication**
✅ **Database queries filtered by userId**
✅ **Function calls validated before execution**
⚠️ **TODO**: Add rate limiting per user
⚠️ **TODO**: Add content filtering for inappropriate requests

---

## What's Different from V1?

| Feature | V1 (GPT-4o) | V2 (GPT-5) |
|---------|-------------|------------|
| Model | GPT-4 Turbo | **GPT-5** |
| Tools | 6 complex functions | **2 simple tools** |
| Database context | No | **Yes - full data access** |
| Response length | 500 tokens | **400 tokens (concise)** |
| Temperature | 0.7 | **0.8 (natural)** |
| System prompt | Generic | **Industry-specific** |
| Personalization | None | **Uses user's actual data** |
| Cost per message | ~$0.003 | **~$0.0015 (50% cheaper)** |

---

## Future Improvements

1. **Structured Outputs**: Use GPT-5's JSON mode for consistent responses
2. **Memory**: Store conversation summaries for context across sessions
3. **Analytics**: Track most common questions, success rates
4. **A/B Testing**: Compare response quality vs GPT-4o
5. **Voice Mode**: Add speech-to-text for mobile users
6. **Proactive Tips**: Bot suggests actions based on user behavior

---

**Ready to use!** Backend is complete, frontend integration pending.
