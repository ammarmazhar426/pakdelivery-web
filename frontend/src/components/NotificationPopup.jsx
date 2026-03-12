import { useEffect, useRef } from 'react'
import { X, Bell } from 'lucide-react'

export default function NotificationPopup({ notifs, onClose }) {
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position:'absolute', top:50, right:0, width:340, zIndex:2000,
      background:'var(--bg-card)', border:'1px solid var(--glass2)',
      borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
      overflow:'hidden',
    }} className="fade-in">

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 16px', borderBottom:'1px solid var(--glass2)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Bell size={16} color="#00C566" />
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text-white)' }}>
            Notifications
          </span>
          {notifs.length > 0 && (
            <span style={{
              background:'#F43F5E', color:'white',
              borderRadius:20, fontSize:10, fontWeight:700,
              padding:'2px 7px',
            }}>{notifs.length}</span>
          )}
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-mid)' }}>
          <X size={16} />
        </button>
      </div>

      {/* List */}
      <div style={{ maxHeight:380, overflow:'auto' }}>
        {notifs.length === 0 ? (
          <div style={{ padding:'40px 20px', textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🎉</div>
            <p style={{ color:'var(--text-mid)', fontSize:13, fontWeight:600 }}>Sab theek hai!</p>
            <p style={{ color:'var(--text-dim)', fontSize:11, marginTop:4 }}>Koi alert nahi</p>
          </div>
        ) : notifs.map((n, i) => (
          <div key={i} style={{
            padding:'12px 16px', borderBottom:'1px solid var(--glass2)',
            display:'flex', gap:12, alignItems:'flex-start',
            transition:'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='var(--glass)'}
          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            {/* Icon */}
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              background:`${n.color}22`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18,
            }}>{n.icon}</div>
            {/* Text */}
            <div style={{ flex:1 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-white)', marginBottom:3 }}>
                {n.title}
              </p>
              <p style={{ fontSize:11, color:'var(--text-mid)' }}>{n.message}</p>
            </div>
            {/* Color dot */}
            <div style={{
              width:8, height:8, borderRadius:'50%',
              background:n.color, flexShrink:0, marginTop:4,
            }}/>
          </div>
        ))}
      </div>
    </div>
  )
}
