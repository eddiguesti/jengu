import { useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { RevenueSeries } from '@/types/analytics'
import { Download } from 'lucide-react'

interface RevenueGainChartProps {
  data: RevenueSeries
  loading?: boolean
}

export function RevenueGainChart({ data, loading }: RevenueGainChartProps) {
  const chartRef = useRef<ReactECharts>(null)
  const { setSelectedDate, hoveredDate, setHoveredDate } = useDashboardStore()

  // Calculate cumulative gain
  const cumulativeGain = data.optimized
    ? data.actual.reduce((acc, actual, i) => {
        const optimized = data.optimized?.[i] ?? actual
        return acc + (optimized - actual)
      }, 0)
    : 0

  const gainPercentage = data.revpau_lift_pct ?? 0

  const option: EChartsOption = {
    title: {
      text: 'Revenue vs Optimized',
      subtext: data.optimized
        ? `Cumulative Gain: $${cumulativeGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (+${gainPercentage.toFixed(1)}%)`
        : 'Actual Revenue',
      left: 'left',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        link: [{ xAxisIndex: 'all' }],
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const date = params[0].axisValue
        let result = `<strong>${date}</strong><br/>`

        params.forEach((param: any) => {
          const value = param.value
          const color = param.color
          result += `<span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;margin-right:5px;"></span>`
          result += `${param.seriesName}: $${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>`
        })

        return result
      },
    },
    legend: {
      data: data.optimized ? ['Actual Revenue', 'Optimized Revenue', 'Gain Area'] : ['Actual Revenue'],
      top: 40,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: 100,
      containLabel: true,
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: 'none',
        },
        restore: {},
        saveAsImage: {
          name: 'revenue-gain-chart',
          title: 'Download',
        },
      },
      right: 20,
      top: 40,
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        start: 0,
        end: 100,
      },
    ],
    xAxis: {
      type: 'category',
      data: data.dates,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: 'Revenue ($)',
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
          if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
          return `$${value}`
        },
      },
    },
    series: [
      {
        name: 'Actual Revenue',
        type: 'line' as const,
        data: data.actual,
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#00D9FF',
        },
        itemStyle: {
          color: '#00D9FF',
        },
        emphasis: {
          focus: 'series',
        },
      },
      ...(data.optimized
        ? [
            {
              name: 'Optimized Revenue',
              type: 'line' as const,
              data: data.optimized,
              smooth: true,
              lineStyle: {
                width: 3,
                color: '#EBFF57',
              },
              itemStyle: {
                color: '#EBFF57',
              },
              emphasis: {
                focus: 'series',
              },
            },
            {
              name: 'Gain Area',
              type: 'line' as const,
              data: data.optimized,
              smooth: true,
              lineStyle: {
                width: 0,
              },
              areaStyle: {
                color: 'rgba(235, 255, 87, 0.15)',
                origin: 'start' as const,
              },
              stack: 'confidence-band',
              symbol: 'none',
            },
          ]
        : []),
    ] as any,
  }

  // Handle chart click for drill-down
  const onEvents = {
    click: (params: any) => {
      if (params.componentType === 'series') {
        const date = data.dates[params.dataIndex]
        setSelectedDate(date)
      }
    },
    mouseover: (params: any) => {
      if (params.componentType === 'series') {
        const date = data.dates[params.dataIndex]
        setHoveredDate(date)
      }
    },
    mouseout: () => {
      setHoveredDate(null)
    },
  }

  // Export chart as PNG
  const handleExport = () => {
    const instance = chartRef.current?.getEchartsInstance()
    if (instance) {
      const url = instance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#0A0A0A',
      })
      const link = document.createElement('a')
      link.href = url
      link.download = 'revenue-gain-chart.png'
      link.click()
    }
  }

  // Sync hover state with other charts
  useEffect(() => {
    const instance = chartRef.current?.getEchartsInstance()
    if (!instance || !hoveredDate) return

    const dataIndex = data.dates.indexOf(hoveredDate)
    if (dataIndex !== -1) {
      instance.dispatchAction({
        type: 'showTip',
        seriesIndex: 0,
        dataIndex,
      })
    }
  }, [hoveredDate, data.dates])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
        <div className="text-muted">Loading revenue data...</div>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg border border-border bg-card p-4">
      <button
        onClick={handleExport}
        className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
        title="Export as PNG"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>
      <ReactECharts
        ref={chartRef}
        option={option}
        theme="director-dashboard"
        style={{ height: '400px', width: '100%' }}
        onEvents={onEvents}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  )
}
