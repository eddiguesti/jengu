import ReactECharts from 'echarts-for-react'

export default function HeatmapRevLead({
  leads,
  seasons,
  matrix,
}: {
  leads: string[]
  seasons: string[]
  matrix: number[][]
}) {
  const data = []
  for (let i = 0; i < seasons.length; i++) {
    for (let j = 0; j < leads.length; j++) {
      data.push([j, i, matrix[i][j] ?? 0])
    }
  }

  const maxValue = Math.max(...data.map(d => d[2] || 0)) || 1

  const option = {
    tooltip: { position: 'top' },
    grid: { left: 70, right: 20, top: 20, bottom: 50 },
    xAxis: { type: 'category', data: leads, splitArea: { show: true } },
    yAxis: { type: 'category', data: seasons, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: maxValue,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      calculable: true,
    },
    series: [
      {
        name: 'RevPAU',
        type: 'heatmap',
        data,
        emphasis: { itemStyle: { shadowBlur: 10 } },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height: 360 }} />
}
