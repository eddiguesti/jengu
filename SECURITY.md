# Security Configuration Guide - Vanta Compliant

## Overview

This application implements enterprise-grade security controls designed to meet SOC2, GDPR, and CCPA compliance requirements. All security features are configurable through environment variables and follow industry best practices.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Network Security](#network-security)
5. [Logging & Monitoring](#logging--monitoring)
6. [Compliance Features](#compliance-features)
7. [Security Checklist](#security-checklist)
8. [Incident Response](#incident-response)

---

## Security Architecture

### Defense in Depth

The application implements multiple layers of security:

```
┌─────────────────────────────────────┐
│   Layer 1: Network Security          │
│   - HTTPS/TLS 1.2+                   │
│   - IP Whitelisting (optional)       │
│   - Rate Limiting                    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 2: Application Security      │
│   - JWT Authentication               │
│   - RBAC Authorization               │
│   - Input Validation                 │
│   - Security Headers                 │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 3: Data Security             │
│   - Encryption at Rest               │
│   - Parameterized Queries            │
│   - PII Redaction in Logs            │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│   Layer 4: Monitoring & Audit        │
│   - Audit Trail                      │
│   - Failed Login Tracking            │
│   - Security Alerts                  │
└─────────────────────────────────────┘
```

---

## Authentication & Authorization

### JWT Token Configuration

Generate a secure secret key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Add to `.env`:
```env
SECRET_KEY=your-generated-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Password Policy

**Requirements** (SOC2 Compliant):
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character
- No password reuse (tracks last 5 passwords)

Configure in `.env`:
```env
MIN_PASSWORD_LENGTH=12
REQUIRE_UPPERCASE=true
REQUIRE_LOWERCASE=true
REQUIRE_DIGITS=true
REQUIRE_SPECIAL_CHARS=true
PASSWORD_HISTORY_COUNT=5
```

### Role-Based Access Control (RBAC)

**Available Roles:**

1. **Admin**: Full system access
2. **Manager**: Manage pricing policies, view all data
3. **Analyst**: View data, run analyses, limited edits
4. **Viewer**: Read-only access
5. **API User**: Programmatic access only

**Example Usage:**

```python
from core.security import check_permission, Permission, User, UserRole

user = User(
    user_id="user123",
    email="analyst@company.com",
    role=UserRole.ANALYST
)

if check_permission(user, Permission.EDIT_PRICING):
    # User can edit pricing
    pass
```

### Account Lockout

Protection against brute force attacks:

```env
ENABLE_FAILED_LOGIN_MONITORING=true
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MINUTES=30
```

---

## Data Protection

### Encryption at Rest

Generate an encryption key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Configure:
```env
ENCRYPTION_KEY=your-fernet-key-here
ENABLE_FIELD_ENCRYPTION=true
```

**Encrypting Sensitive Fields:**

```python
from core.security import encrypt_field, decrypt_field

# Encrypt before storing
encrypted_email = encrypt_field("user@example.com")

# Decrypt when retrieving
email = decrypt_field(encrypted_email)
```

### SQL Injection Protection

All database queries use SQLAlchemy ORM with parameterized queries:

```python
# SAFE - Parameterized query
session.query(Booking).filter(
    Booking.booking_id == user_input  # Automatically escaped
).first()

# UNSAFE - Never do this
session.execute(f"SELECT * FROM bookings WHERE id = {user_input}")
```

### Data Sanitization

```python
from core.security.middleware import sanitize_input

# Sanitize user input
safe_input = sanitize_input(user_input, max_length=1000)
```

### PII Redaction in Logs

Automatically redacts sensitive data from logs:

```env
LOG_PII_REDACTION=true
```

Redacts:
- Email addresses
- SSN
- Credit card numbers
- Phone numbers
- IP addresses (optional)

---

## Network Security

### HTTPS/TLS Configuration

**Production Setup:**

```env
ENABLE_HTTPS=true
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem
MIN_TLS_VERSION=1.2
```

**Obtaining SSL Certificates:**

Option 1: Let's Encrypt (Free)
```bash
certbot certonly --standalone -d yourdomain.com
```

Option 2: Commercial CA (Recommended for production)
- DigiCert
- Comodo
- GlobalSign

### Security Headers

Implemented automatically via middleware:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdn.plot.ly
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

Configure:
```env
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000
CSP_ENABLED=true
X_FRAME_OPTIONS=DENY
```

### CORS Configuration

**Development:**
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8501
```

**Production:**
```env
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
ALLOWED_METHODS=GET,POST,PUT,DELETE
```

### Rate Limiting

Protect against DDoS and brute force attacks:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

**Per-Endpoint Configuration:**

```python
@app.post("/api/v1/optimize")
@limiter.limit("10/minute")  # Custom rate limit
async def optimize_pricing(request: Request):
    # Endpoint logic
    pass
```

### IP Whitelisting (Optional)

Restrict access to specific IP ranges:

```env
ENABLE_IP_WHITELIST=true
ALLOWED_IP_RANGES=192.168.1.0/24,10.0.0.0/8
```

---

## Logging & Monitoring

### Audit Trail

All API requests are logged with:
- User ID
- IP address
- HTTP method and path
- Status code
- Request duration
- User agent

```env
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_PATH=logs/audit.log
AUDIT_LOG_ROTATION=daily
AUDIT_LOG_BACKUP_COUNT=90
```

### Log Retention

SOC2 requires 90-day log retention:

```env
LOG_RETENTION_DAYS=90
```

### Security Alerts

Configure alerts for security events:

```env
ENABLE_SECURITY_ALERTS=true
ALERT_EMAIL=security@yourcompany.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Alertable Events:**
- Multiple failed login attempts
- Account lockouts
- Unauthorized access attempts
- Rate limit exceeded
- Database connection errors

---

## Compliance Features

### SOC2 Compliance

Enabled by default:

```env
SOC2_COMPLIANCE=true
```

**SOC2 Controls Implemented:**

| Control | Implementation |
|---------|----------------|
| Access Control | JWT + RBAC |
| Encryption | TLS 1.2+, Fernet encryption |
| Logging | Audit trail with 90-day retention |
| Change Management | Git version control |
| Monitoring | Security alerts |
| Incident Response | Documented in this guide |

### GDPR Compliance

```env
GDPR_COMPLIANCE=true
DATA_RETENTION_DAYS=365
ENABLE_DATA_ANONYMIZATION=true
```

**GDPR Features:**
- Right to be forgotten (data deletion)
- Data export functionality
- Consent tracking
- PII encryption
- Audit logs

### CCPA Compliance

```env
CCPA_COMPLIANCE=true
```

**CCPA Features:**
- Data disclosure upon request
- Opt-out mechanisms
- Do Not Sell flag
- Data deletion within 45 days

### HIPAA (If Applicable)

```env
HIPAA_COMPLIANCE=false  # Enable if handling PHI
```

---

## Security Checklist

### Pre-Production Checklist

- [ ] Change `SECRET_KEY` from default
- [ ] Generate and set `ENCRYPTION_KEY`
- [ ] Configure SSL certificates
- [ ] Set `ENVIRONMENT=production`
- [ ] Disable API docs in production
- [ ] Configure CORS for production domains
- [ ] Enable all security headers
- [ ] Set up log rotation and retention
- [ ] Configure security alerts
- [ ] Review and restrict database credentials
- [ ] Enable IP whitelisting (if applicable)
- [ ] Test rate limiting
- [ ] Run security vulnerability scan
- [ ] Review all environment variables
- [ ] Set up automated backups
- [ ] Document incident response procedures

### Post-Deployment Checklist

- [ ] Verify HTTPS is working
- [ ] Test authentication flows
- [ ] Verify RBAC permissions
- [ ] Check audit logs are being written
- [ ] Test security alerts
- [ ] Verify rate limiting is active
- [ ] Check security headers in browser
- [ ] Run penetration test
- [ ] Review database access logs
- [ ] Verify backup restoration

---

## Incident Response

### Security Incident Procedure

**1. Detection & Identification**
- Monitor audit logs
- Review security alerts
- Investigate anomalies

**2. Containment**
```bash
# Immediately revoke compromised tokens
# Lock affected user accounts
# Block suspicious IP addresses
```

**3. Investigation**
```bash
# Review audit logs
grep "failed_login" logs/audit.log | tail -n 100

# Check for unauthorized access
grep "unauthorized" logs/audit.log
```

**4. Remediation**
- Reset compromised credentials
- Rotate secrets (SECRET_KEY, ENCRYPTION_KEY)
- Patch vulnerabilities
- Update security rules

**5. Recovery**
- Restore from backups if needed
- Re-enable affected accounts
- Monitor for continued threats

**6. Post-Incident**
- Document the incident
- Update security procedures
- Conduct team training
- Notify stakeholders if required

### Emergency Contacts

```env
ALERT_EMAIL=security@yourcompany.com
```

### Key Rotation Schedule

| Secret | Rotation Frequency |
|--------|-------------------|
| DATABASE_URL password | 90 days |
| SECRET_KEY | 180 days or after incident |
| ENCRYPTION_KEY | 180 days or after incident |
| API Keys | 90 days |
| SSL Certificates | Annually or before expiry |

---

## Security Testing

### Automated Security Scanning

**OWASP ZAP:**
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t http://localhost:8000
```

**Bandit (Python Security):**
```bash
pip install bandit
bandit -r core/ apps/
```

### Manual Security Review

**Test Authentication:**
```bash
# Test with expired token
curl -H "Authorization: Bearer EXPIRED_TOKEN" \
     http://localhost:8000/api/v1/metrics

# Test without token
curl http://localhost:8000/api/v1/optimize

# Test with invalid token
curl -H "Authorization: Bearer INVALID" \
     http://localhost:8000/api/v1/optimize
```

**Test Rate Limiting:**
```bash
# Send 100 requests rapidly
for i in {1..100}; do
  curl http://localhost:8000/api/v1/optimize &
done
```

**Test Input Validation:**
```bash
# Test SQL injection
curl -X POST http://localhost:8000/api/v1/optimize \
     -H "Content-Type: application/json" \
     -d '{"current_price": "1 OR 1=1"}'

# Test XSS
curl -X POST http://localhost:8000/api/v1/optimize \
     -H "Content-Type: application/json" \
     -d '{"current_price": "<script>alert(1)</script>"}'
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [SOC2 Compliance Guide](https://www.vanta.com/products/soc-2)
- [GDPR Overview](https://gdpr.eu/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## Support

For security concerns or vulnerability reports:
- Email: security@yourcompany.com
- Use encrypted communication for sensitive issues

**Last Updated**: 2025-10-12
**Security Version**: 2.0.0
**Compliance**: SOC2, GDPR, CCPA
