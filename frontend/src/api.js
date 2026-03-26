import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' })

// Auto-attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

const sid = () => ({ store_id: localStorage.getItem('active_store') || '' })

export const getOrders  = (status) => api.get('/orders', { params: { ...sid(), ...(status ? { status } : {}) } })
export const getOrder   = (id)     => api.get(`/orders/${id}`, { params: sid() })
export const createOrder= (data)   => api.post('/orders', data, { params: sid() })
export const updateOrder= (id, d)  => api.patch(`/orders/${id}`, d, { params: sid() })
export const deleteOrder= (id, deleteFromShopify=false) => api.delete(`/orders/${id}`, { params: { ...sid(), delete_from_shopify: deleteFromShopify } })
export const getStats   = ()       => api.get('/stats', { params: sid() })
export const checkRisk  = (data)   => api.post('/orders/check-risk', data)
export const sendWA     = (order_id, stage_key) => api.post('/whatsapp/send', { order_id, stage_key }, { params: sid() })
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
export const getPNL    = ()       => api.get('/pnl', { params: sid() })
export const createPNL = (data)   => api.post('/pnl', data, { params: sid() })
export const deletePNL = (id)     => api.delete(`/pnl/${id}`, { params: sid() })

export const shopifySync   = ()     => api.post('/shopify/sync', {}, { params: sid() })
export const shopifyStatus = ()     => api.get('/shopify/status', { params: sid() })