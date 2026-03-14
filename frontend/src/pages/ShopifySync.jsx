import { useState, useEffect } from 'react'
import { ShoppingBag, RefreshCw, CheckCircle, XCircle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ShopifySync() {
  const [status,      setStatus]      = useState(null)
  const [shop,        setShop]        = useState('alnajahtech-2.myshopify.com')
  const [token,       setToken]       = useState('')
  const [connecting,  setConnecting]  = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [syncResult,  setSyncResult]  = useState(null)

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = () =>
    axios.get(`${API}/shopify/status`).then(r => setStatus(r.data)).catch(()=>{})

  const handleConnect = async () => {
    if (!shop || !token) return toast.error('Shop URL aur token daalo')
    setConnecting(true)
    try {
      const res = await axios.post(`${API}/shopify/connect`, { shop, token })
      toast.success(`✅ Connected: ${res.data.shop_name}`)
      setToken('')
      loadStatus()
    } catch(e) {
      toast.error(e.response?.data?.detail || 'Connection fail ho gaya')
    } finally { setConnecting(false) }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await axios.post(`${API}/shopify/sync`)
      setSyncResult(res.data)
      if (res.data.synced > 0) {
        toast.success(`🎉 ${res.data.synced} naye orders import hue!`)
      } else {
        toast.success('Sab orders already sync hain ✅')
      }
      loadStatus()
    } catch { toast.error('Sync fail ho gaya') }
    finally { setSyncing(false) }
  }

  const handleResetSync = async () => {
    if (!window.confirm('Sync history clear karein? Sab Shopify orders dobara import honge.')) return
    try {
      await axios.post(`${API}/shopify/reset-sync`)
      toast.success('Reset ho gaya — ab Sync Now karo')
    } catch { toast.error('Reset fail') }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Shopify disconnect karein?')) return
    try {
      await axios.post(`${API}/shopify/disconnect`)
      toast.success('Disconnected')
      loadStatus()
    } catch { toast.error('Error') }
  }

  const isConnected = status?.enabled

  return (
    <div style={{ padding:16, maxWidth:700, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:'rgba(149,191,71,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ShoppingBag size={24} color="#95BF47"/>
        </div>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-white)' }}>Shopify Integration</h1>
          <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>
            Shopify orders automatically PakDelivery mein aayenge + AI risk analysis
          </p>
        </div>
      </div>

      {/* Status card */}
      <div style={{
        background:'var(--glass)', border:`1px solid ${isConnected ? '#95BF4744' : 'var(--glass2)'}`,
        borderRadius:16, padding:20, marginBottom:20,
      }}>
        {/* Top row: icon + text */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          {isConnected
            ? <CheckCircle size={28} color="#95BF47" style={{ flexShrink:0, marginTop:2 }}/>
            : <XCircle size={28} color="var(--text-dim)" style={{ flexShrink:0, marginTop:2 }}/>
          }
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text-white)' }}>
              {isConnected ? `✅ Connected — ${status.shop_name || status.shop}` : '❌ Not Connected'}
            </p>
            {isConnected && (
              <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:3, lineHeight:1.5 }}>
                {status.shop} • {status.synced_count} orders synced<br/>
                Last: {status.last_synced || 'Never'} • 🔄 Auto sync: every 3 min
              </p>
            )}
          </div>
        </div>
        {/* Buttons row — always full width below */}
        {isConnected && (
          <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
            <button onClick={handleSync} disabled={syncing} style={{
              background:'#95BF47', border:'none', borderRadius:10,
              color:'white', padding:'8px 14px', fontWeight:700,
              fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:6, flex:1,
              justifyContent:'center',
            }}>
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}/>
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button onClick={handleResetSync} title="Sync history clear karein" style={{
              background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)',
              borderRadius:10, color:'#F59E0B', padding:'8px 14px',
              fontWeight:700, fontSize:12, cursor:'pointer', flex:1,
            }}>↺ Reset</button>
            <button onClick={handleDisconnect} style={{
              background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.3)',
              borderRadius:10, color:'#F43F5E', padding:'8px 14px',
              fontWeight:700, fontSize:12, cursor:'pointer', flex:1,
            }}>Disconnect</button>
          </div>
        )}
      </div>

      {/* Sync result */}
      {syncResult && (
        <div style={{
          background: syncResult.synced > 0 ? 'rgba(149,191,71,0.1)' : 'var(--glass)',
          border: `1px solid ${syncResult.synced > 0 ? '#95BF4744' : 'var(--glass2)'}`,
          borderRadius:14, padding:16, marginBottom:20,
          display:'flex', alignItems:'center', gap:12,
        }}>
          <Zap size={20} color={syncResult.synced > 0 ? '#95BF47' : 'var(--text-dim)'}/>
          <div>
            {syncResult.error
              ? <p style={{ fontSize:13, color:'#F43F5E', fontWeight:600 }}>❌ {syncResult.error}</p>
              : <>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--text-white)' }}>
                    {syncResult.synced > 0
                      ? `🎉 ${syncResult.synced} naye orders import hue!`
                      : '✅ Koi naya order nahi — sab sync hai'}
                  </p>
                  <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:3 }}>
                    Shopify mein total {syncResult.total_shopify} orders • AI risk analysis ho gaya
                  </p>
                </>
            }
          </div>
        </div>
      )}

      {/* Connect form */}
      {!isConnected && (
        <div style={{ background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--text-white)', marginBottom:16 }}>
            🔗 Shopify Store Connect Karein
          </p>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:'var(--text-mid)', fontWeight:600, display:'block', marginBottom:5 }}>
              Store URL
            </label>
            <input value={shop} onChange={e => setShop(e.target.value)}
              placeholder="yourstore.myshopify.com"
              style={{ width:'100%', padding:'10px 14px', background:'var(--glass2)', border:'1px solid var(--glass2)', borderRadius:10, color:'var(--text-white)', fontSize:13, boxSizing:'border-box' }}/>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:'var(--text-mid)', fontWeight:600, display:'block', marginBottom:5 }}>
              Admin API Access Token
            </label>
            <input value={token} onChange={e => setToken(e.target.value)}
              placeholder="shpat_xxxxxxxxxxxx" type="password"
              style={{ width:'100%', padding:'10px 14px', background:'var(--glass2)', border:'1px solid var(--glass2)', borderRadius:10, color:'var(--text-white)', fontSize:13, boxSizing:'border-box' }}/>
            <p style={{ fontSize:10, color:'var(--text-dim)', marginTop:4 }}>
              Shopify Admin → Settings → Apps → PakDelivery Pro → API credentials
            </p>
          </div>

          <button onClick={handleConnect} disabled={connecting} style={{
            width:'100%', padding:'12px', background:'#95BF47', border:'none',
            borderRadius:10, color:'white', fontWeight:700, fontSize:14, cursor:'pointer',
          }}>
            {connecting ? '⏳ Connecting...' : '🔗 Connect Shopify'}
          </button>
        </div>
      )}

      {/* Setup Guide */}
      <div style={{ background:'var(--glass)', border:'1px solid var(--glass2)', borderRadius:16, padding:20, marginTop:20 }}>
        <p style={{ fontSize:15, fontWeight:700, color:'var(--text-white)', marginBottom:4 }}>
          🔌 How to Connect Your Shopify Store
        </p>
        <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:16 }}>
          Follow these simple steps — no technical knowledge needed
        </p>
        {[
          { step:'1', title:'Open your Shopify Admin', desc:'Go to your Shopify store admin panel. The URL looks like: yourstore.myshopify.com/admin' },
          { step:'2', title:'Go to Settings → Apps', desc:'Click "Settings" at the bottom left of your Shopify admin, then click "Apps and sales channels".' },
          { step:'3', title:'Open App Development', desc:'Click "Develop apps" button. If asked, click "Allow custom app development" to enable it.' },
          { step:'4', title:'Create a new app', desc:'Click "Create an app" → give it any name (e.g. PakDelivery) → click "Create app".' },
          { step:'5', title:'Set API permissions', desc:'Click "Configure Admin API scopes" → search and check: read_orders, write_orders, read_customers, read_products → click Save.' },
          { step:'6', title:'Install the app & get your token', desc:'Click "Install app" → then click "Reveal token once" → COPY it immediately (it only shows once!).' },
          { step:'7', title:'Paste here & connect!', desc:'Enter your store URL (yourstore.myshopify.com) and paste the token above → click Connect. Done! ✅' },
        ].map(({ step, title, desc }) => (
          <div key={step} style={{ display:'flex', gap:12, marginBottom:14, alignItems:'flex-start' }}>
            <div style={{
              width:28, height:28, borderRadius:'50%', background:'#00C566',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:800, color:'white', flexShrink:0, marginTop:1,
            }}>{step}</div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)' }}>{title}</p>
              <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:3, lineHeight:1.5 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div style={{ background:'var(--glass)', border:'1px solid rgba(0,197,102,0.2)', borderRadius:16, padding:20, marginTop:16 }}>
        <p style={{ fontSize:15, fontWeight:700, color:'var(--text-white)', marginBottom:4 }}>
          🚀 What You Get After Connecting
        </p>
        <p style={{ fontSize:11, color:'var(--text-dim)', marginBottom:16 }}>
          Everything runs automatically — just sit back and manage
        </p>
        {[
          { icon:'⚡', title:'Auto Order Import — Every 5 Minutes', desc:'Every new Shopify order automatically appears in your PakDelivery dashboard. No copy-paste, no manual entry ever again.', color:'#F59E0B' },
          { icon:'🤖', title:'Instant AI Risk Analysis', desc:'Every Shopify order gets automatically scored — fake order detection, blacklist check, address validation, and phone history check. All before you even see the order.', color:'#F43F5E' },
          { icon:'🚫', title:'Blacklist Protection', desc:'If a customer previously gave a fake order or RTO, they are instantly flagged the moment they order again on your Shopify store.', color:'#F43F5E' },
          { icon:'📦', title:'Smart Courier Recommendation', desc:"Based on the customer's city and address, PakDelivery suggests the best courier (Leopards, TCS, M&P etc.) that actually delivers to that area.", color:'#60A5FA' },
          { icon:'💬', title:'Automatic WhatsApp Messages', desc:'Order confirmed, dispatched, out for delivery, delivered — WhatsApp messages are sent to customers automatically at each stage.', color:'#00C566' },
          { icon:'📊', title:'P&L Tracking Per Order', desc:'Track profit and loss on every Shopify order. Know exactly how much you made after product cost, shipping, ads, and RTO losses.', color:'#A78BFA' },
          { icon:'🛒', title:'Shopify Badge on Every Order', desc:'Shopify orders are clearly marked in your dashboard so you always know which orders came from your online store vs manual entries.', color:'#95BF47' },
        ].map(({ icon, title, desc, color }) => (
          <div key={title} style={{
            display:'flex', gap:12, marginBottom:12,
            padding:'12px 14px', background:'var(--bg-card)',
            borderRadius:12, border:'1px solid var(--glass2)', alignItems:'flex-start',
          }}>
            <span style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{icon}</span>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)' }}>{title}</p>
              <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:3, lineHeight:1.6 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}