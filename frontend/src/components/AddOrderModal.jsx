import { useState, useEffect, useRef } from 'react'
import { X, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { createOrder, checkRisk } from '../api'

const FIELDS = [
  { key:'name',    label:'Customer Name', placeholder:'Ali Hassan',           type:'text',   col:1 },
  { key:'phone',   label:'Phone Number',  placeholder:'0300-1234567',         type:'text',   col:1 },
  { key:'city',    label:'City',          placeholder:'Karachi',              type:'text',   col:1 },
  { key:'address', label:'Address',       placeholder:'House #1, Street 2, Block A...', type:'text', col:2 },
  { key:'product', label:'Product',       placeholder:'Nike Shoes',           type:'text',   col:1 },
  { key:'amount',  label:'Amount (Rs.)',  placeholder:'1500',                 type:'number', col:1 },
  { key:'courier', label:'Courier',       placeholder:'Leopards / TCS',       type:'text',   col:1 },
  { key:'notes',   label:'Notes',         placeholder:'Extra notes...',       type:'text',   col:1 },
]

const RISK_COLOR = { LOW:'#00C566', MEDIUM:'#F59E0B', HIGH:'#F43F5E', CRITICAL:'#F43F5E' }
const RISK_BG    = { LOW:'rgba(0,197,102,0.08)', MEDIUM:'rgba(245,158,11,0.08)', HIGH:'rgba(244,63,94,0.08)', CRITICAL:'rgba(244,63,94,0.08)' }

export default function AddOrderModal({ onClose }) {
  const [form,    setForm]    = useState({})
  const [risk,    setRisk]    = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [checking,setChecking]= useState(false)
  const debounceRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-check risk whenever key fields change
  useEffect(() => {
    const { name, phone, city, address, product, amount } = form
    // Only check if at least phone or name filled
    if (!phone && !name) { setRisk(null); return }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setChecking(true)
      try {
        const res = await checkRisk({
          name:    name    || 'unknown',
          phone:   phone   || '',
          city:    city    || 'unknown',
          address: address || '',
          product: product || 'unknown',
          amount:  Number(amount) || 0,
        })
        setRisk(res.data)
      } catch {}
      finally { setChecking(false) }
    }, 600) // 600ms debounce — wait for user to stop typing
  }, [form.name, form.phone, form.city, form.address, form.product, form.amount])

  const handleSave = async () => {
    if (!form.name || !form.phone) return toast.error('Name aur phone zaroori hain')

    // Warn on high risk but still allow save
    if (risk && (risk.level === 'CRITICAL' || risk.level === 'HIGH')) {
      const go = window.confirm(`⚠️ ${risk.level} RISK detected!\n\n${risk.summary}\n\nPhir bhi save karein?`)
      if (!go) return
    }

    setSaving(true)
    try {
      await createOrder({ ...form, amount: Number(form.amount)||0 })
      toast.success('Order save ho gaya! ✅')
      onClose()
    } catch { toast.error('Order save nahi hua') }
    finally { setSaving(false) }
  }

  const riskLevel  = risk?.level || null
  const borderColor = riskLevel ? RISK_COLOR[riskLevel] : 'var(--glass2)'

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:1000, backdropFilter:'blur(4px)', padding:12,
    }}>
      <div style={{
        background:'var(--bg-card)', borderRadius:20,
        border:`1px solid ${borderColor}`,
        width:'100%', maxWidth:560,
        maxHeight:'92vh', overflow:'auto', padding:20,
        transition:'border-color 0.3s',
      }} className="fade-in modal-box">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text-white)' }}>➕ Naya Order</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-mid)' }}>
            <X size={20}/>
          </button>
        </div>

        {/* Live Risk Banner — shows as user types */}
        <div style={{
          marginBottom:14, padding:'10px 14px', borderRadius:12,
          background: riskLevel ? RISK_BG[riskLevel] : 'var(--glass)',
          border: `1px solid ${riskLevel ? RISK_COLOR[riskLevel]+'44' : 'var(--glass2)'}`,
          display:'flex', alignItems:'center', gap:10,
          minHeight: 46, transition:'all 0.3s',
        }}>
          <Shield size={16} color={riskLevel ? RISK_COLOR[riskLevel] : 'var(--text-dim)'}
            style={{ flexShrink:0, animation: checking ? 'spin 1s linear infinite' : 'none' }}/>
          {checking ? (
            <p style={{ fontSize:12, color:'var(--text-dim)' }}>🔄 Analyzing...</p>
          ) : risk ? (
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, fontWeight:800, color:RISK_COLOR[riskLevel] }}>
                  {riskLevel==='LOW'?'🟢':riskLevel==='MEDIUM'?'🟡':riskLevel==='HIGH'?'🟠':'🔴'} {riskLevel} RISK
                </span>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--text-mid)' }}>
                  Score: {risk.score}/100
                </span>
                <span style={{
                  fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                  background: riskLevel==='LOW' ? '#00C56622':'#F43F5E22',
                  color: riskLevel==='LOW' ? '#00C566':'#F43F5E',
                }}>
                  {risk.rec}
                </span>
                {/* Blacklisted badge */}
                {risk.details?.blacklist?.blacklisted && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#F43F5E', color:'white' }}>
                    🚫 BLACKLISTED
                  </span>
                )}
                {/* Returning customer badge */}
                {risk.details?.phone_history?.delivered > 0 && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#00C56622', color:'#00C566' }}>
                    ✅ Trusted Customer ({risk.details.phone_history.delivered}x delivered)
                  </span>
                )}
              </div>
              <p style={{ fontSize:11, color:'var(--text-mid)', marginTop:3 }}>{risk.summary}</p>
              {/* Issues */}
              {risk.issues?.length > 0 && (
                <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:2 }}>
                  {risk.issues.slice(0,4).map((issue,i) => (
                    <p key={i} style={{ fontSize:11, color:'var(--text-mid)' }}>{issue}</p>
                  ))}
                  {risk.issues.length > 4 && (
                    <p style={{ fontSize:10, color:'var(--text-dim)' }}>+{risk.issues.length-4} more issues...</p>
                  )}
                </div>
              )}
              {/* Address tip */}
              {risk.details?.address_tip && (
                <div style={{ marginTop:6, padding:'6px 10px', background:'rgba(245,158,11,0.1)', borderRadius:8, borderLeft:'3px solid #F59E0B' }}>
                  <p style={{ fontSize:11, color:'#F59E0B', fontWeight:600 }}>💡 Address Tip:</p>
                  <p style={{ fontSize:11, color:'var(--text-mid)', marginTop:2 }}>{risk.details.address_tip}</p>
                </div>
              )}
              {/* Courier suggestions */}
              {risk.details?.courier_suggestion?.length > 0 && (
                <div style={{ marginTop:6 }}>
                  <p style={{ fontSize:10, color:'var(--text-dim)', fontWeight:700, marginBottom:4 }}>📦 COURIER SUGGESTION:</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {risk.details.courier_suggestion.slice(0,3).map((c,i) => (
                      <span key={i} style={{
                        fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20,
                        background: c.coverage.includes('Full') ? 'rgba(0,197,102,0.15)' : 'rgba(245,158,11,0.15)',
                        color: c.coverage.includes('Full') ? '#00C566' : '#F59E0B',
                        border: `1px solid ${c.coverage.includes('Full') ? '#00C56633' : '#F59E0B33'}`,
                      }} title={c.note}>
                        {c.courier} {c.coverage.includes('Full') ? '✅' : '⚠️'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize:12, color:'var(--text-dim)' }}>Phone ya naam type karo — AI automatically analyze karega</p>
          )}
        </div>

        {/* Form */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {FIELDS.map(({ key, label, placeholder, type, col }) => (
            <div key={key} style={{ gridColumn: col===2 ? 'span 2' : 'span 1' }}>
              <label style={{ fontSize:11, color:'var(--text-mid)', fontWeight:600, marginBottom:4, display:'block' }}>
                {label}
                {key==='phone' && risk?.details?.blacklist?.blacklisted && (
                  <span style={{ color:'#F43F5E', marginLeft:6, fontSize:10 }}>🚫 BLACKLISTED</span>
                )}
                {key==='phone' && risk?.details?.phone_history?.total_orders > 0 && !risk?.details?.blacklist?.blacklisted && (
                  <span style={{ color:'#60A5FA', marginLeft:6, fontSize:10 }}>
                    📱 {risk.details.phone_history.total_orders} prev orders
                  </span>
                )}
                {key==='city' && risk?.details?.city_risk === 'high' && (
                  <span style={{ color:'#F43F5E', marginLeft:6, fontSize:10 }}>🗺️ High RTO area</span>
                )}
                {key==='address' && risk?.details?.address_score !== undefined && (
                  <span style={{
                    marginLeft:6, fontSize:10, fontWeight:700,
                    color: risk.details.address_score >= 80 ? '#00C566' : risk.details.address_score >= 50 ? '#F59E0B' : '#F43F5E'
                  }}>
                    Address quality: {risk.details.address_score}%
                  </span>
                )}
              </label>
              <input
                type={type} placeholder={placeholder}
                value={form[key]||''}
                onChange={e => set(key, e.target.value)}
                style={{
                  width:'100%', padding:'9px 12px',
                  background:'var(--glass)',
                  border: `1px solid ${
                    (key==='phone' && risk?.details?.blacklist?.blacklisted) ? '#F43F5E' :
                    (key==='city' && risk?.details?.city_risk==='high') ? '#F59E0B' :
                    'var(--glass2)'
                  }`,
                  borderRadius:10, color:'var(--text-white)',
                  fontSize:13, outline:'none', boxSizing:'border-box',
                }}
              />
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button onClick={onClose} className="btn-ios" style={{ flex:1 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className={risk && (riskLevel==='HIGH'||riskLevel==='CRITICAL') ? '' : 'btn-green'}
            style={{
              flex:2, padding:'10px', borderRadius:10, border:'none', cursor:'pointer',
              fontWeight:700, fontSize:13,
              background: saving ? '#3D5068' :
                         riskLevel==='CRITICAL' ? '#F43F5E' :
                         riskLevel==='HIGH' ? '#F59E0B' : '#00C566',
              color: 'white',
            }}>
            {saving ? 'Saving...' :
             riskLevel==='CRITICAL' ? '⚠️ High Risk — Phir Bhi Save?' :
             riskLevel==='HIGH' ? '⚠️ Save (Call First)' :
             '✅ Save Order'}
          </button>
        </div>

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  )
}