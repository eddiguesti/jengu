"""
Jengu Pricing Service - FastAPI Microservice
============================================
Phase 1: Rule-based pricing with occupancy awareness
Phase 2: ML models (EnKF, conformal prediction, demand forecasting)

This service provides:
- /score - Get price quote for a stay date
- /learn - Submit booking outcomes for model training
- /live - Health check (always returns 200)
- /ready - Readiness check (returns 200 when models loaded)
- /version - Service version info
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date
import os

# Initialize FastAPI app
app = FastAPI(
    title="Jengu Pricing Service",
    description="Dynamic pricing microservice with occupancy-aware optimization",
    version="1.0.0-MVP",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================================
# Pydantic Models (Request/Response)
# ========================================


class EntityInfo(BaseModel):
    """User and property identification"""

    userId: str
    propertyId: str


class ProductInfo(BaseModel):
    """Product configuration"""

    type: str  # e.g., "standard", "premium"
    refundable: bool = False
    los: int = 1  # length of stay


class InventoryInfo(BaseModel):
    """Inventory/capacity information"""

    capacity: Optional[int] = None
    remaining: Optional[int] = None
    overbook_limit: int = 0


class MarketInfo(BaseModel):
    """Competitive market data"""

    comp_price_p10: Optional[float] = None
    comp_price_p50: Optional[float] = None
    comp_price_p90: Optional[float] = None


class ContextInfo(BaseModel):
    """Contextual features"""

    season: Optional[str] = None  # winter, spring, summer, autumn
    day_of_week: Optional[int] = None  # 0=Monday, 6=Sunday
    weather: Optional[Dict[str, Any]] = None


class PricingToggles(BaseModel):
    """Director toggles for pricing strategy"""

    strategy_fill_vs_rate: Optional[int] = Field(
        default=50, ge=0, le=100
    )  # 0=fill, 100=rate
    exploration_pct: Optional[float] = Field(default=5.0, ge=0, le=20)  # exploration %
    risk_mode: Optional[str] = Field(default="balanced")  # conservative, balanced, aggressive
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    max_day_delta_pct: Optional[float] = Field(default=10.0, ge=0, le=50)
    target_occ_by_lead: Optional[Dict[str, float]] = None  # {"0-1": 0.85, "2-7": 0.75, ...}


class ScoreRequest(BaseModel):
    """Request body for /score endpoint"""

    entity: EntityInfo
    stay_date: str  # YYYY-MM-DD
    quote_time: str  # ISO timestamp
    product: ProductInfo
    inventory: InventoryInfo
    market: MarketInfo = MarketInfo()
    costs: Optional[Dict[str, Any]] = None
    context: ContextInfo = ContextInfo()
    toggles: PricingToggles = PricingToggles()
    allowed_price_grid: Optional[List[float]] = None


class ScoreResponse(BaseModel):
    """Response from /score endpoint"""

    price: float
    price_grid: Optional[List[float]] = None
    conf_band: Optional[Dict[str, float]] = None  # {"lower": x, "upper": y}
    expected: Optional[Dict[str, float]] = None  # {"occ_now": x, "occ_end_bucket": y}
    reasons: Optional[List[str]] = None
    safety: Optional[Dict[str, Any]] = None


class OutcomeRecord(BaseModel):
    """Single outcome record for learning"""

    quote_id: str
    entity: EntityInfo
    stay_date: str
    product: ProductInfo
    context: ContextInfo
    price_offered: float
    booked: bool
    cancelled: Optional[bool] = None
    revenue_realized: Optional[float] = None


class LearnResponse(BaseModel):
    """Response from /learn endpoint"""

    success: bool
    processed: int
    message: Optional[str] = None


# ========================================
# Global State
# ========================================

# Track if service is ready (models loaded)
service_ready = True  # For MVP, always ready since we use rules


# ========================================
# Rule-based Pricing Logic (Phase 1)
# ========================================


def calculate_rule_based_price(request: ScoreRequest) -> ScoreResponse:
    """
    MVP Rule-based pricing with occupancy awareness

    Strategy:
    1. Start with base price (from market or defaults)
    2. Adjust for occupancy (higher if low availability)
    3. Adjust for season/day of week
    4. Adjust for strategy (fill vs rate)
    5. Apply min/max constraints
    6. Return price with reasoning
    """

    # Default base price if no market data
    base_price = 100.0

    # Use competitor median if available
    if request.market.comp_price_p50 is not None:
        base_price = request.market.comp_price_p50

    # Season adjustments
    season_multipliers = {
        "winter": 0.85,
        "spring": 1.0,
        "summer": 1.25,
        "autumn": 0.95,
    }

    season = request.context.season or "spring"
    price = base_price * season_multipliers.get(season, 1.0)

    # Day of week adjustments (weekends more expensive)
    dow = request.context.day_of_week
    if dow is not None:
        if dow in [5, 6]:  # Friday, Saturday
            price *= 1.15
        elif dow in [0, 4]:  # Monday, Thursday
            price *= 1.05

    # Occupancy-aware pricing
    occupancy_rate = None
    if request.inventory.capacity and request.inventory.remaining is not None:
        booked = request.inventory.capacity - request.inventory.remaining
        occupancy_rate = booked / request.inventory.capacity if request.inventory.capacity > 0 else 0

        # Higher prices when occupancy is high (scarcity)
        if occupancy_rate > 0.8:
            price *= 1.3  # 30% premium when 80%+ full
        elif occupancy_rate > 0.6:
            price *= 1.15  # 15% premium when 60%+ full
        elif occupancy_rate < 0.3:
            price *= 0.9  # 10% discount when below 30% occupancy

    # Strategy adjustment (fill vs rate)
    fill_vs_rate = request.toggles.strategy_fill_vs_rate or 50
    if fill_vs_rate < 50:
        # More fill-oriented: lower prices
        fill_factor = 1.0 - ((50 - fill_vs_rate) / 100)  # 0.5 to 1.0
        price *= fill_factor
    elif fill_vs_rate > 50:
        # More rate-oriented: higher prices
        rate_factor = 1.0 + ((fill_vs_rate - 50) / 100)  # 1.0 to 1.5
        price *= rate_factor

    # Risk mode adjustments
    risk_mode = request.toggles.risk_mode or "balanced"
    risk_multipliers = {
        "conservative": 0.95,  # More conservative pricing
        "balanced": 1.0,
        "aggressive": 1.1,  # Push prices higher
    }
    price *= risk_multipliers.get(risk_mode, 1.0)

    # Refundable products command premium
    if request.product.refundable:
        price *= 1.1

    # Apply min/max constraints
    min_price = request.toggles.min_price or 50.0
    max_price = request.toggles.max_price or 500.0
    price = max(min_price, min(price, max_price))

    # Round to nearest dollar (or 0.99 for psychological pricing)
    price = round(price) - 0.01

    # Build reasoning
    reasons = []
    reasons.append(f"Base price: ${base_price:.2f}")
    reasons.append(f"Season adjustment ({season}): {season_multipliers.get(season, 1.0):.2f}x")

    if dow is not None:
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        reasons.append(f"Day of week ({day_names[dow]})")

    if occupancy_rate is not None:
        reasons.append(f"Current occupancy: {occupancy_rate * 100:.1f}%")

    reasons.append(f"Strategy: {fill_vs_rate}% fill-vs-rate")
    reasons.append(f"Risk mode: {risk_mode}")

    # Expected occupancy (rough estimate for MVP)
    expected_occ_now = occupancy_rate if occupancy_rate is not None else 0.5
    expected_occ_end = min(
        1.0, expected_occ_now + 0.2
    )  # Assume 20% more bookings by stay date

    # Build price grid (for exploration)
    price_grid = [
        round(price * 0.9, 2),  # -10%
        round(price * 0.95, 2),  # -5%
        price,  # current
        round(price * 1.05, 2),  # +5%
        round(price * 1.1, 2),  # +10%
    ]

    # Confidence band (placeholder for future ML)
    conf_band = {"lower": round(price * 0.9, 2), "upper": round(price * 1.1, 2)}

    return ScoreResponse(
        price=price,
        price_grid=price_grid,
        conf_band=conf_band,
        expected={"occ_now": expected_occ_now, "occ_end_bucket": expected_occ_end},
        reasons=reasons,
        safety={"strategy": "rule_based_mvp", "version": "1.0.0"},
    )


# ========================================
# API Endpoints
# ========================================


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Jengu Pricing Service",
        "version": "1.0.0-MVP",
        "phase": "Rule-based pricing",
        "status": "operational",
    }


@app.get("/live")
async def liveness():
    """Liveness probe - always returns 200 if service is running"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}


