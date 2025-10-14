"""
Dynamic Pricing Intelligence Platform
Enterprise-grade Streamlit application with premium UI/UX
"""

import streamlit as st
from pathlib import Path
import sys

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from apps.ui.theme import inject_custom_css, toggle_theme, get_theme_mode, Colors
from apps.ui.components import show_toast, gradient_header, empty_state
from core.models.business_profile import BusinessProfileManager

# Page config
st.set_page_config(
    page_title="Dynamic Pricing Intelligence",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
def init_session_state():
    """Initialize all session state variables"""
    if "route" not in st.session_state:
        st.session_state.route = "Overview"

    if "has_profile" not in st.session_state:
        manager = BusinessProfileManager()
        st.session_state.has_profile = manager.exists()

    if "profile" not in st.session_state and st.session_state.has_profile:
        manager = BusinessProfileManager()
        st.session_state.profile = manager.load()

    if "uploaded_df" not in st.session_state:
        st.session_state.uploaded_df = None

    if "enriched_df" not in st.session_state:
        st.session_state.enriched_df = None

    if "correlations_df" not in st.session_state:
        st.session_state.correlations_df = None

    if "theme_mode" not in st.session_state:
        st.session_state.theme_mode = "dark"


init_session_state()

# Inject premium CSS
inject_custom_css()


# Sidebar Navigation
def render_sidebar():
    """Render the premium sidebar navigation"""
    with st.sidebar:
        # Logo/Header
        st.markdown(f"""
        <div style="padding: 1rem 0; border-bottom: 1px solid {Colors.BORDER_DEFAULT.get(get_theme_mode())}; margin-bottom: 1rem;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: {Colors.PRIMARY.get(get_theme_mode())};">
                🎯 Pricing Intelligence
            </h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.7;">
                AI-Powered Dynamic Pricing
            </p>
        </div>
        """, unsafe_allow_html=True)

        # Navigation items
        nav_items = [
            {"label": "Overview", "icon": "🧭", "route": "Overview"},
            {"label": "Data", "icon": "📂", "route": "Data"},
            {"label": "Enrichment", "icon": "🌦️", "route": "Enrichment"},
            {"label": "Insights", "icon": "📈", "route": "Insights"},
            {"label": "Model", "icon": "🧠", "route": "Model"},
            {"label": "Optimize", "icon": "🎯", "route": "Optimize"},
            {"label": "Audit", "icon": "🧾", "route": "Audit"},
            {"label": "Settings", "icon": "⚙️", "route": "Settings"},
        ]

        for item in nav_items:
            is_active = st.session_state.route == item["route"]
            button_type = "primary" if is_active else "secondary"

            if st.button(
                f"{item['icon']}  {item['label']}",
                key=f"nav_{item['route']}",
                use_container_width=True,
                type=button_type
            ):
                st.session_state.route = item["route"]
                st.rerun()

        # Theme toggle at bottom
        st.markdown("---")
        mode = get_theme_mode()
        theme_icon = "🌙" if mode == "dark" else "☀️"
        theme_label = "Dark Mode" if mode == "dark" else "Light Mode"

        if st.button(f"{theme_icon}  {theme_label}", use_container_width=True):
            toggle_theme()
            st.rerun()


# Main content router
def render_main_content():
    """Route to the appropriate page based on session state"""

    # Check if setup is required
    if not st.session_state.has_profile:
        render_setup_wizard()
        return

    route = st.session_state.route

    if route == "Overview":
        render_overview()
    elif route == "Data":
        render_data_page()
    elif route == "Enrichment":
        render_enrichment_page()
    elif route == "Insights":
        render_insights_page()
    elif route == "Model":
        render_model_page()
    elif route == "Optimize":
        render_optimize_page()
    elif route == "Audit":
        render_audit_page()
    elif route == "Settings":
        render_settings_page()
    else:
        st.error(f"Unknown route: {route}")


def render_setup_wizard():
    """Render the setup wizard"""
    from apps.ui.setup_wizard import render_setup_wizard as show_wizard

    # Show wizard
    completed = show_wizard()

    # Check if profile was created
    manager = BusinessProfileManager()
    if manager.exists():
        st.session_state.has_profile = True
        st.session_state.profile = manager.load()
        st.session_state.route = "Overview"
        show_toast("Business profile created successfully!", "success")
        st.balloons()
        st.rerun()


def render_overview():
    """Render the overview/dashboard page"""
    gradient_header(
        "Overview Dashboard",
        subtitle="Your intelligent pricing command center",
        icon="🧭"
    )

    # Welcome message
    if st.session_state.has_profile:
        profile = st.session_state.profile
        st.markdown(f"### Welcome back, **{profile.business_name}**!")
        st.markdown(f"📍 {profile.city}, {profile.country} | 🕐 {profile.timezone}")

    st.markdown("---")

    # Show next action cards based on state
    if st.session_state.uploaded_df is None:
        empty_state(
            title="No Data Uploaded",
            description="Upload your historical booking data to get started with AI-powered pricing insights.",
            icon="📂",
            action_label="📤 Upload Data",
            action_callback=lambda: setattr(st.session_state, 'route', 'Data') or st.rerun()
        )
    elif st.session_state.enriched_df is None:
        empty_state(
            title="Data Ready for Enrichment",
            description="Enrich your data with weather, holidays, and temporal features for better insights.",
            icon="🌦️",
            action_label="✨ Enrich Data",
            action_callback=lambda: setattr(st.session_state, 'route', 'Enrichment') or st.rerun()
        )
    elif st.session_state.correlations_df is None:
        empty_state(
            title="Ready for Analysis",
            description="Run correlation analysis to discover what drives demand for your business.",
            icon="📈",
            action_label="🔍 Analyze Insights",
            action_callback=lambda: setattr(st.session_state, 'route', 'Insights') or st.rerun()
        )
    else:
        # Show KPIs and shortcuts
        st.markdown("### 📊 Quick Stats")

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric("📅 Data Points", len(st.session_state.enriched_df) if st.session_state.enriched_df is not None else 0)

        with col2:
            st.metric("✨ Features", len(st.session_state.enriched_df.columns) if st.session_state.enriched_df is not None else 0)

        with col3:
            st.metric("📈 Correlations", len(st.session_state.correlations_df) if st.session_state.correlations_df is not None else 0)

        with col4:
            st.metric("🎯 Status", "Active")

        st.markdown("---")
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


def render_data_page():
    """Render the data upload page"""
    # Import and render the data page
    from apps.ui.pages import data_page
    data_page.render()


def render_enrichment_page():
    """Render the enrichment page"""
    from apps.ui.pages import enrichment_page
    enrichment_page.render()


def render_insights_page():
    """Render the insights page"""
    from apps.ui.pages import insights_page
    insights_page.render()


def render_model_page():
    """Render the model training page"""
    gradient_header(
        "Model Training",
        subtitle="Train predictive models for demand forecasting",
        icon="🧠"
    )

    empty_state(
        title="Model Training Coming Soon",
        description="Advanced machine learning models for demand prediction and price optimization will be available soon.",
        icon="🚧"
    )


def render_optimize_page():
    """Render the optimization page"""
    gradient_header(
        "Price Optimization",
        subtitle="AI-powered pricing recommendations",
        icon="🎯"
    )

    empty_state(
        title="Optimization Engine Coming Soon",
        description="Real-time pricing recommendations based on demand drivers will be available soon.",
        icon="🚧"
    )


def render_audit_page():
    """Render the audit log page"""
    gradient_header(
        "Audit Log",
        subtitle="Track all pricing changes and model updates",
        icon="🧾"
    )

    empty_state(
        title="Audit Log Coming Soon",
        description="Comprehensive audit trail of all pricing decisions and model changes will be available soon.",
        icon="🚧"
    )


def render_settings_page():
    """Render the settings page"""
    gradient_header(
        "Settings",
        subtitle="Configure your pricing intelligence platform",
        icon="⚙️"
    )

    st.markdown("### 🏢 Business Profile")

    if st.session_state.has_profile:
        profile = st.session_state.profile

        col1, col2 = st.columns(2)

        with col1:
            st.markdown(f"""
            <div class="premium-card">
                <h4>Business Information</h4>
                <p><strong>Name:</strong> {profile.business_name}</p>
                <p><strong>Type:</strong> {profile.business_type}</p>
            </div>
            """, unsafe_allow_html=True)

        with col2:
            st.markdown(f"""
            <div class="premium-card">
                <h4>Location</h4>
                <p><strong>City:</strong> {profile.city}</p>
                <p><strong>Country:</strong> {profile.country}</p>
                <p><strong>Timezone:</strong> {profile.timezone}</p>
            </div>
            """, unsafe_allow_html=True)

        if st.button("🔄 Reconfigure Profile", type="secondary"):
            manager = BusinessProfileManager()
            if manager.path.exists():
                manager.path.unlink()
            st.session_state.has_profile = False
            st.session_state.profile = None
            st.rerun()


# Main app
render_sidebar()
render_main_content()
