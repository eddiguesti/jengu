/**
 * OpenAPI Configuration
 * Defines the base OpenAPI specification structure
 */

import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi'

export const registry = new OpenAPIRegistry()

// Register security schemes
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase JWT token',
})

registry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'sb-access-token',
  description: 'Supabase session cookie (httpOnly)',
})

export function generateOpenAPIDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions)

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Jengu API',
      description: `
# Jengu Dynamic Pricing API

Hospitality revenue management and dynamic pricing intelligence platform.

## Features

- **File Management**: Upload CSV pricing data with streaming support
- **Data Enrichment**: Weather, holidays, and temporal feature enrichment
- **ML Analytics**: Demand forecasting, feature importance, competitor analysis
- **AI Insights**: Claude-powered pricing recommendations
- **Dynamic Pricing**: Real-time price quotes with ML-based optimization

## Authentication

Most endpoints require authentication via:
- **Bearer Token**: Supabase JWT in Authorization header
- **Cookie**: HttpOnly session cookie (sb-access-token)

## Rate Limiting

- General endpoints: 60 requests/minute
- File uploads: 5 requests/minute
- Analytics: 10 requests/minute
- Assistant: 20 requests/minute

## Error Responses

All endpoints return errors in this format:
\`\`\`json
{
  "error": "ERROR_TYPE",
  "message": "Human-readable error message"
}
\`\`\`
      `.trim(),
      contact: {
        name: 'Jengu Support',
        email: 'support@jengu.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.jengu.com',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication and authorization' },
      { name: 'Files', description: 'File upload and management' },
      { name: 'Analytics', description: 'ML analytics and insights' },
      { name: 'Pricing', description: 'Dynamic pricing engine' },
      { name: 'Weather', description: 'Weather data (Open-Meteo, OpenWeather)' },
      { name: 'Location', description: 'Geocoding and location services' },
      { name: 'Competitor', description: 'Competitor data scraping' },
      { name: 'Assistant', description: 'AI-powered pricing assistant' },
      { name: 'Settings', description: 'Business settings management' },
    ],
    security: [
      { bearerAuth: [] },
      { cookieAuth: [] },
    ],
  })
}
