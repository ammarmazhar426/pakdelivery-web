import { useState } from 'react'
import { X, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { sendWA } from '../api'

const STAGES = [
  { key:'confirmed',  label:'✅ Order Confirmed' },
  { key:'dispatched', label:'🚚 Dispatched' },
  { key:'day_of',     label:'📦 Out for Delivery' },
  { key:'delivered',  label:'🎉 Delivered' },
  { key:'rto',        label:'🔴 RTO / Return' },
]

const RISK_COLOR = { LOW:'#00C566', MEDIUM:'#F59E0B', HIGH:'#F43F5E', CRITICAL:'#F43F5E' }

export default function OrderDetail({ order, onClose }) {
  const [sending, setSending] = useState({})
  const [sent,    setSent]    = useState({})
  const risk = order._risk || {}

  const handleSend = async (stageKey) => {
    setSending(s => ({ ...s, [stageKey]: true }))
    try {
      const res = await sendWA(order.order_id, stageKey)
      if (res.data.sent) {
        toast.success('WhatsApp bhej diya! ✅')
        setSent(s => ({ ...s, [stageKey]: true }))
      } else {
        toast.error('Send nahi hua — internet check karein')
      }
    } catch { toast.error('Error aa gaya') }
    finally { setSending(s => ({ ...s, [stageKey]: false })) }
  }

  const alreadySent = (key) => order.reminders_sent?.includes(key) || sent[key]

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, backdropFilter:'blur(4px)',
    }}>
      <div style={{
        background:'var(--bg-card)', borderRadius:20,
        border:'1px solid var(--glass2)', width:500,
        maxHeight:'90vh', overflow:'auto', padding:24,
      }} className="fade-in modal-box">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-white)' }}>
            📋 {order.order_id?.toUpperCase()}
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-mid)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Order info */}
        <div style={{
          background:'var(--glass)', borderRadius:12, padding:16,
          border:'1px solid var(--glass2)', marginBottom:16,
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:10,
        }}>
          {[
            ['Customer', order.name],
            ['Phone',    order.phone],
            ['City',     order.city],
            ['Product',  order.product],
            ['Amount',   `Rs.${Number(order.amount||0).toLocaleString()}`],
            ['Courier',  order.courier||'—'],
            ['Status',   order.status],
            ['Date',     (order.created_at||'').slice(0,10)],
            ['Time',     (order.created_at||'').slice(11,16) || '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <span style={{ fontSize:10, color:'var(--text-dim)', fontWeight:600 }}>{label}</span>
              <p style={{ fontSize:13, color:'var(--text-white)', fontWeight:500, marginTop:2 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Risk */}
        <div style={{
          background:'var(--glass)', borderRadius:12, padding:'10px 14px',
          border:`1px solid ${RISK_COLOR[risk.level]||'var(--glass2)'}`,
          marginBottom:16,
        }}>
          <p style={{ color:RISK_COLOR[risk.level], fontWeight:700, fontSize:13 }}>
            Risk: {risk.level} — {risk.rec}
          </p>
          {risk.issues?.length > 0 && (
            <p style={{ color:'var(--text-mid)', fontSize:11, marginTop:4 }}>
              {risk.issues.join(' • ')}
            </p>
          )}
        </div>

        {/* WhatsApp Reminders */}
        <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-mid)', marginBottom:10 }}>
          📲 WhatsApp Reminders
        </h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {STAGES.map(({ key, label }) => (
            <div key={key} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'var(--glass)', borderRadius:10, padding:'10px 14px',
              border:'1px solid var(--glass2)',
            }}>
              <span style={{ fontSize:13, color:'var(--text-white)', fontWeight:500 }}>{label}</span>
              {alreadySent(key) ? (
                <span style={{ fontSize:11, color:'#00C566', fontWeight:700 }}>✅ Bheja ja chuka</span>
              ) : (
                <button
                  onClick={() => handleSend(key)}
                  disabled={sending[key]}
                  style={{
                    background:'#00C566', border:'none', borderRadius:8,
                    color:'white', fontSize:11, fontWeight:700,
                    padding:'6px 12px', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5,
                    opacity: sending[key] ? 0.6 : 1,
                  }}>
                  <Send size={12} />
                  {sending[key] ? 'Sending...' : 'Bhejo'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}