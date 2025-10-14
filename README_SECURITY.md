# 🔐 Security Features - Quick Start Guide

## Overview

Your application is now **enterprise-ready** with comprehensive security features designed for **Vanta compliance**, **SOC2**, **GDPR**, and **CCPA**.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Security Packages

```bash
pip install -r requirements.txt
```

### Step 2: Generate Secure Keys

```bash
python generate_secrets.py
```

This will:
- Generate a JWT secret key
- Generate an encryption key
- Optionally update your .env file

### Step 3: Update Environment

Edit `.env` and configure:

```env
# Set to production when deploying
ENVIRONMENT=production

# Security (already set by generate_secrets.py)
SECRET_KEY=<generated-key>
ENCRYPTION_KEY=<generated-key>

# Database - use strong password
DATABASE_URL=postgresql://user:STRONG_PASSWORD@localhost:5432/travel_pricing

# CORS - restrict to your domains
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Step 4: Run Secured API

```bash
# Development
.venv\Scripts\python -m uvicorn apps.api.main:app --reload --port 8000

# Production (with SSL)
.venv\Scripts\python apps\api\main.py
```

---

## 🛡️ Security Features Included

| Feature | Status | Description |
|---------|--------|-------------|
| 🔐 **JWT Authentication** | ✅ | Industry-standard token-based auth |
| 👥 **RBAC** | ✅ | 5 roles with granular permissions |
| 🔒 **Encryption at Rest** | ✅ | Fernet encryption for sensitive data |
| 🔐 **Encryption in Transit** | ✅ | TLS 1.2+ with HTTPS |
| 🛡️ **Security Headers** | ✅ | HSTS, CSP, X-Frame-Options, etc. |
| ⚡ **Rate Limiting** | ✅ | Per-IP request throttling |
| 📝 **Audit Logging** | ✅ | Comprehensive request logging |
| 🚫 **SQL Injection Protection** | ✅ | Parameterized queries via SQLAlchemy |
| ✅ **Input Validation** | ✅ | Pydantic models with validators |
| 🔍 **PII Redaction** | ✅ | Automatic removal from logs |
| 🚨 **Failed Login Tracking** | ✅ | Auto-lockout after 5 attempts |
| 📊 **Compliance Ready** | ✅ | SOC2, GDPR, CCPA |

---

## 📋 Pre-Production Checklist

### Critical (Must Do)

- [ ] Run `python generate_secrets.py` to create secure keys
- [ ] Set `ENVIRONMENT=production` in .env
- [ ] Configure SSL certificates for HTTPS
- [ ] Update `ALLOWED_ORIGINS` with your production domains
- [ ] Change database password to strong password
- [ ] Review all .env settings

### Recommended

- [ ] Enable rate limiting (`RATE_LIMIT_ENABLED=true`)
- [ ] Configure security alerts (email/Slack)
- [ ] Set up log rotation
- [ ] Run security scan: `bandit -r core/ apps/`
- [ ] Test authentication flows
- [ ] Review RBAC permissions

---

## 🔧 Configuration Quick Reference

### Minimal Production .env

```env
# Environment
ENVIRONMENT=production

# Security Keys (GENERATE THESE!)
SECRET_KEY=<run generate_secrets.py>
ENCRYPTION_KEY=<run generate_secrets.py>

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pricing

# HTTPS
ENABLE_HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# CORS (YOUR DOMAINS)
ALLOWED_ORIGINS=https://yourdomain.com

# Logging
ENABLE_AUDIT_LOGGING=true
LOG_RETENTION_DAYS=90

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
```

---

## 🧪 Testing Security

### Test Rate Limiting

```bash
# Windows (send 100 requests)
for /L %i in (1,1,100) do @curl http://localhost:8000/api/v1/health
```

### Test Input Validation

```bash
# Should reject negative price
curl -X POST http://localhost:8000/api/v1/optimize ^
  -H "Content-Type: application/json" ^
  -d "{\"current_price\": -100}"

# Should reject out-of-range value
curl -X POST http://localhost:8000/api/v1/optimize ^
  -H "Content-Type: application/json" ^
  -d "{\"weather_sensitivity\": 5.0}"
