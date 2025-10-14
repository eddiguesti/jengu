"""
PriceLab - Intelligent Dynamic Pricing Platform
Premium lime-on-dark design with full routing
"""
import streamlit as st
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from apps.ui._theme import apply_global_theme
from apps.ui._nav import render_sidebar
from apps.ui._ui import section_header, cta_card, empty_state
from core.models.business_profile import BusinessProfileManager

# Currency symbols mapping
CURRENCY_SYMBOLS = {
    "EUR": "€",
    "USD": "$",
    "GBP": "£",
    "CHF": "CHF",
    "JPY": "¥",
    "AUD": "A$",
    "CAD": "C$",
    "AED": "AED",
}

def format_currency(value: float, currency_code: str = "EUR") -> str:
    """Format currency value with appropriate symbol"""
    symbol = CURRENCY_SYMBOLS.get(currency_code, currency_code)
    # For EUR, GBP, CHF - symbol after number. For others - before
    if currency_code in ["EUR"]:
        return f"{value:.2f}{symbol}"
    else:
        return f"{symbol}{value:.2f}"

def get_currency_symbol(profile=None) -> str:
    """Get currency symbol from business profile"""
    if profile and hasattr(profile, 'currency'):
        return CURRENCY_SYMBOLS.get(profile.currency, profile.currency)
    return "€"  # Default to EUR

def get_currency_code(profile=None) -> str:
    """Get currency code from business profile"""
    if profile and hasattr(profile, 'currency'):
        return profile.currency
    return "EUR"  # Default to EUR

# Page configuration
st.set_page_config(
    page_title="PriceLab - Intelligent Pricing",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)


def init_session_state():
    """Initialize session state with defaults"""
    defaults = {
        "route": "Overview",
        "has_profile": False,
        "profile": None,
        "uploaded_df": None,
        "enriched_df": None,
        "correlations_df": None,
        "show_wizard": False,
    }

    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

    # Check if profile exists on disk
    if not st.session_state.has_profile:
        manager = BusinessProfileManager()
        if manager.exists():
            st.session_state.has_profile = True
            st.session_state.profile = manager.load()


def render_overview():
    """Overview dashboard with KPIs and charts"""
    from apps.ui._icons import icon
    from apps.ui._ui import metric_card, info_box
    from apps.ui._plotly import chart_ring_progress, chart_sparkline, chart_time_series, chart_bar
    import pandas as pd
    import numpy as np

    section_header(
        "Overview Dashboard",
        "Real-time insights into your pricing performance",
        "home"
    )

    # Check prerequisites
    if not st.session_state.get("has_profile"):
        empty_state(
            "No Business Profile Found",
            "Create your business profile to start analyzing pricing data",
            "alert-circle",
            "Setup Business Profile",
            "setup_cta"
        )
        if st.session_state.get("setup_cta_clicked"):
            st.session_state.route = "Settings"
            st.rerun()
        return

    # Check if data has been uploaded
    if st.session_state.get("uploaded_df") is None:
        st.write("")
        info_box(
            "Welcome to Jengu Dynamic Pricing! Start by uploading your historical booking data.",
            "info"
        )
        st.write("")

        # Show quick stats about business profile
        profile = st.session_state.get("profile")
        if profile:
            st.markdown("### Your Business Profile")
            col1, col2, col3 = st.columns(3)
            with col1:
                metric_card("Business", getattr(profile, 'business_name', 'N/A'), "", False, "home")
            with col2:
                metric_card("Location", f"{getattr(profile, 'city', 'N/A')}, {getattr(profile, 'country', 'N/A')}", "", False, "map-pin")
            with col3:
                currency = getattr(profile, 'currency', 'EUR')
                metric_card("Currency", currency, "", False, "dollar-sign")

        st.write("")
        st.write("")

    else:
        # Data exists - show real KPIs
        df = st.session_state.uploaded_df
        enriched_df = st.session_state.get("enriched_df")
        profile = st.session_state.get("profile")
        currency_code = get_currency_code(profile)

        # Use enriched data if available, otherwise use uploaded data
        data_to_show = enriched_df if enriched_df is not None else df

        # Identify price column
        price_col = 'price' if 'price' in data_to_show.columns else data_to_show.select_dtypes(include=[np.number]).columns[0] if len(data_to_show.select_dtypes(include=[np.number]).columns) > 0 else None
        occupancy_col = 'occupancy' if 'occupancy' in data_to_show.columns else 'bookings' if 'bookings' in data_to_show.columns else None

        # KPI Cards Row
        st.write("")
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            total_bookings = len(data_to_show)
            metric_card("Total Records", f"{total_bookings:,}", "", True, "database")

        with col2:
            if price_col:
                avg_price = data_to_show[price_col].mean()
                metric_card("Average Price", format_currency(avg_price, currency_code), "", True, "target")
            else:
                metric_card("Average Price", "N/A", "", False, "target")

        with col3:
            if occupancy_col and occupancy_col in data_to_show.columns:
                avg_occupancy = data_to_show[occupancy_col].mean()
                metric_card("Avg Occupancy", f"{avg_occupancy:.1f}%", "", True, "trending-up")
            else:
                metric_card("Columns", f"{len(data_to_show.columns)}", "", True, "list")

        with col4:
            # Check if enriched
            if enriched_df is not None:
                metric_card("Status", "Enriched ✓", "", True, "check-circle")
            else:
                metric_card("Status", "Ready to Enrich", "", False, "cloud-sun")

        st.write("")

        # Add charts for uploaded data
        st.markdown("### Data Visualizations")
        st.write("")

        # Find date column
        date_col = [c for c in data_to_show.columns if 'date' in c.lower()]
        date_col = date_col[0] if date_col else None

        if date_col and price_col:
            # Ensure date column is datetime
            if not pd.api.types.is_datetime64_any_dtype(data_to_show[date_col]):
                data_to_show[date_col] = pd.to_datetime(data_to_show[date_col])

            col1, col2 = st.columns(2)

            with col1:
                st.markdown("#### Price Trend Over Time")

                # Create price trend chart
                fig_price = chart_time_series(
                    data_to_show.groupby(date_col)[price_col].mean().reset_index(),
                    date_col,
                    price_col,
                    f"Average Price ({currency_code})",
                    "#EBFF57"
                )
                st.plotly_chart(fig_price, use_container_width=True)

            with col2:
                if occupancy_col and occupancy_col in data_to_show.columns:
                    st.markdown("#### Occupancy Trend Over Time")

                    # Create occupancy trend chart
                    fig_occ = chart_time_series(
                        data_to_show.groupby(date_col)[occupancy_col].mean().reset_index(),
                        date_col,
                        occupancy_col,
                        "Average Occupancy (%)",
                        "#A2F7A1"
                    )
                    st.plotly_chart(fig_occ, use_container_width=True)
                else:
                    st.markdown("#### Daily Records")

                    # Show count of records per day
                    daily_counts = data_to_show.groupby(date_col).size().reset_index(name='count')
                    fig_count = chart_time_series(
                        daily_counts,
                        date_col,
                        'count',
                        "Records Per Day",
                        "#A2F7A1"
                    )
                    st.plotly_chart(fig_count, use_container_width=True)

        st.write("")

    # Quick Actions
    st.write("")
    st.markdown("### Quick Actions")

    col1, col2, col3 = st.columns(3)

    with col1:
        if cta_card(
            "Upload Data",
            "Import your historical booking data",
            "Go to Data",
            "cta_data",
            "upload",
            "default"
        ):
            st.session_state.route = "Data"
            st.rerun()

    with col2:
        if cta_card(
            "Enrich Dataset",
            "Add weather, holidays, and temporal features",
            "Go to Enrichment",
            "cta_enrich",
            "cloud-sun",
            "default"
        ):
            st.session_state.route = "Enrichment"
            st.rerun()

    with col3:
        if cta_card(
            "View Insights",
            "Explore correlation analysis and patterns",
            "Go to Insights",
            "cta_insights",
            "line-chart",
            "lime"
        ):
            st.session_state.route = "Insights"
            st.rerun()


