# OpenAPI/Swagger Documentation

## Overview

The Jengu API is now fully documented using OpenAPI 3.0 specification with interactive Swagger UI.

## Accessing the Documentation

### Development

When running the backend server locally:

- **Swagger UI**: [http://localhost:3001/docs](http://localhost:3001/docs)
- **OpenAPI JSON**: [http://localhost:3001/openapi.json](http://localhost:3001/openapi.json)

### Production

- **Swagger UI**: [https://api.jengu.com/docs](https://api.jengu.com/docs)
- **OpenAPI JSON**: [https://api.jengu.com/openapi.json](https://api.jengu.com/openapi.json)

## Features

### Interactive API Testing

The Swagger UI allows you to:

1. **Browse all endpoints** organized by tags (Health, Files, Analytics, Pricing, etc.)
2. **View request/response schemas** with examples
3. **Test endpoints directly** from the browser
4. **Authenticate** using Bearer tokens or cookies
5. **See real-time responses** with status codes and headers

### Authentication

Most endpoints require authentication. To test authenticated endpoints:

1. Click the **Authorize** button in Swagger UI
2. Enter your Bearer token in the format: `Bearer YOUR_JWT_TOKEN`
3. Click **Authorize** again
4. All subsequent requests will include the Authorization header

### Schema Validation

All endpoints use Zod schemas for request/response validation, ensuring:

- Type safety at runtime
- Automatic OpenAPI schema generation
- Consistent error messages
- Input sanitization

## Architecture

### File Structure

```
backend/
├── lib/openapi/
│   ├── config.ts         # OpenAPI configuration, registry, security schemes
│   ├── schemas.ts        # Reusable Zod schemas with OpenAPI extensions
│   └── index.ts          # Module exports
├── routes/
│   ├── health.ts         # Health check endpoint (documented)
│   ├── files.ts          # File management endpoints (documented)
│   ├── analytics.ts      # Analytics endpoints (documented)
│   └── ...               # Other routes (can be documented)
├── scripts/
│   └── generate-openapi.ts  # Script to generate openapi.json
└── openapi.json          # Generated OpenAPI specification
```

### How It Works

1. **Route Registration**: Each route file imports the OpenAPI registry and registers paths:

```typescript
import { registry } from '../lib/openapi/index.js'

registry.registerPath({
  method: 'get',
  path: '/api/files',
  tags: ['Files'],
  summary: 'List uploaded files',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Files retrieved successfully',
      content: {
        'application/json': {
          schema: FilesListResponseSchema,
        },
      },
    },
  },
})
```

2. **Schema Definition**: Schemas are defined once and reused across endpoints:

```typescript
export const FileMetadataSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    size: z.number(),
    rows: z.number(),
    status: z.enum(['complete', 'processing', 'error']),
  })
  .openapi('FileMetadata')
```

3. **Document Generation**: The OpenAPI document is generated at server startup:

```typescript
// In server.ts
const openAPIDocument = generateOpenAPIDocument()
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openAPIDocument))
```

## Documented Endpoints

### Health (1 endpoint)

- `GET /health` - Health check

### Files (5 endpoints)

- `POST /api/files/upload` - Upload CSV file
- `GET /api/files` - List all files
- `GET /api/files/:fileId/data` - Get file pricing data
- `DELETE /api/files/:fileId` - Delete file
- `POST /api/files/:fileId/enrich` - Enrich file with external data

### Analytics (5 endpoints)

- `POST /api/analytics/summary` - Get comprehensive analytics summary
- `POST /api/analytics/weather-impact` - Analyze weather impact on pricing
- `POST /api/analytics/demand-forecast` - Forecast future demand
- `POST /api/analytics/feature-importance` - Calculate feature importance
- `POST /api/analytics/ai-insights` - Get Claude-powered AI insights

**Total: 11 endpoints documented**

## Adding Documentation to New Endpoints

### Step 1: Import OpenAPI Dependencies

```typescript
import { registry } from '../lib/openapi/index.js'
import { z } from 'zod'
```

### Step 2: Define Schemas (if needed)

```typescript
const MyRequestSchema = z
  .object({
    param1: z.string(),
    param2: z.number(),
  })
  .openapi('MyRequest')

const MyResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.unknown(),
  })
  .openapi('MyResponse')
```

### Step 3: Register the Path

```typescript
registry.registerPath({
  method: 'post',
  path: '/api/my-endpoint',
  tags: ['MyTag'],
  summary: 'Short description',
  description: 'Detailed description',
  security: [{ bearerAuth: [] }], // If auth required
  request: {
    body: {
      content: {
        'application/json': {
          schema: MyRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Success',
      content: {
        'application/json': {
          schema: MyResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
})
```

### Step 4: Implement the Route Handler

```typescript
router.post('/my-endpoint', authenticateUser, async (req, res) => {
  // Optionally validate with Zod
  const parsed = MyRequestSchema.parse(req.body)

  // Your logic here
  res.json({ success: true, data: {} })
})
```

### Step 5: Regenerate OpenAPI Spec

```bash
cd backend
npx tsx scripts/generate-openapi.ts
```

## Best Practices

### 1. Use Zod for Validation

Always define Zod schemas and use `.parse()` or `.safeParse()` to validate inputs:

```typescript
const result = MyRequestSchema.safeParse(req.body)
if (!result.success) {
  return res.status(400).json({
    error: 'VALIDATION_ERROR',
    message: result.error.message,
  })
}
```

### 2. Reuse Schemas

Define common schemas in `lib/openapi/schemas.ts` and import them:

```typescript
import { ErrorResponseSchema, SuccessResponseSchema } from '../lib/openapi/index.js'
```

### 3. Document All Responses

Include all possible response codes (200, 400, 401, 404, 500):

```typescript
responses: {
  200: { ... },
  400: { description: 'Invalid input', content: { ... } },
  401: { description: 'Unauthorized', content: { ... } },
  404: { description: 'Not found', content: { ... } },
}
```

### 4. Add Examples

Use `.openapi()` to add examples and descriptions:

```typescript
z.string().email().openapi({ example: 'user@example.com', description: 'User email address' })
```

### 5. Organize by Tags

Use consistent tags to group related endpoints:

- Health
- Auth
- Files
- Analytics
- Pricing
- Weather
- Location
- Competitor
- Assistant
- Settings

## CI/CD Integration

### Validate OpenAPI Spec

Add to your CI pipeline:

```bash
# Generate and validate OpenAPI spec
npx tsx scripts/generate-openapi.ts

# Check for errors
npx @redocly/cli lint openapi.json
```

### Version Control

Commit the generated `openapi.json` to version control so clients can:

- Track API changes
- Generate SDKs automatically
- Compare versions

## Troubleshooting

### "Cannot find module" errors

Make sure all route files are imported in `scripts/generate-openapi.ts`:

```typescript
import '../routes/health.js'
import '../routes/files.js'
import '../routes/analytics.js'
// Add new routes here
```

### Schemas not appearing

Ensure schemas are registered with `.openapi()`:

```typescript
const MySchema = z.object({}).openapi('MySchema') // ✅ Named schema
const MySchema = z.object({}) // ❌ Won't appear in components
```

### Swagger UI not loading

1. Check server logs for errors
2. Verify `swagger-ui-express` is installed
3. Ensure OpenAPI document is valid JSON
4. Check browser console for errors

## Resources

- **Zod**: [https://zod.dev](https://zod.dev)
- **Zod to OpenAPI**: [https://github.com/asteasolutions/zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi)
- **OpenAPI Spec**: [https://swagger.io/specification/](https://swagger.io/specification/)
- **Swagger UI**: [https://swagger.io/tools/swagger-ui/](https://swagger.io/tools/swagger-ui/)

## Next Steps

1. **Document remaining routes**: Auth, Weather, Geocoding, Holidays, Competitor, Assistant, Settings, Pricing
2. **Add request validation**: Use Zod `.parse()` in all route handlers
3. **Generate SDK**: Use OpenAPI Codegen to create client SDKs
4. **Add tests**: Test OpenAPI spec validity in CI
5. **Publish docs**: Host Swagger UI publicly for clients

---

**Last Updated**: 2025-10-23
