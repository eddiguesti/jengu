# Utility Scripts

This directory contains utility scripts for the Jengu platform.

## 📜 Available Scripts

### `generate_secrets.py`

Generate secure cryptographic keys for production deployment.

**Usage:**
```bash
python scripts/generate_secrets.py
```

**What it does:**
- Generates secure JWT secret key (for authentication)
- Generates Fernet encryption key (for data encryption)
- Generates API keys
- Optionally updates your `.env` file

**When to use:**
- Before first production deployment
- When rotating security keys
- When setting up a new environment

**Security notes:**
- ⚠️ Never commit the generated keys to Git
- ✅ Store keys in a secure password manager
- ✅ Use different keys for dev/staging/production
- ✅ Rotate keys every 90-180 days

### `snapshot_competition.py`

Capture competitor pricing data for analysis.

**Usage:**
```bash
python scripts/snapshot_competition.py
```

**What it does:**
- Fetches competitor pricing from configured sources
- Stores snapshots in `data/competitors/`
- Updates price observations database

**Configuration:**
- Competitor list: `data/competitors/competitors.json`
- API keys: Set in `.env` file
  - `MAKCORPS_API_KEY`
  - `AIRBTICS_API_KEY`

**When to use:**
- Scheduled daily (via cron or task scheduler)
- Before making pricing decisions
- For competitor intelligence reports

## 🚀 Running Scripts

### From Project Root

```bash
# Activate virtual environment first
source .venv/bin/activate  # Mac/Linux
# OR: .venv\Scripts\activate  # Windows

# Run a script
python scripts/generate_secrets.py
```

### Via package.json (Root)

```bash
# Generate secrets
pnpm run setup

# Or with npm
npm run setup
```

## 📝 Adding New Scripts

When creating a new utility script:

1. **Place in this directory** (`scripts/`)
2. **Add shebang** for direct execution:
   ```python
   #!/usr/bin/env python3
   ```
3. **Add docstring** explaining purpose
4. **Update this README** with usage instructions
5. **Add to package.json** if it's frequently used

## 🧪 Testing Scripts

Test scripts should be in `tests/` directory, not here.

This directory is for:
- ✅ Utility/helper scripts
- ✅ Setup/deployment scripts
- ✅ Data migration scripts
- ✅ One-off operations

Not for:
- ❌ Test files (use `tests/`)
- ❌ Application code (use `core/`)
- ❌ API endpoints (use `backend/`)

## 📋 Script Ideas / TODO

Future scripts to consider:
- [ ] Database migration script
- [ ] Data backup/restore script
- [ ] Environment setup validation script
- [ ] Dependency update checker
- [ ] Performance benchmarking script

---

**Last Updated**: 2025-10-14
