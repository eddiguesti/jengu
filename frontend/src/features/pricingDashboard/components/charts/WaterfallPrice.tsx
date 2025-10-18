import { Waterfall } from '@ant-design/plots'

export default function WaterfallPrice({ steps }: { steps: { name: string; value: number }[] }) {
  const total = steps.reduce((a, b) => a + b.value, 0)
  const config: any = {
    data: steps,
    xField: 'name',
    yField: 'value',
    total: { label: 'Final', value: total },
    interactions: [{ type: 'element-active' }],
    label: { position: 'middle' as const },
    tooltip: { shared: true },
  }
  return <Waterfall {...config} />
}
