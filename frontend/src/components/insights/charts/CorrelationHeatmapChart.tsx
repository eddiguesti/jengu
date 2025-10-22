import { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { CorrelationHeatmap } from '@/types/analytics'
import { Card } from '@/components/ui/Card'
import { Download } from 'lucide-react'

interface CorrelationHeatmapChartProps {
  data: CorrelationHeatmap
  loading?: boolean
}

export function CorrelationHeatmapChart({ data, loading }: CorrelationHeatmapChartProps) {
  const chartRef = useRef<ReactECharts>(null)

  const handleExport = () => {
    if (chartRef.current) {
      const echartInstance = chartRef.current.getEchartsInstance()
      const url = echartInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#0A0A0A',
      })
      const link = document.createElement('a')
      link.href = url
      link.download = 'correlation-heatmap.png'
      link.click()
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Feature Correlation Heatmap</h3>
        </div>
        <div className="flex h-[500px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EBFF57] border-t-transparent"></div>
        </div>
      </Card>
    )
  }

  // Prepare heatmap data
  const heatmapData = []
  for (let i = 0; i < data.features.length; i++) {
    for (let j = 0; j < data.features.length; j++) {
      heatmapData.push([j, i, data.matrix[i][j]])
    }
  }

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const xFeature = data.features[params.data[0]]
        const yFeature = data.features[params.data[1]]
        const correlation = params.data[2].toFixed(2)
        return `<div style="text-align: left;">
          <strong>${xFeature}</strong> × <strong>${yFeature}</strong><br/>
          Correlation: <strong>${correlation}</strong>
        </div>`
      },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#2A2A2A',
      textStyle: {
        color: '#E5E5E5',
      },
    },
    grid: {
      height: '70%',
      top: '10%',
      left: '15%',
    },
    xAxis: {
      type: 'category',
      data: data.features,
      splitArea: {
        show: true,
      },
      axisLabel: {
        color: '#999999',
        rotate: 45,
      },
    },
    yAxis: {
      type: 'category',
      data: data.features,
      splitArea: {
        show: true,
      },
      axisLabel: {
        color: '#999999',
      },
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'vertical',
      right: '5%',
      top: '15%',
      inRange: {
        color: ['#FF6B6B', '#FFFFFF', '#00D9FF'],
      },
      textStyle: {
        color: '#999999',
      },
    },
    series: [
      {
        name: 'Correlation',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          formatter: (params: any) => params.data[2].toFixed(2),
          color: '#E5E5E5',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ] as any,
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Feature Correlation Heatmap</h3>
          <p className="text-sm text-gray-400">Pearson correlation between key features</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: '500px' }}
        theme="director-dashboard"
        lazyUpdate={true}
        notMerge={true}
      />
    </Card>
  )
}
