/**
 * Shared chart configuration for consistent styling across the application
 */

export const chartColors = {
  primary: '#EBFF57',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  muted: '#9CA3AF',
  grid: '#2A2A2A',
  background: '#1A1A1A',
  border: '#2A2A2A',
}

export const tooltipStyle = {
  backgroundColor: chartColors.background,
  border: `1px solid ${chartColors.border}`,
  borderRadius: '8px',
  padding: '8px 12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
}

export const gridConfig = {
  strokeDasharray: '3 3',
  stroke: chartColors.grid,
  opacity: 0.5,
}

export const axisConfig = {
  stroke: chartColors.muted,
  style: {
    fontSize: '12px',
    fill: chartColors.muted,
  },
}

// Gradient definitions (use these in your chart defs)
export const gradientDefinitions = {
  primary: {
    id: 'primaryGradient',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
    stops: [
      { offset: '5%', color: chartColors.primary, opacity: 0.3 },
      { offset: '95%', color: chartColors.primary, opacity: 0 },
    ],
  },
  success: {
    id: 'successGradient',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
    stops: [
      { offset: '5%', color: chartColors.success, opacity: 0.3 },
      { offset: '95%', color: chartColors.success, opacity: 0 },
    ],
  },
  warning: {
    id: 'warningGradient',
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
    stops: [
      { offset: '5%', color: chartColors.warning, opacity: 0.3 },
      { offset: '95%', color: chartColors.warning, opacity: 0 },
    ],
  },
}

// Custom tooltip formatter (for use in recharts Tooltip component)
export const formatTooltipValue = (value: any) => {
  return typeof value === 'number' ? value.toLocaleString() : value
}

// Responsive container default props
export const responsiveContainerDefaults = {
  width: '100%' as const,
  height: 300,
}

// Export common chart component configurations
export const commonChartProps = {
  margin: { top: 10, right: 10, left: 0, bottom: 0 },
}
