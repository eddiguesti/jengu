"""Simple system test"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

print("Testing Intelligent Dynamic Pricing System")
print("=" * 50)

# Test imports
print("\n[1/6] Testing imports...")
try:
    from core.models.business_profile import BusinessProfile, BusinessProfileManager
    from core.utils.geocode import resolve_location
    from core.services.enrichment_pipeline import EnrichmentPipeline
    from core.analysis.correlations import compute_correlations, rank_top_features
    from core.analysis.pricing_weights import PricingWeightGenerator
    print("  [OK] All modules imported successfully")
except Exception as e:
    print(f"  [FAIL] Import error: {e}")
    sys.exit(1)

# Test Business Profile
print("\n[2/6] Testing Business Profile...")
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
    manager = BusinessProfileManager(path=Path("data/test_profile.json"))
    manager.save(profile)
    loaded = manager.load()
    assert loaded.business_name == "Test Hotel"
    print("  [OK] BusinessProfile works")
    Path("data/test_profile.json").unlink(missing_ok=True)
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Test Geocoding
print("\n[3/6] Testing Geocoding...")
try:
    location = resolve_location("Paris", "FR")
    assert 48 < location['lat'] < 49
    print(f"  [OK] Geocoded: {location['lat']:.2f}, {location['lon']:.2f}, {location['timezone']}")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Test Enrichment
print("\n[4/6] Testing Enrichment Pipeline...")
try:
    import pandas as pd
    import numpy as np

    dates = pd.date_range(start='2024-01-01', periods=30, freq='D')
    sample_data = pd.DataFrame({
        'booking_date': dates,
        'final_price': np.random.normal(250, 50, 30),
        'bookings': np.random.poisson(5, 30),
    })

    pipeline = EnrichmentPipeline(profile)
    enriched_df, summary = pipeline.enrich_bookings(sample_data, date_col='booking_date')

    print(f"  [OK] Enriched {summary['total_bookings']} bookings")
    print(f"       Weather coverage: {summary['weather_coverage_pct']}%")
    print(f"       Features added: {summary['features_added']}")

except Exception as e:
    print(f"  [FAIL] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test Correlation Analysis
print("\n[5/6] Testing Correlation Analysis...")
try:
    correlations_df = compute_correlations(enriched_df, target='bookings')
    rankings_df = rank_top_features(correlations_df, top_n=5)
    print(f"  [OK] Analyzed {len(correlations_df)} correlations")
    if not rankings_df.empty:
        print(f"       Top feature: {rankings_df.iloc[0]['feature']}")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Test Pricing Weights
print("\n[6/6] Testing Pricing Weights...")
try:
    generator = PricingWeightGenerator()
    weights = generator.generate_weights(rankings_df)
    print(f"  [OK] Generated {len(weights)} pricing weights")
    for cat, w in list(weights.items())[:3]:
        print(f"       {cat}: {w*100:.1f}%")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

print("\n" + "=" * 50)
print("SUCCESS: All tests passed!")
print("=" * 50)
print("\nThe system is fully operational.")
print("\nNext: Run 'streamlit run apps/ui/pages/01_Setup.py'")
