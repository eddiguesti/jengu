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

Edit `.env` and replace placeholder values with your actual API keys.

### 3. Start the Server

**Development mode** (with auto-reload):

```bash
npm run dev
```

**Production mode**:

```bash
npm start
```

## Health Check

```
GET /health
```

Returns server status and timestamp.
