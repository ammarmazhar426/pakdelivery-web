import { useState, useEffect, useRef } from 'react'
import { Trash2, TrendingUp, TrendingDown, Printer, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPNL, createPNL, deletePNL } from '../api'

// ── Field definitions ─────────────────────────────────────────────────────────
const ORDER_FIELDS = [
  { key:'total_orders',  label:'Total Orders',      placeholder:'10',   note:'Aaj kitne orders aye' },
  { key:'confirmed',     label:'Confirmed',         placeholder:'7',    note:'Confirm hue orders' },
  { key:'dispatched',    label:'Dispatched',        placeholder:'5',    note:'Courier ko diye' },
  { key:'delivered',     label:'Delivered',         placeholder:'3',    note:'Customer tak pahunche' },
  { key:'rto',           label:'RTO / Returns',     placeholder:'1',    note:'Wapas aye orders' },
]

const COST_FIELDS = [
  { key:'selling_price',    label:'Selling Price',       placeholder:'1500', note:'Per order customer se liya', per:'per order' },
  { key:'product_cost',     label:'Product Cost',        placeholder:'400',  note:'Per order product ki cost', per:'per order' },
  { key:'packing_cost',     label:'Packing Cost',        placeholder:'80',   note:'Per order packing', per:'per order' },
  { key:'forward_shipping', label:'Forward Shipping',    placeholder:'250',  note:'Per order courier charge', per:'per order' },
  { key:'rto_shipping',     label:'RTO Shipping',        placeholder:'200',  note:'Per returned order', per:'per RTO' },
  { key:'ad_spend_total',   label:'Total Ad Spend',      placeholder:'2000', note:'Aaj total ads pe kharch', per:'total' },
  { key:'employee_cost',    label:'Employee Cost',       placeholder:'150',  note:'Per order', per:'per order' },
  { key:'platform_fees',    label:'Platform Fees',       placeholder:'80',   note:'Per order', per:'per order' },
  { key:'other_costs',      label:'Other Costs',         placeholder:'0',    note:'Total misc costs', per:'total' },
]

const DEFAULT = {
  date: new Date().toISOString().slice(0,10), label:'',
  total_orders:0, confirmed:0, dispatched:0, delivered:0, rto:0,
  selling_price:0, product_cost:0, packing_cost:0,
  forward_shipping:0, rto_shipping:0, ad_spend_total:0,
  employee_cost:0, platform_fees:0, other_costs:0,
}

function calcLive(f) {
  const n = k => Number(f[k]) || 0

  // Revenue — only from delivered
  const revenue_actual    = n('delivered') * n('selling_price')
  // Projected — if all dispatched get delivered
  const revenue_projected = n('dispatched') * n('selling_price')

  // Costs on dispatched orders (already spent)
  const cost_product   = n('total_orders') * n('product_cost')
  const cost_packing   = n('total_orders') * n('packing_cost')
  const cost_forward   = n('dispatched')   * n('forward_shipping')
  const cost_rto       = n('rto')          * n('rto_shipping')
  const cost_ads       = n('ad_spend_total')
  const cost_employee  = n('total_orders') * n('employee_cost')
  const cost_platform  = n('total_orders') * n('platform_fees')
  const cost_other     = n('other_costs')

  const total_cost = cost_product + cost_packing + cost_forward + cost_rto +
                     cost_ads + cost_employee + cost_platform + cost_other

  const profit_actual    = revenue_actual    - total_cost
  const profit_projected = revenue_projected - total_cost

  const margin_actual    = revenue_actual>0    ? (profit_actual/revenue_actual*100).toFixed(1)       : 0
  const margin_projected = revenue_projected>0 ? (profit_projected/revenue_projected*100).toFixed(1) : 0

  const ad_cpo = n('total_orders') > 0 ? (cost_ads / n('total_orders')).toFixed(0) : 0

  const delivery_rate   = n('total_orders')  > 0 ? ((n('delivered')/n('total_orders'))*100).toFixed(1)  : 0
  const confirm_rate    = n('total_orders')  > 0 ? ((n('confirmed')/n('total_orders'))*100).toFixed(1)  : 0

  return {
    revenue_actual, revenue_projected, total_cost,
    profit_actual, profit_projected,
    margin_actual, margin_projected,
    ad_cpo, delivery_rate, confirm_rate,
    cost_product, cost_packing, cost_forward, cost_rto,
    cost_ads, cost_employee, cost_platform, cost_other,
  }
}