def render_data():
    """Data upload page"""
    from apps.ui._ui import info_box, toast_success, toast_error, spinner
    import pandas as pd

    section_header(
        "Data Upload",
        "Import your historical booking data (CSV or Excel)",
        "database"
    )

    info_box(
        "Upload a CSV or Excel file containing columns: date, price, bookings, revenue, etc.",
        "info"
    )

    uploaded_file = st.file_uploader(
        "📁 Drop your file here or click to browse",
        type=["csv", "xlsx", "xls"],
        key="data_uploader"
    )

    if uploaded_file:
        try:
            with spinner("Reading file..."):
                if uploaded_file.name.endswith(".csv"):
                    df = pd.read_csv(uploaded_file)
                else:
                    df = pd.read_excel(uploaded_file)

            st.session_state.uploaded_df = df
            toast_success(f"Successfully loaded {len(df):,} rows")

            st.write("")
            st.markdown("### Preview")
            st.dataframe(df.head(50), width="stretch")

            st.write("")
            st.markdown("### Summary")
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Rows", f"{len(df):,}")
            with col2:
                st.metric("Columns", len(df.columns))
            with col3:
                st.metric("Date Range", f"{len(df)} days" if "date" in df.columns else "N/A")

            st.write("")
            if st.button("Confirm and Proceed to Enrichment", width="stretch", type="primary"):
                st.session_state.route = "Enrichment"
                st.rerun()

        except Exception as e:
            toast_error(f"Failed to read file: {str(e)}")

    elif st.session_state.get("uploaded_df") is not None:
        df = st.session_state.uploaded_df
        st.markdown("### Current Dataset")
        st.dataframe(df.head(50), width="stretch")


