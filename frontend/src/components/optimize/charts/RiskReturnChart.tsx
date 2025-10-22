import { useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { RiskReturn } from '@/types/analytics'
import { Card } from '@/components/ui/Card'
import { Download } from 'lucide-react'

interface RiskReturnChartProps {
  data: RiskReturn[]
  loading?: boolean
}

export function RiskReturnChart({ data, loading }: RiskReturnChartProps) {
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
      link.download = 'risk-return.png'
      link.click()
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Risk-Return Analysis</h3>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#EBFF57] border-t-transparent"></div>
        </div>
      </Card>
    )
  }

  // Prepare scatter data [risk, return, count]
  const scatterData = data.map((d) => ({
    value: [d.risk, d.expectedReturn],
    name: d.strategy,
    symbolSize: Math.max(20, Math.min(60, d.count)), // Size by count
  }))

  // Color mapping
  const colorMap: Record<string, string> = {
    Conservative: '#4ECDC4',
    Balanced: '#EBFF57',
    Aggressive: '#FF6B6B',
  }

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const strategy = data.find((d) => d.strategy === params.name)
        if (!strategy) return ''
        return `<div style="text-align: left;">
          <strong>${strategy.strategy}</strong><br/>
          Risk (Std Dev): ${strategy.risk.toFixed(2)}<br/>
          Expected Return: $${strategy.expectedReturn.toFixed(2)}<br/>
          Samples: ${strategy.count}
        </div>`
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
      name: 'Risk (Std Deviation)',
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
      name: 'Expected Return',
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
    series: [
      {
        type: 'scatter',
        data: scatterData,
        itemStyle: {
          color: (params: any) => colorMap[params.name] || '#00D9FF',
          opacity: 0.8,
        },
        label: {
          show: true,
          formatter: (params: any) => params.name,
          position: 'top',
          color: '#E5E5E5',
          fontSize: 12,
        },
        emphasis: {
          scale: 1.3,
        },
      },
    ] as any,
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Risk-Return Analysis</h3>
          <p className="text-sm text-gray-400">
            Risk vs expected return by pricing strategy
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
