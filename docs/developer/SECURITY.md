# Security Configuration Guide

## Overview

This guide covers security configuration for the Jengu Dynamic Pricing Platform. The platform is designed with security best practices and can be configured to meet SOC2, GDPR, and CCPA compliance requirements.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Network Security](#network-security)
5. [Logging & Monitoring](#logging--monitoring)
6. [Security Checklist](#security-checklist)
7. [Incident Response](#incident-response)

---

## Security Architecture

### Defense in Depth

The application implements multiple layers of security:

```
┌─────────────────────────────────────┐
│   Layer 1: Network Security          │
│   - HTTPS/TLS 1.2+                   │
│   - Rate Limiting (configurable)     │
│   - CORS Configuration               │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 2: Application Security      │
│   - Input Validation (Pydantic)      │
│   - Security Headers                 │
│   - API Authentication (optional)    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 3: Data Security             │
│   - Parameterized Queries            │
│   - Environment Variables            │
│   - Secure File Handling             │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 4: Monitoring & Audit        │
│   - Application Logging              │
│   - Error Tracking                   │
│   - Access Logs                      │
└─────────────────────────────────────┘
```

---

## Authentication & Authorization

### API Authentication (Optional)

For production deployments requiring authentication:

#### JWT Token Configuration

Generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Add to `.env`:
```env
SECRET_KEY=your-generated-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### Implementing JWT in FastAPI

```python
# apps/api/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import os

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(
            credentials.credentials,
            os.getenv("SECRET_KEY"),
            algorithms=[os.getenv("ALGORITHM", "HS256")]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

# Use in endpoints:
@app.post("/api/v1/optimize")
async def optimize_pricing(
    data: OptimizeRequest,
    user: dict = Depends(verify_token)  # Protect endpoint
):
    pass
```

### Password Policy (If Implementing User Management)

**Recommended Requirements**:
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character

---

## Data Protection

### Environment Variables

**Never commit secrets to git**. Use environment variables:

**Development** (`.env`):
```env
DATABASE_URL=postgresql://localhost:5432/jengu_dev
SECRET_KEY=dev-secret-key-change-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Production** (set in hosting platform):
```env
DATABASE_URL=postgresql://user:pass@host:5432/jengu_prod
SECRET_KEY=<generated-secure-key>
ALLOWED_ORIGINS=https://app.yourdomain.com
LOG_LEVEL=INFO
```

### SQL Injection Protection

The platform uses parameterized queries via SQLAlchemy ORM and Pydantic validation:

```python
# ✅ SAFE - Parameterized query
session.query(Booking).filter(
    Booking.booking_id == user_input  # Automatically escaped
).first()

# ❌ UNSAFE - Never do this
session.execute(f"SELECT * FROM bookings WHERE id = {user_input}")
```

### Input Validation

FastAPI + Pydantic provides automatic validation:

```python
from pydantic import BaseModel, Field

class OptimizeRequest(BaseModel):
    current_price: float = Field(gt=0, lt=10000)  # Must be between 0 and 10000
    weather_sensitivity: float = Field(ge=0, le=1)  # Must be 0-1

# Automatic validation - invalid input returns 422 Unprocessable Entity
```

### File Upload Security

```python
from fastapi import UploadFile
import magic

ALLOWED_EXTENSIONS = {'.csv', '.xlsx', '.xls'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def validate_upload(file: UploadFile):
    # Check file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Invalid file type")

    # Check file size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large")

    return file
```

---

## Network Security

### HTTPS/TLS Configuration

**Development**: HTTP is acceptable
**Production**: HTTPS is mandatory

#### Using Let's Encrypt (Free)
```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificates location:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

#### Using Cloud Provider SSL
- **Vercel**: Automatic SSL
- **Railway**: Automatic SSL for custom domains
- **AWS**: Use ACM (AWS Certificate Manager)
- **GCP**: Google-managed SSL certificates

### Security Headers

Implemented in FastAPI middleware:

```python
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

app = FastAPI()

# Security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

### CORS Configuration

**Development**:
```python
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
]
```

**Production**:
```python
origins = [
    "https://app.yourdomain.com",
    "https://www.yourdomain.com",
]
```

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### Rate Limiting

Install slowapi for rate limiting:
```bash
pip install slowapi
```

Implement:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/v1/optimize")
@limiter.limit("10/minute")  # 10 requests per minute
async def optimize_pricing(request: Request):
    pass
```

---

## Logging & Monitoring

### Application Logging

Configure structured logging:

```python
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/app.log')
    ]
)

logger = logging.getLogger(__name__)
```

### Sensitive Data Redaction

Never log sensitive data:
```python
# ❌ BAD
logger.info(f"User email: {user.email}")

# ✅ GOOD
logger.info(f"User authenticated: {user.id}")
```

### Error Tracking

**Recommended**: Sentry

```bash
pip install sentry-sdk[fastapi]
```

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("ENVIRONMENT", "development"),
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
)
```

---

## Security Checklist

### Pre-Production Checklist

**Required**:
- [ ] Generate secure `SECRET_KEY` (not default)
- [ ] Configure HTTPS/SSL certificates
- [ ] Set `ENVIRONMENT=production`
- [ ] Restrict CORS to production domains only
- [ ] Use environment variables for all secrets
- [ ] Remove or secure API documentation endpoints
- [ ] Enable security headers
- [ ] Set up error tracking (Sentry)
- [ ] Configure proper log levels (avoid DEBUG)

**Recommended**:
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerts
- [ ] Configure automated backups
- [ ] Implement authentication if multi-user
- [ ] Run security scan (OWASP ZAP, Bandit)
- [ ] Document incident response procedures
- [ ] Set up log rotation
- [ ] Configure database connection pooling

### Post-Deployment Checklist

- [ ] Verify HTTPS is working
- [ ] Test CORS configuration
- [ ] Verify rate limiting is active
- [ ] Check security headers in browser
- [ ] Test error tracking integration
- [ ] Verify logs are being written
- [ ] Test backup restoration
- [ ] Review access logs

---

## Incident Response

### Security Incident Procedure

**1. Detection & Identification**
- Monitor error tracking dashboard
- Review application logs
- Check rate limit violations
- Investigate anomalies

**2. Containment**
```bash
# If needed:
# - Revoke API tokens
# - Block suspicious IP addresses
# - Take affected service offline temporarily
```

**3. Investigation**
```bash
# Review logs
tail -f logs/app.log | grep ERROR

# Check access patterns
grep "401\|403" logs/access.log
```

**4. Remediation**
- Patch vulnerabilities
- Rotate secrets if compromised
- Update security rules
- Deploy fixes

**5. Recovery**
- Restore from backups if needed
- Re-enable affected services
- Monitor for continued threats

**6. Post-Incident**
- Document the incident
- Update security procedures
- Implement preventive measures
- Notify stakeholders if required

### Emergency Contacts

Configure in `.env`:
```env
ALERT_EMAIL=security@yourcompany.com
```

---

## Security Testing

### Automated Security Scanning

**Python Code Security**:
```bash
pip install bandit
bandit -r core/ apps/
```

**Dependency Scanning**:
```bash
pip install safety
safety check
```

### Manual Security Testing

**Test API Authentication**:
```bash
# Test without token (should fail if auth enabled)
curl http://localhost:8000/api/v1/optimize

# Test with invalid token
curl -H "Authorization: Bearer INVALID" \
     http://localhost:8000/api/v1/optimize
```

**Test Rate Limiting**:
```bash
# Send rapid requests
for i in {1..20}; do
  curl http://localhost:8000/api/v1/optimize &
done
```

**Test Input Validation**:
```bash
# Test invalid input
curl -X POST http://localhost:8000/api/v1/optimize \
     -H "Content-Type: application/json" \
     -d '{"current_price": -100}'  # Should fail validation
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Python Security Best Practices](https://python.readthedocs.io/en/latest/library/security_warnings.html)

---

## Support

For security concerns or vulnerability reports:
- Review this security guide
- Check application logs
- Contact: security@yourcompany.com
- Use encrypted communication for sensitive issues

---

**Last Updated**: 2025-10-14
**Version**: 2.0
