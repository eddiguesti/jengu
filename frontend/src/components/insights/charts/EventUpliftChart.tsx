import { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { EventUplift } from '@/types/analytics'
import { Card } from '@/components/ui/Card'
import { Download } from 'lucide-react'

interface EventUpliftChartProps {
  data: EventUplift[]
  loading?: boolean
}

export function EventUpliftChart({ data, loading }: EventUpliftChartProps) {
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
      link.download = 'event-uplift.png'
      link.click()
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Event/Holiday Uplift</h3>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EBFF57] border-t-transparent"></div>
        </div>
      </Card>
    )
  }

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#2A2A2A',
      textStyle: {
        color: '#E5E5E5',
      },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: {
        color: '#999999',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.type),
      axisLine: {
        lineStyle: {
          color: '#2A2A2A',
        },
      },
      axisLabel: {
        color: '#999999',
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Occupancy %',
        position: 'left',
        axisLine: {
          lineStyle: {
            color: '#2A2A2A',
          },
        },
        axisLabel: {
          color: '#999999',
          formatter: '{value}%',
        },
        splitLine: {
          lineStyle: {
            color: '#2A2A2A',
            type: 'dashed',
          },
        },
      },
      {
        type: 'value',
        name: 'Price',
        position: 'right',
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
          show: false,
        },
      },
    ],
    series: [
      {
        name: 'Occupancy Uplift',
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d) => d.occupancyUplift),
        itemStyle: {
          color: '#00D9FF',
        },
      },
      {
        name: 'Price Uplift',
        type: 'bar',
        yAxisIndex: 1,
        data: data.map((d) => d.priceUplift),
        itemStyle: {
          color: '#EBFF57',
        },
      },
    ] as any,
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Event/Holiday Uplift</h3>
          <p className="text-sm text-gray-400">Occupancy and price patterns by event type</p>
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
