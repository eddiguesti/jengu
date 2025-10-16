# Jengu Backend API Server

Secure Express.js backend server that acts as a proxy for all external APIs, keeping API keys safe and never exposing them to the frontend.

## Features

- **Secure API Key Storage**: All API keys stored server-side in environment variables
- **Rate Limiting**: 60 requests per minute per IP (configurable)
- **CORS Protection**: Only allows requests from your frontend
- **Error Handling**: Comprehensive error handling and logging
- **Multiple API Integrations**:
  - Anthropic Claude (AI Assistant)
  - OpenWeatherMap (Weather data)
  - Calendarific (Holidays)
  - Mapbox (Geocoding)
  - ScraperAPI (Competitor pricing)
  - Makcorps (Hotel prices)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and replace placeholder values with your actual API keys:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

ANTHROPIC_API_KEY=your_actual_key_here
OPENWEATHER_API_KEY=your_actual_key_here
CALENDARIFIC_API_KEY=your_actual_key_here
SCRAPERAPI_KEY=your_actual_key_here
MAPBOX_TOKEN=your_actual_token_here
MAKCORPS_API_KEY=68ed86819d19968d101c2f43

MAX_REQUESTS_PER_MINUTE=60
```

### 3. Start the Server

**Development mode** (with auto-reload):

```bash
npm run dev
```

**Production mode**:

```bash
npm start
```

You should see:

```
🚀 Jengu Backend API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port 3001
✅ Environment: development
✅ Frontend URL: http://localhost:5173
✅ Rate limit: 60 requests/minute
```

## API Endpoints

### Health Check

```
GET /health
```

Returns server status and timestamp.

### AI Assistant (Anthropic Claude)

```
POST /api/assistant/message
Content-Type: application/json

{
  "message": "What's the best pricing strategy for summer?",
  "conversationHistory": [],
  "context": {
    "businessName": "Hotel Example",
    "location": "Nice, France"
  }
}
```

### Weather Data (OpenWeatherMap)

```
POST /api/weather/historical
Content-Type: application/json

{
  "latitude": 43.7102,
  "longitude": 7.2620,
  "dates": [1640995200, 1641081600]
}
```

### Holidays (Calendarific)

```
GET /api/holidays?country=FR&year=2024
```

### Geocoding (Mapbox)

Forward geocoding:

```
GET /api/geocoding/forward?address=Nice, France
```

Reverse geocoding:

```
GET /api/geocoding/reverse?latitude=43.7102&longitude=7.2620
```

### Competitor Scraping (ScraperAPI)

```
POST /api/competitor/scrape
Content-Type: application/json

{
  "url": "https://www.booking.com/hotel/..."
}
```

### Hotel Search (Makcorps)

```
POST /api/hotels/search
Content-Type: application/json

{
  "cityId": "123",
  "checkIn": "2024-06-01",
  "checkOut": "2024-06-05",
  "adults": 2,
  "rooms": 1,
  "currency": "EUR"
}
```

## Security Best Practices

### Development

- ✅ API keys in `.env` file (gitignored)
- ✅ CORS limited to frontend URL
- ✅ Rate limiting enabled
- ✅ Input validation on all endpoints

### Production Deployment

**Option 1: Deploy to Vercel/Netlify Serverless Functions**

- Export functions from `server.js`
- Configure environment variables in hosting dashboard
- Deploy with automatic CI/CD

**Option 2: Deploy to Railway/Render/Heroku**

1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables in dashboard:
   - `ANTHROPIC_API_KEY`
   - `OPENWEATHER_API_KEY`
   - `CALENDARIFIC_API_KEY`
   - `SCRAPERAPI_KEY`
   - `MAPBOX_TOKEN`
   - `MAKCORPS_API_KEY`
   - `FRONTEND_URL` (your production frontend URL)
4. Deploy!

**Option 3: VPS (AWS, DigitalOcean, etc.)**

1. SSH into server
2. Install Node.js: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`
3. Clone repository
4. Install dependencies: `npm install`
5. Create `.env` file with production values
6. Use PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name jengu-api
   pm2 startup
   pm2 save
   ```
7. Configure nginx reverse proxy (port 3001 → 443)

## Rate Limiting

Default: 60 requests per minute per IP address.

To change, update `MAX_REQUESTS_PER_MINUTE` in `.env`:

```env
MAX_REQUESTS_PER_MINUTE=100
```

## CORS Configuration

By default, only your frontend can make requests. To update:

```env
FRONTEND_URL=https://your-production-frontend.com
```

For multiple origins, edit `server.js`:

```javascript
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://your-production-frontend.com'],
    credentials: true,
  })
)
```

## Monitoring & Logs

All errors are logged to console. In production, consider adding:

- **Winston** for structured logging
- **Sentry** for error tracking
- **New Relic** or **Datadog** for performance monitoring

## Testing

Test the server is running:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

## Troubleshooting

**Problem: "EADDRINUSE" error**

- Port 3001 is already in use
- Solution: Change `PORT` in `.env` or kill the process using port 3001

**Problem: "API key invalid" errors**

- Check `.env` file has correct API keys
- Restart server after changing `.env`

**Problem: CORS errors in frontend**

- Verify `FRONTEND_URL` matches your frontend URL exactly
- Include protocol (http:// or https://)

**Problem: Rate limit too restrictive**

- Increase `MAX_REQUESTS_PER_MINUTE` in `.env`
- Restart server

## Environment Variables Reference

| Variable                  | Required | Description           | Example                       |
| ------------------------- | -------- | --------------------- | ----------------------------- |
| `PORT`                    | No       | Server port           | `3001`                        |
| `NODE_ENV`                | No       | Environment           | `development` or `production` |
| `FRONTEND_URL`            | Yes      | Frontend URL for CORS | `http://localhost:5173`       |
| `ANTHROPIC_API_KEY`       | Yes      | Claude AI API key     | `sk-ant-...`                  |
| `OPENWEATHER_API_KEY`     | Yes      | Weather data key      | `abc123...`                   |
| `CALENDARIFIC_API_KEY`    | Yes      | Holiday API key       | `abc123...`                   |
| `SCRAPERAPI_KEY`          | Yes      | Web scraping key      | `abc123...`                   |
| `MAPBOX_TOKEN`            | Yes      | Geocoding token       | `pk.abc123...`                |
| `MAKCORPS_API_KEY`        | Yes      | Hotel prices key      | `68ed86...`                   |
| `MAX_REQUESTS_PER_MINUTE` | No       | Rate limit            | `60`                          |

## License

MIT
