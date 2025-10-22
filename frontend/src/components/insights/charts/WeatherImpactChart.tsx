import { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { WeatherImpact } from '@/types/analytics'
import { Card } from '@/components/ui/Card'
import { Download } from 'lucide-react'

interface WeatherImpactChartProps {
  data: WeatherImpact
  loading?: boolean
}

export function WeatherImpactChart({ data, loading }: WeatherImpactChartProps) {
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
      link.download = 'weather-impact.png'
      link.click()
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Weather Impact on Bookings</h3>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EBFF57] border-t-transparent"></div>
        </div>
      </Card>
    )
  }

  // Prepare scatter data
  const scatterData = data.temperature.map((temp, i) => [
    temp,
    data.occupancy[i],
    data.bookings[i] || 10, // Use bookings for bubble size
  ])

  // Calculate linear regression for trend line
  const n = data.temperature.length
  const sumX = data.temperature.reduce((a, b) => a + b, 0)
  const sumY = data.occupancy.reduce((a, b) => a + b, 0)
  const sumXY = data.temperature.reduce((sum, temp, i) => sum + temp * data.occupancy[i], 0)
  const sumX2 = data.temperature.reduce((sum, temp) => sum + temp * temp, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const minTemp = Math.min(...data.temperature)
  const maxTemp = Math.max(...data.temperature)
  const trendLine = [
    [minTemp, slope * minTemp + intercept],
    [maxTemp, slope * maxTemp + intercept],
  ]

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesName === 'Trend') {
          return `Trend Line<br/>Correlation: ${data.correlation.toFixed(2)}`
        }
        return `Temperature: ${params.data[0]}°C<br/>Occupancy: ${params.data[1].toFixed(1)}%<br/>Bookings: ${params.data[2]}`
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
      name: 'Temperature (°C)',
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
      name: 'Occupancy %',
      nameLocation: 'middle',
      nameGap: 50,
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
    series: [
      {
        name: 'Impact',
        type: 'scatter',
        symbolSize: (val: any) => Math.max(5, val[2] / 2), // Size based on bookings
        data: scatterData,
        itemStyle: {
          color: '#00D9FF',
          opacity: 0.7,
        },
      },
      {
        name: 'Trend',
        type: 'line',
        data: trendLine,
        lineStyle: {
          color: '#EBFF57',
          width: 2,
          type: 'dashed',
        },
        symbol: 'none',
      },
    ] as any,
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Weather Impact on Bookings</h3>
          <p className="text-sm text-gray-400">
            Temperature vs Occupancy (Correlation: {data.correlation.toFixed(2)})
          </p>
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
