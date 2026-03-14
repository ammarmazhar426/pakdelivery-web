import { useState, useEffect } from 'react'
import { Send, ArrowLeft, MessageCircle, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrders, sendWA } from '../api'

const STAGES = [
  { key:'confirmed',  label:'Order Confirmed',    emoji:'✅', desc:'Order confirm hone pe' },
  { key:'dispatched', label:'Dispatched',          emoji:'🚚', desc:'Courier ko dene ke baad' },
  { key:'day_of',     label:'Out for Delivery',    emoji:'📦', desc:'Delivery wale din' },
  { key:'delivered',  label:'Delivered',           emoji:'🎉', desc:'Delivery ke baad' },
  { key:'rto',        label:'RTO / Return',        emoji:'🔴', desc:'Return hone pe' },
]

const STATUS_COLOR = {
  pending:'#F59E0B', confirmed:'#60A5FA', dispatched:'#A78BFA',
  out_for_delivery:'#FB923C', delivered:'#00C566',
  cancelled:'#3D5068', rto:'#F43F5E',
}

export default function Reminders() {
  const [orders,   setOrders]   = useState([])
  const [selected, setSelected] = useState(null)
  const [sending,  setSending]  = useState({})
  const [sent,     setSent]     = useState({})
  const [searchQ,  setSearchQ]  = useState('')
  const [allOrders,setAllOrders] = useState([])

  useEffect(() => {
    getOrders().then(r => {
      setOrders(r.data.orders)
      setAllOrders(r.data.orders)
      // desktop pe auto select, mobile pe nahi
      if (window.innerWidth > 768 && r.data.orders.length > 0)
        setSelected(r.data.orders[0])
    }).catch(() => {})
  }, [])

  const handleSend = async (stageKey) => {
    if (!selected) return
    setSending(s => ({ ...s, [stageKey]: true }))
    try {
      const res = await sendWA(selected.order_id, stageKey)
      if (res.data.sent) {
        toast.success('WhatsApp bhej diya! ✅')
        setSent(s => ({ ...s, [`${selected.order_id}-${stageKey}`]: true }))
        setSelected(o => ({ ...o, reminders_sent: [...(o.reminders_sent||[]), stageKey] }))
      } else {
        const errMsg = res.data.error || 'Send nahi hua'
        toast.error(`❌ ${errMsg}`, { duration: 6000 })
      }
    } catch { toast.error('Error') }
    finally { setSending(s => ({ ...s, [stageKey]: false })) }
  }

  const filteredOrders = searchQ
    ? allOrders.filter(o =>
        (o.order_id||'').toLowerCase().includes(searchQ.toLowerCase()) ||
        (o.name||'').toLowerCase().includes(searchQ.toLowerCase()) ||
        (o.phone||'').includes(searchQ) ||
        (o.city||'').toLowerCase().includes(searchQ.toLowerCase())
      )
    : orders

  const isSent = (key) =>
    selected?.reminders_sent?.includes(key) || sent[`${selected?.order_id}-${key}`]

  return (
    <>
      {/* ════ DESKTOP ════ */}
      <div className="rem-desktop">
        {/* Left — chat list */}
        <div style={{
          width:300, borderRight:'1px solid var(--glass2)',
          display:'flex', flexDirection:'column', height:'calc(100vh - 56px)',
        }}>
          {/* Header */}
          <div style={{ padding:'12px 12px 8px', borderBottom:'1px solid var(--glass2)', background:'var(--glass)' }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-white)', display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <MessageCircle size={16} color="#00C566"/> Reminders
            </h2>
            {/* Search */}
            <div style={{ display:'flex', alignItems:'center', gap:7, background:'var(--glass2)', borderRadius:10, padding:'7px 10px', border: searchQ ? '1px solid #00C566' : '1px solid transparent' }}>
              <Search size={13} color={searchQ ? '#00C566' : 'var(--text-dim)'}/>
              <input type="text" placeholder="Naam, phone, order ID..."
                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text-white)', fontSize:12 }}/>
              {searchQ && <button onClick={() => setSearchQ('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', lineHeight:1 }}><X size={12}/></button>}
            </div>
          </div>
          {/* List */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {filteredOrders.map(order => <ChatItem key={order.order_id} order={order} selected={selected} onSelect={setSelected}/>)}
          </div>
        </div>

        {/* Right — detail */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', height:'calc(100vh - 56px)' }}>
          {selected
            ? <DetailPanel selected={selected} isSent={isSent} sending={sending} onSend={handleSend}/>
            : <EmptyDetail/>
          }
        </div>
      </div>

      {/* ════ MOBILE ════ */}
      <div className="rem-mobile">
        {!selected ? (
          /* Chat list full screen */
          <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 56px - 56px)' }}>
            <div style={{ padding:'12px 12px 8px', borderBottom:'1px solid var(--glass2)', background:'var(--glass)' }}>
              <h2 style={{ fontSize:15, fontWeight:700, color:'var(--text-white)', display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <MessageCircle size={16} color="#00C566"/> Reminders
              </h2>
              {/* Search */}
              <div style={{ display:'flex', alignItems:'center', gap:7, background:'var(--glass2)', borderRadius:10, padding:'7px 10px', border: searchQ ? '1px solid #00C566' : '1px solid transparent' }}>
                <Search size={13} color={searchQ ? '#00C566' : 'var(--text-dim)'}/>
                <input type="text" placeholder="Naam, phone, order ID..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text-white)', fontSize:12 }}/>
                {searchQ && <button onClick={() => setSearchQ('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', lineHeight:1 }}><X size={12}/></button>}
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {filteredOrders.map(order => <ChatItem key={order.order_id} order={order} selected={selected} onSelect={setSelected}/>)}
            </div>
          </div>
        ) : (
          /* Detail full screen */
          <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 56px - 56px)' }}>
            {/* Mobile top bar with back */}
            <div style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 14px', borderBottom:'1px solid var(--glass2)',
              background:'var(--glass)', flexShrink:0,
            }}>
              <button onClick={() => setSelected(null)} style={{
                background:'none', border:'none', cursor:'pointer',
                color:'#00C566', display:'flex', alignItems:'center',
              }}>
                <ArrowLeft size={22}/>
              </button>
              {/* Mini order info */}
              <div style={{
                width:38, height:38, borderRadius:'50%', background:'#00C56622',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:16, flexShrink:0,
              }}>👤</div>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text-white)' }}>{selected.name}</p>
                <p style={{ fontSize:11, color:STATUS_COLOR[selected.status]||'#8D9DB8', fontWeight:600 }}>{selected.status}</p>
              </div>
              <span style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:'#00C566' }}>
                Rs.{Number(selected.amount||0).toLocaleString()}
              </span>
            </div>
            {/* Detail content */}
            <div style={{ flex:1, overflowY:'auto' }}>
              <DetailPanel selected={selected} isSent={isSent} sending={sending} onSend={handleSend} mobile/>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Chat List Item ── */
