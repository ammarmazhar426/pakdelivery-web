import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Sidebar    from './components/Sidebar'
import Topbar     from './components/Topbar'
import Dashboard  from './pages/Dashboard'
import Reminders  from './pages/Reminders'
import Calculator from './pages/Calculator'
import RiskIntel  from './pages/RiskIntel'
import ShopifySync from './pages/ShopifySync'
import Login         from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Register   from './pages/Register'

export default function App() {
  const [tab,         setTab]         = useState('dashboard')
  const [theme,       setTheme]       = useState('dark')
  const [authPage,    setAuthPage]    = useState('login')   // 'login' | 'register' | 'forgot'
  const [user,        setUser]        = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [stores,      setStores]      = useState(() => {
    try { return JSON.parse(localStorage.getItem('stores')) || [] } catch { return [] }
  })
  const [activeStore, setActiveStore] = useState(() => localStorage.getItem('active_store') || '')

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light' : ''
  }, [theme])

  const handleLogin = (userData, storesData, storeId) => {
    setUser(userData)
    setStores(storesData)
    setActiveStore(storeId)
  }

  const handleLogout = () => {
    localStorage.clear()
    setUser(null)
    setStores([])
    setActiveStore('')
    setAuthPage('login')
  }

  const handleStoreChange = (storeId) => {
    setActiveStore(storeId)
    localStorage.setItem('active_store', storeId)
  }

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // ── Auth pages ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <Toaster position="top-right"/>
        {authPage === 'login'    && <Login         onLogin={handleLogin} onGoRegister={() => setAuthPage('register')} onGoForgot={() => setAuthPage('forgot')}/>}
        {authPage === 'register' && <Register       onLogin={handleLogin} onGoLogin={() => setAuthPage('login')}/>}
        {authPage === 'forgot'   && <ForgotPassword onGoLogin={() => setAuthPage('login')}/>}
      </>
    )
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg-main)', overflow:'hidden' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background:'var(--glass)', color:'var(--text-white)', border:'1px solid var(--glass2)' }
      }}/>

      {/* Sidebar — hidden on mobile */}
      <div className="sidebar-wrap">
        <Sidebar activeTab={tab} onTabChange={setTab}/>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar
          theme={theme} onToggleTheme={toggleTheme}
          user={user} stores={stores}
          activeStore={activeStore} onStoreChange={handleStoreChange}
          onLogout={handleLogout}
        />
        <div style={{ flex:1, overflow:'auto' }}>
          {tab === 'dashboard'  && <Dashboard  storeId={activeStore}/>}
          {tab === 'reminders'  && <Reminders  storeId={activeStore}/>}
          {tab === 'calculator' && <Calculator storeId={activeStore}/>}
          {tab === 'risk'       && <RiskIntel  storeId={activeStore}/>}
          {tab === 'shopify'    && <ShopifySync storeId={activeStore}/>}
        </div>

        {/* Bottom nav — mobile only */}
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
              background:'transparent',
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