import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, RefreshCw, ChevronDown, Upload, Download, Calendar, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { getOrders, getStats, deleteOrder, updateOrder, exportCSV, exportJSON, importFile } from '../api'
import AddOrderModal from '../components/AddOrderModal'
import OrderDetail   from '../components/OrderDetail'

const TABS = [
  { key:'all',              label:'All' },
  { key:'pending',          label:'Pending' },
  { key:'confirmed',        label:'Confirmed' },
  { key:'dispatched',       label:'Dispatched' },
  { key:'out_for_delivery', label:'OFD' },
  { key:'delivered',        label:'Delivered' },
  { key:'cancelled',        label:'Cancelled' },
  { key:'rto',              label:'🔴 RTO' },
]
const STATUS_OPTS = ['Pending','Confirmed','Dispatched','Out for Delivery','Delivered','Cancelled','RTO / Return']
const STATUS_MAP  = {
  'Pending':'pending','Confirmed':'confirmed','Dispatched':'dispatched',
  'Out for Delivery':'out_for_delivery','Delivered':'delivered',
  'Cancelled':'cancelled','RTO / Return':'rto'
}
const STATUS_COLOR = {
  pending:'#F59E0B', confirmed:'#60A5FA', dispatched:'#A78BFA',
  out_for_delivery:'#FB923C', delivered:'#00C566', cancelled:'#3D5068', rto:'#F43F5E',
}
const RISK_COLOR = { LOW:'#00C566', MEDIUM:'#F59E0B', HIGH:'#F43F5E', CRITICAL:'#F43F5E' }
const RISK_DOT   = { LOW:'🟢', MEDIUM:'🟡', HIGH:'🔴', CRITICAL:'🔴' }

const DATE_FILTERS = [
  { key:'all',       label:'All Dates' },
  { key:'today',     label:'Today' },
  { key:'yesterday', label:'Yesterday' },
  { key:'7days',     label:'Last 7 Days' },
  { key:'14days',    label:'Last 14 Days' },
  { key:'month',     label:'This Month' },
  { key:'prev',      label:'Previous Month' },
]

function applyDateFilter(orders, filterKey, customDate) {
  if (filterKey === 'all') return orders
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return orders.filter(o => {
    const d = new Date((o.created_at||'').slice(0,10))
    if (filterKey==='today')     return d >= today
    if (filterKey==='yesterday') { const y=new Date(today); y.setDate(y.getDate()-1); return d>=y && d<today }
    if (filterKey==='7days')     { const w=new Date(today); w.setDate(w.getDate()-7); return d>=w }
    if (filterKey==='14days')    { const f=new Date(today); f.setDate(f.getDate()-14); return d>=f }
    if (filterKey==='month')     return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()
    if (filterKey==='prev')      { const pm=new Date(now.getFullYear(),now.getMonth()-1,1); const em=new Date(now.getFullYear(),now.getMonth(),1); return d>=pm && d<em }
    if (filterKey==='custom' && customDate) return o.created_at?.slice(0,10) === customDate
    return true
  })
}

// ── Calendar Picker ───────────────────────────────────────────────────────────
function CalendarPicker({ value, onSelect, onClose }) {
  const [year,  setYear]  = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const ref = useRef()

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    // slight delay so the button click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', h), 100)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h) }
  }, [onClose])

  const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth= new Date(year, month+1, 0).getDate()
  const cells = []
  for (let i=0; i<firstDay; i++) cells.push(null)
  for (let d=1; d<=daysInMonth; d++) cells.push(d)

  const prevMonth = () => { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  const nextMonth = () => { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }

  return (
    <div ref={ref} style={{
      position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
      zIndex:9999, width:300,
      background:'var(--bg-card)', border:'1px solid var(--glass2)',
      borderRadius:18, boxShadow:'0 30px 80px rgba(0,0,0,0.5)', padding:20,
    }} className="fade-in">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <button onClick={prevMonth} style={{ background:'var(--glass)', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', color:'var(--text-white)', fontSize:16 }}>‹</button>
        <span style={{ fontWeight:700, color:'var(--text-white)', fontSize:14 }}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={{ background:'var(--glass)', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', color:'var(--text-white)', fontSize:16 }}>›</button>
      </div>
      {/* Day labels */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:6 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <span key={d} style={{ textAlign:'center', fontSize:10, color:'var(--text-dim)', fontWeight:700, padding:'4px 0' }}>{d}</span>
        ))}
      </div>
      {/* Cells */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i}/>
          const dt  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
          const sel = value === dt
          return (
            <button key={i} onClick={() => { onSelect(dt); onClose() }}
              style={{
                padding:'7px 0', borderRadius:8, border:'none', cursor:'pointer',
                background: sel ? '#00C566' : 'transparent',
                color: sel ? 'white' : 'var(--text-white)',
                fontSize:13, fontWeight: sel ? 700 : 400,
              }}
              onMouseEnter={e=>{ if(!sel) e.target.style.background='var(--glass)' }}
              onMouseLeave={e=>{ if(!sel) e.target.style.background='transparent' }}
            >{d}</button>
          )
        })}
      </div>
      {/* Close */}
      <button onClick={onClose} style={{
        width:'100%', marginTop:14, padding:'8px', background:'var(--glass)',
        border:'1px solid var(--glass2)', borderRadius:10, color:'var(--text-mid)',
        cursor:'pointer', fontSize:12, fontWeight:600,
      }}>Cancel</button>
    </div>
  )
}

