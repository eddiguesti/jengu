"""
Jengu Pricing ML Service
=========================
Machine learning-powered dynamic pricing engine for hospitality businesses.

This service provides:
- Real-time price optimization
- Demand-based pricing
- Competitor-aware pricing
- Seasonal and temporal adjustments
- Confidence intervals and risk management
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import uvicorn
from datetime import datetime, date
import logging

# Import our pricing engine
from pricing_engine import PricingEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Jengu Pricing ML Service",
    description="Machine learning pricing engine for dynamic hospitality pricing",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize pricing engine
pricing_engine = PricingEngine()

# ============================================================================
# Request/Response Models
# ============================================================================

class EntityModel(BaseModel):
    userId: str
    propertyId: str

class ProductModel(BaseModel):
    type: str = "standard"
    refundable: bool = False
    los: int = Field(1, ge=1, description="Length of stay in nights")

class InventoryModel(BaseModel):
    capacity: int = Field(..., ge=1)
    remaining: int = Field(..., ge=0)
    overbook_limit: int = Field(0, ge=0)

class MarketModel(BaseModel):
    comp_price_p10: Optional[float] = None
    comp_price_p50: Optional[float] = None
    comp_price_p90: Optional[float] = None

class ContextModel(BaseModel):
    season: Optional[str] = None
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    weather: Optional[Dict[str, Any]] = None

class TogglesModel(BaseModel):
    aggressive: bool = False
    conservative: bool = False
    use_ml: bool = True
    use_competitors: bool = True
    apply_seasonality: bool = True

class PricingRequest(BaseModel):
    entity: EntityModel
    stay_date: str
    quote_time: str
    product: ProductModel
    inventory: InventoryModel
    market: MarketModel
    costs: Optional[Dict[str, Any]] = None
    context: ContextModel
    toggles: TogglesModel
    allowed_price_grid: Optional[List[float]] = None

class PricingResponse(BaseModel):
    price: float
    price_grid: Optional[List[float]] = None
    conf_band: Optional[Dict[str, float]] = None
    expected: Optional[Dict[str, float]] = None
    reasons: Optional[List[str]] = None
    safety: Optional[Dict[str, Any]] = None

class LearnRequest(BaseModel):
    batch: List[Dict[str, Any]]

class LearnResponse(BaseModel):
    success: bool
    processed: int
    message: str

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Jengu Pricing ML Service",
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": pricing_engine.is_ready(),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/score", response_model=PricingResponse)
async def score(request: PricingRequest):
    """
    Generate optimal price recommendation

    This endpoint analyzes:
    - Historical pricing patterns
    - Current inventory levels
    - Competitor pricing
    - Seasonal trends
    - Day of week patterns
    - Lead time dynamics

    Returns optimized price with confidence intervals.
    """
    try:
        logger.info(f"Pricing request for property {request.entity.propertyId}, stay_date {request.stay_date}")

        # Calculate optimal price
        result = pricing_engine.calculate_price(
            property_id=request.entity.propertyId,
            user_id=request.entity.userId,
            stay_date=request.stay_date,
            quote_time=request.quote_time,
            product=request.product.dict(),
            inventory=request.inventory.dict(),
            market=request.market.dict(),
            context=request.context.dict(),
            toggles=request.toggles.dict(),
            allowed_price_grid=request.allowed_price_grid
        )

        logger.info(f"Price calculated: €{result['price']:.2f}")

        return PricingResponse(**result)

    except Exception as e:
        logger.error(f"Error calculating price: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")

@app.post("/learn", response_model=LearnResponse)
async def learn(request: LearnRequest):
    """
    Submit booking outcomes for ML model training

    This endpoint accepts historical booking data to improve
    the pricing model over time through reinforcement learning.
    """
    try:
        logger.info(f"Learning from {len(request.batch)} outcomes")

        processed = pricing_engine.learn_from_outcomes(request.batch)

        return LearnResponse(
            success=True,
            processed=processed,
            message=f"Successfully processed {processed} outcomes"
        )

    except Exception as e:
        logger.error(f"Error processing learning batch: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Learning failed: {str(e)}")

@app.get("/model/info")
async def model_info():
    """Get information about the current pricing model"""
    return pricing_engine.get_model_info()

# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (dev only)
        log_level="info"
    )
