/**
 * Unified ECharts Theme for Director Dashboard
 *
 * Matches the app's design system:
 * - Primary: #EBFF57
 * - Background: #0A0A0A
 * - Card: #1A1A1A
 * - Border: #2A2A2A
 * - Text: #E5E5E5
 * - Muted: #999999
 */

export const directorDashboardTheme = {
  // Color palette
  color: [
    '#EBFF57', // Primary (yellow-green)
    '#00D9FF', // Cyan
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#FFE66D', // Yellow
    '#A8DADC', // Light blue
    '#FF8A5B', // Orange
    '#95E1D3', // Mint
  ],

  // Background colors
  backgroundColor: 'transparent',

  // Text styles
  textStyle: {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#E5E5E5',
    fontSize: 12,
  },

  // Title
  title: {
    textStyle: {
      color: '#E5E5E5',
      fontSize: 16,
      fontWeight: 600,
    },
    subtextStyle: {
      color: '#999999',
      fontSize: 12,
    },
  },

  // Axis
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: '#2A2A2A',
      },
    },
    axisTick: {
      lineStyle: {
        color: '#2A2A2A',
      },
    },
    axisLabel: {
      color: '#999999',
      fontSize: 11,
    },
    splitLine: {
      lineStyle: {
        color: '#1A1A1A',
      },
    },
  },

  valueAxis: {
    axisLine: {
      lineStyle: {
        color: '#2A2A2A',
      },
    },
    axisTick: {
      lineStyle: {
        color: '#2A2A2A',
      },
    },
    axisLabel: {
      color: '#999999',
      fontSize: 11,
    },
    splitLine: {
      lineStyle: {
        color: '#1A1A1A',
        type: 'dashed',
      },
    },
  },

  // Tooltip
  tooltip: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
    borderWidth: 1,
    textStyle: {
      color: '#E5E5E5',
      fontSize: 12,
    },
    axisPointer: {
      lineStyle: {
        color: '#EBFF57',
        width: 1,
      },
      crossStyle: {
        color: '#EBFF57',
        width: 1,
      },
    },
  },

  // Legend
  legend: {
    textStyle: {
      color: '#E5E5E5',
      fontSize: 12,
    },
    pageTextStyle: {
      color: '#E5E5E5',
    },
  },

  // Data zoom
  dataZoom: {
    backgroundColor: '#1A1A1A',
    borderColor: '#2A2A2A',
    fillerColor: 'rgba(235, 255, 87, 0.15)',
    handleStyle: {
      color: '#EBFF57',
      borderColor: '#EBFF57',
    },
    textStyle: {
      color: '#999999',
    },
  },

  // Timeline
  timeline: {
    lineStyle: {
      color: '#2A2A2A',
    },
    itemStyle: {
      color: '#EBFF57',
    },
    controlStyle: {
      color: '#EBFF57',
      borderColor: '#EBFF57',
    },
    label: {
      color: '#E5E5E5',
    },
  },

  // Visual map
  visualMap: {
    textStyle: {
      color: '#E5E5E5',
    },
  },

  // Series defaults
  line: {
    itemStyle: {
      borderWidth: 1,
    },
    lineStyle: {
      width: 2,
    },
    symbolSize: 4,
    symbol: 'circle',
    smooth: false,
  },

  bar: {
    itemStyle: {
      barBorderWidth: 0,
      barBorderColor: '#2A2A2A',
    },
  },

  pie: {
    itemStyle: {
      borderWidth: 0,
      borderColor: '#2A2A2A',
    },
  },

  scatter: {
    itemStyle: {
      borderWidth: 0,
      borderColor: '#2A2A2A',
    },
  },

  boxplot: {
    itemStyle: {
      borderWidth: 0,
      borderColor: '#2A2A2A',
    },
  },

  parallel: {
    itemStyle: {
      borderWidth: 0,
      borderColor: '#2A2A2A',
    },
  },

  sankey: {
    itemStyle: {
      borderWidth: 0,
      borderColor: '#2A2A2A',
    },
  },

  funnel: {
    itemStyle: {
      borderWidth: 0,
      borderColor: '#2A2A2A',
    },
  },

  gauge: {
    itemStyle: {
      borderWidth: 0,
      borderColor: '#2A2A2A',
    },
  },

  candlestick: {
    itemStyle: {
      color: '#FF6B6B',
      color0: '#4ECDC4',
      borderColor: '#FF6B6B',
      borderColor0: '#4ECDC4',
      borderWidth: 1,
    },
  },

  graph: {
    itemStyle: {
      borderWidth: 0,
      borderColor: '#2A2A2A',
    },
    lineStyle: {
      width: 1,
      color: '#2A2A2A',
    },
    symbolSize: 4,
    symbol: 'circle',
    smooth: false,
    color: [
      '#EBFF57',
      '#00D9FF',
      '#FF6B6B',
      '#4ECDC4',
      '#FFE66D',
      '#A8DADC',
      '#FF8A5B',
      '#95E1D3',
    ],
    label: {
      color: '#E5E5E5',
    },
  },

  map: {
    itemStyle: {
      areaColor: '#1A1A1A',
      borderColor: '#2A2A2A',
      borderWidth: 0.5,
    },
    label: {
      color: '#E5E5E5',
    },
    emphasis: {
      itemStyle: {
        areaColor: '#EBFF57',
        borderColor: '#EBFF57',
        borderWidth: 1,
      },
      label: {
        color: '#0A0A0A',
      },
    },
  },
}

// Register theme with ECharts
import * as echarts from 'echarts/core'

export function registerDirectorTheme() {
  echarts.registerTheme('director-dashboard', directorDashboardTheme)
}
