import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar   from './components/Sidebar'
import Topbar    from './components/Topbar'
import Dashboard  from './pages/Dashboard'
import Reminders  from './pages/Reminders'
import Calculator from './pages/Calculator'
import RiskIntel    from './pages/RiskIntel'
import ShopifySync  from './pages/ShopifySync'

export default function App() {
  const [tab,   setTab]   = useState('dashboard')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light' : ''
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg-main)', overflow:'hidden' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background:'var(--glass)', color:'var(--text-white)', border:'1px solid var(--glass2)' }
      }}/>

      {/* Sidebar — hidden on mobile */}
      <div className="sidebar-wrap">
        <Sidebar activeTab={tab} onTabChange={setTab} />
      </div>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar theme={theme} onToggleTheme={toggleTheme} />
        {/* Mobile logo strip — shown only on mobile via CSS */}
        <div style={{ flex:1, overflow:'auto' }}>
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'reminders'  && <Reminders />}
          {tab === 'calculator' && <Calculator />}
          {tab === 'risk'       && <RiskIntel />}
          {tab === 'shopify'    && <ShopifySync />}
        </div>
        {/* Bottom nav — mobile only, always fixed at bottom */}
        <div className="bottom-nav">
          {[
            { key:'dashboard',  icon:'📊', label:'Dashboard' },
            { key:'reminders',  icon:'📲', label:'Reminders' },
            { key:'calculator', icon:'💰', label:'P&L' },
            { key:'risk',       icon:'🛡️', label:'Risk' },
            { key:'shopify',    icon:'🛒', label:'Shopify' },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              gap:3, padding:'8px 0', border:'none', cursor:'pointer',
              background: 'transparent',
              color: tab===key ? '#00C566' : 'var(--text-mid)',
            }}>
              <span style={{ fontSize:20 }}>{icon}</span>
              <span style={{ fontSize:10, fontWeight:700 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}