def render_enrichment():
    """Enrichment page"""
    from apps.ui._ui import empty_state, info_box, toast_success, toast_error, spinner
    from core.services.enrichment_pipeline import EnrichmentPipeline
    import pandas as pd

    section_header(
        "Data Enrichment",
        "Enrich your data with weather, holidays, and temporal features",
        "cloud-sun"
    )

    # Check if data uploaded
    if st.session_state.get("uploaded_df") is None:
        empty_state(
            "No Data Uploaded",
            "Upload your booking data first to proceed with enrichment",
            "database",
            "Go to Data Upload",
            "goto_data"
        )
        if st.session_state.get("goto_data_clicked"):
            st.session_state.route = "Data"
            st.rerun()
        return

    # Check if profile exists
    if not st.session_state.get("has_profile"):
        empty_state(
            "No Business Profile",
            "Create your business profile to enable automatic enrichment",
            "alert-circle",
            "Go to Settings",
            "goto_settings"
        )
        if st.session_state.get("goto_settings_clicked"):
            st.session_state.route = "Settings"
            st.rerun()
        return

    profile = st.session_state.profile
    df = st.session_state.uploaded_df

    st.markdown(f"### Business Profile")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Business", getattr(profile, 'business_name', 'N/A'))
    with col2:
        st.metric("Location", f"{getattr(profile, 'city', 'N/A')}, {getattr(profile, 'country', 'N/A')}")
    with col3:
        st.metric("Coordinates", f"{getattr(profile, 'latitude', 0):.2f}, {getattr(profile, 'longitude', 0):.2f}")

    st.write("")
    st.markdown("### Enrichment Options")

    col1, col2 = st.columns(2)

    with col1:
        info_box("Weather data from Open-Meteo (temperature, precipitation, conditions)", "info", "cloud-sun")

    with col2:
        info_box("Holidays and temporal features (weekday, month, season, etc.)", "success", "calendar")

    st.write("")

    if st.button("Start Enrichment", width="stretch", type="primary", key="enrich_btn"):
        try:
            with spinner("Enriching dataset... This may take a moment"):
                pipeline = EnrichmentPipeline(profile)

                # Column mapping (use first date column found)
                date_cols = [c for c in df.columns if "date" in c.lower()]
                if not date_cols:
                    toast_error("No date column found in dataset")
                    return

                column_map = {"date": date_cols[0]}

                enriched_df = pipeline.enrich(df, column_map)
                st.session_state.enriched_df = enriched_df

            toast_success(f"Enrichment complete! Added {len(enriched_df.columns) - len(df.columns)} features")

            st.write("")
            st.markdown("### Enriched Dataset Preview")
            st.dataframe(enriched_df.head(20), width="stretch")

            st.write("")
            if st.button("Proceed to Insights", width="stretch", type="primary"):
                st.session_state.route = "Insights"
                st.rerun()

        except Exception as e:
            toast_error(f"Enrichment failed: {str(e)}")

    elif st.session_state.get("enriched_df") is not None:
        enriched_df = st.session_state.enriched_df
        st.write("")
        st.markdown("### Current Enriched Dataset")
        st.dataframe(enriched_df.head(20), width="stretch")


