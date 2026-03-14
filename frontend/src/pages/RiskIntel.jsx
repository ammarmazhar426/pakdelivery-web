import { useState, useEffect } from 'react'
import { Shield, Trash2, Plus, Package, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const RISK_COLOR = { high:'#F43F5E', medium:'#F59E0B', low:'#00C566', invalid:'#A78BFA' }
const RISK_BG    = { high:'rgba(244,63,94,0.1)', medium:'rgba(245,158,11,0.1)', low:'rgba(0,197,102,0.1)' }

const inp = {
  padding:'9px 12px', background:'var(--glass2)',
  border:'1px solid var(--glass2)', borderRadius:10,
  color:'var(--text-white)', fontSize:13, width:'100%', boxSizing:'border-box',
}

export default function RiskIntel() {
  const [tab,        setTab]        = useState('blacklist')
  const [blacklist,  setBlacklist]  = useState([])
  const [analytics,  setAnalytics]  = useState(null)
  const [phone,      setPhone]      = useState('')
  const [name,       setName]       = useState('')
  const [reason,     setReason]     = useState('')
  const [adding,     setAdding]     = useState(false)
  const [checkPhone, setCheckPhone] = useState('')
  const [checkResult,setCheckResult]= useState(null)
  const [checking,   setChecking]   = useState(false)

  useEffect(() => { loadBlacklist(); loadAnalytics() }, [])

  const loadBlacklist = () =>
    axios.get(`${API}/blacklist`).then(r => setBlacklist(r.data.blacklist)).catch(()=>{})

  const loadAnalytics = () =>
    axios.get(`${API}/risk/analytics`).then(r => setAnalytics(r.data)).catch(()=>{})

  const handleAdd = async () => {
    if (!phone.trim()) return toast.error('Phone number daalo')
    setAdding(true)
    try {
      await axios.post(`${API}/blacklist`, { phone, name, reason })
      toast.success('Blacklist mein add ho gaya 🚫')
      setPhone(''); setName(''); setReason('')
      loadBlacklist()
    } catch { toast.error('Add nahi hua') }
    finally { setAdding(false) }
  }

  const handleRemove = async (ph) => {
    if (!window.confirm('Blacklist se hataein?')) return
    try {
      await axios.delete(`${API}/blacklist/${ph}`)
      toast.success('Blacklist se hata diya')
      loadBlacklist()
    } catch { toast.error('Error') }
  }

  const handleCheck = async () => {
    if (!checkPhone.trim()) return
    setChecking(true)
    try {
      const r = await axios.post(`${API}/orders/check-risk`, {
        name:'check', phone:checkPhone, address:'check',
        city:'check', product:'check', amount:100
      })
      setCheckResult(r.data)
    } catch { toast.error('Check nahi hua') }
    finally { setChecking(false) }
  }

  const TABS = [
    { key:'blacklist', label:'🚫 Blacklist',   count: blacklist.length },
    { key:'heatmap',   label:'🗺️ Heatmap',     count: analytics?.city_heatmap?.length || 0 },
    { key:'products',  label:'📦 Products',    count: analytics?.product_risk?.length || 0 },
    { key:'checker',   label:'🔍 Checker',     count: null },
  ]

  return (
    <div style={{ padding:16, maxWidth:960, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ width:44, height:44, borderRadius:14, background:'rgba(244,63,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Shield size={22} color="#F43F5E"/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text-white)' }}>🤖 AI Risk Intelligence</h1>
          <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>Blacklist • Heatmap • Phone History • Scoring</p>
        </div>
        {analytics && (
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <p style={{ fontSize:22, fontWeight:800, color:'#F43F5E' }}>{analytics.blacklist_count}</p>
            <p style={{ fontSize:10, color:'var(--text-dim)' }}>Blacklisted</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:14, padding:4, marginBottom:16, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex:1, padding:'8px 4px', borderRadius:10, border:'none', cursor:'pointer',
            background: tab===t.key ? '#F43F5E' : 'transparent',
            color: tab===t.key ? 'white' : 'var(--text-mid)',
            fontWeight:700, fontSize:11, whiteSpace:'nowrap',
            display:'flex', alignItems:'center', justifyContent:'center', gap:4, minWidth:0,
          }}>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span style={{ background: tab===t.key ? 'rgba(255,255,255,0.3)':'var(--glass2)', borderRadius:20, fontSize:9, padding:'1px 5px', flexShrink:0 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── BLACKLIST TAB ── */}
      {tab === 'blacklist' && (
        <div>
          {/* Add form */}
          <div style={{ background:'var(--glass)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:16, padding:16, marginBottom:16 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)', marginBottom:12 }}>🚫 Naya Number Blacklist Karein</p>
            {/* Mobile: stack vertically, Desktop: 2 cols */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:10 }}>
              <input placeholder="Phone Number *" value={phone} onChange={e=>setPhone(e.target.value)} style={inp}/>
              <input placeholder="Customer Naam" value={name} onChange={e=>setName(e.target.value)} style={inp}/>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <input placeholder="Reason (e.g. 3 baar RTO)" value={reason} onChange={e=>setReason(e.target.value)}
                style={{ ...inp, flex:1, minWidth:160 }}/>
              <button onClick={handleAdd} disabled={adding} style={{
                background:'#F43F5E', border:'none', borderRadius:10, color:'white',
                padding:'9px 18px', fontWeight:700, fontSize:13, cursor:'pointer',
                display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', flexShrink:0,
              }}><Plus size={14}/>{adding?'...':'Add'}</button>
            </div>
          </div>

          {/* List */}
          {blacklist.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-dim)' }}>
              <Shield size={40} color="var(--text-dim)" style={{ marginBottom:12 }}/>
              <p>Abhi koi number blacklist nahi</p>
            </div>
          ) : blacklist.map((b,i) => (
            <div key={i} style={{
              background:'var(--glass)', border:'1px solid rgba(244,63,94,0.2)',
              borderRadius:14, padding:'12px 14px', marginBottom:8,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <div style={{ width:38, height:38, borderRadius:12, background:'rgba(244,63,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>🚫</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)' }}>{b.phone}</p>
                  {b.name && <span style={{ fontSize:11, color:'var(--text-mid)' }}>— {b.name}</span>}
                  <span style={{ fontSize:10, fontWeight:700, background:'rgba(244,63,94,0.15)', color:'#F43F5E', borderRadius:20, padding:'1px 7px', flexShrink:0 }}>
                    {b.times_blocked}x blocked
                  </span>
                </div>
                {b.reason && <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.reason}</p>}
                <p style={{ fontSize:10, color:'var(--text-dim)', marginTop:2 }}>{b.added_on}</p>
              </div>
              <button onClick={() => handleRemove(b.phone)} style={{
                background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.2)',
                borderRadius:8, padding:'6px 8px', cursor:'pointer', flexShrink:0,
              }}><Trash2 size={14} color="#F43F5E"/></button>
            </div>
          ))}
        </div>
      )}

      {/* ── HEATMAP TAB ── */}
      {tab === 'heatmap' && (
        <div>
          <div style={{ background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <MapPin size={16} color="#60A5FA"/>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text-white)' }}>City RTO Heatmap</p>
            </div>
            <p style={{ fontSize:11, color:'var(--text-dim)' }}>Tumhare orders ke base pe — konse areas zyada RTO dete hain</p>
          </div>

          {!analytics || analytics.city_heatmap?.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-dim)' }}>
              <MapPin size={40} color="var(--text-dim)" style={{ marginBottom:12 }}/>
              <p>Kafi orders nahi — data aate aate show hoga</p>
            </div>
          ) : analytics.city_heatmap.map((c,i) => (
            <div key={i} style={{
              background:'var(--glass)', borderRadius:14,
              border:`1px solid ${RISK_COLOR[c.risk_level]}33`,
              padding:'12px 14px', marginBottom:8,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <div style={{ width:36, height:36, borderRadius:10, background:RISK_BG[c.risk_level], display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                {c.risk_level==='high'?'🚨':c.risk_level==='medium'?'⚠️':'✅'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)', textTransform:'capitalize' }}>{c.city}</p>
                  <span style={{ fontSize:11, fontWeight:700, color:RISK_COLOR[c.risk_level], background:RISK_BG[c.risk_level], padding:'2px 8px', borderRadius:20, flexShrink:0 }}>
                    {c.rto_rate}% RTO
                  </span>
                </div>
                <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>
                  {c.total} orders • {c.delivered} delivered • {c.rto} RTO
                </p>
              </div>
              <div style={{ width:60, height:6, background:'var(--glass2)', borderRadius:3, flexShrink:0 }}>
                <div style={{ width:`${Math.min(c.rto_rate,100)}%`, height:'100%', background:RISK_COLOR[c.risk_level], borderRadius:3 }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {tab === 'products' && (
        <div>
          <div style={{ background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:16, padding:16, marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <Package size={16} color="#A78BFA"/>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text-white)' }}>Product Risk Analysis</p>
            </div>
            <p style={{ fontSize:11, color:'var(--text-dim)' }}>Konse products zyada fake orders attract karte hain</p>
          </div>

          {!analytics || analytics.product_risk?.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-dim)' }}>
              <Package size={40} color="var(--text-dim)" style={{ marginBottom:12 }}/>
              <p>Kafi orders nahi — jaise jaise aate jayenge data show hoga</p>
            </div>
          ) : analytics.product_risk.map((p,i) => (
            <div key={i} style={{
              background:'var(--glass)', borderRadius:14,
              border:`1px solid ${RISK_COLOR[p.risk_level]}33`,
              padding:'12px 14px', marginBottom:8,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <div style={{ width:36, height:36, borderRadius:10, background:RISK_BG[p.risk_level], display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                {p.risk_level==='high'?'🚨':p.risk_level==='medium'?'⚠️':'✅'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)', textTransform:'capitalize' }}>{p.product}</p>
                  <span style={{ fontSize:11, fontWeight:700, color:RISK_COLOR[p.risk_level], background:RISK_BG[p.risk_level], padding:'2px 8px', borderRadius:20, flexShrink:0 }}>
                    {p.rto_rate}% RTO
                  </span>
                </div>
                <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{p.total} orders • {p.rto} RTO</p>
              </div>
              <div style={{ width:60, height:6, background:'var(--glass2)', borderRadius:3, flexShrink:0 }}>
                <div style={{ width:`${Math.min(p.rto_rate,100)}%`, height:'100%', background:RISK_COLOR[p.risk_level], borderRadius:3 }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PHONE CHECKER TAB ── */}
      {tab === 'checker' && (
        <div>
          <div style={{ background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:16, padding:16, marginBottom:16 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)', marginBottom:8 }}>🔍 Phone Number Check Karein</p>
            <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:12 }}>Koi bhi number daalo — uska pura history aur risk score dekho</p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <input placeholder="03XX-XXXXXXX" value={checkPhone} onChange={e=>setCheckPhone(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleCheck()}
                style={{ ...inp, flex:1, minWidth:180 }}/>
              <button onClick={handleCheck} disabled={checking} style={{
                background:'#60A5FA', border:'none', borderRadius:10, color:'white',
                padding:'10px 20px', fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0,
              }}>{checking ? '...' : '🔍 Check'}</button>
            </div>
          </div>

          {checkResult && (
            <div style={{ background:'var(--glass)', border:`2px solid ${checkResult.level==='LOW'?'#00C566':checkResult.level==='MEDIUM'?'#F59E0B':'#F43F5E'}`, borderRadius:16, overflow:'hidden' }}>
              {/* Score header */}
              <div style={{ background: checkResult.level==='LOW'?'#00C566':checkResult.level==='MEDIUM'?'#F59E0B':'#F43F5E', padding:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                <div>
                  <p style={{ color:'white', fontSize:11, opacity:0.85 }}>Risk Score</p>
                  <p style={{ color:'white', fontSize:28, fontWeight:800 }}>{checkResult.score}/100</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ color:'white', fontSize:20, fontWeight:800 }}>{checkResult.emoji} {checkResult.level}</p>
                  <p style={{ color:'white', fontSize:13, fontWeight:700, opacity:0.9 }}>{checkResult.rec}</p>
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--glass2)' }}>
                <p style={{ fontSize:13, color:'var(--text-white)', fontWeight:600 }}>{checkResult.summary}</p>
              </div>

              {/* Phone history */}
              {checkResult.details?.phone_history?.total_orders > 0 && (
                <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--glass2)' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--text-dim)', marginBottom:10 }}>📱 PHONE HISTORY</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {[
                      { label:'Total',     val:checkResult.details.phone_history.total_orders, color:'var(--text-white)' },
                      { label:'Delivered', val:checkResult.details.phone_history.delivered,    color:'#00C566' },
                      { label:'RTO',       val:checkResult.details.phone_history.rto,          color:'#F43F5E' },
                      { label:'Cancelled', val:checkResult.details.phone_history.cancelled,    color:'#F59E0B' },
                    ].map(({label,val,color}) => (
                      <div key={label} style={{ background:'var(--glass2)', borderRadius:10, padding:'8px', textAlign:'center' }}>
                        <p style={{ fontSize:18, fontWeight:700, color }}>{val}</p>
                        <p style={{ fontSize:9, color:'var(--text-dim)' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {checkResult.issues?.length > 0 && (
                <div style={{ padding:'12px 16px' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--text-dim)', marginBottom:8 }}>ISSUES DETECTED</p>
                  {checkResult.issues.map((issue,i) => (
                    <p key={i} style={{ fontSize:12, color:'var(--text-white)', marginBottom:5 }}>{issue}</p>
                  ))}
                </div>
              )}

              {/* Blacklist button */}
              {!checkResult.details?.blacklist?.blacklisted && (
                <div style={{ padding:'0 16px 16px' }}>
                  <button onClick={() => { setTab('blacklist'); setPhone(checkPhone) }} style={{
                    background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)',
                    borderRadius:10, color:'#F43F5E', padding:'9px 16px',
                    fontWeight:700, fontSize:12, cursor:'pointer', width:'100%',
                  }}>🚫 Is Number Ko Blacklist Karein</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}