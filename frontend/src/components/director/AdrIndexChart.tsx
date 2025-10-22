import { useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { AdrIndex } from '@/types/analytics'
import { Download } from 'lucide-react'

interface AdrIndexChartProps {
  data: AdrIndex
  loading?: boolean
}

export function AdrIndexChart({ data, loading }: AdrIndexChartProps) {
  const chartRef = useRef<ReactECharts>(null)
  const { hoveredDate, setHoveredDate } = useDashboardStore()

  const option: EChartsOption = {
    title: {
      text: 'ADR vs Market Index',
      subtext: '100 = Market Parity',
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
          result += `${param.seriesName}: ${Number(value).toFixed(1)}<br/>`
        })

        // Add pricing guidance
        const propertyIndex = params.find((p: any) => p.seriesName === 'Property ADR Index')?.value
        if (propertyIndex) {
          if (propertyIndex > 110) {
            result += `<br/><span style="color:#FF6B6B;">⚠ Potentially overpriced</span>`
          } else if (propertyIndex < 90) {
            result += `<br/><span style="color:#FFE66D;">⚠ Potentially underpriced</span>`
          } else {
            result += `<br/><span style="color:#4ECDC4;">✓ Competitive pricing</span>`
          }
        }

        return result
      },
    },
    legend: {
      data: data.marketIndex ? ['Property ADR Index', 'Market Index'] : ['Property ADR Index'],
      top: 40,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: 90,
      containLabel: true,
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: 'none',
        },
        restore: {},
        saveAsImage: {
          name: 'adr-index-chart',
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
    ] as any,
    xAxis: {
      type: 'category',
      data: data.dates,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      name: 'Index (100 = parity)',
      axisLabel: {
        formatter: (value: number) => value.toFixed(0),
      },
    },
    visualMap: {
      show: false,
      pieces: [
        {
          gt: 110,
          color: '#FF6B6B', // Red zone - overpriced
        },
        {
          gte: 90,
          lte: 110,
          color: '#4ECDC4', // Green zone - competitive
        },
        {
          lt: 90,
          color: '#FFE66D', // Yellow zone - underpriced
        },
      ] as any,
      dimension: 1, // Apply to y-axis values
      seriesIndex: 0,
    },
    series: [
      {
        name: 'Property ADR Index',
        type: 'line',
        data: data.propertyIndex,
        smooth: true,
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          opacity: 0.2,
        },
        emphasis: {
          focus: 'series',
        },
      },
      ...(data.marketIndex
        ? [
            {
              name: 'Market Index',
              type: 'line',
              data: data.marketIndex,
              smooth: true,
              lineStyle: {
                width: 2,
                color: '#999999',
                type: 'dashed',
              },
              itemStyle: {
                color: '#999999',
              },
              symbol: 'none',
              emphasis: {
                focus: 'series',
              },
            },
          ]
        : []),
      // Reference line at 100 (parity)
      {
        name: 'Market Parity',
        type: 'line',
        data: new Array(data.dates.length).fill(100),
        lineStyle: {
          width: 1,
          color: '#2A2A2A',
          type: 'solid',
        },
        symbol: 'none',
        silent: true,
        tooltip: {
          show: false,
        },
      },
    ] as any,
  }

  // Handle hover sync
  const onEvents = {
    mouseover: (params: any) => {
      if (params.componentType === 'series' && params.seriesName !== 'Market Parity') {
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
      link.download = 'adr-index-chart.png'
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
        <div className="text-muted">Loading ADR index data...</div>
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
