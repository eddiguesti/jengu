import { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { RevLeadHeatmap } from '@/types/analytics'
import { Download } from 'lucide-react'

interface RevLeadHeatmapProps {
  data: RevLeadHeatmap
  loading?: boolean
}

export function RevLeadHeatmapChart({ data, loading }: RevLeadHeatmapProps) {
  const chartRef = useRef<ReactECharts>(null)
  const { setFilters } = useDashboardStore()

  // Transform matrix to ECharts format: [leadIndex, seasonIndex, value]
  const heatmapData: [number, number, number][] = []
  let maxValue = 0

  data.matrix.forEach((seasonRow, seasonIndex) => {
    seasonRow.forEach((value, leadIndex) => {
      heatmapData.push([leadIndex, seasonIndex, value])
      if (value > maxValue) maxValue = value
    })
  })

  const option: EChartsOption = {
    title: {
      text: 'Revenue Heatmap',
      subtext: 'By Lead Window × Season',
      left: 'left',
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const leadIndex = params.value[0]
        const seasonIndex = params.value[1]
        const revenue = params.value[2]

        const lead = data.leadBuckets[leadIndex]
        const season = data.seasons[seasonIndex]

        return `
          <strong>${season}</strong><br/>
          Lead: ${lead} days<br/>
          Revenue: $${Number(revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        `
      },
    },
    grid: {
      left: '12%',
      right: '10%',
      bottom: '15%',
      top: 80,
      containLabel: false,
    },
    toolbox: {
      feature: {
        saveAsImage: {
          name: 'revenue-heatmap',
          title: 'Download',
        },
      },
      right: 20,
      top: 40,
    },
    xAxis: {
      type: 'category',
      data: data.leadBuckets,
      name: 'Lead Bucket (Days)',
      nameLocation: 'middle',
      nameGap: 30,
      splitArea: {
        show: true,
      },
      axisLabel: {
        formatter: (value: string) => `${value}d`,
      },
    },
    yAxis: {
      type: 'category',
      data: data.seasons,
      name: 'Season',
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#1A1A1A', '#00D9FF', '#EBFF57', '#FFE66D'],
      },
      text: ['High Revenue', 'Low Revenue'],
      textStyle: {
        color: '#E5E5E5',
      },
    },
    series: [
      {
        name: 'Revenue',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(235, 255, 87, 0.5)',
            borderColor: '#EBFF57',
            borderWidth: 2,
          },
        },
      },
    ] as any,
  }

  // Handle cell click for filtering
  const onEvents = {
    click: (params: any) => {
      if (params.componentType === 'series') {
        const leadIndex = params.value[0]
        const seasonIndex = params.value[1]

        const leadBucket = data.leadBuckets[leadIndex]
        const season = data.seasons[seasonIndex]

        // Filter other charts to this segment
        setFilters({
          leadBucket,
          // Note: Season filtering would need to be implemented in backend
          // For now, just setting lead bucket
        })

        console.log(`Filtered to: Lead ${leadBucket}, Season ${season}`)
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
      link.download = 'revenue-heatmap.png'
      link.click()
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
        <div className="text-muted">Loading heatmap data...</div>
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
