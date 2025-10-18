import ReactECharts from 'echarts-for-react'

export type LineWithBandProps = {
  x: string[]
  y: number[]
  yLow?: number[]
  yHigh?: number[]
  name: string
  height?: number
}

export default function LineWithBand({ x, y, yLow, yHigh, name, height = 320 }: LineWithBandProps) {
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 36, right: 12, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: x, boundaryGap: false },
    yAxis: { type: 'value', scale: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider' }],
    series: [
      ...(yHigh && yLow
        ? [
            {
              type: 'line',
              name: `${name} band`,
              data: yHigh,
              lineStyle: { width: 0 },
              stack: 'band',
              areaStyle: { opacity: 0.3 },
              symbol: 'none',
            },
            {
              type: 'line',
              data: yLow,
              lineStyle: { width: 0 },
              stack: 'band',
              areaStyle: { opacity: 0.3 },
              symbol: 'none',
            },
          ]
        : []),
      { type: 'line', name, data: y, smooth: true, symbolSize: 3 },
    ],
  }
  return <ReactECharts option={option} style={{ height }} />
}
