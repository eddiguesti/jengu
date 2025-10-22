import { useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { ForecastActual } from '@/types/analytics'
import { Download, AlertCircle } from 'lucide-react'

interface ForecastActualChartProps {
  data: ForecastActual
  loading?: boolean
}

export function ForecastActualChart({ data, loading }: ForecastActualChartProps) {
  const chartRef = useRef<ReactECharts>(null)
  const { hoveredDate, setHoveredDate } = useDashboardStore()

  // Calculate error metrics
  const mapeFormatted = data.mape ? data.mape.toFixed(1) : 'N/A'
  const crpsFormatted = data.crps ? data.crps.toFixed(3) : 'N/A'

  // Identify outliers (errors > 2 std deviations)
  const errors = data.forecast.map((f, i) => Math.abs(f - data.actual[i]))
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length
  const stdError = Math.sqrt(
    errors.reduce((sum, e) => sum + Math.pow(e - meanError, 2), 0) / errors.length
  )
  const outlierThreshold = meanError + 2 * stdError

  const outlierIndices = errors
    .map((e, i) => (e > outlierThreshold ? i : -1))
    .filter((i) => i !== -1)

  const option: EChartsOption = {
    title: {
      text: 'Forecast vs Actual Bookings',
      subtext: `MAPE: ${mapeFormatted}% | CRPS: ${crpsFormatted}`,
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
        const dataIndex = params[0].dataIndex

        let result = `<strong>${date}</strong><br/>`

        params.forEach((param: any) => {
          if (param.seriesName === 'Outliers') return // Skip outlier series in tooltip
          const value = param.value
          const color = param.color
          result += `<span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;margin-right:5px;"></span>`
          result += `${param.seriesName}: ${Number(value).toFixed(0)}<br/>`
        })

        // Calculate error
        const forecast = data.forecast[dataIndex]
        const actual = data.actual[dataIndex]
        const error = Math.abs(forecast - actual)
        const errorPct = actual > 0 ? ((error / actual) * 100).toFixed(1) : 'N/A'

        result += `<br/><span style="color:#999;">Error: ${error.toFixed(0)} (${errorPct}%)</span>`

        // Flag if outlier
        if (outlierIndices.includes(dataIndex)) {
          result += `<br/><span style="color:#FF6B6B;">⚠ Outlier detected</span>`
        }

        return result
      },
    },
    legend: {
      data: ['Forecast', 'Actual', 'Outliers'],
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
          name: 'forecast-actual-chart',
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
      name: 'Bookings',
      axisLabel: {
        formatter: (value: number) => value.toFixed(0),
      },
    },
    series: [
      {
        name: 'Forecast',
        type: 'line',
        data: data.forecast,
        smooth: true,
        lineStyle: {
          width: 2,
          color: '#EBFF57',
          type: 'dashed',
        },
        itemStyle: {
          color: '#EBFF57',
        },
        symbol: 'circle',
        symbolSize: 4,
        emphasis: {
          focus: 'series',
        },
      },
      {
        name: 'Actual',
        type: 'line',
        data: data.actual,
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#00D9FF',
        },
        itemStyle: {
          color: '#00D9FF',
        },
        emphasis: {
          focus: 'series',
        },
      },
      {
        name: 'Outliers',
        type: 'scatter',
        data: outlierIndices.map((i) => [data.dates[i], data.actual[i]]),
        symbolSize: 12,
        itemStyle: {
          color: '#FF6B6B',
          borderColor: '#FF6B6B',
          borderWidth: 2,
        },
        z: 10,
      },
    ] as any,
  }

  // Handle hover sync
  const onEvents = {
    mouseover: (params: any) => {
      if (params.componentType === 'series' && params.seriesName !== 'Outliers') {
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
      link.download = 'forecast-actual-chart.png'
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
        <div className="text-muted">Loading forecast data...</div>
      </div>
    )
  }

  // Show accuracy alert if MAPE is high
  const showAccuracyAlert = data.mape && data.mape > 20

  return (
    <div className="relative rounded-lg border border-border bg-card p-4">
      {showAccuracyAlert && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
          <AlertCircle className="h-4 w-4" />
          <span>High forecast error detected. Model may need recalibration.</span>
        </div>
      )}
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
