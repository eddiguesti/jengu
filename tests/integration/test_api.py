"""Integration tests for FastAPI"""
import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)


def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "name" in response.json()


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_readiness_check():
    """Test readiness check endpoint"""
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_optimize_price():
    """Test price optimization endpoint"""
    payload = {
        "destination": "Paris",
        "checkin_date": "2024-07-15",
        "checkout_date": "2024-07-22",
        "num_travelers": 2,
        "accommodation_type": "Standard",
        "season": "High",
        "base_price": 1500.0
    }

    response = client.post("/pricing/optimize", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "optimal_price" in data
    assert "expected_demand" in data
    assert "expected_revenue" in data


def test_forecast_demand():
    """Test demand forecast endpoint"""
    payload = {
        "destination": "Tokyo",
        "start_date": "2024-07-01",
        "end_date": "2024-07-07",
        "accommodation_type": "Premium",
        "season": "High"
    }

    response = client.post("/pricing/forecast", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