def render_insights():
    """Interactive insights dashboard with professional visualizations"""
    from apps.ui._ui import empty_state, info_box, toast_success, toast_error, spinner, metric_card
    import plotly.graph_objects as go
    import plotly.express as px
    import pandas as pd
    import numpy as np
    from scipy import stats
    from datetime import datetime

    section_header(
        "Dynamic Pricing Insights",
        "Interactive analysis of weather, occupancy, and competitive dynamics",
        "chart-line"
    )

    # Check if enriched data exists
    if st.session_state.get("enriched_df") is None:
        empty_state(
            "No Enriched Data",
            "Complete data enrichment first to view insights",
            "cloud-sun",
            "Go to Enrichment",
            "goto_enrichment"
        )
        if st.session_state.get("goto_enrichment_clicked"):
            st.session_state.route = "Enrichment"
            st.rerun()
        return

    enriched_df = st.session_state.enriched_df.copy()

    # Get business profile for currency
    profile = st.session_state.get("profile")
    currency_code = get_currency_code(profile)
    currency_symbol = get_currency_symbol(profile)

    # Get competitor data if available
    comp_service = st.session_state.get("comp_service")
    has_competitor_data = comp_service is not None and comp_service.get_summary_statistics().get("total_observations", 0) > 0

    # Identify columns
    price_col = 'price' if 'price' in enriched_df.columns else enriched_df.select_dtypes(include=[np.number]).columns[0]
    occupancy_col = 'occupancy' if 'occupancy' in enriched_df.columns else 'bookings' if 'bookings' in enriched_df.columns else None
    date_col = [c for c in enriched_df.columns if 'date' in c.lower()][0] if any('date' in c.lower() for c in enriched_df.columns) else enriched_df.columns[0]

    # Ensure date column is datetime
    if not pd.api.types.is_datetime64_any_dtype(enriched_df[date_col]):
        enriched_df[date_col] = pd.to_datetime(enriched_df[date_col])

    # Classify weather - Sunny vs Not Sunny
    if 'precipitation' in enriched_df.columns and 'sunshine_hours' in enriched_df.columns:
        # More sophisticated classification using multiple weather features
        enriched_df['is_sunny'] = ((enriched_df['precipitation'] < 1.0) &
                                    (enriched_df['sunshine_hours'] > enriched_df['sunshine_hours'].median())).astype(int)
    elif 'precipitation' in enriched_df.columns:
        enriched_df['is_sunny'] = (enriched_df['precipitation'] < 1.0).astype(int)
    elif 'weather_quality' in enriched_df.columns:
        enriched_df['is_sunny'] = (enriched_df['weather_quality'] > enriched_df['weather_quality'].median()).astype(int)
    else:
        # If no weather data, assign based on season (summer more sunny)
        if 'season' in enriched_df.columns:
            enriched_df['is_sunny'] = enriched_df['season'].isin(['summer', 'spring']).astype(int)
        else:
            enriched_df['is_sunny'] = 1  # Default to sunny

    # Add weather label
    enriched_df['weather_label'] = enriched_df['is_sunny'].map({1: 'Sunny', 0: 'Not Sunny'})

    # INTERACTIVE FILTERS
    st.markdown("### Interactive Filters")

    col1, col2 = st.columns(2)

    with col1:
        # Date range filter
        min_date = enriched_df[date_col].min().date()
        max_date = enriched_df[date_col].max().date()

        date_range = st.date_input(
            "Date Range",
            value=(min_date, max_date),
            min_value=min_date,
            max_value=max_date,
            key="insights_date_range"
        )

    with col2:
        # Occupancy filter (if available)
        if occupancy_col and occupancy_col in enriched_df.columns:
            occ_min = float(enriched_df[occupancy_col].min())
            occ_max = float(enriched_df[occupancy_col].max())

            occupancy_range = st.slider(
                "Occupancy Range (%)",
                min_value=occ_min,
                max_value=occ_max,
                value=(occ_min, occ_max),
                key="occupancy_filter"
            )

    # Apply filters
    filtered_df = enriched_df.copy()

    # Date filter
    if isinstance(date_range, tuple) and len(date_range) == 2:
        start_date, end_date = date_range
        filtered_df = filtered_df[
            (filtered_df[date_col].dt.date >= start_date) &
            (filtered_df[date_col].dt.date <= end_date)
        ]

    # Occupancy filter
    if occupancy_col and occupancy_col in enriched_df.columns:
        filtered_df = filtered_df[
            (filtered_df[occupancy_col] >= occupancy_range[0]) &
            (filtered_df[occupancy_col] <= occupancy_range[1])
        ]

    st.write("")
    st.markdown(f"**Showing {len(filtered_df):,} of {len(enriched_df):,} bookings**")

    # KEY METRICS
    st.write("")
    st.markdown("### Key Performance Indicators")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        avg_price = filtered_df[price_col].mean()
        metric_card("Average Price", format_currency(avg_price, currency_code), "", True, "target")

    with col2:
        if occupancy_col and occupancy_col in filtered_df.columns:
            avg_occupancy = filtered_df[occupancy_col].mean()
            metric_card("Average Occupancy", f"{avg_occupancy:.1f}%", "", True, "users")
        else:
            metric_card("Total Bookings", f"{len(filtered_df):,}", "", True, "calendar")

    with col3:
        sunny_days = (filtered_df['is_sunny'] == 1).sum()
        sunny_pct = (sunny_days / len(filtered_df) * 100) if len(filtered_df) > 0 else 0
        metric_card("Sunny Days", f"{sunny_pct:.0f}%", "", True, "sun")

    with col4:
        if 'is_weekend' in filtered_df.columns:
            weekend_days = filtered_df['is_weekend'].sum()
            weekend_pct = (weekend_days / len(filtered_df) * 100) if len(filtered_df) > 0 else 0
            metric_card("Weekend Days", f"{weekend_pct:.0f}%", "", True, "calendar")
        else:
            metric_card("Date Range", f"{(filtered_df[date_col].max() - filtered_df[date_col].min()).days} days", "", True, "clock")

    # VISUALIZATIONS
    st.write("")
    st.write("")
    st.markdown("### Interactive Visualizations")

    # 1. WEATHER IMPACT ON PRICE - Boxplot
    st.write("")
    st.markdown("#### 1. Weather Impact on Pricing")

    fig1 = go.Figure()

    sunny_prices = filtered_df[filtered_df['is_sunny'] == 1][price_col]
    not_sunny_prices = filtered_df[filtered_df['is_sunny'] == 0][price_col]

    fig1.add_trace(go.Box(
        y=sunny_prices,
        name='Sunny Days',
        marker_color='#EBFF57',
        boxmean='sd'
    ))

    fig1.add_trace(go.Box(
        y=not_sunny_prices,
        name='Not Sunny Days',
        marker_color='#7C8EA3',
        boxmean='sd'
    ))

    fig1.update_layout(
        title="Price Distribution by Weather Condition",
        yaxis_title=f"Price ({currency_symbol})",
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        font=dict(color='#E0E0E0'),
        showlegend=True,
        height=400
    )

    st.plotly_chart(fig1, use_container_width=True)

    # Statistical test
    if len(sunny_prices) > 0 and len(not_sunny_prices) > 0:
        t_stat, p_value = stats.ttest_ind(sunny_prices, not_sunny_prices)
        price_diff = sunny_prices.mean() - not_sunny_prices.mean()
        price_diff_pct = (price_diff / not_sunny_prices.mean() * 100) if not_sunny_prices.mean() > 0 else 0

        if p_value < 0.05:
            if price_diff > 0:
                info_box(
                    f"**Statistical Significance**: Sunny days command {format_currency(price_diff, currency_code)} ({price_diff_pct:+.1f}%) higher prices (p={p_value:.4f}). This is a clear pricing opportunity!",
                    "success"
                )
            else:
                info_box(
                    f"**Counter-Intuitive Pattern**: Not sunny days show {format_currency(abs(price_diff), currency_code)} ({abs(price_diff_pct):.1f}%) higher prices (p={p_value:.4f}). May indicate indoor activity demand or business travel patterns.",
                    "warning"
                )
        else:
            info_box(
                f"Weather shows minimal impact on pricing (p={p_value:.4f}). Price difference is {format_currency(abs(price_diff), currency_code)} but not statistically significant.",
                "info"
            )

    # 2. PRICE & OCCUPANCY OVER TIME
    st.write("")
    st.markdown("#### 2. Price & Occupancy Trends Over Time")

    # Aggregate by date
    daily_agg = filtered_df.groupby(date_col).agg({
        price_col: 'mean',
        occupancy_col: 'mean' if occupancy_col else None,
        'is_sunny': 'mean'
    }).reset_index()

    daily_agg.columns = [date_col, 'avg_price', 'avg_occupancy', 'sunny_ratio']

    fig2 = go.Figure()

    # Price line
    fig2.add_trace(go.Scatter(
        x=daily_agg[date_col],
        y=daily_agg['avg_price'],
        name='Average Price',
        line=dict(color='#EBFF57', width=2),
        yaxis='y'
    ))

    # Occupancy line (if available)
    if occupancy_col:
        fig2.add_trace(go.Scatter(
            x=daily_agg[date_col],
            y=daily_agg['avg_occupancy'],
            name='Average Occupancy',
            line=dict(color='#A2F7A1', width=2),
            yaxis='y2'
        ))

    fig2.update_layout(
        title="Price and Occupancy Trends",
        xaxis_title="Date",
        yaxis=dict(title=f"Price ({currency_symbol})", side='left', showgrid=False),
        yaxis2=dict(title="Occupancy (%)", side='right', overlaying='y', showgrid=False) if occupancy_col else None,
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        font=dict(color='#E0E0E0'),
        hovermode='x unified',
        height=450
    )

    st.plotly_chart(fig2, use_container_width=True)

    # 3. CORRELATION HEATMAP
    if occupancy_col and 'temp_mean' in filtered_df.columns:
        st.write("")
        st.markdown("#### 3. Correlation Matrix: Key Variables")

        # Select numeric columns for correlation
        corr_cols = [price_col]
        if occupancy_col in filtered_df.columns:
            corr_cols.append(occupancy_col)
        if 'temp_mean' in filtered_df.columns:
            corr_cols.append('temp_mean')
        if 'precipitation' in filtered_df.columns:
            corr_cols.append('precipitation')
        if 'is_weekend' in filtered_df.columns:
            corr_cols.append('is_weekend')
        if 'is_sunny' in filtered_df.columns:
            corr_cols.append('is_sunny')
        if has_competitor_data and 'median_comp_price' in filtered_df.columns:
            corr_cols.append('median_comp_price')

        corr_df = filtered_df[corr_cols].corr()

        # Rename for display
        display_names = {
            price_col: 'Price',
            occupancy_col: 'Occupancy' if occupancy_col else None,
            'temp_mean': 'Temperature',
            'precipitation': 'Precipitation',
            'is_weekend': 'Weekend',
            'is_sunny': 'Sunny',
            'median_comp_price': 'Competitor Price'
        }

        corr_df_renamed = corr_df.rename(columns=display_names, index=display_names)

        fig3 = go.Figure(data=go.Heatmap(
            z=corr_df_renamed.values,
            x=corr_df_renamed.columns,
            y=corr_df_renamed.index,
            colorscale='RdYlGn',
            zmid=0,
            text=corr_df_renamed.values,
            texttemplate='%{text:.2f}',
            textfont={"size": 12},
            colorbar=dict(title="Correlation")
        ))

        fig3.update_layout(
            title="Correlation Heatmap: How Variables Relate to Each Other",
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            font=dict(color='#E0E0E0'),
            height=500
        )

        st.plotly_chart(fig3, use_container_width=True)

        # Correlation insights
        price_corr = corr_df[price_col].drop(price_col).abs().sort_values(ascending=False)
        st.markdown("**Key Correlations with Price:**")
        for var, corr in price_corr.head(3).items():
            display_name = display_names.get(var, var)
            if corr > 0.5:
                info_box(f"**{display_name}**: Strong correlation ({corr:.2f}) - major pricing driver", "success")
            elif corr > 0.3:
                info_box(f"**{display_name}**: Moderate correlation ({corr:.2f}) - influences pricing", "info")

    # 4. OCCUPANCY PATTERNS
    if occupancy_col and occupancy_col in filtered_df.columns:
        st.write("")
        st.markdown("#### 4. Occupancy Analysis: When Are You Full vs Empty?")

        # Define occupancy levels
        filtered_df['occupancy_level'] = pd.cut(
            filtered_df[occupancy_col],
            bins=[0, 30, 60, 85, 100],
            labels=['Low (<30%)', 'Medium (30-60%)', 'High (60-85%)', 'Full (>85%)']
        )

        occupancy_counts = filtered_df['occupancy_level'].value_counts().sort_index()

        fig4 = go.Figure(data=[
            go.Bar(
                x=occupancy_counts.index.astype(str),
                y=occupancy_counts.values,
                marker_color=['#FF6B6B', '#FFA500', '#EBFF57', '#A2F7A1'],
                text=occupancy_counts.values,
                textposition='outside'
            )
        ])

        fig4.update_layout(
            title="Distribution of Occupancy Levels",
            xaxis_title="Occupancy Level",
            yaxis_title="Number of Days",
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            font=dict(color='#E0E0E0'),
            height=400
        )

        st.plotly_chart(fig4, use_container_width=True)

        # Occupancy insights
        low_occ_days = filtered_df[filtered_df[occupancy_col] < 30]
        full_occ_days = filtered_df[filtered_df[occupancy_col] > 85]

        col1, col2 = st.columns(2)

        with col1:
            if len(low_occ_days) > 0:
                low_sunny_pct = (low_occ_days['is_sunny'].mean() * 100)
                st.markdown(f"**Low Occupancy Days ({len(low_occ_days)})**")
                st.markdown(f"- Sunny: {low_sunny_pct:.0f}%")
                st.markdown(f"- Avg Price: {format_currency(low_occ_days[price_col].mean(), currency_code)}")
                if 'is_weekend' in low_occ_days.columns:
                    weekend_pct = (low_occ_days['is_weekend'].mean() * 100)
                    st.markdown(f"- Weekend: {weekend_pct:.0f}%")

        with col2:
            if len(full_occ_days) > 0:
                full_sunny_pct = (full_occ_days['is_sunny'].mean() * 100)
                st.markdown(f"**Full Occupancy Days ({len(full_occ_days)})**")
                st.markdown(f"- Sunny: {full_sunny_pct:.0f}%")
                st.markdown(f"- Avg Price: {format_currency(full_occ_days[price_col].mean(), currency_code)}")
                if 'is_weekend' in full_occ_days.columns:
                    weekend_pct = (full_occ_days['is_weekend'].mean() * 100)
                    st.markdown(f"- Weekend: {weekend_pct:.0f}%")

    # 5. COMPETITOR IMPACT (if available)
    if has_competitor_data and 'median_comp_price' in filtered_df.columns:
        st.write("")
        st.markdown("#### 5. Competitive Dynamics: How Competitor Pricing Affects Demand")

        # Calculate competitive pressure
        filtered_df['price_vs_comp'] = filtered_df[price_col] - filtered_df['median_comp_price']
        filtered_df['comp_category'] = pd.cut(
            filtered_df['price_vs_comp'],
            bins=[-np.inf, -20, -5, 5, 20, np.inf],
            labels=['Much Cheaper', 'Cheaper', 'Similar', 'Expensive', 'Much Expensive']
        )

        # Group by competitive position
        comp_analysis = filtered_df.groupby('comp_category').agg({
            occupancy_col: 'mean' if occupancy_col else None,
            price_col: 'mean'
        }).reset_index()

        if occupancy_col:
            fig5 = go.Figure()

            fig5.add_trace(go.Bar(
                x=comp_analysis['comp_category'].astype(str),
                y=comp_analysis[occupancy_col],
                name='Avg Occupancy',
                marker_color='#A2F7A1',
                yaxis='y',
                offsetgroup=0
            ))

            fig5.add_trace(go.Bar(
                x=comp_analysis['comp_category'].astype(str),
                y=comp_analysis[price_col],
                name='Avg Price',
                marker_color='#EBFF57',
                yaxis='y2',
                offsetgroup=1
            ))

            fig5.update_layout(
                title="Occupancy & Price by Competitive Position",
                xaxis_title="Your Price vs Competitors",
                yaxis=dict(title="Occupancy (%)", side='left'),
                yaxis2=dict(title=f"Price ({currency_symbol})", side='right', overlaying='y'),
                plot_bgcolor='rgba(0,0,0,0)',
                paper_bgcolor='rgba(0,0,0,0)',
                font=dict(color='#E0E0E0'),
                barmode='group',
                height=450
            )

            st.plotly_chart(fig5, use_container_width=True)

        # Competitor correlation
        comp_corr = filtered_df[[price_col, 'median_comp_price']].corr().iloc[0, 1]

        if abs(comp_corr) > 0.7:
            info_box(
                f"**Strong Competitor Following** ({comp_corr:.2f}): You're closely tracking competitor prices. Consider dynamic pricing to differentiate.",
                "warning"
            )
        elif abs(comp_corr) < 0.3:
            info_box(
                f"**Independent Pricing Strategy** ({comp_corr:.2f}): Low correlation with competitors. Ensure this is based on demand signals, not market ignorance.",
                "info"
            )
        else:
            info_box(
                f"**Balanced Approach** ({comp_corr:.2f}): Moderate correlation suggests you're market-aware but not slavishly following competitors.",
                "success"
            )

    # 6. SEASONAL PATTERNS
    if 'month' in filtered_df.columns:
        st.write("")
        st.markdown("#### 6. Seasonal Patterns: Monthly Performance")

        monthly_agg = filtered_df.groupby('month').agg({
            price_col: 'mean',
            occupancy_col: 'mean' if occupancy_col else None,
        }).reset_index()

        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        monthly_agg['month_name'] = monthly_agg['month'].apply(lambda x: month_names[int(x)-1] if 1 <= x <= 12 else 'Unknown')

        fig6 = go.Figure()

        fig6.add_trace(go.Scatter(
            x=monthly_agg['month_name'],
            y=monthly_agg[price_col],
            name='Avg Price',
            mode='lines+markers',
            line=dict(color='#EBFF57', width=3),
            marker=dict(size=10),
            yaxis='y'
        ))

        if occupancy_col:
            fig6.add_trace(go.Scatter(
                x=monthly_agg['month_name'],
                y=monthly_agg[occupancy_col],
                name='Avg Occupancy',
                mode='lines+markers',
                line=dict(color='#A2F7A1', width=3),
                marker=dict(size=10),
                yaxis='y2'
            ))

        fig6.update_layout(
            title="Monthly Price & Occupancy Patterns",
            xaxis_title="Month",
            yaxis=dict(title=f"Price ({currency_symbol})", side='left'),
            yaxis2=dict(title="Occupancy (%)", side='right', overlaying='y') if occupancy_col else None,
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            font=dict(color='#E0E0E0'),
            hovermode='x unified',
            height=400
        )

        st.plotly_chart(fig6, use_container_width=True)

    # NAVIGATION
    st.write("")
    st.write("")
    col1, col2 = st.columns(2)

    with col1:
        if st.button("Back to Competitors", width="stretch"):
            st.session_state.route = "Competitors"
            st.rerun()

    with col2:
        if st.button("Proceed to Modeling", width="stretch", type="primary"):
            st.session_state.route = "Model"
            st.rerun()


