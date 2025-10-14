"""
JENGU - Dynamic Pricing Intelligence for the Hospitality Future
© 2025 JENGU Technologies - Confidential

Main Application Entry Point
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import numpy as np
from pathlib import Path

# JENGU Configuration
from jengu_config import (
    JENGU_BRAND,
    JENGU_COLORS,
    STREAMLIT_CSS,
    PLOTLY_THEME,
    MESSAGES,
    FEATURES
)

# Core modules - Import what's available
try:
    from core.analytics.correlation import CorrelationAnalyzer, discover_correlations
except ImportError:
    CorrelationAnalyzer = None
    discover_correlations = None

try:
    from core.analytics.enrichment import enrich_with_weather, enrich_with_holidays
except ImportError:
    enrich_with_weather = None
    enrich_with_holidays = None

try:
    from core.analytics.insights import generate_insights
except ImportError:
    generate_insights = None

try:
    from core.connectors.weather import WeatherConnector
except ImportError:
    WeatherConnector = None

try:
    from core.connectors.holidays import get_holidays_for_period
except ImportError:
    get_holidays_for_period = None

# ============================================================================
# JENGU APP CONFIGURATION
# ============================================================================

st.set_page_config(
    page_title="JENGU - Dynamic Pricing Intelligence",
    page_icon="🌟",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'About': f"{JENGU_BRAND['name']} - {JENGU_BRAND['tagline']}\\n{JENGU_BRAND['copyright']}"
    }
)

# Apply JENGU styling
st.markdown(STREAMLIT_CSS, unsafe_allow_html=True)

# ============================================================================
# JENGU HEADER
# ============================================================================

def render_header():
    """Render JENGU branded header"""
    col1, col2, col3 = st.columns([1, 2, 1])

    with col2:
        st.markdown(
            f"""
            <div style="text-align: center; padding: 2rem 0;">
                <h1 style="
                    font-size: 3.5rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, {JENGU_COLORS['lime']} 0%, {JENGU_COLORS['mint']} 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin: 0;
                    letter-spacing: -0.02em;
                ">JENGU</h1>
                <p style="
                    color: {JENGU_COLORS['text_secondary']};
                    font-size: 1.1rem;
                    margin-top: 0.5rem;
                    font-weight: 400;
                ">{JENGU_BRAND['tagline']}</p>
                <p style="
                    color: {JENGU_COLORS['mint']};
                    font-size: 0.9rem;
                    margin-top: 1rem;
                    font-style: italic;
                ">{JENGU_BRAND['vision']}</p>
            </div>
            """,
            unsafe_allow_html=True
        )

# ============================================================================
# JENGU SIDEBAR
# ============================================================================

def render_sidebar():
    """Render JENGU navigation sidebar"""
    with st.sidebar:
        st.markdown(
            f"""
            <div style="padding: 1rem 0; border-bottom: 1px solid {JENGU_COLORS['lime']}40;">
                <h2 style="color: {JENGU_COLORS['lime']}; font-size: 1.5rem; margin: 0;">
                    🌟 JENGU
                </h2>
            </div>
            """,
            unsafe_allow_html=True
        )

        st.markdown("### Navigation")
        page = st.radio(
            "Select Module",
            ["📊 Dashboard", "📤 Data Upload", "🔮 Intelligence", "⚡ Optimize", "⚙️ Settings"],
            label_visibility="collapsed"
        )

        # Property Information
        st.markdown("---")
        st.markdown("### Property Details")

        property_type = st.selectbox(
            "Type",
            ["Hotel", "Resort", "Campsite", "Vacation Rental", "Hostel"]
        )

        location = st.text_input("Location", "San Francisco, CA")
        rooms = st.number_input("Total Rooms/Units", min_value=1, value=100)

        # Date Range
        st.markdown("---")
        st.markdown("### Analysis Period")

        col1, col2 = st.columns(2)
        with col1:
            start_date = st.date_input(
                "Start",
                value=datetime.now() - timedelta(days=365)
            )
        with col2:
            end_date = st.date_input(
                "End",
                value=datetime.now()
            )

        # Footer
        st.markdown("---")
        st.markdown(
            f"""
            <div style="text-align: center; padding: 1rem 0; color: {JENGU_COLORS['text_muted']}; font-size: 0.8rem;">
                {JENGU_BRAND['copyright']}<br>
                Version {JENGU_BRAND['version']}
            </div>
            """,
            unsafe_allow_html=True
        )

        return page, property_type, location, rooms, start_date, end_date

# ============================================================================
# JENGU DASHBOARD
# ============================================================================

def render_dashboard(data=None):
    """Render JENGU main dashboard"""

    # KPI Metrics Row
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown(
            f"""
            <div style="
                background: linear-gradient(135deg, {JENGU_COLORS['surface']} 0%, {JENGU_COLORS['surface_variant']} 100%);
                border: 1px solid {JENGU_COLORS['lime']}40;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 0 20px {JENGU_COLORS['lime']}20;
            ">
                <p style="color: {JENGU_COLORS['text_secondary']}; margin: 0; font-size: 0.9rem;">Average Rate</p>
                <h2 style="color: {JENGU_COLORS['lime']}; margin: 0.5rem 0; font-size: 2rem;">$285</h2>
                <p style="color: {JENGU_COLORS['mint']}; margin: 0; font-size: 0.85rem;">↑ 12.5%</p>
            </div>
            """,
            unsafe_allow_html=True
        )

    with col2:
        st.markdown(
            f"""
            <div style="
                background: linear-gradient(135deg, {JENGU_COLORS['surface']} 0%, {JENGU_COLORS['surface_variant']} 100%);
                border: 1px solid {JENGU_COLORS['mint']}40;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 0 20px {JENGU_COLORS['mint']}20;
            ">
                <p style="color: {JENGU_COLORS['text_secondary']}; margin: 0; font-size: 0.9rem;">Occupancy</p>
                <h2 style="color: {JENGU_COLORS['mint']}; margin: 0.5rem 0; font-size: 2rem;">87%</h2>
                <p style="color: {JENGU_COLORS['lime']}; margin: 0; font-size: 0.85rem;">↑ 5.2%</p>
            </div>
            """,
            unsafe_allow_html=True
        )

    with col3:
        st.markdown(
            f"""
            <div style="
                background: linear-gradient(135deg, {JENGU_COLORS['surface']} 0%, {JENGU_COLORS['surface_variant']} 100%);
                border: 1px solid {JENGU_COLORS['lime']}40;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 0 20px {JENGU_COLORS['lime']}20;
            ">
                <p style="color: {JENGU_COLORS['text_secondary']}; margin: 0; font-size: 0.9rem;">RevPAR</p>
                <h2 style="color: {JENGU_COLORS['lime']}; margin: 0.5rem 0; font-size: 2rem;">$248</h2>
                <p style="color: {JENGU_COLORS['mint']}; margin: 0; font-size: 0.85rem;">↑ 18.1%</p>
            </div>
            """,
            unsafe_allow_html=True
        )

    with col4:
        st.markdown(
            f"""
            <div style="
                background: linear-gradient(135deg, {JENGU_COLORS['surface']} 0%, {JENGU_COLORS['surface_variant']} 100%);
                border: 1px solid {JENGU_COLORS['mint']}40;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 0 20px {JENGU_COLORS['mint']}20;
            ">
                <p style="color: {JENGU_COLORS['text_secondary']}; margin: 0; font-size: 0.9rem;">Total Revenue</p>
                <h2 style="color: {JENGU_COLORS['mint']}; margin: 0.5rem 0; font-size: 2rem;">$2.4M</h2>
                <p style="color: {JENGU_COLORS['lime']}; margin: 0; font-size: 0.85rem;">↑ 22.3%</p>
            </div>
            """,
            unsafe_allow_html=True
        )

    # Charts Row
    st.markdown("<br>", unsafe_allow_html=True)
    col1, col2 = st.columns([2, 1])

    with col1:
        st.markdown(f"### <span style='color: {JENGU_COLORS['lime']}'>Revenue Optimization Curve</span>", unsafe_allow_html=True)

        # Generate sample data
        prices = np.linspace(150, 400, 50)
        demand = 100 * np.exp(-0.005 * (prices - 200))
        revenue = prices * demand
        optimal_idx = np.argmax(revenue)

        fig = go.Figure()

        # Revenue curve
        fig.add_trace(go.Scatter(
            x=prices,
            y=revenue,
            mode='lines',
            name='Revenue',
            line=dict(color=JENGU_COLORS['lime'], width=3),
            fill='tozeroy',
            fillcolor='rgba(235, 255, 87, 0.2)'  # JENGU lime with transparency
        ))

        # Optimal point
        fig.add_trace(go.Scatter(
            x=[prices[optimal_idx]],
            y=[revenue[optimal_idx]],
            mode='markers',
            name='Optimal Price',
            marker=dict(
                color=JENGU_COLORS['mint'],
                size=15,
                line=dict(color=JENGU_COLORS['lime'], width=2)
            )
        ))

        # Current price line
        fig.add_vline(
            x=250,
            line_dash="dash",
            line_color=JENGU_COLORS['text_secondary'],
            annotation_text="Current Price"
        )

        fig.update_layout(
            **PLOTLY_THEME['layout'],
            title="JENGU Intelligence: Price-Revenue Optimization",
            xaxis_title="Price ($)",
            yaxis_title="Revenue ($)",
            height=400,
            showlegend=True,
            hovermode='x unified'
        )

        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown(f"### <span style='color: {JENGU_COLORS['mint']}'>Demand Factors</span>", unsafe_allow_html=True)

        # Correlation factors
        factors = pd.DataFrame({
            'Factor': ['Weather', 'Holidays', 'Events', 'Season', 'Competition'],
            'Impact': [0.85, 0.72, 0.68, 0.61, 0.45]
        })

        fig = go.Figure(go.Bar(
            x=factors['Impact'],
            y=factors['Factor'],
            orientation='h',
            marker=dict(
                color=factors['Impact'],
                colorscale=[[0, JENGU_COLORS['surface_variant']],
                           [0.5, JENGU_COLORS['mint']],
                           [1, JENGU_COLORS['lime']]],
                showscale=False
            ),
            text=[f"{x:.0%}" for x in factors['Impact']],
            textposition='outside'
        ))

        fig.update_layout(
            **PLOTLY_THEME['layout'],
            title="Key Demand Drivers",
            xaxis_title="Correlation Strength",
            height=400,
            xaxis=dict(range=[0, 1], tickformat='.0%'),
            showlegend=False
        )

        st.plotly_chart(fig, use_container_width=True)

    # Insights Section
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown(f"### <span style='color: {JENGU_COLORS['lime']}'>🔮 JENGU Intelligence Insights</span>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns(3)

    with col1:
        st.info(
            """
            **Weather Impact Detected** 🌤️

            Sunny weekends show 35% higher demand.
            Recommend dynamic pricing +$50 for favorable weather forecasts.
            """
        )

    with col2:
        st.success(
            """
            **Holiday Opportunity** 📅

            Upcoming holiday weekend shows 78% historical occupancy.
            JENGU suggests increasing rates by 25% starting 14 days out.
            """
        )

    with col3:
        st.warning(
            """
            **Competitive Alert** ⚠️

            Competitor rates dropped 15% for next month.
            Consider tactical promotion to maintain occupancy.
            """
        )

# ============================================================================
# JENGU DATA UPLOAD
# ============================================================================

def render_data_upload():
    """Render JENGU data upload interface"""
    st.markdown(f"## <span style='color: {JENGU_COLORS['lime']}'>📤 Data Upload & Enrichment</span>", unsafe_allow_html=True)

    col1, col2 = st.columns([2, 1])

    with col1:
        st.markdown(
            """
            Upload your historical booking data to unleash JENGU's intelligence.
            We'll automatically enrich it with weather, holidays, and market data.
            """
        )

        uploaded_file = st.file_uploader(
            "Choose your data file",
            type=['csv', 'xlsx', 'parquet'],
            help="Upload CSV, Excel, or Parquet files with booking history"
        )

        if uploaded_file:
            # Process uploaded file
            if uploaded_file.name.endswith('.csv'):
                df = pd.read_csv(uploaded_file)
            elif uploaded_file.name.endswith('.xlsx'):
                df = pd.read_excel(uploaded_file)
            else:
                df = pd.read_parquet(uploaded_file)

            st.success(f"✓ Loaded {len(df):,} records from {uploaded_file.name}")

            # Preview data
            st.markdown("### Data Preview")
            st.dataframe(
                df.head(),
                use_container_width=True,
                hide_index=True
            )

            # Enrichment options
            st.markdown("### 🔮 JENGU Enrichment Options")

            col1, col2, col3 = st.columns(3)

            with col1:
                enrich_weather = st.checkbox("🌤️ Weather Data", value=True)
            with col2:
                enrich_holidays = st.checkbox("📅 Holiday Calendar", value=True)
            with col3:
                enrich_events = st.checkbox("🎭 Local Events", value=False, disabled=True)

            if st.button("🚀 Start JENGU Analysis", type="primary", use_container_width=True):
                with st.spinner("JENGU is analyzing your data..."):
                    # Simulate enrichment
                    progress = st.progress(0)
                    status = st.empty()

                    steps = [
                        "Validating data quality...",
                        "Fetching weather patterns...",
                        "Analyzing holiday impacts...",
                        "Computing correlations...",
                        "Generating insights..."
                    ]

                    for i, step in enumerate(steps):
                        status.text(step)
                        progress.progress((i + 1) / len(steps))
                        # In real app, call actual functions here

                st.success("✓ JENGU analysis complete! Navigate to Intelligence tab for insights.")

    with col2:
        st.markdown("### 📊 Data Requirements")
        st.markdown(
            """
            **Required Fields:**
            - Booking Date
            - Check-in Date
            - Room/Property Type
            - Rate/Price
            - Guest Count

            **Optional Fields:**
            - Channel/Source
            - Guest Origin
            - Length of Stay
            - Booking Window
            """
        )

        st.markdown("### 🎯 Best Practices")
        st.info(
            """
            - Include 12+ months of data
            - Daily granularity preferred
            - Include all room types
            - Maintain consistent formats
            """
        )

# ============================================================================
# JENGU INTELLIGENCE
# ============================================================================

def render_intelligence():
    """Render JENGU intelligence and correlation analysis"""
    st.markdown(f"## <span style='color: {JENGU_COLORS['lime']}'>🔮 JENGU Intelligence Engine</span>", unsafe_allow_html=True)

    tabs = st.tabs(["📈 Correlations", "🌡️ Weather Impact", "📅 Seasonality", "🎯 Predictions"])

    with tabs[0]:
        st.markdown("### Correlation Analysis")
        st.markdown("JENGU reveals the hidden relationships in your data.")

        # Correlation matrix placeholder
        st.info("Upload data to see correlation analysis")

    with tabs[1]:
        st.markdown("### Weather Impact Analysis")
        st.markdown("Understanding how weather drives your demand.")

        # Weather impact chart placeholder
        st.info("Upload data to see weather impact")

    with tabs[2]:
        st.markdown("### Seasonal Patterns")
        st.markdown("Discover recurring patterns and cycles.")

        # Seasonality chart placeholder
        st.info("Upload data to see seasonal patterns")

    with tabs[3]:
        st.markdown("### Demand Predictions")
        st.markdown("JENGU's ML models forecast future demand.")

        # Prediction chart placeholder
        st.info("Upload data to see predictions")

# ============================================================================
# JENGU OPTIMIZATION
# ============================================================================

def render_optimize():
    """Render JENGU price optimization interface"""
    st.markdown(f"## <span style='color: {JENGU_COLORS['lime']}'>⚡ Dynamic Price Optimization</span>", unsafe_allow_html=True)

    col1, col2 = st.columns([1, 1])

    with col1:
        st.markdown("### Optimization Parameters")

        weather_sensitivity = st.slider(
            "Weather Sensitivity",
            0.0, 1.0, 0.7,
            help="How much should weather impact pricing?"
        )

        demand_elasticity = st.slider(
            "Demand Elasticity",
            0.0, 1.0, 0.5,
            help="How sensitive are guests to price changes?"
        )

        competitor_weight = st.slider(
            "Competitor Influence",
            0.0, 1.0, 0.3,
            help="How much should competitor rates affect pricing?"
        )

        risk_tolerance = st.slider(
            "Risk Tolerance",
            0.0, 1.0, 0.6,
            help="Higher = more aggressive pricing"
        )

    with col2:
        st.markdown("### Scenario Testing")

        scenario = st.selectbox(
            "Select Scenario",
            ["Normal Conditions", "Peak Season", "Low Season", "Special Event", "Bad Weather"]
        )

        forecast_days = st.number_input(
            "Forecast Period (days)",
            min_value=1,
            max_value=365,
            value=30
        )

        if st.button("🚀 Run JENGU Optimization", type="primary", use_container_width=True):
            with st.spinner("JENGU is optimizing prices..."):
                # Simulate optimization
                st.success("✓ Optimization complete!")

            # Show results
            st.metric("Recommended Price", "$325", "+15%")
            st.metric("Expected Revenue Increase", "+$45,000", "+18%")
            st.metric("Confidence Score", "92%", "+5%")

# ============================================================================
# MAIN APPLICATION
# ============================================================================

def main():
    """Main JENGU application"""

    # Render header
    render_header()

    # Render sidebar and get navigation
    page, property_type, location, rooms, start_date, end_date = render_sidebar()

    # Route to appropriate page
    if page == "📊 Dashboard":
        render_dashboard()
    elif page == "📤 Data Upload":
        render_data_upload()
    elif page == "🔮 Intelligence":
        render_intelligence()
    elif page == "⚡ Optimize":
        render_optimize()
    else:  # Settings
        st.markdown(f"## <span style='color: {JENGU_COLORS['lime']}'>⚙️ Settings</span>", unsafe_allow_html=True)
        st.info("Settings page coming soon...")

    # Footer
    st.markdown("---")
    st.markdown(
        f"""
        <div style="text-align: center; padding: 2rem 0; color: {JENGU_COLORS['text_muted']};">
            {JENGU_BRAND['copyright']} — {JENGU_BRAND['tagline']}
        </div>
        """,
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()