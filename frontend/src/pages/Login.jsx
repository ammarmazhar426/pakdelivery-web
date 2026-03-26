import { useState } from 'react'
import { ShoppingBag, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Login({ onLogin, onGoRegister, onGoForgot }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return toast.error('Email aur password daalo')
    setLoading(true)
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password })
      const { access_token, refresh_token, user, stores, active_store } = res.data

      // Save to localStorage
      localStorage.setItem('access_token',  access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user',          JSON.stringify(user))
      localStorage.setItem('stores',        JSON.stringify(stores))
      localStorage.setItem('active_store',  active_store || stores?.[0]?.id || '')

      toast.success(`Welcome back, ${user.full_name}! 👋`)
      onLogin(user, stores, active_store || stores?.[0]?.id)
    } catch(e) {
      toast.error(e.response?.data?.detail || 'Login fail ho gaya')
    } finally { setLoading(false) }
  }

  const inp = {
    width:'100%', padding:'12px 14px',
    background:'rgba(255,255,255,0.05)',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:12, color:'white', fontSize:14,
    outline:'none', boxSizing:'border-box',
  }

  return (
    <div style={{
      minHeight:'100vh', background:'#080C14',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:16,
    }}>
      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{
            width:64, height:64, borderRadius:20,
            background:'linear-gradient(135deg, #00C566, #00A855)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px',
          }}>
            <ShoppingBag size={32} color="white"/>
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'white' }}>PakDelivery Pro</h1>
          <p style={{ fontSize:14, color:'#8D9DB8', marginTop:6 }}>COD Management System</p>
        </div>

        {/* Card */}
        <div style={{
          background:'#111827', borderRadius:24,
          border:'1px solid rgba(255,255,255,0.08)',
          padding:32,
        }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:24 }}>Login Karein</h2>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#8D9DB8', fontWeight:600, display:'block', marginBottom:6 }}>Email</label>
            <input
              type="email" placeholder="aap@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inp}
            />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:12, color:'#8D9DB8', fontWeight:600, display:'block', marginBottom:6 }}>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ ...inp, paddingRight:44 }}
              />
              <button onClick={() => setShowPass(p => !p)} style={{
                position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'#8D9DB8', padding:4,
              }}>
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading} style={{
            width:'100%', padding:'13px',
            background: loading ? '#3D5068' : '#00C566',
            border:'none', borderRadius:12,
            color:'white', fontWeight:700, fontSize:15,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition:'background 0.2s',
          }}>
            {loading ? '⏳ Logging in...' : '🔑 Login'}
          </button>

          <div style={{ textAlign:'center', marginTop:20 }}>
            <button onClick={onGoForgot} style={{
              background:'none', border:'none', color:'#8D9DB8',
              cursor:'pointer', fontSize:12, display:'block', margin:'0 auto 12px',
            }}>Password bhool gaye?</button>
            <p style={{ fontSize:13, color:'#8D9DB8' }}>
              Account nahi hai?{' '}
              <button onClick={onGoRegister} style={{
                background:'none', border:'none', color:'#00C566',
                fontWeight:700, cursor:'pointer', fontSize:13,
              }}>Register karein</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}