def render_model():
    """Model training page"""
    from apps.ui.pages.model_page import render_model_page
    render_model_page()


def render_optimize():
    """Optimization page"""
    from apps.ui.pages.optimize_page import render_optimize_page
    render_optimize_page()


def render_audit():
    """Audit log page (stub)"""
    from apps.ui._ui import info_box

    section_header(
        "Audit Log",
        "Track all changes and system events",
        "file-text"
    )

    info_box("Audit log features coming soon", "info", "file-text")


def render_assistant():
    """AI Assistant chatbot for guidance and recommendations"""
    from apps.ui._ui import info_box
    import anthropic
    import os

    section_header(
        "AI Assistant",
        "Get help, guidance, and personalized recommendations",
        "message-circle"
    )

    # Initialize chat history
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    # System context about the app
    SYSTEM_CONTEXT = """You are an AI assistant for Jengu Dynamic Pricing Platform.

Jengu helps hospitality businesses (hotels, resorts, vacation rentals) optimize their pricing using:
- Historical booking data analysis
- Weather data enrichment (temperature, precipitation, sunshine)
- Competitor intelligence monitoring
- Holiday and temporal features
- ML-powered pricing models (XGBoost, Random Forest)
- Dynamic price optimization

**App Navigation:**
1. **Overview**: Dashboard showing KPIs, price trends, occupancy trends
2. **Data**: Upload CSV/Excel booking data (date, price, bookings/occupancy columns)
3. **Enrichment**: Add weather, holidays, temporal features automatically
4. **Competitors**: Discover and monitor nearby hotel competitors & Airbnb markets
5. **Insights**: Interactive visualizations showing weather impact, occupancy patterns, competitor dynamics, seasonal trends, correlations
6. **Model**: Train ML models to predict optimal pricing
7. **Optimize**: Generate pricing recommendations based on models
8. **Audit**: Track system changes and events
9. **Settings**: Manage business profile (location, currency, timezone)

**Common User Questions:**
- "How do I start?" → Upload data in Data page, then Enrich it
- "What format should my data be?" → CSV/Excel with date, price, bookings/occupancy columns
- "How does weather impact pricing?" → View Insights page after enrichment
- "How do I find competitors?" → Go to Competitors page to auto-discover nearby properties
- "What currency does it use?" → Based on your business location (EUR for France, USD for USA, etc.)

Be helpful, concise, and guide users through the workflow. Provide specific page names and actionable steps. If users have pricing strategy questions, give professional dynamic pricing advice based on occupancy, competition, and seasonality."""

    # Display chat messages
    for message in st.session_state.chat_history:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input
    if prompt := st.chat_input("Ask me anything about Jengu or dynamic pricing..."):
        # Add user message to chat
        st.session_state.chat_history.append({"role": "user", "content": prompt})

        with st.chat_message("user"):
            st.markdown(prompt)

        # Generate AI response
        with st.chat_message("assistant"):
            message_placeholder = st.empty()

            # Check if Anthropic API key exists
            api_key = os.getenv("ANTHROPIC_API_KEY")

            if not api_key:
                # Fallback to rule-based responses
                response = generate_fallback_response(prompt)
                message_placeholder.markdown(response)
            else:
                # Use Anthropic Claude API
                try:
                    client = anthropic.Anthropic(api_key=api_key)

                    # Build conversation history
                    messages = []
                    for msg in st.session_state.chat_history:
                        messages.append({"role": msg["role"], "content": msg["content"]})

                    # Stream response
                    full_response = ""
                    with client.messages.stream(
                        model="claude-3-5-sonnet-20241022",
                        max_tokens=1024,
                        system=SYSTEM_CONTEXT,
                        messages=messages,
                    ) as stream:
                        for text in stream.text_stream:
                            full_response += text
                            message_placeholder.markdown(full_response + "▌")

                    message_placeholder.markdown(full_response)
                    response = full_response

                except Exception as e:
                    response = generate_fallback_response(prompt)
                    message_placeholder.markdown(response)

            # Add assistant response to chat
            st.session_state.chat_history.append({"role": "assistant", "content": response})

    # Suggested questions
    st.write("")
    st.markdown("### Suggested Questions")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("How do I get started?", key="q1"):
            st.session_state.chat_history.append({"role": "user", "content": "How do I get started?"})
            st.rerun()

        if st.button("What data format do I need?", key="q2"):
            st.session_state.chat_history.append({"role": "user", "content": "What data format do I need?"})
            st.rerun()

        if st.button("How does weather affect pricing?", key="q3"):
            st.session_state.chat_history.append({"role": "user", "content": "How does weather affect pricing?"})
            st.rerun()

    with col2:
        if st.button("How do I find competitors?", key="q4"):
            st.session_state.chat_history.append({"role": "user", "content": "How do I find competitors?"})
            st.rerun()

        if st.button("What pricing strategy should I use?", key="q5"):
            st.session_state.chat_history.append({"role": "user", "content": "What pricing strategy should I use?"})
            st.rerun()

        if st.button("How do I view insights?", key="q6"):
            st.session_state.chat_history.append({"role": "user", "content": "How do I view insights?"})
            st.rerun()

    # Clear chat button
    st.write("")
    if len(st.session_state.chat_history) > 0:
        if st.button("Clear Chat History", key="clear_chat"):
            st.session_state.chat_history = []
            st.rerun()


