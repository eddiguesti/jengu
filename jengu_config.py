"""
JENGU Configuration and Branding
© 2025 JENGU Technologies - Confidential
"""

# ============================================================================
# JENGU BRAND IDENTITY
# ============================================================================

JENGU_BRAND = {
    "name": "JENGU",
    "tagline": "Dynamic Pricing Intelligence for the Hospitality Future",
    "vision": "Bridge human intuition with machine intelligence",
    "copyright": "© 2025 JENGU Technologies",
    "version": "1.0.0"
}

# ============================================================================
# JENGU COLOR SYSTEM
# ============================================================================

JENGU_COLORS = {
    # Primary Brand Colors
    "lime": "#EBFF57",  # Primary accent - JENGU Lime
    "mint": "#A2F7A1",  # Secondary accent - JENGU Mint

    # Dark Theme
    "background": "#0A0A0A",  # Matte-dark canvas
    "surface": "#1A1A1A",  # Card/panel background
    "surface_variant": "#242424",  # Hover states

    # Text Colors
    "text_primary": "#FFFFFF",
    "text_secondary": "#A0A0A0",
    "text_muted": "#606060",

    # Semantic Colors
    "success": "#A2F7A1",  # Mint for positive
    "warning": "#FFB957",  # Warm orange
    "error": "#FF5757",  # Soft red
    "info": "#57B8FF",  # Sky blue

    # Chart Colors (Plotly)
    "chart_primary": "#EBFF57",
    "chart_secondary": "#A2F7A1",
    "chart_tertiary": "#57B8FF",
    "chart_quaternary": "#FFB957",

    # Gradients
    "gradient_start": "#EBFF57",
    "gradient_end": "#A2F7A1"
}

# ============================================================================
# JENGU TYPOGRAPHY
# ============================================================================

JENGU_FONTS = {
    "primary": "'Plus Jakarta Sans', 'Helvetica Neue', Helvetica, system-ui, sans-serif",
    "mono": "'JetBrains Mono', 'Courier New', monospace",

    # Font Weights
    "weight_regular": 400,
    "weight_medium": 500,
    "weight_semibold": 600,
    "weight_bold": 700,

    # Font Sizes
    "size_xs": "0.75rem",  # 12px
    "size_sm": "0.875rem",  # 14px
    "size_base": "1rem",  # 16px
    "size_lg": "1.125rem",  # 18px
    "size_xl": "1.25rem",  # 20px
    "size_2xl": "1.5rem",  # 24px
    "size_3xl": "1.875rem",  # 30px
    "size_4xl": "2.25rem",  # 36px
}

# ============================================================================
# JENGU UI COMPONENTS
# ============================================================================

JENGU_COMPONENTS = {
    # Border Radius
    "radius_sm": "0.25rem",  # 4px
    "radius_md": "0.5rem",  # 8px
    "radius_lg": "0.75rem",  # 12px
    "radius_xl": "1rem",  # 16px
    "radius_full": "9999px",  # Pill shape

    # Shadows (subtle glows)
    "shadow_sm": "0 1px 3px rgba(235, 255, 87, 0.1)",
    "shadow_md": "0 4px 6px rgba(235, 255, 87, 0.15)",
    "shadow_lg": "0 10px 25px rgba(235, 255, 87, 0.2)",
    "shadow_glow": "0 0 20px rgba(235, 255, 87, 0.3)",

    # Spacing
    "space_xs": "0.25rem",  # 4px
    "space_sm": "0.5rem",  # 8px
    "space_md": "1rem",  # 16px
    "space_lg": "1.5rem",  # 24px
    "space_xl": "2rem",  # 32px
    "space_2xl": "3rem",  # 48px
}

# ============================================================================
# JENGU STREAMLIT THEME
# ============================================================================

STREAMLIT_THEME_CONFIG = """
[theme]
primaryColor="#EBFF57"
backgroundColor="#0A0A0A"
secondaryBackgroundColor="#1A1A1A"
textColor="#FFFFFF"
font="sans serif"
"""

