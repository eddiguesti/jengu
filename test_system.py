"""Test script to verify the entire intelligent pricing system"""
import sys
from pathlib import Path
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

# Fix Windows encoding
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    sys.stdout.reconfigure(encoding='utf-8')

# Add project root
sys.path.insert(0, str(Path(__file__).parent))

from core.models.business_profile import BusinessProfile, BusinessProfileManager
from core.utils.geocode import resolve_location
from core.services.enrichment_pipeline import EnrichmentPipeline
from core.analysis.correlations import compute_correlations, rank_top_features
from core.analysis.pricing_weights import PricingWeightGenerator

print("=" * 60)
print("Testing Intelligent Dynamic Pricing System")
print("=" * 60)

# Test 1: Business Profile
print("\n[1/6] Testing Business Profile...")
try:
    profile = BusinessProfile(
        business_name="Test Hotel",
        business_type="Hotel",
        country="FR",
        city="Paris",
        latitude=48.8566,
        longitude=2.3522,
        timezone="Europe/Paris"
    )
    print("  ✓ BusinessProfile created")

    # Test save/load
    manager = BusinessProfileManager(path=Path("data/test_profile.json"))
    manager.save(profile)
    loaded = manager.load()
    assert loaded.business_name == "Test Hotel"
    print("  ✓ Save/load works")

    # Cleanup
    Path("data/test_profile.json").unlink(missing_ok=True)

except Exception as e:
    print(f"  ✗ Failed: {e}")
    sys.exit(1)

# Test 2: Geocoding
print("\n[2/6] Testing Geocoding...")
try:
    location = resolve_location("Paris", "FR")
    assert 48 < location['lat'] < 49
    assert 2 < location['lon'] < 3
    assert location['timezone'] == "Europe/Paris"
    print(f"  ✓ Geocoded Paris: {location['lat']:.2f}, {location['lon']:.2f}")

except Exception as e:
    print(f"  ✗ Failed: {e}")
    sys.exit(1)

# Test 3: Create sample data
print("\n[3/6] Creating sample booking data...")
try:
    # Generate 90 days of sample data
    dates = pd.date_range(start='2024-01-01', periods=90, freq='D')
    np.random.seed(42)

    sample_data = pd.DataFrame({
        'booking_date': dates,
        'final_price': np.random.normal(250, 50, 90),
        'bookings': np.random.poisson(5, 90),
        'destination': 'Paris'
    })

    print(f"  ✓ Created {len(sample_data)} sample bookings")

except Exception as e:
    print(f"  ✗ Failed: {e}")
    sys.exit(1)

# Test 4: Enrichment Pipeline
print("\n[4/6] Testing Data Enrichment...")
try:
    pipeline = EnrichmentPipeline(profile)

    enriched_df, summary = pipeline.enrich_bookings(
        sample_data,
        date_col='booking_date'
    )

    print(f"  ✓ Enriched {summary['total_bookings']} bookings")
    print(f"  ✓ Weather coverage: {summary['weather_coverage_pct']}%")
    print(f"  ✓ Holidays detected: {summary['holidays_detected']}")
    print(f"  ✓ Features added: {summary['features_added']}")

    # Verify new columns exist
    assert 'temp_mean' in enriched_df.columns
    assert 'is_holiday' in enriched_df.columns
    assert 'is_weekend' in enriched_df.columns
    assert 'weather_quality' in enriched_df.columns
    print("  ✓ All expected features present")

except Exception as e:
    print(f"  ✗ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Correlation Analysis
print("\n[5/6] Testing Correlation Analysis...")
try:
    # Compute correlations
    correlations_df = compute_correlations(
        enriched_df,
        target='bookings'
    )

    print(f"  ✓ Computed {len(correlations_df)} correlation results")

    # Rank features
    rankings_df = rank_top_features(correlations_df, top_n=10)

    if not rankings_df.empty:
        top_feature = rankings_df.iloc[0]
        print(f"  ✓ Top feature: {top_feature['feature']} (score: {top_feature['combined_score']:.3f})")

except Exception as e:
    print(f"  ✗ Failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Pricing Weights
print("\n[6/6] Testing Pricing Weight Generation...")
try:
    generator = PricingWeightGenerator()
    weights = generator.generate_weights(rankings_df)

    print(f"  ✓ Generated {len(weights)} pricing weights:")
    for category, weight in sorted(weights.items(), key=lambda x: x[1], reverse=True):
        print(f"    - {category}: {weight*100:.1f}%")

    suggestions = generator.suggest_pricing_factors()
    print(f"  ✓ Generated recommendations for {len(suggestions)} categories")

except Exception as e:
    print(f"  ✗ Failed: {e}")
    sys.exit(1)

# Summary
print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED!")
print("=" * 60)
print("\nThe Intelligent Dynamic Pricing System is fully operational.")
print("\nNext steps:")
print("  1. Run: .venv\\Scripts\\streamlit run apps\\ui\\pages\\01_Setup.py")
print("  2. Complete the Setup Wizard")
print("  3. Upload your historical booking data")
print("  4. Analyze correlations and generate pricing weights")
print("\nSee INTELLIGENT_PRICING_GUIDE.md for full documentation.")
