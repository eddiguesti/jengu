import { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { OccupancyPace } from '@/types/analytics'
import { Download } from 'lucide-react'

interface OccupancyPaceChartProps {
  data: OccupancyPace
  loading?: boolean
}

export function OccupancyPaceChart({ data, loading }: OccupancyPaceChartProps) {
  const chartRef = useRef<ReactECharts>(null)
  const { setFilter } = useDashboardStore()

  const option: EChartsOption = {
    title: {
      text: 'Occupancy Pace vs Target',
      subtext: 'By Lead Bucket (Days Before Check-in)',
      left: 'left',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const leadBucket = params[0].axisValue
        let result = `<strong>Lead: ${leadBucket} days</strong><br/>`

        params.forEach((param: any) => {
          const value = param.value
          const color = param.color
          result += `<span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;margin-right:5px;"></span>`
          result += `${param.seriesName}: ${(Number(value) * 100).toFixed(1)}%<br/>`
        })

        // Calculate gap
        if (params.length >= 2) {
          const actualIdx = params.findIndex((p: any) => p.seriesName === 'Actual Pace')
          const targetIdx = params.findIndex((p: any) => p.seriesName === 'Target Pace')
          if (actualIdx !== -1 && targetIdx !== -1) {
            const gap = (params[actualIdx].value - params[targetIdx].value) * 100
            const gapColor = gap >= 0 ? '#4ECDC4' : '#FF6B6B'
            result += `<br/><span style="color:${gapColor};font-weight:600;">Gap: ${gap > 0 ? '+' : ''}${gap.toFixed(1)}%</span>`
          }
        }

        return result
      },
    },
    legend: {
      data: data.model
        ? ['Actual Pace', 'Target Pace', 'Model Projection']
        : ['Actual Pace', 'Target Pace'],
      top: 40,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 90,
      containLabel: true,
    },
    toolbox: {
      feature: {
        saveAsImage: {
          name: 'occupancy-pace-chart',
          title: 'Download',
        },
      },
      right: 20,
      top: 40,
    },
    xAxis: {
      type: 'category',
      data: data.lead,
      axisLabel: {
        formatter: (value: string) => `${value}d`,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Occupancy Rate',
      min: 0,
      max: 1,
      axisLabel: {
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
    },
    series: [
      {
        name: 'Actual Pace',
        type: 'bar' as const,
        data: data.actual,
        itemStyle: {
          color: '#00D9FF',
        },
        emphasis: {
          focus: 'series',
        },
        barMaxWidth: 60,
      },
      {
        name: 'Target Pace',
        type: 'line' as const,
        data: data.target,
        lineStyle: {
          width: 3,
          color: '#EBFF57',
          type: 'dashed',
        },
        itemStyle: {
          color: '#EBFF57',
        },
        symbol: 'circle',
        symbolSize: 8,
        emphasis: {
          focus: 'series',
        },
      },
      ...(data.model
        ? [
            {
              name: 'Model Projection',
              type: 'line' as const,
              data: data.model,
              lineStyle: {
                width: 2,
                color: '#4ECDC4',
                type: 'dotted' as const,
              },
              itemStyle: {
                color: '#4ECDC4',
              },
              symbol: 'diamond' as const,
              symbolSize: 6,
              emphasis: {
                focus: 'series',
              },
            },
          ]
        : []),
    ] as any,
  }

  // Handle chart click for filtering
  const onEvents = {
    click: (params: any) => {
      if (params.componentType === 'series') {
        const leadBucket = data.lead[params.dataIndex]
        setFilter('leadBucket', leadBucket)
      }
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
      link.download = 'occupancy-pace-chart.png'
      link.click()
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
        <div className="text-muted">Loading occupancy data...</div>
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
        style={{ height: '380px', width: '100%' }}
        onEvents={onEvents}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  )
}