STREAMLIT_CSS = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    /* Global Styles */
    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', 'Helvetica Neue', sans-serif;
    }

    /* JENGU Brand Colors */
    .jengu-lime { color: #EBFF57 !important; }
    .jengu-mint { color: #A2F7A1 !important; }
    .jengu-dark-bg { background-color: #0A0A0A !important; }
    .jengu-surface { background-color: #1A1A1A !important; }

    /* Header Styling */
    h1, h2, h3 {
        font-weight: 600;
        letter-spacing: -0.02em;
    }

    h1 { color: #EBFF57 !important; }
    h2 { color: #A2F7A1 !important; }

    /* Metric Cards */
    [data-testid="metric-container"] {
        background: linear-gradient(135deg, #1A1A1A 0%, #242424 100%);
        border: 1px solid rgba(235, 255, 87, 0.2);
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 0 20px rgba(235, 255, 87, 0.1);
    }

    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, #EBFF57 0%, #A2F7A1 100%);
        color: #0A0A0A;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        transition: all 0.3s ease;
    }

    .stButton > button:hover {
        box-shadow: 0 0 20px rgba(235, 255, 87, 0.4);
        transform: translateY(-2px);
    }

    /* Sliders */
    .stSlider > div > div {
        background: linear-gradient(90deg, #EBFF57 0%, #A2F7A1 100%);
    }

    /* Sidebar */
    .css-1d391kg, [data-testid="stSidebar"] {
        background-color: #0A0A0A;
        border-right: 1px solid rgba(235, 255, 87, 0.1);
    }

    /* Glow Effects */
    .jengu-glow {
        box-shadow: 0 0 30px rgba(235, 255, 87, 0.3);
    }

    /* Success Messages */
    .stSuccess {
        background-color: rgba(162, 247, 161, 0.1);
        border-left: 4px solid #A2F7A1;
    }

    /* Info Messages */
    .stInfo {
        background-color: rgba(235, 255, 87, 0.1);
        border-left: 4px solid #EBFF57;
    }
</style>
"""

# ============================================================================
# JENGU PLOTLY THEME
# ============================================================================

PLOTLY_THEME = {
    "layout": {
        "paper_bgcolor": "#0A0A0A",
        "plot_bgcolor": "#1A1A1A",
        "font": {
            "family": "Plus Jakarta Sans, Helvetica, sans-serif",
            "color": "#FFFFFF"
        },
        "colorway": [
            "#EBFF57",  # Lime
            "#A2F7A1",  # Mint
            "#57B8FF",  # Blue
            "#FFB957",  # Orange
            "#FF5757",  # Red
            "#B757FF",  # Purple
        ],
        "xaxis": {
            "gridcolor": "#242424",
            "zerolinecolor": "#242424"
        },
        "yaxis": {
            "gridcolor": "#242424",
            "zerolinecolor": "#242424"
        },
        "hoverlabel": {
            "bgcolor": "#1A1A1A",
            "bordercolor": "#EBFF57",
            "font": {"color": "#FFFFFF"}
        }
    }
}

# ============================================================================
# JENGU API SETTINGS
# ============================================================================

API_CONFIG = {
    "title": "JENGU API",
    "description": "Dynamic Pricing Intelligence for the Hospitality Future",
    "version": "1.0.0",
    "terms_of_service": "https://jengu.io/terms",
    "contact": {
        "name": "JENGU Technologies",
        "url": "https://jengu.io",
        "email": "api@jengu.io"
    },
    "license": {
        "name": "Proprietary",
        "url": "https://jengu.io/license"
    }
}

# ============================================================================
# JENGU FEATURE FLAGS
# ============================================================================

FEATURES = {
    # Phase 1 - MVP
    "data_upload": True,
    "weather_enrichment": True,
    "holiday_enrichment": True,
    "basic_analytics": True,
    "correlation_engine": True,

    # Phase 2 - Intelligence
    "lag_analysis": False,  # TODO: Implement
    "advanced_correlation": False,  # TODO: Implement
    "market_data": False,  # TODO: Implement

    # Phase 3 - Predictive
    "demand_forecasting": False,  # TODO: Implement
    "ml_optimization": False,  # TODO: Implement
    "scenario_testing": False,  # TODO: Implement

    # Phase 4 - Production
    "pms_integration": False,  # TODO: Implement
    "ota_integration": False,  # TODO: Implement
    "live_rate_push": False,  # TODO: Implement
    "webhooks": False,  # TODO: Implement
}

# ============================================================================
# JENGU MESSAGES
# ============================================================================

MESSAGES = {
    "welcome": "Welcome to JENGU - Your Dynamic Pricing Intelligence Partner",
    "tagline": "Revealing the WHY behind demand, not just the WHAT",
    "loading": "JENGU is analyzing your data...",
    "success": "✓ Analysis complete. Insights ready.",
    "error": "⚠ JENGU encountered an issue. Please try again.",
    "no_data": "Upload your data to unleash JENGU's intelligence",
}

# ============================================================================
# JENGU ICONS (Lucide Icon Names)
# ============================================================================

ICONS = {
    "logo": "🌟",  # Placeholder - replace with actual logo
    "dashboard": "LayoutDashboard",
    "upload": "Upload",
    "analyze": "TrendingUp",
    "optimize": "Target",
    "settings": "Settings",
    "calendar": "Calendar",
    "weather": "Cloud",
    "dollar": "DollarSign",
    "chart": "LineChart",
    "users": "Users",
    "lock": "Lock",
    "check": "Check",
    "alert": "AlertCircle",
    "info": "Info",
}