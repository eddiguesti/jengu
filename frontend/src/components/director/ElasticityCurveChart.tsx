import { useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { ElasticityCurve } from '@/types/analytics'
import { Download, Info } from 'lucide-react'

interface ElasticityCurveChartProps {
  data: ElasticityCurve
  loading?: boolean
}

export function ElasticityCurveChart({ data, loading }: ElasticityCurveChartProps) {
  const chartRef = useRef<ReactECharts>(null)
  const [simulatedPrice, setSimulatedPrice] = useState<number | null>(data.chosenPrice ?? null)

  // Calculate expected RevPAU at simulated price
  const calculateExpectedRevPAU = (price: number) => {
    const priceIndex = data.priceGrid.findIndex(p => p >= price)
    if (priceIndex === -1) return 0

    const prob = data.probMean[priceIndex] ?? 0
    return price * prob
  }

  const expectedRevPAU = simulatedPrice ? calculateExpectedRevPAU(simulatedPrice) : 0

  const option: EChartsOption = {
    title: {
      text: 'Price Elasticity Curve',
      subtext: simulatedPrice
        ? `Simulated Price: $${simulatedPrice.toFixed(2)} → Expected RevPAU: $${expectedRevPAU.toFixed(2)}`
        : 'Booking Probability vs Price',
      left: 'left',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const priceIndex = params[0].dataIndex
        const price = data.priceGrid[priceIndex]
        const probMean = data.probMean[priceIndex]

        let result = `<strong>Price: $${price.toFixed(2)}</strong><br/>`
        result += `Booking Probability: ${(probMean * 100).toFixed(1)}%<br/>`

        if (data.probLow && data.probHigh) {
          const low = data.probLow[priceIndex]
          const high = data.probHigh[priceIndex]
          result += `Confidence: ${(low * 100).toFixed(1)}% - ${(high * 100).toFixed(1)}%<br/>`
        }

        const revPAU = price * probMean
        result += `<br/>Expected RevPAU: $${revPAU.toFixed(2)}`

        return result
      },
    },
    legend: {
      data: [
        'Booking Probability',
        'Confidence Band',
        'Market Median',
        'Chosen Price',
        'Simulated',
      ],
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
          name: 'elasticity-curve-chart',
          title: 'Download',
        },
      },
      right: 20,
      top: 40,
    },
    xAxis: {
      type: 'value',
      name: 'Price ($)',
      axisLabel: {
        formatter: (value: number) => `$${value.toFixed(0)}`,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Booking Probability',
      min: 0,
      max: 1,
      axisLabel: {
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
    },
    series: [
      {
        name: 'Booking Probability',
        type: 'line',
        data: data.priceGrid.map((price, i) => [price, data.probMean[i]]),
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
      // Confidence band (if available)
      ...(data.probLow && data.probHigh
        ? [
            {
              name: 'Confidence Band',
              type: 'line',
              data: data.priceGrid.map((price, i) => [price, data.probHigh?.[i] ?? 0]),
              lineStyle: {
                width: 0,
              },
              areaStyle: {
                color: 'rgba(235, 255, 87, 0.15)',
              },
              stack: 'confidence',
              symbol: 'none',
              smooth: true,
            },
            {
              name: 'Confidence Band Lower',
              type: 'line',
              data: data.priceGrid.map((price, i) => [price, data.probLow?.[i] ?? 0]),
              lineStyle: {
                width: 0,
              },
              stack: 'confidence',
              symbol: 'none',
              smooth: true,
              tooltip: {
                show: false,
              },
            },
          ]
        : []),
      // Market median marker
      ...(data.compMedian
        ? [
            {
              name: 'Market Median',
              type: 'scatter',
              data: [[data.compMedian, 0.5]],
              symbolSize: 15,
              itemStyle: {
                color: '#00D9FF',
                borderColor: '#00D9FF',
                borderWidth: 2,
              },
              label: {
                show: true,
                formatter: 'Market',
                position: 'top',
                color: '#00D9FF',
                fontSize: 11,
              },
              z: 10,
            },
          ]
        : []),
      // Chosen price marker
      ...(data.chosenPrice && !simulatedPrice
        ? [
            {
              name: 'Chosen Price',
              type: 'scatter',
              data: [
                [
                  data.chosenPrice,
                  data.probMean[data.priceGrid.findIndex(p => p >= data.chosenPrice!)] ?? 0.5,
                ] as any,
              ] as any,
              symbolSize: 15,
              itemStyle: {
                color: '#4ECDC4',
                borderColor: '#4ECDC4',
                borderWidth: 2,
              },
              label: {
                show: true,
                formatter: 'Chosen',
                position: 'bottom',
                color: '#4ECDC4',
                fontSize: 11,
              },
              z: 10,
            },
          ]
        : []),
      // Simulated price marker (draggable)
      ...(simulatedPrice
        ? [
            {
              name: 'Simulated',
              type: 'scatter',
              data: [
                [
                  simulatedPrice,
                  data.probMean[data.priceGrid.findIndex(p => p >= simulatedPrice)] ?? 0.5,
                ] as any,
              ] as any,
              symbolSize: 18,
              itemStyle: {
                color: '#FF6B6B',
                borderColor: '#FF6B6B',
                borderWidth: 3,
              },
              label: {
                show: true,
                formatter: `$${simulatedPrice.toFixed(0)}`,
                position: 'top',
                color: '#FF6B6B',
                fontSize: 12,
                fontWeight: 'bold',
              },
              z: 10,
            },
          ]
        : []),
    ] as any,
  }

  // Handle chart click for price simulation
  const onEvents = {
    click: (params: any) => {
      if (params.componentType === 'series') {
        const clickedPrice = params.value[0]
        setSimulatedPrice(clickedPrice)
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
      link.download = 'elasticity-curve-chart.png'
      link.click()
    }
  }

  // Reset simulation
  const handleReset = () => {
    setSimulatedPrice(data.chosenPrice ?? null)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
        <div className="text-muted">Loading elasticity data...</div>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Click anywhere on the curve to simulate a different price point</span>
      </div>
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        {simulatedPrice && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
          >
            Reset
          </button>
        )}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
          title="Export as PNG"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>
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