@app.get("/ready")
async def readiness():
    """Readiness probe - returns 200 only when service is ready to serve requests"""
    if not service_ready:
        raise HTTPException(status_code=503, detail="Service not ready (models not loaded)")

    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
        "phase": "rule_based",
    }


@app.get("/version")
async def version():
    """Version and service information"""
    return {
        "service": "Jengu Pricing Service",
        "version": "1.0.0-MVP",
        "phase": "Rule-based pricing (Phase 1)",
        "ml_models": "Not yet implemented (Phase 2)",
        "python_version": os.sys.version,
    }


@app.post("/score", response_model=ScoreResponse)
async def score_price(request: ScoreRequest):
    """
    Get a price quote for a specific stay date and product configuration

    This is the main pricing endpoint. Returns:
    - price: Recommended price
    - price_grid: Alternative price options for exploration
    - conf_band: Confidence interval (future ML feature)
    - expected: Expected occupancy metrics
    - reasons: Human-readable pricing rationale
    """

    try:
        result = calculate_rule_based_price(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")


@app.post("/learn", response_model=LearnResponse)
async def learn_from_outcomes(batch: List[OutcomeRecord]):
    """
    Submit booking outcomes for model training

    Phase 1 (MVP): Just logs the outcomes, no actual learning
    Phase 2: Will update ML models (EnKF, conformal prediction, etc.)
    """

    try:
        # For MVP, just acknowledge receipt
        # In Phase 2, this will update ML models
        processed_count = len(batch)

        print(f"📚 Received {processed_count} learning records (Phase 1: logging only)")

        # Log some basic stats
        booked_count = sum(1 for record in batch if record.booked)
        print(
            f"   - Booked: {booked_count}/{processed_count} ({booked_count / processed_count * 100:.1f}%)"
        )

        return LearnResponse(
            success=True,
            processed=processed_count,
            message="Phase 1: Outcomes logged, ML training deferred to Phase 2",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning failed: {str(e)}")


# ========================================
# Server Startup
# ========================================

if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting Jengu Pricing Service...")
    print("📍 Phase 1: Rule-based pricing with occupancy awareness")
    print("🔮 Phase 2: ML models (coming soon)")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
