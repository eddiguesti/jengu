import apiClient from '@/lib/api/client'

export async function getRevenueSeries(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/revenue-series', {
    propertyId,
    ...params,
  })
  return data // { dates, actual, optimized }
}

export async function getOccupancyPace(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/occupancy-pace', {
    propertyId,
    ...params,
  })
  return data // { lead, actual, target, model }
}

export async function getAdrIndex(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/adr-index', { propertyId, ...params })
  return data // { dates, propertyIndex, marketIndex }
}

export async function getHeatmapRevLead(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/rev-lead-heatmap', {
    propertyId,
    ...params,
  })
  return data // { leadBuckets, seasons, matrix }
}

export async function getForecastVsActual(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/forecast-actual', {
    propertyId,
    ...params,
  })
  return data // { dates, forecast, actual, mape, crps }
}

export async function getElasticityCurve(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/elasticity', { propertyId, ...params })
  return data // { priceGrid, probMean, probLow, probHigh, compMedian, chosenPrice }
}

export async function getPriceExplainWaterfall(propertyId: string, params: any) {
  const { data } = await apiClient.post('/analytics/price-explain', {
    propertyId,
    ...params,
  })
  return data // { steps: [{name, value}], final }
}
