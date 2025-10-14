"""Holiday data connector using python-holidays library"""
import pandas as pd
from datetime import date, datetime
from typing import Optional, Dict, Any, Set
import holidays as holidays_lib

from .base import BaseConnector, register_connector
from ..utils.logging import get_logger

logger = get_logger(__name__)


@register_connector('holidays')
class HolidayConnector(BaseConnector):
    """Connector for holiday data using python-holidays"""

    # Map cities to countries
    CITY_TO_COUNTRY = {
        'Paris': 'FR',
        'Tokyo': 'JP',
        'New York': 'US',
        'London': 'GB',
        'Sydney': 'AU',
        'Dubai': 'AE'
    }

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.holiday_calendars: Dict[str, holidays_lib.HolidayBase] = {}

    def connect(self) -> bool:
        """Initialize holiday calendars for supported countries"""
        logger.info("initializing_holiday_calendars")

        for city, country_code in self.CITY_TO_COUNTRY.items():
            try:
                # Get holiday calendar for country
                calendar = holidays_lib.country_holidays(country_code)
                self.holiday_calendars[city] = calendar
            except Exception as e:
                logger.warning(
                    "holiday_calendar_init_failed",
                    city=city,
                    country=country_code,
                    error=str(e)
                )

        self._is_connected = True
        logger.info("holiday_connector_connected", num_calendars=len(self.holiday_calendars))
        return True

    def disconnect(self):
        """Clear holiday calendars"""
        self.holiday_calendars.clear()
        self._is_connected = False

    def fetch_data(
        self,
        city: str,
        start_date: date,
        end_date: date
    ) -> pd.DataFrame:
        """
        Fetch holiday data for a city and date range

        Args:
            city: City name
            start_date: Start date
            end_date: End date

        Returns:
            DataFrame with date, city, is_holiday, holiday_name columns
        """
        if not self._is_connected:
            raise RuntimeError("Not connected. Call connect() first.")

        if city not in self.holiday_calendars:
            raise ValueError(f"City '{city}' not supported. Available: {list(self.holiday_calendars.keys())}")

        logger.info("fetching_holidays", city=city, start_date=start_date, end_date=end_date)

        calendar = self.holiday_calendars[city]

        # Generate date range
        date_range = pd.date_range(start=start_date, end=end_date, freq='D')

        # Check each date for holidays
        records = []
        for dt in date_range:
            dt_date = dt.date()
            is_holiday = dt_date in calendar
            holiday_name = calendar.get(dt_date, None)

            records.append({
                'date': dt_date,
                'city': city,
                'is_holiday': is_holiday,
                'holiday_name': holiday_name
            })

        df = pd.DataFrame(records)
        logger.info("holidays_fetched", rows=len(df), num_holidays=df['is_holiday'].sum())
        return df

    def is_holiday(self, city: str, check_date: date) -> bool:
        """
        Check if a specific date is a holiday

        Args:
            city: City name
            check_date: Date to check

        Returns:
            True if holiday
        """
        if not self._is_connected:
            self.connect()

        if city not in self.holiday_calendars:
            return False

        return check_date in self.holiday_calendars[city]

    def get_holidays(
        self,
        city: str,
        year: int
    ) -> Dict[date, str]:
        """
        Get all holidays for a city in a given year

        Args:
            city: City name
            year: Year

        Returns:
            Dictionary mapping dates to holiday names
        """
        if not self._is_connected:
            self.connect()

        if city not in self.holiday_calendars:
            return {}

        # Get holidays for the year
        calendar = self.holiday_calendars[city]
        year_holidays = {
            dt: name for dt, name in calendar.items()
            if dt.year == year
        }

        return year_holidays

    def validate(self) -> bool:
        """Validate connector"""
        try:
            if not self.connect():
                return False

            # Test with Paris for current year
            current_year = date.today().year
            holidays_dict = self.get_holidays('Paris', current_year)

            if len(holidays_dict) > 0:
                logger.info("holiday_validation_passed", num_holidays=len(holidays_dict))
                return True
            else:
                logger.warning("holiday_validation_warning", reason="no holidays found")
                return True  # Still valid, might just be no holidays

        except Exception as e:
            logger.error("holiday_validation_failed", error=str(e))
            return False


def add_holiday_features(
    bookings_df: pd.DataFrame,
    destination_col: str = 'destination',
    date_col: str = 'booking_date'
) -> pd.DataFrame:
    """
    Add holiday features to bookings DataFrame

    Args:
        bookings_df: Bookings DataFrame
        destination_col: Column with destination names
        date_col: Column with dates

    Returns:
        DataFrame with holiday features added
    """
    connector = HolidayConnector()

    with connector:
        # Add holiday flags
        bookings_df = bookings_df.copy()

        bookings_df['is_holiday'] = False
        bookings_df['holiday_name'] = None

        for idx, row in bookings_df.iterrows():
            city = row[destination_col]
            dt = row[date_col]

            if pd.isna(dt):
                continue

            # Convert to date if needed
            if isinstance(dt, pd.Timestamp):
                dt = dt.date()
            elif isinstance(dt, str):
                dt = pd.to_datetime(dt).date()

            try:
                is_hol = connector.is_holiday(city, dt)
                bookings_df.at[idx, 'is_holiday'] = is_hol

                if is_hol:
                    calendar = connector.holiday_calendars[city]
                    bookings_df.at[idx, 'holiday_name'] = calendar.get(dt)

            except Exception as e:
                logger.warning("holiday_check_failed", city=city, date=dt, error=str(e))

        logger.info(
            "holiday_features_added",
            total_bookings=len(bookings_df),
            holiday_bookings=bookings_df['is_holiday'].sum()
        )

    return bookings_df
