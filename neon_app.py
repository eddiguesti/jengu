"""
🌟 NEON PRICING INTELLIGENCE PLATFORM
Award-winning dashboard with buttery animations and perfect UX
"""

import streamlit as st
from pathlib import Path
import sys
import pandas as pd

# Add project root
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from apps.ui.neon_theme import inject_neon_theme, NeonColors, Animation
from core.models.business_profile import BusinessProfileManager

# ============================================================================
# PAGE CONFIG
# ============================================================================

st.set_page_config(
    page_title="🌟 Pricing Intelligence",
    page_icon="🌟",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# SESSION STATE INIT
# ============================================================================

def init_state():
    """Initialize session state with proper defaults"""
    defaults = {
        "route": "Overview",
        "has_profile": False,
        "profile": None,
        "uploaded_df": None,
        "enriched_df": None,
        "correlations_df": None,
        "show_wizard": False
    }

    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value

    # Check profile existence
    manager = BusinessProfileManager()
    if manager.exists() and not st.session_state.has_profile:
        st.session_state.has_profile = True
        st.session_state.profile = manager.load()

init_state()

# Inject neon theme
inject_neon_theme()

# ============================================================================
# SIDEBAR NAVIGATION
# ============================================================================

def render_sidebar():
    """Premium neon sidebar with buttery animations"""
    with st.sidebar:
        # Logo header
        st.markdown(f"""
        <div style="
            padding: 2rem 1rem;
            border-bottom: 2px solid {NeonColors.BORDER_DEFAULT};
            margin-bottom: 1.5rem;
            animation: slideUp {Animation.SLOW} {Animation.EASE_OUT};
        ">
            <h2 style="
                margin: 0;
                font-size: 24px;
                font-weight: 800;
                background: {NeonColors.GRAD_CYAN_MAGENTA};
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: {NeonColors.GLOW_CYAN_SM};
            ">
                🌟 PRICING AI
            </h2>
            <p style="
                margin: 8px 0 0 0;
                font-size: 12px;
                color: {NeonColors.TEXT_SECONDARY};
                text-transform: uppercase;
                letter-spacing: 0.1em;
            ">
                Intelligent Revenue Optimization
            </p>
        </div>
        """, unsafe_allow_html=True)

        # Nav items
        nav_items = [
            ("Overview", "🧭", "Overview"),
            ("Data Upload", "📂", "Data"),
            ("Enrichment", "🌦️", "Enrichment"),
            ("Insights", "📈", "Insights"),
            ("Model", "🧠", "Model"),
            ("Optimize", "🎯", "Optimize"),
            ("Audit", "🧾", "Audit"),
            ("Settings", "⚙️", "Settings"),
        ]

        for label, icon, route in nav_items:
            is_active = st.session_state.route == route
            button_type = "primary" if is_active else "secondary"

            if st.button(
                f"{icon}  {label}",
                key=f"nav_{route}",
                use_container_width=True,
                type=button_type
            ):
                st.session_state.route = route
                st.rerun()

        # Footer
        st.markdown("---")
        st.markdown(f"""
        <div style="
            text-align: center;
            padding: 1rem;
            color: {NeonColors.TEXT_MUTED};
            font-size: 11px;
        ">
            <p style="margin: 0;">Powered by AI</p>
            <p style="margin: 4px 0 0 0; color: {NeonColors.NEON_CYAN};">v2.0 NEON</p>
        </div>
        """, unsafe_allow_html=True)

render_sidebar()

# ============================================================================
# NEON COMPONENTS
# ============================================================================

def neon_header(title, subtitle=None, icon="🌟"):
    """Premium gradient header with glow"""
    st.markdown(f"""
    <div style="
        background: {NeonColors.GRAD_CYAN_MAGENTA};
        padding: 3rem 2rem;
        border-radius: 20px;
        margin-bottom: 2rem;
        box-shadow: {NeonColors.GLOW_CYAN_LG};
        animation: slideUp {Animation.SLOW} {Animation.EASE_OUT};
        position: relative;
        overflow: hidden;
    ">
        <div style="
            position: absolute;
            top: -50%;
            right: -10%;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
        "></div>
        <h1 style="
            color: white;
            margin: 0;
            font-size: 36px;
            font-weight: 900;
            position: relative;
            z-index: 1;
        ">
            {icon} {title}
        </h1>
        {f'<p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px; position: relative; z-index: 1;">{subtitle}</p>' if subtitle else ''}
    </div>

    <style>
    @keyframes pulse {{
        0%, 100% {{ transform: scale(1); opacity: 0.3; }}
        50% {{ transform: scale(1.2); opacity: 0.5; }}
    }}
    @keyframes slideUp {{
        from {{ opacity: 0; transform: translateY(30px); }}
        to {{ opacity: 1; transform: translateY(0); }}
    }}
    </style>
    """, unsafe_allow_html=True)


def neon_card(content_fn, accent="cyan"):
    """Animated neon card wrapper"""
    glow = {
        "cyan": NeonColors.GLOW_CYAN_MD,
        "magenta": NeonColors.GLOW_MAGENTA,
        "green": NeonColors.GLOW_GREEN
    }.get(accent, NeonColors.GLOW_CYAN_MD)

    st.markdown(f'<div class="neon-card" style="box-shadow: {glow};">', unsafe_allow_html=True)
    content_fn()
    st.markdown('</div>', unsafe_allow_html=True)


def empty_state(title, desc, icon="📭", action_label=None, action_fn=None):
    """Premium empty state"""
    st.markdown(f"""
    <div style="
        text-align: center;
        padding: 4rem 2rem;
        background: {NeonColors.BG_CARD};
        border: 2px dashed {NeonColors.BORDER_DEFAULT};
        border-radius: 20px;
        animation: slideUp {Animation.DEFAULT} {Animation.EASE_OUT};
    ">
        <div style="font-size: 64px; margin-bottom: 1rem; filter: drop-shadow({NeonColors.GLOW_CYAN_SM});">
            {icon}
        </div>
        <h3 style="color: {NeonColors.TEXT_PRIMARY}; margin-bottom: 0.5rem;">{title}</h3>
        <p style="color: {NeonColors.TEXT_SECONDARY}; max-width: 500px; margin: 0 auto 2rem auto;">
            {desc}
        </p>
    </div>
    """, unsafe_allow_html=True)

    if action_label and action_fn:
        col1, col2, col3 = st.columns([1, 1, 1])
        with col2:
            if st.button(action_label, type="primary", use_container_width=True):
                action_fn()


# ============================================================================
# PAGES
# ============================================================================

def page_overview():
    """Overview dashboard"""
    neon_header("Dashboard", "Your intelligent pricing command center", "🧭")

    if not st.session_state.has_profile:
        empty_state(
            "Welcome! Let's Get Started",
            "Complete the setup wizard to configure your business profile and unlock AI-powered insights.",
            "🚀",
            "🎯 Start Setup",
            lambda: (setattr(st.session_state, 'show_wizard', True), st.rerun())
        )
        return

    profile = st.session_state.profile
    st.markdown(f"""
    <div class="neon-card" style="margin-bottom: 2rem;">
        <h3 style="margin-top: 0;">👋 Welcome back, <span style="color: {NeonColors.NEON_CYAN};">{profile.business_name}</span></h3>
        <p style="color: {NeonColors.TEXT_SECONDARY};">📍 {profile.city}, {profile.country} | 🕐 {profile.timezone}</p>
    </div>
    """, unsafe_allow_html=True)

    # KPIs
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("📊 Data Points", len(st.session_state.enriched_df) if st.session_state.enriched_df is not None else 0)
    with col2:
        st.metric("✨ Features", len(st.session_state.enriched_df.columns) if st.session_state.enriched_df is not None else 0)
    with col3:
        st.metric("📈 Insights", "Ready" if st.session_state.correlations_df is not None else "Pending")
    with col4:
        st.metric("🎯 Status", "Active")

    st.markdown("---")

    # Next actions
    if st.session_state.uploaded_df is None:
        empty_state(
            "No Data Yet",
            "Upload your historical booking data to begin AI-powered analysis.",
            "📂",
            "📤 Upload Data",
            lambda: (setattr(st.session_state, 'route', 'Data'), st.rerun())
        )
    elif st.session_state.enriched_df is None:
        empty_state(
            "Ready to Enrich",
            "Enhance your data with weather, holidays, and temporal features.",
            "🌦️",
            "✨ Enrich Data",
            lambda: (setattr(st.session_state, 'route', 'Enrichment'), st.rerun())
        )
    elif st.session_state.correlations_df is None:
        empty_state(
            "Discover Insights",
            "Run correlation analysis to find what drives demand for your business.",
            "📈",
            "🔍 Analyze Now",
            lambda: (setattr(st.session_state, 'route', 'Insights'), st.rerun())
        )
    else:
        st.markdown("### 🚀 Quick Actions")
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("📈 View Insights", use_container_width=True, type="primary"):
                st.session_state.route = "Insights"
                st.rerun()
        with col2:
            if st.button("🧠 Train Model", use_container_width=True):
                st.session_state.route = "Model"
                st.rerun()
        with col3:
            if st.button("🎯 Optimize Pricing", use_container_width=True):
                st.session_state.route = "Optimize"
                st.rerun()


def page_data():
    """Data upload page"""
    neon_header("Data Upload", "Import your historical booking data", "📂")

    uploaded_file = st.file_uploader(
        "📁 DROP YOUR CSV OR EXCEL FILE HERE",
        type=["csv", "xlsx", "xls"],
        help="Upload historical booking data with dates, prices, and quantities"
    )

    if uploaded_file:
        try:
            df = pd.read_csv(uploaded_file) if uploaded_file.name.endswith('.csv') else pd.read_excel(uploaded_file)
            st.session_state.uploaded_df = df
            st.success(f"✅ Loaded {len(df)} rows, {len(df.columns)} columns")

            with st.expander("📋 Data Preview"):
                st.dataframe(df.head(20), use_container_width=True)

            st.markdown("---")
            if st.button("🌦️ Continue to Enrichment →", type="primary", use_container_width=True):
                st.session_state.route = "Enrichment"
                st.rerun()

        except Exception as e:
            st.error(f"❌ Failed to load: {str(e)}")
    else:
        empty_state(
            "Drop Your Data",
            "Upload CSV or Excel with booking history (dates, prices, quantities).",
            "📂"
        )


def page_enrichment():
    """Enrichment page"""
    neon_header("Data Enrichment", "AI-powered feature engineering", "🌦️")

    if st.session_state.uploaded_df is None:
        empty_state(
            "No Data to Enrich",
            "Upload your booking data first.",
            "📂",
            "📤 Upload Data",
            lambda: (setattr(st.session_state, 'route', 'Data'), st.rerun())
        )
        return

    df = st.session_state.uploaded_df
    st.info(f"📊 Data loaded: {len(df)} rows")

    # Column mapping
    col1, col2 = st.columns(2)
    with col1:
        date_col = st.selectbox("📅 Date Column", df.columns)
    with col2:
        price_col = st.selectbox("💰 Price Column", [None] + list(df.columns))

    if st.button("🚀 Start Enrichment", type="primary", use_container_width=True):
        try:
            from core.services.enrichment_pipeline import EnrichmentPipeline

            with st.spinner("🔄 Enriching with AI..."):
                pipeline = EnrichmentPipeline(st.session_state.profile)
                enriched_df, summary = pipeline.enrich_bookings(df, date_col=date_col)
                st.session_state.enriched_df = enriched_df

                st.success("✅ Enrichment complete!")
                st.balloons()

                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("📅 Days", summary.get('total_days', 0))
                with col2:
                    st.metric("🌤️ Weather Coverage", f"{summary.get('weather_coverage_pct', 0)}%")
                with col3:
                    st.metric("✨ Features", summary.get('features_added', 0))

                if st.button("📈 Analyze Insights →", type="primary"):
                    st.session_state.route = "Insights"
                    st.rerun()

        except Exception as e:
            st.error(f"❌ Enrichment failed: {str(e)}")


def page_insights():
    """Insights page"""
    neon_header("AI Insights", "Discover what drives demand", "📈")

    if st.session_state.enriched_df is None:
        empty_state(
            "No Enriched Data",
            "Enrich your data first.",
            "🌦️",
            "✨ Enrich Data",
            lambda: (setattr(st.session_state, 'route', 'Enrichment'), st.rerun())
        )
        return

    df = st.session_state.enriched_df
    st.info(f"📊 Analyzing {len(df)} enriched records")

    target_options = [col for col in df.columns if col in ['bookings', 'revenue', 'final_price'] or 'booking' in col.lower()]
    if not target_options:
        target_options = df.select_dtypes(include=['number']).columns.tolist()

    target = st.selectbox("🎯 Target Variable", target_options)

    if st.button("🔍 Analyze Correlations", type="primary", use_container_width=True):
        try:
            from core.analysis.correlations import compute_correlations, rank_top_features
            import plotly.graph_objects as go

            with st.spinner("🔄 Computing AI insights..."):
                correlations_df = compute_correlations(df, target=target)
                rankings_df = rank_top_features(correlations_df, top_n=20)
                st.session_state.correlations_df = correlations_df

                st.success("✅ Analysis complete!")

                # Chart with dark theme
                top_10 = rankings_df.head(10)
                fig = go.Figure()
                fig.add_trace(go.Bar(
                    y=top_10['feature'],
                    x=top_10['combined_score'],
                    orientation='h',
                    marker=dict(
                        color=top_10['combined_score'],
                        colorscale=[[0, NeonColors.NEON_BLUE], [1, NeonColors.NEON_CYAN]],
                        line=dict(color=NeonColors.BG_PRIMARY, width=2)
                    ),
                    text=[f"{s:.3f}" for s in top_10['combined_score']],
                    textposition='outside',
                    textfont=dict(color=NeonColors.TEXT_PRIMARY)
                ))

                fig.update_layout(
                    title="Top 10 Demand Drivers",
                    paper_bgcolor=NeonColors.BG_PRIMARY,
                    plot_bgcolor=NeonColors.BG_CARD,
                    font=dict(color=NeonColors.TEXT_PRIMARY, family="Inter"),
                    height=500,
                    yaxis={'categoryorder': 'total ascending'},
                    xaxis=dict(gridcolor=NeonColors.BORDER_DEFAULT)
                )

                st.plotly_chart(fig, use_container_width=True)

        except Exception as e:
            st.error(f"❌ Analysis failed: {str(e)}")


def page_coming_soon(title, icon):
    """Coming soon placeholder"""
    neon_header(title, "Feature launching soon", icon)
    empty_state(
        f"{title} Coming Soon",
        "This premium feature is under development. Stay tuned!",
        "🚧"
    )


# ============================================================================
# ROUTING
# ============================================================================

if st.session_state.show_wizard or (not st.session_state.has_profile and st.session_state.route == "Overview"):
    from apps.ui.setup_wizard import render_setup_wizard
    render_setup_wizard()
    # Check if profile was created
    manager = BusinessProfileManager()
    if manager.exists():
        st.session_state.has_profile = True
        st.session_state.profile = manager.load()
        st.session_state.show_wizard = False
        st.session_state.route = "Overview"
        st.balloons()
        st.rerun()
else:
    route = st.session_state.route
    if route == "Overview":
        page_overview()
    elif route == "Data":
        page_data()
    elif route == "Enrichment":
        page_enrichment()
    elif route == "Insights":
        page_insights()
    elif route == "Model":
        page_coming_soon("Model Training", "🧠")
    elif route == "Optimize":
        page_coming_soon("Price Optimization", "🎯")
    elif route == "Audit":
        page_coming_soon("Audit Log", "🧾")
    elif route == "Settings":
        neon_header("Settings", "Configure your platform", "⚙️")
        if st.session_state.has_profile:
            profile = st.session_state.profile
            st.markdown(f"""
            <div class="neon-card">
                <h3>🏢 Business Profile</h3>
                <p><strong>Name:</strong> {profile.business_name}</p>
                <p><strong>Type:</strong> {profile.business_type}</p>
                <p><strong>Location:</strong> {profile.city}, {profile.country}</p>
                <p><strong>Timezone:</strong> {profile.timezone}</p>
            </div>
            """, unsafe_allow_html=True)

            if st.button("🔄 Reconfigure Profile"):
                manager = BusinessProfileManager()
                if manager.path.exists():
                    manager.path.unlink()
                st.session_state.has_profile = False
                st.session_state.profile = None
                st.rerun()
