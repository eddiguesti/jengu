import ReactECharts from 'echarts-for-react'

export default function ElasticityCurve({
  prices,
  mean,
  low,
  high,
  compMedian,
  chosen,
}: {
  prices: number[]
  mean: number[]
  low?: number[]
  high?: number[]
  compMedian?: number | null
  chosen?: number | null
}) {
  const marks = []
  if (compMedian != null) {
    marks.push({ xAxis: compMedian, label: { formatter: 'Comp' } })
  }
  if (chosen != null) {
    marks.push({ xAxis: chosen, label: { formatter: 'Chosen' } })
  }

  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value', name: 'Price', data: prices },
    yAxis: { type: 'value', name: 'Booking Probability', min: 0, max: 1 },
    series: [
      ...(high && low
        ? [
            {
              type: 'line',
              data: high.map((val, idx) => [prices[idx], val]),
              lineStyle: { width: 0 },
              stack: 'b',
              areaStyle: { opacity: 0.3 },
              symbol: 'none',
            },
            {
              type: 'line',
              data: low.map((val, idx) => [prices[idx], val]),
              lineStyle: { width: 0 },
              stack: 'b',
              areaStyle: { opacity: 0.3 },
              symbol: 'none',
            },
          ]
        : []),
      {
        type: 'line',
        data: mean.map((val, idx) => [prices[idx], val]),
        smooth: true,
        name: 'Booking Probability',
      },
    ],
    markLine: marks.length > 0 ? { data: marks } : undefined,
  }
  return <ReactECharts option={option} style={{ height: 300 }} />
}
