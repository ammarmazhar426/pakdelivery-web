import { Bell, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getNotifications } from '../api'
import NotificationPopup from './NotificationPopup'

export default function Topbar({ theme, onToggleTheme }) {
  const [notifs,  setNotifs]  = useState([])
  const [showPop, setShowPop] = useState(false)

  useEffect(() => {
    const fetch = () => getNotifications().then(r => setNotifs(r.data.notifications)).catch(()=>{})
    fetch()
    const interval = setInterval(fetch, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      height:52, background:'var(--glass)',
      borderBottom:'1px solid var(--glass2)',
      display:'flex', alignItems:'center',
      padding:'0 14px', gap:10, flexShrink:0,
    }}>
      {/* Logo — mobile only, CSS controls visibility */}
      <div className="topbar-logo" style={{
        background:'#00C566', borderRadius:10,
        padding:'5px 12px', alignItems:'center', gap:7, flexShrink:0,
      }}>
        <span style={{ fontSize:14 }}>🇵🇰</span>
        <span style={{ color:'white', fontWeight:700, fontSize:12, whiteSpace:'nowrap' }}>
          PakDelivery Pro
        </span>
      </div>


      <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
        {/* Theme toggle */}
        <button onClick={onToggleTheme} className="btn-ios"
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px' }}>
          {theme==='dark' ? <Sun size={13}/> : <Moon size={13}/>}
          <span className="topbar-title" style={{ fontSize:12 }}>
            {theme==='dark' ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* Bell */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setShowPop(p=>!p)} className="btn-ios"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px' }}>
            <Bell size={13}/> {notifs.length}
          </button>
          {notifs.length > 0 && (
            <span style={{
              position:'absolute', top:-5, right:-5,
              background:'#F43F5E', color:'white',
              borderRadius:20, fontSize:9, fontWeight:700,
              padding:'1px 5px', pointerEvents:'none',
            }}>{notifs.length}</span>
          )}
          {showPop && <NotificationPopup notifs={notifs} onClose={() => setShowPop(false)} />}
        </div>
      </div>
    </div>
  )
}