"""
Tests for FastAPI pricing service endpoints
"""

import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test GET / returns service info"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Jengu Pricing ML Service"
    assert data["status"] == "operational"
    assert "version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test GET /health returns healthy status"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_loaded" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_score_endpoint_missing_fields():
    """Test POST /score with missing required fields returns 422"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "entity": {"userId": "test-user", "propertyId": "test-property"},
            # Missing stay_date, quote_time, etc.
        }

        response = await client.post("/score", json=payload)

    # FastAPI returns 422 for validation errors
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_model_info_endpoint():
    """Test GET /model/info returns model information"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/model/info")

    assert response.status_code == 200
    data = response.json()
    # Model info should be a dictionary
    assert isinstance(data, dict)