export default function Dashboard() {
  const [orders,      setOrders]      = useState([])
  const [stats,       setStats]       = useState({})
  const [activeTab,   setActiveTab]   = useState('all')
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [detailOrder, setDetailOrder] = useState(null)
  const [dateFilter,  setDateFilter]  = useState('all')
  const [customDate,  setCustomDate]  = useState('')
  const [showCal,     setShowCal]     = useState(false)
  const [showDateDrop,setShowDateDrop]= useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchOpen,   setSearchOpen]   = useState(false)
  const importRef  = useRef()
  const dateDDRef  = useRef()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [oRes, sRes] = await Promise.all([getOrders(), getStats()])
      setOrders(oRes.data.orders)
      setStats(sRes.data)
    } catch { toast.error('Server se connect nahi hua') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    const h = (e) => { if (dateDDRef.current && !dateDDRef.current.contains(e.target)) setShowDateDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const tabFiltered  = activeTab==='all' ? orders : orders.filter(o => o.status===activeTab)
  const dateFiltered = applyDateFilter(tabFiltered, dateFilter, customDate)
  const filtered     = !searchQuery ? dateFiltered : dateFiltered.filter(o => {
    const q = searchQuery.toLowerCase()
    return (o.order_id||'').toLowerCase().includes(q) ||
           (o.name||'').toLowerCase().includes(q) ||
           (o.phone||'').includes(searchQuery) ||
           (o.city||'').toLowerCase().includes(q) ||
           (o.product||'').toLowerCase().includes(q) ||
           (o.courier||'').toLowerCase().includes(q)
  })

  const onStatusChange = async (order, newLabel) => {
    const newStatus = STATUS_MAP[newLabel]
    if (!newStatus || newStatus===order.status) return
    try {
      await updateOrder(order.order_id, { status: newStatus })
      toast.success(`Status → ${newLabel}`)
      fetchAll()
    } catch { toast.error('Update nahi hua') }
  }

  const onDelete = async (order) => {
    if (!window.confirm(`${order.order_id} delete karein?`)) return
    try {
      await deleteOrder(order.order_id)
      toast.success('Order delete ho gaya')
      fetchAll()
    } catch { toast.error('Delete nahi hua') }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await importFile(file)
      toast.success(`${res.data.imported} orders import ho gaye! ✅`)
      fetchAll()
    } catch { toast.error('Import nahi hua') }
    e.target.value = ''
  }

  const activeDateLabel = dateFilter==='custom' && customDate
    ? customDate
    : DATE_FILTERS.find(f=>f.key===dateFilter)?.label || 'All Dates'

  return (
    <div className="page-content" style={{ padding:'16px', height:'calc(100vh - 56px)', overflow:'auto' }}>

      {/* ── Title + Actions ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text-white)' }}>Orders Dashboard</h1>
          <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>Manage & track your COD orders</p>
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {/* Search button */}
          <button onClick={() => { setSearchOpen(s=>!s); if(searchOpen) setSearchQuery('') }}
            className={searchOpen ? 'btn-green' : 'btn-ios'}
            style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Search size={13}/>
            {searchQuery && <span style={{ background:'white', color:'#00C566', borderRadius:20, fontSize:9, fontWeight:800, padding:'1px 5px' }}>{filtered.length}</span>}
          </button>
          <button className="btn-ios" onClick={fetchAll} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={13}/> <span className="hide-sm">Refresh</span>
          </button>

          {/* Date filter */}
          <div ref={dateDDRef} style={{ position:'relative' }}>
            <button className="btn-ios" onClick={() => setShowDateDrop(p=>!p)}
              style={{ display:'flex', alignItems:'center', gap:5 }}>
              <Calendar size={13}/> <span className="hide-sm">{activeDateLabel}</span> <ChevronDown size={11}/>
            </button>
            {showDateDrop && (
              <div style={{
                position:'absolute', top:40, right:0, zIndex:2000, width:190,
                background:'var(--bg-card)', border:'1px solid var(--glass2)',
                borderRadius:14, overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.3)',
              }} className="fade-in">
                {DATE_FILTERS.map(({ key, label }) => (
                  <button key={key}
                    onClick={() => { setDateFilter(key); setCustomDate(''); setShowDateDrop(false) }}
                    style={{
                      width:'100%', padding:'9px 14px', border:'none', textAlign:'left',
                      background: dateFilter===key ? 'var(--glass)' : 'transparent',
                      color: dateFilter===key ? '#00C566' : 'var(--text-white)',
                      fontWeight: dateFilter===key ? 700 : 400, fontSize:12, cursor:'pointer',
                    }}>{label}</button>
                ))}
                <div style={{ borderTop:'1px solid var(--glass2)' }}>
                  <button onClick={() => { setShowDateDrop(false); setShowCal(true) }}
                    style={{
                      width:'100%', padding:'9px 14px', border:'none', textAlign:'left',
                      background: dateFilter==='custom' ? 'var(--glass)' : 'transparent',
                      color: dateFilter==='custom' ? '#00C566' : 'var(--text-white)',
                      fontWeight:700, fontSize:12, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:6,
                    }}>
                    <Calendar size={12}/> Custom Date
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import */}
          <input ref={importRef} type="file" accept=".json,.csv" onChange={handleImport} style={{ display:'none' }}/>
          <button className="btn-ios" onClick={() => importRef.current?.click()}
            style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Upload size={13}/> <span className="hide-sm">Import</span>
          </button>

          {/* Export */}
          <a href={exportCSV()} download className="btn-ios"
            style={{ display:'flex', alignItems:'center', gap:5, textDecoration:'none' }}>
            <Download size={13}/> CSV
          </a>
          <a href={exportJSON()} download className="btn-ios"
            style={{ display:'flex', alignItems:'center', gap:5, textDecoration:'none' }}>
            <Download size={13}/> JSON
          </a>

          <button className="btn-green" onClick={() => setShowAdd(true)}
            style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Plus size={14}/> Add Order
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      {searchOpen && (
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          background:'var(--glass)', border:'1px solid #00C566',
          borderRadius:12, padding:'9px 14px', marginBottom:12,
        }}>
          <Search size={15} color="#00C566"/>
          <input autoFocus type="text"
            placeholder="Order ID, naam, phone, city, product search karein..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text-white)', fontSize:13 }}
          />
          {searchQuery
            ? <span style={{ fontSize:11, color:'var(--text-dim)', whiteSpace:'nowrap' }}>{filtered.length} results</span>
            : null
          }
          <button onClick={() => setSearchQuery('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)' }}>
            <X size={14}/>
          </button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))',
        gap:10, marginBottom:16,
      }}>
        {[
          { key:'total',     label:'Total',       icon:'📦' },
          { key:'genuine',   label:'Genuine',     icon:'✅' },
          { key:'call',      label:'Call Needed', icon:'📞' },
          { key:'fake',      label:'Fake Risk',   icon:'🚨' },
          { key:'delivered', label:'Delivered',   icon:'🎉' },
        ].map(({ key, label, icon }) => (
          <div key={key} style={{
            background:'var(--bg-card)', borderRadius:16,
            border:'1px solid var(--glass2)', padding:'14px 10px',
            display:'flex', flexDirection:'column', alignItems:'center',
          }}>
            <div style={{
              background:'#00C566', borderRadius:12, width:38, height:38,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, marginBottom:6,
            }}>{icon}</div>
            <span style={{ fontSize:24, fontWeight:700, color:'#00C566', lineHeight:1 }}>
              {stats[key] ?? 0}
            </span>
            <span style={{ fontSize:10, color:'var(--text-mid)', marginTop:3, textAlign:'center' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Status Tabs ── */}
      <div className="tabs-row" style={{
        background:'var(--glass)', border:'1px solid var(--glass2)',
        borderRadius:14, padding:'5px', marginBottom:10,
        display:'flex', gap:3,
      }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            flex:1, padding:'6px 2px', borderRadius:8, border:'none',
            background: activeTab===key ? '#00C566' : 'transparent',
            color: activeTab===key ? 'white' : 'var(--text-white)',
            fontWeight:700, fontSize:11, cursor:'pointer', transition:'all 0.15s',
            whiteSpace:'nowrap', textAlign:'center',
          }}>{label}</button>
        ))}
      </div>

      {/* Active date badge */}
      {dateFilter !== 'all' && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{
            background:'rgba(0,197,102,0.15)', color:'#00C566',
            border:'1px solid rgba(0,197,102,0.3)', borderRadius:20,
            fontSize:11, fontWeight:700, padding:'3px 10px',
            display:'flex', alignItems:'center', gap:5,
          }}>
            📅 {activeDateLabel}
            <button onClick={() => { setDateFilter('all'); setCustomDate('') }}
              style={{ background:'none', border:'none', color:'#00C566', cursor:'pointer', fontSize:14, lineHeight:1, padding:0 }}>×</button>
          </span>
          <span style={{ fontSize:11, color:'var(--text-dim)' }}>{filtered.length} orders</span>
        </div>
      )}

      {/* ── Table — Desktop ── */}
      <div className="desktop-table">
        {/* Header */}
        <div style={{
          background:'var(--glass)', borderRadius:12, border:'1px solid var(--glass2)',
          display:'grid', gridTemplateColumns:'90px 130px 110px 120px 85px 85px 1fr 95px',
          padding:'0 12px', height:44, alignItems:'center', marginBottom:4,
        }}>
          {['Order ID','Customer','Phone','Product','Amount','Risk','Status','Actions'].map(col => (
            <span key={col} style={{ fontSize:11, fontWeight:700, color:'var(--text-mid)', textAlign:'center' }}>{col}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-dim)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <EmptyState/>
        ) : filtered.map((order, idx) => {
          const risk   = order._risk || {}
          const status = order.status || 'pending'
          const sColor = STATUS_COLOR[status] || '#8D9DB8'
          const statusLabel = STATUS_OPTS.find(s => STATUS_MAP[s]===status) || 'Pending'
          return (
            <div key={order.order_id} className="fade-in" style={{
              background: idx%2===0 ? 'var(--glass)' : 'var(--bg-card2)',
              borderRadius:12, border:'1px solid var(--glass2)',
              display:'grid', gridTemplateColumns:'90px 130px 110px 120px 85px 85px 1fr 95px',
              alignItems:'center', height:50, padding:'0 12px',
              borderLeft:`4px solid ${sColor}`, marginBottom:3,
            }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#22D3EE', textAlign:'center' }}>
                {order.order_id?.toUpperCase()}
              </span>
              <span style={{ fontSize:12, fontWeight:700, color:'var(--text-white)', textAlign:'center' }}>
                {(order.name||'').slice(0,13)}{(order.name||'').length>13?'…':''}
              </span>
              <span style={{ fontSize:11, color:'var(--text-mid)', textAlign:'center' }}>{order.phone}</span>
              <span style={{ fontSize:11, color:'var(--text-mid)', textAlign:'center' }}>
                {(order.product||'').slice(0,12)}{(order.product||'').length>12?'…':''}
              </span>
              <span style={{ fontSize:12, fontWeight:700, color:'#00C566', textAlign:'center' }}>
                Rs.{Number(order.amount||0).toLocaleString()}
              </span>
              <span style={{ fontSize:11, fontWeight:700, color:RISK_COLOR[risk.level]||'#8D9DB8', textAlign:'center' }}>
                {RISK_DOT[risk.level]} {risk.level==='CRITICAL'?'Crit':risk.level==='MEDIUM'?'Med':risk.level||'—'}
              </span>
              {/* Status — centered */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ position:'relative', width:'90%' }}>
                  <select value={statusLabel} onChange={e => onStatusChange(order, e.target.value)}
                    style={{
                      width:'100%', padding:'5px 24px 5px 10px',
                      background:'var(--glass2)', border:'none', borderRadius:8,
                      color:sColor, fontSize:11, fontWeight:700,
                      cursor:'pointer', appearance:'none', textAlign:'center',
                    }}>
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={11} style={{
                    position:'absolute', right:6, top:'50%',
                    transform:'translateY(-50%)', color:'var(--text-dim)', pointerEvents:'none',
                  }}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                <button onClick={() => setDetailOrder(order)} style={{
                  background:'var(--glass2)', border:'none', borderRadius:8,
                  color:'#60A5FA', fontSize:11, fontWeight:700,
                  padding:'5px 8px', cursor:'pointer',
                }}>Detail</button>
                <button onClick={() => onDelete(order)} style={{
                  background:'var(--glass2)', border:'none', borderRadius:8,
                  color:'var(--text-dim)', fontSize:13, padding:'5px 7px', cursor:'pointer',
                }}>🗑</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Mobile Cards ── */}
      <div className="mobile-cards">
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-dim)' }}>Loading...</div>
        ) : filtered.length === 0 ? <EmptyState/> : filtered.map((order) => {
          const risk   = order._risk || {}
          const status = order.status || 'pending'
          const sColor = STATUS_COLOR[status] || '#8D9DB8'
          const statusLabel = STATUS_OPTS.find(s => STATUS_MAP[s]===status) || 'Pending'
          return (
            <div key={order.order_id} className="fade-in" style={{
              background:'var(--glass)', borderRadius:14,
              border:'1px solid var(--glass2)',
              borderLeft:`4px solid ${sColor}`,
              padding:'14px', marginBottom:8,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:700, color:'#22D3EE' }}>{order.order_id?.toUpperCase()}</span>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--text-white)', marginTop:2 }}>{order.name}</p>
                  <p style={{ fontSize:12, color:'var(--text-mid)' }}>{order.phone}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontSize:16, fontWeight:700, color:'#00C566' }}>Rs.{Number(order.amount||0).toLocaleString()}</p>
                  <span style={{ fontSize:11, fontWeight:700, color:RISK_COLOR[risk.level]||'#8D9DB8' }}>
                    {RISK_DOT[risk.level]} {risk.level||'—'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize:12, color:'var(--text-mid)', marginBottom:10 }}>{order.product}</p>
              {/* Status select */}
              <div style={{ position:'relative', marginBottom:8 }}>
                <select value={statusLabel} onChange={e => onStatusChange(order, e.target.value)}
                  style={{
                    width:'100%', padding:'8px 28px 8px 12px',
                    background:'var(--glass2)', border:'none', borderRadius:10,
                    color:sColor, fontSize:12, fontWeight:700,
                    cursor:'pointer', appearance:'none',
                  }}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} style={{
                  position:'absolute', right:10, top:'50%',
                  transform:'translateY(-50%)', color:'var(--text-dim)', pointerEvents:'none',
                }}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setDetailOrder(order)} style={{
                  flex:1, background:'var(--glass2)', border:'none', borderRadius:8,
                  color:'#60A5FA', fontSize:12, fontWeight:700, padding:'8px', cursor:'pointer',
                }}>Detail</button>
                <button onClick={() => onDelete(order)} style={{
                  background:'var(--glass2)', border:'none', borderRadius:8,
                  color:'#F43F5E', fontSize:12, fontWeight:700, padding:'8px 12px', cursor:'pointer',
                }}>🗑</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Calendar modal */}
      {showCal && (
        <CalendarPicker
          value={customDate}
          onSelect={(dt) => { setCustomDate(dt); setDateFilter('custom') }}
          onClose={() => setShowCal(false)}
        />
      )}

      {showAdd     && <AddOrderModal onClose={() => { setShowAdd(false); fetchAll() }} />}
      {detailOrder && <OrderDetail order={detailOrder} onClose={() => { setDetailOrder(null); fetchAll() }} />}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      background:'var(--glass)', borderRadius:18, padding:'40px 20px',
      textAlign:'center', border:'1px solid var(--glass2)',
    }}>
      <div style={{ fontSize:40, marginBottom:8 }}>📭</div>
      <p style={{ color:'var(--text-mid)', fontWeight:600 }}>Koi order nahi mila</p>
      <p style={{ color:'var(--text-dim)', fontSize:12, marginTop:4 }}>Filter change karein ya naya order add karein</p>
    </div>
  )
}