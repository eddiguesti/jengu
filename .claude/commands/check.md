---
description: Run frontend type check and build verification
allowed-tools: [Bash]
---

# Frontend Check Command

Runs TypeScript type checking, linting and build verification for the frontend and backend, and checks the changes are in line with the Architecture guide.

## Execution

1. Check that changes in this session are in accordance with the guidance in `docs/developer/ARCHITECTURE.md`.
2. Run the comprehensive check command from this project's root directory

```bash
pnpm run check-all
```

3. Fix any errors and warnings reported.
4. Confirm you have fixed the issues by running again.
5. Report a summary to the user.
