# Pricing Service Quick Start

**Get the Jengu Pricing Service running in 5 minutes**

---

## Prerequisites

- Python 3.10+
- pip installed

---

## Installation

```bash
# 1. Navigate to pricing service directory
cd services/pricing

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt
```

---

## Start Service

```bash
# From services/pricing directory
python main.py
```

**Service runs on**: `http://localhost:8000`

**API Docs**: `http://localhost:8000/docs` (Swagger UI)

---

## Quick Test

### Health Check

```bash
curl http://localhost:8000/live
```

Expected: `{"status":"alive","timestamp":"..."}`

### Get Price Quote

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "entity": {"userId": "test", "propertyId": "test"},
    "stay_date": "2025-08-20",
    "quote_time": "2025-01-18T12:00:00Z",
    "product": {"type": "standard", "refundable": false, "los": 1},
    "inventory": {"capacity": 50, "remaining": 15},
    "market": {"comp_price_p50": 110},
    "context": {"season": "summer", "day_of_week": 5},
    "toggles": {"strategy_fill_vs_rate": 50, "risk_mode": "balanced"}
  }'
```

Expected: Price quote with reasoning

---

## Common Commands

```bash
# Start with auto-reload (development)
uvicorn main:app --reload

# Start on different port
python main.py --port 8080

# Run with more workers (production)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# View API docs
open http://localhost:8000/docs  # macOS
start http://localhost:8000/docs  # Windows
```

---

## Endpoints

| Endpoint   | Method | Purpose                       |
| ---------- | ------ | ----------------------------- |
| `/`        | GET    | Service info                  |
| `/live`    | GET    | Health check (always 200)     |
| `/ready`   | GET    | Readiness check               |
| `/version` | GET    | Version info                  |
| `/score`   | POST   | Get price quote               |
| `/learn`   | POST   | Submit outcomes (Phase 2)     |
| `/docs`    | GET    | Interactive API documentation |

---

## Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

### Module Not Found

```bash
pip install -r requirements.txt
```

### Python Version Issues

```bash
python --version  # Should be 3.10+
```

---

## Full Documentation

- **Complete Setup**: [../../docs/developer/PRICING_ENGINE_SETUP.md](../../docs/developer/PRICING_ENGINE_SETUP.md)
- **Service README**: [README.md](README.md)
- **API Reference**: http://localhost:8000/docs (when service is running)

---

**Questions?** Check the [README.md](README.md) or [PRICING_ENGINE_SETUP.md](../../docs/developer/PRICING_ENGINE_SETUP.md)