```

### Run Security Scan

```bash
# Install scanner
pip install bandit

# Run scan
bandit -r core/ apps/

# Check dependencies
pip install safety
safety check
```

---

## 📖 Complete Documentation

| Document | Purpose |
|----------|---------|
| [SECURITY.md](SECURITY.md) | Complete security configuration guide |
| [SECURITY_IMPLEMENTATION_SUMMARY.md](SECURITY_IMPLEMENTATION_SUMMARY.md) | Detailed implementation overview |
| [.env.example](.env.example) | All configuration options |
| [generate_secrets.py](generate_secrets.py) | Secret key generator |

---

## 🎯 Common Scenarios

### Scenario 1: I just want to run it locally

```bash
# Use defaults (development mode)
pip install -r requirements.txt
python generate_secrets.py  # Creates .env with secure keys
.venv\Scripts\python -m uvicorn apps.api.main:app --reload
```

### Scenario 2: I'm deploying to production

```bash
# 1. Generate production keys
python generate_secrets.py

# 2. Edit .env
set ENVIRONMENT=production
set ALLOWED_ORIGINS=https://yourdomain.com

# 3. Get SSL certificate (e.g., Let's Encrypt)
# 4. Update SSL paths in .env
# 5. Run
.venv\Scripts\python apps\api\main.py
```

### Scenario 3: I need Vanta compliance

```bash
# All features are enabled by default
# Just configure:
VANTA_API_KEY=your-key
ENABLE_VANTA_SYNC=true
SOC2_COMPLIANCE=true
GDPR_COMPLIANCE=true
```

---

## 🔑 Key Management Best Practices

### Generating Keys

```bash
# JWT Secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Encryption Key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Rotation Schedule

| Key | Rotate Every |
|-----|--------------|
| DATABASE_URL password | 90 days |
| SECRET_KEY | 180 days |
| ENCRYPTION_KEY | 180 days |
| API Keys | 90 days |
| SSL Certificates | Annually |

### After Compromise

```bash
# 1. Generate new keys immediately
python generate_secrets.py

# 2. Update .env
# 3. Restart application
# 4. Revoke old tokens/sessions
# 5. Review audit logs
# 6. Notify affected users if needed
```

---

## 🆘 Troubleshooting

### "SECRET_KEY must be changed in production"

**Fix**: Run `python generate_secrets.py` to generate secure keys

### Rate limit errors in testing

**Fix**: Temporarily disable for testing:
```env
RATE_LIMIT_ENABLED=false
```

### CORS errors

**Fix**: Add your frontend domain to ALLOWED_ORIGINS:
```env
ALLOWED_ORIGINS=http://localhost:3000,https://app.yourdomain.com
```

### Authentication not working

**Fix**: Check that:
1. SECRET_KEY is set correctly
2. Token hasn't expired (30 min default)
3. Token is sent as: `Authorization: Bearer <token>`

---

## 📞 Support

For security questions or to report vulnerabilities:
- **Email**: security@yourcompany.com
- **Documentation**: See [SECURITY.md](SECURITY.md)
- **GitHub Issues**: (configure your repo)

---

## ✅ You're Ready When...

- [x] `python generate_secrets.py` has been run
- [x] .env file is configured
- [x] ENVIRONMENT is set correctly
- [x] SSL certificates are configured (production)
- [x] ALLOWED_ORIGINS includes your domains
- [x] Security tests pass
- [x] Audit logging is working
- [x] Team has reviewed SECURITY.md

---

## 🎉 Next Steps

1. **Test Locally**: Verify all features work
2. **Review Logs**: Check `logs/audit.log`
3. **Run Security Scan**: `bandit -r core/ apps/`
4. **Deploy Staging**: Test in staging environment
5. **Vanta Integration**: Connect Vanta if using
6. **Production**: Deploy with confidence!

---

**Security Version**: 2.0.0
**Compliance**: SOC2, GDPR, CCPA Ready
**Last Updated**: 2025-10-12

**Your application is now enterprise-secure! 🚀**
