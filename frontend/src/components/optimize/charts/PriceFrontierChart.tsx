import { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { PriceFrontier } from '@/types/analytics'
import { Card } from '@/components/ui/Card'
import { Download } from 'lucide-react'

interface PriceFrontierChartProps {
  data: PriceFrontier[]
  loading?: boolean
}

export function PriceFrontierChart({ data, loading }: PriceFrontierChartProps) {
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
      link.download = 'price-frontier.png'
      link.click()
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Price-Revenue/Occupancy Frontier</h3>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EBFF57] border-t-transparent"></div>
        </div>
      </Card>
    )
  }

  // Prepare scatter data [occupancy, revenue, price]
  const scatterData = data.map(d => [d.occupancy * 100, d.revenue, d.price])

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const [occ, rev, price] = params.data
        return `Price: $${price}<br/>Occupancy: ${occ.toFixed(1)}%<br/>Revenue: $${rev}`
      },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#2A2A2A',
      textStyle: {
        color: '#E5E5E5',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Occupancy %',
      nameLocation: 'middle',
      nameGap: 30,
      axisLine: {
        lineStyle: {
          color: '#2A2A2A',
        },
      },
      axisLabel: {
        color: '#999999',
      },
      splitLine: {
        lineStyle: {
          color: '#2A2A2A',
          type: 'dashed',
        },
      },
    },
    yAxis: {
      type: 'value',
      name: 'Revenue',
      nameLocation: 'middle',
      nameGap: 50,
      axisLine: {
        lineStyle: {
          color: '#2A2A2A',
        },
      },
      axisLabel: {
        color: '#999999',
        formatter: '${value}',
      },
      splitLine: {
        lineStyle: {
          color: '#2A2A2A',
          type: 'dashed',
        },
      },
    },
    visualMap: {
      show: false,
      dimension: 2, // Color by price
      min: Math.min(...data.map(d => d.price)),
      max: Math.max(...data.map(d => d.price)),
      inRange: {
        color: ['#4ECDC4', '#EBFF57', '#FF6B6B'],
      },
    },
    series: [
      {
        name: 'Frontier',
        type: 'scatter',
        symbolSize: 12,
        data: scatterData,
        itemStyle: {
          opacity: 0.8,
        },
        emphasis: {
          scale: 1.5,
        },
      },
    ] as any,
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Price-Revenue/Occupancy Frontier</h3>
          <p className="text-sm text-gray-400">Pareto frontier showing optimal trade-offs</p>
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
        style={{ height: '400px' }}
        theme="director-dashboard"
        lazyUpdate={true}
        notMerge={true}
      />
    </Card>
  )
}
