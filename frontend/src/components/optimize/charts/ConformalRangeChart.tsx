import { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { ConformalRange } from '@/types/analytics'
import { Card } from '@/components/ui/Card'
import { Download } from 'lucide-react'

interface ConformalRangeChartProps {
  data: ConformalRange
  loading?: boolean
}

export function ConformalRangeChart({ data, loading }: ConformalRangeChartProps) {
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
      link.download = 'conformal-range.png'
      link.click()
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Conformal Safe Price Range</h3>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EBFF57] border-t-transparent"></div>
        </div>
      </Card>
    )
  }

  // Find the global min and max for the gauge range
  const allValues = [
    ...data.intervals.flatMap(i => [i.lower, i.upper]),
    data.currentPrice,
    data.recommended.price,
  ]
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)

  // Calculate position of current price as percentage
  // const currentPricePercent =
  //   ((data.currentPrice - minValue) / (maxValue - minValue)) * 100

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: () => {
        return `<div style="text-align: left;">
          <strong>Current Price:</strong> $${data.currentPrice}<br/>
          <strong>Recommended:</strong> $${data.recommended.price}<br/>
          <strong>Safe Range (95%):</strong> $${data.recommended.lowerBound} - $${data.recommended.upperBound}
        </div>`
      },
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderColor: '#2A2A2A',
      textStyle: {
        color: '#E5E5E5',
      },
    },
    series: [
      {
        name: 'Safe Range',
        type: 'gauge',
        min: minValue,
        max: maxValue,
        splitNumber: 10,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.2, '#FF6B6B'], // Too low
              [0.4, '#4ECDC4'], // Conservative
              [0.6, '#EBFF57'], // Optimal
              [0.8, '#4ECDC4'], // Aggressive
              [1, '#FF6B6B'], // Too high
            ],
          },
        },
        pointer: {
          itemStyle: {
            color: '#E5E5E5',
          },
          length: '60%',
          width: 4,
        },
        axisTick: {
          distance: -30,
          length: 8,
          lineStyle: {
            color: '#fff',
            width: 2,
          },
        },
        splitLine: {
          distance: -30,
          length: 15,
          lineStyle: {
            color: '#fff',
            width: 2,
          },
        },
        axisLabel: {
          color: '#999999',
          distance: 40,
          fontSize: 12,
          formatter: (value: number) => `$${Math.round(value)}`,
        },
        detail: {
          valueAnimation: true,
          formatter: (value: number) => `Current\n$${Math.round(value)}`,
          color: '#E5E5E5',
          fontSize: 16,
          offsetCenter: [0, '70%'],
        },
        data: [
          {
            value: data.currentPrice,
          },
        ],
      },
    ] as any,
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Conformal Safe Price Range</h3>
          <p className="text-sm text-gray-400">
            95% confidence interval: ${data.recommended.lowerBound} - ${data.recommended.upperBound}
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

      {/* Confidence intervals table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-gray-300">Confidence</th>
              <th className="px-4 py-2 text-left text-gray-300">Lower Bound</th>
              <th className="px-4 py-2 text-left text-gray-300">Upper Bound</th>
              <th className="px-4 py-2 text-left text-gray-300">Range</th>
            </tr>
          </thead>
          <tbody>
            {data.intervals.map((interval, i) => (
              <tr key={i} className={i === 1 ? 'bg-gray-800/50' : 'bg-gray-900/20'}>
                <td className="px-4 py-2 text-gray-300">
                  {(interval.confidence * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 text-gray-300">${interval.lower}</td>
                <td className="px-4 py-2 text-gray-300">${interval.upper}</td>
                <td className="px-4 py-2 text-gray-300">${interval.upper - interval.lower}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
