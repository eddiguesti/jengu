# Test Suite

This directory contains the test suite for the Jengu platform.

## 📂 Directory Structure

```
tests/
├── unit/                  # Unit tests (isolated, fast)
│   ├── test_pricing.py    # Price calculation tests
│   └── test_policy.py     # Policy engine tests
│
├── integration/           # Integration tests (with external services)
│   └── test_api.py        # API integration tests
│
├── test_simple.py         # Quick smoke test
└── test_system.py         # Full system test
```

## 🚀 Running Tests

### All Tests

```bash
# From project root
pytest tests/

# With verbose output
pytest tests/ -v

# With coverage report
pytest tests/ --cov=core --cov-report=html

# Open coverage report
open htmlcov/index.html  # Mac
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

### Specific Test Files

```bash
# Run unit tests only
pytest tests/unit/

# Run integration tests only
pytest tests/integration/

# Run a specific test file
pytest tests/unit/test_pricing.py -v

# Run a specific test function
pytest tests/unit/test_pricing.py::test_calculate_optimal_price -v
```

### Quick Smoke Test

```bash
# Quick sanity check (runs in ~5 seconds)
python tests/test_simple.py
```

### Full System Test

```bash
# Complete end-to-end test (runs in ~30 seconds)
python tests/test_system.py
```

## 📊 Test Coverage

Current coverage targets:
- Core modules: > 80%
- Critical paths (pricing, optimization): > 90%
- Utilities: > 70%

Generate coverage report:
```bash
pytest tests/ --cov=core --cov-report=term-missing
```

## ✍️ Writing Tests

### Unit Test Example

```python
# tests/unit/test_example.py
import pytest
from core.analysis.pricing_weights import PricingWeightGenerator


def test_generate_weights():
    """Test that pricing weights are generated correctly."""
    generator = PricingWeightGenerator()

    # Mock input data
    features_df = pd.DataFrame({
        'feature': ['temp_mean', 'is_weekend', 'is_holiday'],
        'combined_score': [0.8, 0.6, 0.9]
    })

    # Generate weights
    weights = generator.generate_weights(features_df)

    # Assertions
    assert 'weather' in weights
    assert 'temporal' in weights
    assert sum(weights.values()) <= 1.0
    assert all(0 <= w <= 1 for w in weights.values())
```

### Integration Test Example

```python
# tests/integration/test_enrichment.py
import pytest
from core.services.enrichment_pipeline import EnrichmentPipeline
from core.models.business_profile import BusinessProfile


@pytest.fixture
def business_profile():
    """Create a test business profile."""
    return BusinessProfile(
        business_name="Test Hotel",
        country="FR",
        city="Paris",
        latitude=48.8566,
        longitude=2.3522,
        timezone="Europe/Paris"
    )


def test_enrichment_pipeline(business_profile):
    """Test complete enrichment pipeline with real APIs."""
    # Create sample data
    bookings_df = pd.DataFrame({
        'booking_date': pd.date_range('2024-01-01', periods=10),
        'bookings': [5, 8, 3, 12, 6, 9, 15, 7, 4, 11]
    })

    # Run enrichment
    pipeline = EnrichmentPipeline(business_profile)
    enriched_df, summary = pipeline.enrich_bookings(bookings_df)

    # Assertions
    assert len(enriched_df) == 10
    assert 'temp_mean' in enriched_df.columns
    assert 'is_holiday' in enriched_df.columns
    assert summary['weather_coverage_pct'] > 0
```

## 🧪 Test Fixtures

Common fixtures are defined in `conftest.py` (create if needed):

```python
# tests/conftest.py
import pytest
import pandas as pd


@pytest.fixture
def sample_bookings():
    """Sample booking data for tests."""
    return pd.DataFrame({
        'booking_date': pd.date_range('2024-01-01', periods=30),
        'final_price': np.random.normal(250, 50, 30),
        'bookings': np.random.poisson(5, 30),
    })
```

## 🏃 Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment checks

CI configuration: `.github/workflows/tests.yml` (if using GitHub Actions)

## 📋 Test Checklist

Before committing code, ensure:

- [ ] All tests pass (`pytest tests/`)
- [ ] New code has tests
- [ ] Coverage hasn't decreased
- [ ] No warnings or deprecations
- [ ] Tests are fast (< 1 second per unit test)
- [ ] Integration tests use mocks when appropriate

## 🐛 Debugging Tests

### Run with debugging

```bash
# Drop into debugger on failure
pytest tests/ --pdb

# Show print statements
pytest tests/ -s

# Show detailed output
pytest tests/ -vv
```

### Common Issues

**Import errors:**
```bash
# Set PYTHONPATH
export PYTHONPATH=/path/to/jengu  # Mac/Linux
set PYTHONPATH=C:\path\to\jengu  # Windows
```

**Slow tests:**
```bash
# Show slowest 10 tests
pytest tests/ --durations=10
```

## 📚 Testing Resources

- pytest docs: https://docs.pytest.org
- pytest plugins: pytest-cov, pytest-mock, pytest-asyncio
- Testing best practices: https://docs.python-guide.org/writing/tests/

---

**Run tests before every commit!**

**Last Updated**: 2025-10-14
