import { useState } from 'react'
import { Sun, Moon, LogOut, ChevronDown, Store } from 'lucide-react'

export default function Topbar({ theme, onToggleTheme, user, stores, activeStore, onStoreChange, onLogout }) {
  const [showMenu,  setShowMenu]  = useState(false)
  const [showStore, setShowStore] = useState(false)

  const currentStore = stores?.find(s => s.id === activeStore)

  return (
    <div style={{
      height:56, background:'var(--bg-sidebar)',
      borderBottom:'1px solid var(--glass2)',
      display:'flex', alignItems:'center',
      padding:'0 16px', gap:12, flexShrink:0,
    }}>
      {/* Mobile logo */}
      <div className="topbar-logo" style={{ fontWeight:800, fontSize:16, color:'var(--text-white)', flex:1 }}>
        📦 PakDelivery
      </div>

      <div style={{ flex:1 }}/>

      {/* Store switcher */}
      {stores?.length > 0 && (
        <div style={{ position:'relative' }}>
          <button onClick={() => { setShowStore(p=>!p); setShowMenu(false) }} style={{
            display:'flex', alignItems:'center', gap:6,
            background:'var(--glass)', border:'1px solid var(--glass2)',
            borderRadius:10, padding:'6px 12px', cursor:'pointer', color:'var(--text-white)',
          }}>
            <Store size={13} color="#00C566"/>
            <span style={{ fontSize:12, fontWeight:600, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {currentStore?.name || 'Store'}
            </span>
            <ChevronDown size={11} color="var(--text-dim)"/>
          </button>

          {showStore && (
            <div style={{
              position:'absolute', top:44, right:0, zIndex:3000,
              background:'var(--bg-card)', border:'1px solid var(--glass2)',
              borderRadius:14, padding:8, minWidth:180,
              boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <p style={{ fontSize:10, color:'var(--text-dim)', fontWeight:700, padding:'4px 8px', marginBottom:4 }}>STORES</p>
              {stores.map(s => (
                <button key={s.id} onClick={() => { onStoreChange(s.id); setShowStore(false) }} style={{
                  width:'100%', textAlign:'left', padding:'8px 12px',
                  background: s.id === activeStore ? 'rgba(0,197,102,0.1)' : 'none',
                  border:'none', borderRadius:10, cursor:'pointer',
                  color: s.id === activeStore ? '#00C566' : 'var(--text-white)',
                  fontSize:13, fontWeight: s.id === activeStore ? 700 : 500,
                }}>
                  {s.id === activeStore ? '✅ ' : '○ '}{s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Theme toggle */}
      <button onClick={onToggleTheme} style={{
        background:'var(--glass)', border:'1px solid var(--glass2)',
        borderRadius:10, padding:'7px', cursor:'pointer', color:'var(--text-white)',
        display:'flex', alignItems:'center',
      }}>
        {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}
      </button>

      {/* User menu */}
      {user && (
        <div style={{ position:'relative' }}>
          <button onClick={() => { setShowMenu(p=>!p); setShowStore(false) }} style={{
            display:'flex', alignItems:'center', gap:8,
            background:'var(--glass)', border:'1px solid var(--glass2)',
            borderRadius:10, padding:'6px 12px', cursor:'pointer',
          }}>
            <div style={{
              width:26, height:26, borderRadius:8,
              background:'linear-gradient(135deg, #00C566, #00A855)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:800, color:'white', flexShrink:0,
            }}>
              {user.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-white)', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} className="hide-sm">
              {user.full_name}
            </span>
            <ChevronDown size={11} color="var(--text-dim)"/>
          </button>

          {showMenu && (
            <div style={{
              position:'absolute', top:44, right:0, zIndex:3000,
              background:'var(--bg-card)', border:'1px solid var(--glass2)',
              borderRadius:14, padding:8, minWidth:200,
              boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--glass2)', marginBottom:6 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text-white)' }}>{user.full_name}</p>
                <p style={{ fontSize:11, color:'var(--text-dim)', marginTop:2 }}>{user.email}</p>
              </div>
              <button onClick={() => { onLogout(); setShowMenu(false) }} style={{
                width:'100%', textAlign:'left', padding:'8px 12px',
                background:'none', border:'none', borderRadius:10,
                cursor:'pointer', color:'#F43F5E',
                fontSize:13, fontWeight:600,
                display:'flex', alignItems:'center', gap:8,
              }}>
                <LogOut size={14}/> Logout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}