import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getOrders  = (status) => api.get('/orders', { params: status ? { status } : {} })
export const getOrder   = (id)     => api.get(`/orders/${id}`)
export const createOrder= (data)   => api.post('/orders', data)
export const updateOrder= (id, d)  => api.patch(`/orders/${id}`, d)
export const deleteOrder= (id, deleteFromShopify=false) => api.delete(`/orders/${id}`, { params: { delete_from_shopify: deleteFromShopify } })
export const getStats   = ()       => api.get('/stats')
export const checkRisk  = (data)   => api.post('/orders/check-risk', data)
export const sendWA     = (order_id, stage_key) => api.post('/whatsapp/send', { order_id, stage_key })
export const getStages        = ()     => api.get('/reminders/stages')
export const getNotifications = ()     => api.get('/notifications')
export const exportCSV        = ()     => `/api/export/csv`
export const exportJSON       = ()     => `/api/export/json`
export const importFile       = (file) => {
  const form = new FormData()
  form.append('file', file)
  const isCSV = file.name.endsWith('.csv')
  return api.post(isCSV ? '/import/csv' : '/import/json', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export default api

// P&L
export const getPNL    = ()       => api.get('/pnl')
export const createPNL = (data)   => api.post('/pnl', data)
export const deletePNL = (id)     => api.delete(`/pnl/${id}`)

export const shopifySync   = ()     => api.post('/shopify/sync')
export const shopifyStatus = ()     => api.get('/shopify/status')