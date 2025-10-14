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

    col1, col2, col3 = st.columns(3)

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
        # Weather filter
        weather_options = st.multiselect(
            "Weather Conditions",
            options=['Sunny', 'Not Sunny'],
            default=['Sunny', 'Not Sunny'],
            key="weather_filter"
        )

    with col3:
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

    # Weather filter
    if weather_options:
        filtered_df = filtered_df[filtered_df['weather_label'].isin(weather_options)]

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
        metric_card("Average Price", f"${avg_price:.2f}", "", True, "target")

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
        yaxis_title="Price ($)",
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
                    f"**Statistical Significance**: Sunny days command ${price_diff:.2f} ({price_diff_pct:+.1f}%) higher prices (p={p_value:.4f}). This is a clear pricing opportunity!",
                    "success"
                )
            else:
                info_box(
                    f"**Counter-Intuitive Pattern**: Not sunny days show ${abs(price_diff):.2f} ({abs(price_diff_pct):.1f}%) higher prices (p={p_value:.4f}). May indicate indoor activity demand or business travel patterns.",
                    "warning"
                )
        else:
            info_box(
                f"Weather shows minimal impact on pricing (p={p_value:.4f}). Price difference is ${abs(price_diff):.2f} but not statistically significant.",
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
        yaxis=dict(title="Price ($)", side='left', showgrid=False),
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
                st.markdown(f"- Avg Price: ${low_occ_days[price_col].mean():.2f}")
                if 'is_weekend' in low_occ_days.columns:
                    weekend_pct = (low_occ_days['is_weekend'].mean() * 100)
                    st.markdown(f"- Weekend: {weekend_pct:.0f}%")

        with col2:
            if len(full_occ_days) > 0:
                full_sunny_pct = (full_occ_days['is_sunny'].mean() * 100)
                st.markdown(f"**Full Occupancy Days ({len(full_occ_days)})**")
                st.markdown(f"- Sunny: {full_sunny_pct:.0f}%")
                st.markdown(f"- Avg Price: ${full_occ_days[price_col].mean():.2f}")
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
                yaxis2=dict(title="Price ($)", side='right', overlaying='y'),
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
            yaxis=dict(title="Price ($)", side='left'),
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