def generate_fallback_response(prompt: str) -> str:
    """Generate rule-based responses when API is not available"""
    prompt_lower = prompt.lower()

    if "start" in prompt_lower or "begin" in prompt_lower:
        return """**Getting Started with Jengu:**

1. **Setup Business Profile** (Settings page)
   - Enter your business location, type, and currency

2. **Upload Data** (Data page)
   - Upload CSV/Excel with columns: date, price, bookings/occupancy

3. **Enrich Dataset** (Enrichment page)
   - Automatically add weather, holidays, and temporal features

4. **View Insights** (Insights page)
   - Explore interactive visualizations of your pricing patterns

5. **Discover Competitors** (Competitors page)
   - Find nearby hotels and Airbnb properties

6. **Train Models & Optimize** (Model & Optimize pages)
   - Generate ML-powered pricing recommendations"""

    elif "data" in prompt_lower and ("format" in prompt_lower or "need" in prompt_lower):
        return """**Required Data Format:**

Your CSV/Excel file should contain these columns:
- **date** (required): Booking date in YYYY-MM-DD format
- **price** (required): Price per night/booking
- **occupancy** or **bookings** (recommended): Occupancy percentage or booking count

Optional columns: revenue, guest_count, booking_channel, etc.

**Example:**
```
date,price,occupancy
2024-01-01,120.00,85
2024-01-02,150.00,92
```

Upload in the **Data** page to get started!"""

    elif "weather" in prompt_lower:
        return """**Weather Impact on Pricing:**

After enriching your data, view the **Insights** page to see:

1. **Box plots** comparing sunny vs not sunny day prices
2. **Statistical significance** (p-values, t-tests)
3. **Correlation heatmaps** showing weather variables vs price
4. **Occupancy patterns** by weather conditions

Research shows sunny weather can command 5-15% premium in vacation destinations! The Insights page shows your specific data patterns."""

    elif "competitor" in prompt_lower:
        return """**Finding Competitors:**

Go to the **Competitors** page where Jengu will:

1. **Auto-discover** nearby hotels (within 10km radius)
2. **Find Airbnb markets** in your city
3. **Monitor pricing** from multiple sources
4. **Show competitive positioning** (are you premium or value?)
5. **Track price correlations**

The Insights page then shows how competitor pricing affects your demand and occupancy!"""

    elif "strateg" in prompt_lower or "optimize" in prompt_lower:
        return """**Dynamic Pricing Strategy Recommendations:**

**High Season / High Demand:**
- Price 10-20% above competitors
- Monitor occupancy - if >85%, increase prices
- Capture sunny day premiums

**Low Season / Low Demand:**
- Match or undercut competitors by 5-10%
- Focus on occupancy over revenue
- Offer early booking discounts

**Competitive Positioning:**
- **Premium** (>10% above): Requires strong differentiation
- **Market-aligned** (±10%): Safe, balanced approach
- **Value** (<10% below): Drive volume, watch profit margins

Use the **Optimize** page to generate ML-powered recommendations!"""

    elif "insight" in prompt_lower:
        return """**Viewing Insights:**

The **Insights** page shows 6 interactive visualizations:

1. **Weather Impact** - Price distribution by sunny/not sunny
2. **Price & Occupancy Trends** - Time series with dual axes
3. **Correlation Heatmap** - How variables relate to each other
4. **Occupancy Analysis** - When are you full vs empty?
5. **Competitor Dynamics** - How pricing position affects demand
6. **Seasonal Patterns** - Monthly performance trends

Use the **filters** at the top to focus on specific date ranges and occupancy levels!"""

    elif "currency" in prompt_lower or "eur" in prompt_lower or "dollar" in prompt_lower:
        return """**Currency Settings:**

Jengu automatically uses the correct currency based on your business location:

- **France** → € (EUR)
- **USA** → $ (USD)
- **UK** → £ (GBP)
- **Switzerland** → CHF
- **Japan** → ¥ (JPY)

To change currency, go to **Settings** and update your business profile location. All prices and charts will automatically update!"""

    else:
        return f"""I'm here to help with Jengu Dynamic Pricing Platform!

You asked: "{prompt}"

I can help you with:
- Getting started with the platform
- Understanding data requirements
- Learning about pricing strategies
- Finding and monitoring competitors
- Interpreting insights and visualizations
- Optimizing your pricing

Try asking a more specific question, or click one of the suggested questions below!"""


