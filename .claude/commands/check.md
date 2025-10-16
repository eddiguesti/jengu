---
description: Run frontend type check and build verification
allowed-tools: [Bash]
---

# Frontend Check Command

Runs TypeScript type checking and build verification for the frontend.

## Execution

1. Run the comprehensive check command:

```bash
cd /Users/danny/dev/jengu/frontend && pnpm run build:check
```

2. Report results to the user:
   - If successful: Confirm type checking and build passed
   - If failed: Show errors and suggest fixes