function ChatItem({ order, selected, onSelect }) {
  const sc      = STATUS_COLOR[order.status] || '#8D9DB8'
  const active  = selected?.order_id === order.order_id
  const sentCount = order.reminders_sent?.length || 0

  return (
    <button onClick={() => onSelect(order)} style={{
      width:'100%', padding:'14px 16px', border:'none', textAlign:'left',
      background: active ? 'var(--glass)' : 'transparent',
      borderBottom:'1px solid var(--glass2)',
      cursor:'pointer', transition:'background 0.15s',
      display:'flex', alignItems:'center', gap:12,
    }}
    onMouseEnter={e => { if(!active) e.currentTarget.style.background='var(--glass)' }}
    onMouseLeave={e => { if(!active) e.currentTarget.style.background='transparent' }}>

      {/* Avatar circle */}
      <div style={{
        width:44, height:44, borderRadius:'50%', flexShrink:0,
        background: active ? '#00C566' : 'var(--glass2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:16, fontWeight:700, color: active ? 'white' : 'var(--text-mid)',
        border: active ? 'none' : `2px solid ${sc}`,
      }}>
        {(order.name||'?')[0].toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:700, color: active ? '#00C566' : 'var(--text-white)', truncate:true }}>
            {order.name}
          </span>
          <span style={{ fontSize:10, color:'var(--text-dim)', flexShrink:0 }}>
            {order.order_id?.toUpperCase()}
          </span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:3 }}>
          <span style={{ fontSize:11, color:sc, fontWeight:600 }}>{order.status}</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#00C566' }}>
              Rs.{Number(order.amount||0).toLocaleString()}
            </span>
            {sentCount > 0 && (
              <span style={{
                background:'#00C56622', color:'#00C566',
                borderRadius:20, fontSize:9, fontWeight:700,
                padding:'1px 6px',
              }}>{sentCount} sent</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

/* ── Detail Panel ── */
function DetailPanel({ selected, isSent, sending, onSend, mobile }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Order info header — desktop only */}
      {!mobile && (
        <div style={{
          padding:'16px 20px', borderBottom:'1px solid var(--glass2)',
          background:'var(--glass)', display:'flex', alignItems:'center', gap:14,
        }}>
          <div style={{
            width:44, height:44, borderRadius:'50%', background:'#00C56622',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:700, color:'#00C566',
          }}>
            {(selected.name||'?')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text-white)' }}>{selected.name}</p>
            <p style={{ fontSize:12, color:'var(--text-mid)' }}>{selected.phone} • {selected.order_id?.toUpperCase()}</p>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'right' }}>
            <p style={{ fontSize:16, fontWeight:700, color:'#00C566' }}>Rs.{Number(selected.amount||0).toLocaleString()}</p>
            <p style={{ fontSize:11, color: STATUS_COLOR[selected.status]||'#8D9DB8', fontWeight:600 }}>{selected.status}</p>
          </div>
        </div>
      )}

      {/* Messages area — WhatsApp style bubbles */}
      <div style={{
        flex:1, overflowY:'auto', padding:'16px',
        background: 'var(--bg-main)',
        display:'flex', flexDirection:'column', gap:10,
      }}>
        {/* Order info bubble */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}>
          <span style={{
            background:'var(--glass)', color:'var(--text-dim)',
            fontSize:11, padding:'4px 12px', borderRadius:20,
            border:'1px solid var(--glass2)',
          }}>
            📦 {selected.product} • {selected.city}
          </span>
        </div>

        {STAGES.map(({ key, label, emoji, desc }) => {
          const alreadySent = isSent(key)
          return (
            <div key={key} style={{
              display:'flex',
              justifyContent: alreadySent ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth:'75%', minWidth:220, padding:'12px 14px',
                minHeight: 90,
                borderRadius: alreadySent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: alreadySent ? '#00C566' : 'var(--glass)',
                border: alreadySent ? 'none' : '1px solid var(--glass2)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display:'flex', flexDirection:'column', justifyContent:'space-between',
              }}>
                <p style={{
                  fontSize:13, fontWeight:700,
                  color: alreadySent ? 'white' : 'var(--text-white)',
                  marginBottom:3,
                }}>{emoji} {label}</p>
                <p style={{
                  fontSize:11,
                  color: alreadySent ? 'rgba(255,255,255,0.8)' : 'var(--text-mid)',
                  marginBottom: alreadySent ? 0 : 8,
                }}>{desc}</p>

                {!alreadySent && (
                  <button onClick={() => onSend(key)} disabled={sending[key]} style={{
                    background:'#00C566', border:'none', borderRadius:8,
                    color:'white', fontSize:11, fontWeight:700,
                    padding:'6px 14px', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:5,
                    opacity: sending[key] ? 0.6 : 1,
                    marginTop:4,
                  }}>
                    <Send size={12}/>
                    {sending[key] ? 'Sending...' : '📲 Bhejo'}
                  </button>
                )}
                {alreadySent && (
                  <p style={{ fontSize:10, color:'rgba(255,255,255,0.7)', marginTop:4, textAlign:'right' }}>
                    ✓✓ Bheja ja chuka
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyDetail() {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', color:'var(--text-dim)' }}>
      <MessageCircle size={48} color="var(--text-dim)" style={{ marginBottom:12 }}/>
      <p style={{ fontSize:15, fontWeight:600 }}>Koi order select karein</p>
      <p style={{ fontSize:12, marginTop:6 }}>Left se order choose karein</p>
    </div>
  )
}