function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const h = () => setMob(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return mob
}

export default function Calculator() {
  const isMobile = useIsMobile()
  const [form,    setForm]    = useState({ ...DEFAULT })
  const [records, setRecords] = useState([])
  const [saving,  setSaving]  = useState(false)
  const [tab,     setTab]     = useState('calculator')
  const [view,    setView]    = useState('actual') // actual | projected

  const live = calcLive(form)

  useEffect(() => {
    getPNL().then(r => setRecords(r.data.records.reverse())).catch(()=>{})
  }, [])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: parseFloat(v)||0 }))

  const handleSave = async () => {
    if (!form.total_orders) return toast.error('Total orders daalo')
    setSaving(true)
    try {
      // Map to backend model
      const payload = {
        ...form,
        ad_cpo: live.ad_cpo,
        profit: live.profit_actual,
        margin: live.margin_actual,
      }
      const res = await createPNL(payload)
      toast.success('Record save ho gaya! ✅')
      setRecords(r => [res.data, ...r])
      setForm({ ...DEFAULT, date: new Date().toISOString().slice(0,10) })
    } catch { toast.error('Save nahi hua') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete karein?')) return
    try {
      await deletePNL(id)
      setRecords(r => r.filter(x => x.id !== id))
      toast.success('Delete ho gaya')
    } catch { toast.error('Delete nahi hua') }
  }

  const profit  = view==='actual' ? live.profit_actual    : live.profit_projected
  const margin  = view==='actual' ? live.margin_actual    : live.margin_projected
  const revenue = view==='actual' ? live.revenue_actual   : live.revenue_projected
  const isP     = profit >= 0

  return (
    <div style={{ padding:'14px', maxWidth:960, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-white)' }}>💰 P&L Calculator</h1>
          <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>Daily profit & loss tracker</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setTab('calculator')} className={tab==='calculator' ? 'btn-green' : 'btn-ios'}>🧮 Calculator</button>
          <button onClick={() => setTab('history')}    className={tab==='history'    ? 'btn-green' : 'btn-ios'}>📋 History ({records.length})</button>
        </div>
      </div>

      {tab === 'calculator' ? (
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:16, alignItems:'start' }}>

          {/* ── Left: Inputs ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            {/* Date + Label */}
            <div style={{ background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:14, padding:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={{ fontSize:11, color:'var(--text-mid)', fontWeight:600, display:'block', marginBottom:4 }}>📅 Date</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({...f, date: e.target.value}))}
                    style={{ width:'100%', padding:'8px 10px', background:'var(--glass2)', border:'none', borderRadius:8, color:'var(--text-white)', fontSize:12 }}/>
                </div>
                <div>
                  <label style={{ fontSize:11, color:'var(--text-mid)', fontWeight:600, display:'block', marginBottom:4 }}>🏷️ Label</label>
                  <input type="text" placeholder="e.g. FB Campaign" value={form.label}
                    onChange={e => setForm(f => ({...f, label: e.target.value}))}
                    style={{ width:'100%', padding:'8px 10px', background:'var(--glass2)', border:'none', borderRadius:8, color:'var(--text-white)', fontSize:12 }}/>
                </div>
              </div>
            </div>

            {/* Order counts */}
            <div style={{ background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:14, padding:14 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-dim)', marginBottom:10 }}>📦 ORDER COUNTS</p>
              {ORDER_FIELDS.map(({ key, label, placeholder, note }) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'var(--text-white)' }}>{label}</p>
                    <p style={{ fontSize:10, color:'var(--text-dim)' }}>{note}</p>
                  </div>
                  <input type="number" placeholder={placeholder} value={form[key]||''}
                    onChange={e => setF(key, e.target.value)}
                    style={{ width:80, padding:'7px 10px', background:'var(--glass2)', border:'none', borderRadius:8, color:'var(--text-white)', fontSize:13, fontWeight:700, textAlign:'right' }}/>
                </div>
              ))}
            </div>

            {/* Costs */}
            <div style={{ background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:14, padding:14 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-dim)', marginBottom:10 }}>💸 COSTS (Rs.)</p>
              {COST_FIELDS.map(({ key, label, placeholder, note, per }) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'var(--text-white)' }}>{label}</p>
                    <p style={{ fontSize:10, color:'var(--text-dim)' }}>{note}</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                    <input type="number" placeholder={placeholder} value={form[key]||''}
                      onChange={e => setF(key, e.target.value)}
                      style={{ width:90, padding:'7px 10px', background:'var(--glass2)', border:'none', borderRadius:8, color:'var(--text-white)', fontSize:13, fontWeight:700, textAlign:'right' }}/>
                    <span style={{ fontSize:9, color:'var(--text-dim)' }}>{per}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Save button — desktop only (mobile has one below slip) */}
            {!isMobile && (
              <button onClick={handleSave} disabled={saving} className="btn-green"
                style={{ width:'100%', padding:'12px', fontSize:14 }}>
                {saving ? 'Saving...' : '💾 Save Record'}
              </button>
            )}
          </div>

          {/* ── Right: Result Slip ── */}
          <div>
            {/* Actual vs Projected toggle */}
            <div style={{
              display:'flex', gap:4, background:'var(--glass)', border:'1px solid var(--glass2)',
              borderRadius:12, padding:4, marginBottom:12,
            }}>
              <button onClick={() => setView('actual')} style={{
                flex:1, padding:'7px', borderRadius:8, border:'none', cursor:'pointer',
                background: view==='actual' ? '#00C566' : 'transparent',
                color: view==='actual' ? 'white' : 'var(--text-mid)',
                fontWeight:700, fontSize:12,
              }}>✅ Actual (Delivered)</button>
              <button onClick={() => setView('projected')} style={{
                flex:1, padding:'7px', borderRadius:8, border:'none', cursor:'pointer',
                background: view==='projected' ? '#60A5FA' : 'transparent',
                color: view==='projected' ? 'white' : 'var(--text-mid)',
                fontWeight:700, fontSize:12,
              }}>🔮 Projected (Dispatched)</button>
            </div>

            <div style={{ background:'var(--bg-card)', border:`2px solid ${isP ? '#00C566' : '#F43F5E'}`, borderRadius:20, overflow:'hidden' }}>

              {/* Slip top */}
              <div style={{ background: isP ? '#00C566' : '#F43F5E', padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {isP ? <TrendingUp size={22} color="white"/> : <TrendingDown size={22} color="white"/>}
                  <div>
                    <p style={{ color:'white', fontSize:11, opacity:0.85 }}>
                      {view==='projected' ? '🔮 Projected' : '✅ Actual'} • {form.label || form.date}
                    </p>
                    <p style={{ color:'white', fontSize:26, fontWeight:800 }}>
                      {isP?'+':'−'}Rs.{Math.abs(profit).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ marginLeft:'auto', textAlign:'right' }}>
                    <p style={{ color:'white', fontSize:10, opacity:0.8 }}>Margin</p>
                    <p style={{ color:'white', fontSize:22, fontWeight:800 }}>{margin}%</p>
                  </div>
                </div>
              </div>

              {/* Key stats row */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderBottom:'1px solid var(--glass2)' }}>
                {[
                  { label:'Revenue',      val:`Rs.${revenue.toLocaleString()}`,        color:'#00C566' },
                  { label:'Total Cost',   val:`Rs.${live.total_cost.toLocaleString()}`, color:'#F43F5E' },
                  { label:'Ad CPO',       val:`Rs.${live.ad_cpo}`,                      color:'#F59E0B' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ padding:'10px', textAlign:'center', borderRight:'1px solid var(--glass2)' }}>
                    <p style={{ fontSize:10, color:'var(--text-dim)', fontWeight:600 }}>{label}</p>
                    <p style={{ fontSize:13, fontWeight:700, color, marginTop:3 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Rates */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', borderBottom:'1px solid var(--glass2)' }}>
                {[
                  { label:'Confirm Rate', val:`${live.confirm_rate}%`, color:'#60A5FA' },
                  { label:'Delivery Rate',val:`${live.delivery_rate}%`,color:'#A78BFA' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ padding:'10px', textAlign:'center', borderRight:'1px solid var(--glass2)' }}>
                    <p style={{ fontSize:10, color:'var(--text-dim)', fontWeight:600 }}>{label}</p>
                    <p style={{ fontSize:14, fontWeight:700, color, marginTop:3 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Cost breakdown */}
              <div style={{ padding:'14px 16px' }}>
                <p style={{ fontSize:11, color:'var(--text-dim)', fontWeight:700, marginBottom:8 }}>COST BREAKDOWN</p>
                {[
                  ['Product Cost',   live.cost_product],
                  ['Packing',        live.cost_packing],
                  ['Forward Ship',   live.cost_forward],
                  ['RTO Shipping',   live.cost_rto],
                  ['Ads',            live.cost_ads],
                  ['Employee',       live.cost_employee],
                  ['Platform',       live.cost_platform],
                  ['Other',          live.cost_other],
                ].filter(([,v]) => v > 0).map(([label, val]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--glass2)' }}>
                    <span style={{ fontSize:12, color:'var(--text-mid)' }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text-white)' }}>Rs.{val.toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--text-white)' }}>Total Cost</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#F43F5E' }}>Rs.{live.total_cost.toLocaleString()}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background: isP ? 'rgba(0,197,102,0.1)':'rgba(244,63,94,0.1)', borderRadius:10 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--text-white)' }}>Net {isP?'Profit':'Loss'}</span>
                  <span style={{ fontSize:14, fontWeight:800, color: isP?'#00C566':'#F43F5E' }}>
                    {isP?'+':'−'}Rs.{Math.abs(profit).toLocaleString()}
                  </span>
                </div>

                {/* Orders mini */}
                <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                  {[
                    { label:'Total',     val:form.total_orders||0, color:'var(--text-white)' },
                    { label:'Confirmed', val:form.confirmed||0,    color:'#60A5FA' },
                    { label:'Dispatch',  val:form.dispatched||0,   color:'#A78BFA' },
                    { label:'Delivered', val:form.delivered||0,    color:'#00C566' },
                    { label:'RTO',       val:form.rto||0,          color:'#F43F5E' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background:'var(--glass)', borderRadius:8, padding:'6px 4px', textAlign:'center', border:'1px solid var(--glass2)' }}>
                      <p style={{ fontSize:14, fontWeight:700, color }}>{val}</p>
                      <p style={{ fontSize:9, color:'var(--text-dim)' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:8 }}>
                <button onClick={() => window.print()} className="btn-ios"
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  <Printer size={14}/> Print / Save Slip
                </button>
                {/* Mobile save button */}
                {isMobile && (
                  <button onClick={handleSave} disabled={saving} className="btn-green"
                    style={{ width:'100%', padding:'12px', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:70 }}>
                    {saving ? 'Saving...' : '💾 Save Record'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* History */
        <div>
          {records.length === 0 ? (
            <div style={{ background:'var(--glass)', borderRadius:18, padding:'60px 20px', textAlign:'center', border:'1px solid var(--glass2)' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
              <p style={{ color:'var(--text-mid)', fontWeight:600 }}>Koi record nahi</p>
            </div>
          ) : records.map(r => {
            const isP = (r.profit||0) >= 0
            return (
              <div key={r.id} style={{
                background:'var(--glass)', borderRadius:14,
                border:`1px solid ${isP?'rgba(0,197,102,0.3)':'rgba(244,63,94,0.3)'}`,
                padding:'14px 16px', marginBottom:10,
                display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
              }}>
                <div style={{ width:40, height:40, borderRadius:10, background: isP?'rgba(0,197,102,0.15)':'rgba(244,63,94,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {isP ? '📈' : '📉'}
                </div>
                <div style={{ flex:1, minWidth:100 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)' }}>{r.label || r.date}</p>
                  <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{r.date} • {r.total_orders} orders</p>
                </div>
                <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                  {[
                    { label:'Revenue', val:`Rs.${(r.revenue||0).toLocaleString()}`,   color:'#00C566' },
                    { label:'Cost',    val:`Rs.${(r.total_cost||0).toLocaleString()}`, color:'#F43F5E' },
                    { label:'Net',     val:`${isP?'+':'−'}Rs.${Math.abs(r.profit||0).toLocaleString()}`, color: isP?'#00C566':'#F43F5E' },
                    { label:'Margin',  val:`${r.margin||0}%`,                          color: isP?'#00C566':'#F43F5E' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign:'center' }}>
                      <p style={{ fontSize:10, color:'var(--text-dim)' }}>{label}</p>
                      <p style={{ fontSize:13, fontWeight:700, color }}>{val}</p>
                    </div>
                  ))}
                </div>
                <button onClick={() => handleDelete(r.id)} style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)', borderRadius:8, color:'#F43F5E', padding:'6px 10px', cursor:'pointer', flexShrink:0 }}>
                  <Trash2 size={14}/>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}