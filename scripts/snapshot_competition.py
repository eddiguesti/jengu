"""
Daily Competition Data Snapshot Script
Fetches competitor pricing data and stores it for analysis

Usage:
    python scripts/snapshot_competition.py --days 7
    python scripts/snapshot_competition.py --start 2024-01-01 --end 2024-01-31

Schedule with cron (Linux/Mac):
    0 2 * * * cd /path/to/project && python scripts/snapshot_competition.py --days 1

Schedule with Task Scheduler (Windows):
    Create a task that runs daily at 2 AM:
    Program: python.exe
    Arguments: C:\path\to\project\scripts\snapshot_competition.py --days 1
    Start in: C:\path\to\project
"""
import sys
from pathlib import Path
import asyncio
from datetime import date, timedelta
import argparse

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from core.services.competitor_intelligence import CompetitorIntelligenceService
from core.models.business_profile import BusinessProfileManager
from core.utils.logging import get_logger

logger = get_logger(__name__)


async def fetch_competitor_snapshot(
    start_date: date,
    end_date: date,
    min_similarity: float = 0.6,
    mock_mode: bool = False
) -> dict:
    """
    Fetch competitor data snapshot

    Args:
        start_date: Start date
        end_date: End date
        min_similarity: Minimum similarity score
        mock_mode: Use mock API data

    Returns:
        Dictionary with fetch statistics
    """
    logger.info(
        "snapshot_start",
        start_date=start_date,
        end_date=end_date,
        mock_mode=mock_mode
    )

    # Load business profile
    profile_manager = BusinessProfileManager()
    if not profile_manager.exists():
        logger.error("no_business_profile", message="Create a business profile first")
        return {
            "success": False,
            "error": "No business profile found"
        }

    profile = profile_manager.load()

    # Initialize service
    service = CompetitorIntelligenceService(mock_mode=mock_mode)

    # Check if competitors exist
    stats = service.get_summary_statistics()
    if stats.get("total_competitors", 0) == 0:
        logger.warning("no_competitors_found", message="Discovering competitors first...")

        # Discover competitors
        try:
            hotels = await service.discover_hotel_competitors(profile, radius_km=10)
            markets = await service.discover_airbnb_markets(profile)

            logger.info(
                "competitors_discovered",
                hotels=len(hotels),
                airbnb_markets=len(markets)
            )

            # Compute similarity
            similarities = service.compute_similarity_scores(
                profile,
                min_similarity=min_similarity,
                max_distance_km=10,
                top_n=20
            )

            logger.info("similarity_computed", count=len(similarities))

        except Exception as e:
            logger.error("discovery_failed", error=str(e))
            return {
                "success": False,
                "error": f"Discovery failed: {str(e)}"
            }

    # Fetch competitor data
    try:
        counts = await service.fetch_all_competitor_data(
            profile,
            start_date,
            end_date,
            min_similarity=min_similarity
        )

        logger.info(
            "snapshot_complete",
            hotel_observations=counts['hotels'],
            airbnb_observations=counts['airbnb_markets']
        )

        return {
            "success": True,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "hotel_observations": counts['hotels'],
            "airbnb_observations": counts['airbnb_markets'],
            "total_observations": counts['hotels'] + counts['airbnb_markets']
        }

    except Exception as e:
        logger.error("fetch_failed", error=str(e))
        return {
            "success": False,
            "error": f"Fetch failed: {str(e)}"
        }


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Fetch daily competitor pricing snapshot"
    )

    parser.add_argument(
        "--days",
        type=int,
        default=None,
        help="Number of days to fetch (backwards from today)"
    )

    parser.add_argument(
        "--start",
        type=str,
        default=None,
        help="Start date (YYYY-MM-DD)"
    )

    parser.add_argument(
        "--end",
        type=str,
        default=None,
        help="End date (YYYY-MM-DD)"
    )

    parser.add_argument(
        "--mock",
        action="store_true",
        help="Use mock API data (for testing)"
    )

    parser.add_argument(
        "--min-similarity",
        type=float,
        default=0.6,
        help="Minimum similarity score (0.0-1.0)"
    )

    args = parser.parse_args()

    # Determine date range
    if args.days is not None:
        end_date = date.today()
        start_date = end_date - timedelta(days=args.days)
    elif args.start and args.end:
        start_date = date.fromisoformat(args.start)
        end_date = date.fromisoformat(args.end)
    else:
        # Default: yesterday
        end_date = date.today() - timedelta(days=1)
        start_date = end_date

    print(f"\n🔍 Fetching competitor data from {start_date} to {end_date}")
    print(f"   Mock mode: {args.mock}")
    print(f"   Min similarity: {args.min_similarity}\n")

    # Run async function
    loop = asyncio.get_event_loop()
    result = loop.run_until_complete(
        fetch_competitor_snapshot(
            start_date,
            end_date,
            min_similarity=args.min_similarity,
            mock_mode=args.mock
        )
    )

    # Print results
    if result['success']:
        print("✓ Snapshot complete!")
        print(f"  Hotel observations: {result['hotel_observations']}")
        print(f"  Airbnb observations: {result['airbnb_observations']}")
        print(f"  Total: {result['total_observations']}")
        sys.exit(0)
    else:
        print(f"✗ Snapshot failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
