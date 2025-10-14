# Jengu Documentation

Welcome to the Jengu Dynamic Pricing Intelligence Platform documentation.

## Documentation Structure

- **[developer/](developer/)** - Current developer documentation, setup guides, and technical references
- **[archived/](archived/)** - Historical documentation from project development phases
- **[tasks-todo/](tasks-todo/)** - Pending tasks (prioritized by number)
- **[tasks-done/](tasks-done/)** - Completed tasks
- **[tasks.md](tasks.md)** - Task management overview

## Quick Start

For getting started with development:

1. **Read First**: [developer/README.md](developer/README.md) - Developer overview
2. **Setup**: [../SETUP_GUIDE.md](../SETUP_GUIDE.md) - Local development setup
3. **Architecture**: [../ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
4. **Security**: [../SECURITY.md](../SECURITY.md) - Security configuration

## Root Documentation

Key documentation files in the project root:

- **[README.md](../README.md)** - Main project overview and features
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System architecture and data flow
- **[SETUP_GUIDE.md](../SETUP_GUIDE.md)** - Development environment setup
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Production deployment guide
- **[SECURITY.md](../SECURITY.md)** - Security configuration and compliance

## AI Assistant Configuration

Files for AI coding assistants (Claude, Cursor, Gemini):

- **[CLAUDE.md](../CLAUDE.md)** - Claude Code project instructions
- **[AGENTS.md](../AGENTS.md)** - AI agent configuration
- **[GEMINI.md](../GEMINI.md)** - Gemini project instructions

## Historical Context

The [archived/](archived/) directory contains historical documentation including:
- Phase completion notices (PHASE_1_COMPLETE.md, PHASE_2_COMPLETE.md, etc.)
- Implementation plans and roadmaps
- Feature-specific documentation
- Status updates and summaries
- Old setup guides and integration documentation

These files are preserved for historical reference and provide context for past development decisions.

## Contributing to Documentation

When adding documentation:

1. **Current Documentation**: Add to `docs/developer/` or update root files
2. **Historical Documentation**: Place in `docs/archived/` with date reference
3. **Task Management**: Use `docs/tasks-todo/` and `docs/tasks-done/`
4. **Always Update**: Keep this README.md current with new additions

## Documentation Standards

- Use Markdown format (`.md`)
- Include a last updated date
- Use clear, concise language
- Include code examples where helpful
- Link to related documentation
- Keep root documentation concise and current

## Finding Information

### By Topic

- **Setup & Installation**: `SETUP_GUIDE.md`, `developer/README.md`
- **Architecture & Design**: `ARCHITECTURE.md`, `developer/README.md`
- **Security**: `SECURITY.md`
- **Deployment**: `DEPLOYMENT.md`
- **Historical Info**: `archived/`

### By Search

```bash
# Search current documentation
grep -r "search term" developer/ ../README.md ../ARCHITECTURE.md

# Search historical documentation
grep -r "search term" archived/

# Search all documentation
find . -name "*.md" -exec grep -l "search term" {} \;
```

## Support

For questions or issues:
- Review documentation in this directory
- Check [developer/README.md](developer/README.md) for common issues
- See [../SETUP_GUIDE.md](../SETUP_GUIDE.md) for troubleshooting

---

**Last Updated**: 2025-10-14
**Documentation Version**: 2.0