def render_settings():
    """Settings page with business profile wizard"""
    from apps.ui.setup_wizard import render_setup_wizard
    from apps.ui._ui import info_box

    section_header(
        "Settings",
        "Manage your business profile and preferences",
        "settings"
    )

    # Show current profile if exists
    if st.session_state.get("has_profile"):
        profile = st.session_state.profile

        st.markdown("### Current Business Profile")
        col1, col2 = st.columns(2)

        with col1:
            st.markdown(f"**Business Name:** {getattr(profile, 'business_name', 'N/A')}")
            st.markdown(f"**Business Type:** {getattr(profile, 'business_type', 'N/A')}")
            st.markdown(f"**City:** {getattr(profile, 'city', 'N/A')}")
            st.markdown(f"**Country:** {getattr(profile, 'country', 'N/A')}")

        with col2:
            st.markdown(f"**Latitude:** {getattr(profile, 'latitude', 0):.4f}")
            st.markdown(f"**Longitude:** {getattr(profile, 'longitude', 0):.4f}")
            st.markdown(f"**Timezone:** {getattr(profile, 'timezone', 'N/A')}")

        st.write("")

        if st.button("Edit Profile", key="edit_profile", width="stretch"):
            st.session_state.show_wizard = True
            st.rerun()

    # Show wizard
    if not st.session_state.get("has_profile") or st.session_state.get("show_wizard", False):
        st.write("")
        render_setup_wizard()


# ===== MAIN APP ROUTER =====

def main():
    """Main application router"""

    # Initialize
    init_session_state()

    # Apply theme
    apply_global_theme()

    # Check if profile exists, if not force to settings
    if not st.session_state.get("has_profile"):
        st.session_state.route = "Settings"

    # Render sidebar
    current_route = st.session_state.get("route", "Overview")
    render_sidebar(current_route)

    # Route to page
    routes = {
        "Overview": render_overview,
        "Data": render_data,
        "Enrichment": render_enrichment,
        "Insights": render_insights,
        "Competitors": render_competitors,
        "Model": render_model,
        "Optimize": render_optimize,
        "Audit": render_audit,
        "Assistant": render_assistant,
        "Settings": render_settings,
    }

    render_fn = routes.get(current_route, render_overview)
    render_fn()


def render_competitors():
    """Competitor intelligence page"""
    from apps.ui.pages.competitors_page import render_competitors_page
    render_competitors_page()


if __name__ == "__main__":
    main()
