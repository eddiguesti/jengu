import { useEffect, useRef } from 'react'
import { Waterfall } from '@antv/g2plot'
import type { PriceExplain } from '@/types/analytics'
import { Download, X } from 'lucide-react'
import { useDashboardStore } from '@/stores/useDashboardStore'

interface PriceWaterfallChartProps {
  data: PriceExplain
  loading?: boolean
}

export function PriceWaterfallChart({ data, loading }: PriceWaterfallChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const waterfallRef = useRef<Waterfall | null>(null)
  const { selectedDate, setSelectedDate } = useDashboardStore()

  useEffect(() => {
    if (!chartRef.current || loading) return

    // Transform data for waterfall
    const waterfallData = data.steps.map((step) => ({
      type: step.name,
      value: step.value,
    }))

    // Add final price as total
    waterfallData.push({
      type: 'Final Price',
      value: data.final,
    })

    // Create waterfall chart
    const waterfall = new Waterfall(chartRef.current, {
      data: waterfallData,
      xField: 'type',
      yField: 'value',
      theme: 'dark',
      appendPadding: [15, 0, 0, 0],
      meta: {
        type: {
          alias: 'Price Component',
        },
        value: {
          alias: 'Price ($)',
          formatter: (v: number) => `$${v.toFixed(2)}`,
        },
      },
      label: {
        style: {
          fill: '#E5E5E5',
          fontSize: 11,
        },
        formatter: (datum: any) => {
          return `$${datum.value.toFixed(2)}`
        },
      },
      color: ({ type }: any) => {
        if (type === 'Final Price') return '#EBFF57'
        return '#00D9FF'
      },
      risingFill: '#4ECDC4',
      fallingFill: '#FF6B6B',
      total: {
        label: 'Final Price',
        style: {
          fill: '#EBFF57',
        },
      },
      legend: false,
      tooltip: {
        customContent: (_title: string, items: any[]) => {
          if (!items || items.length === 0) return ''
          const item = items[0]
          const value = item.data.value
          const name = item.data.type

          return `
            <div style="padding: 8px 12px; background: #1A1A1A; border: 1px solid #2A2A2A; border-radius: 4px;">
              <div style="font-weight: 600; color: #E5E5E5; margin-bottom: 4px;">${name}</div>
              <div style="color: #EBFF57; font-size: 14px;">$${value.toFixed(2)}</div>
            </div>
          `
        },
      },
      yAxis: {
        label: {
          formatter: (v: string) => {
            const num = parseFloat(v)
            return `$${num.toFixed(0)}`
          },
          style: {
            fill: '#999999',
          },
        },
        grid: {
          line: {
            style: {
              stroke: '#1A1A1A',
              lineDash: [4, 4],
            },
          },
        },
      },
      xAxis: {
        label: {
          autoRotate: true,
          autoHide: false,
          style: {
            fill: '#999999',
            fontSize: 11,
          },
        },
        line: {
          style: {
            stroke: '#2A2A2A',
          },
        },
      },
    })

    waterfall.render()
    waterfallRef.current = waterfall

    return () => {
      waterfall.destroy()
    }
  }, [data, loading])

  // Export chart as PNG
  const handleExport = () => {
    if (waterfallRef.current) {
      // Use the chart's internal canvas export
      const canvas = chartRef.current?.querySelector('canvas')
      if (canvas) {
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = url
        link.download = 'price-waterfall.png'
        link.click()
      }
    }
  }

  // Close waterfall (clear selected date)
  const handleClose = () => {
    setSelectedDate(null)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-lg border border-border bg-card">
        <div className="text-muted">Loading price breakdown...</div>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Price Decision Breakdown</h3>
          {selectedDate && (
            <p className="text-xs text-muted">
              For {new Date(selectedDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
            title="Export as PNG"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          {selectedDate && (
            <button
              onClick={handleClose}
              className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted transition-colors hover:border-red-500 hover:text-red-500"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div ref={chartRef} style={{ height: '360px', width: '100%' }} />
    </div>
  )
}
