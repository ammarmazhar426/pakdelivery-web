import { useState } from 'react'
import { ShoppingBag, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Register({ onLogin, onGoLogin }) {
  const [form,    setForm]    = useState({ email:'', password:'', full_name:'', store_name:'' })
  const [showPass,setShowPass]= useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.full_name || !form.store_name)
      return toast.error('Sab fields bharein')
    if (form.password.length < 6)
      return toast.error('Password 6 characters se zyada hona chahiye')

    setLoading(true)
    try {
      const res = await axios.post(`${API}/auth/register`, form)
      const { access_token, refresh_token, user, store } = res.data

      localStorage.setItem('access_token',  access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user',          JSON.stringify(user))
      localStorage.setItem('stores',        JSON.stringify([store]))
      localStorage.setItem('active_store',  store.id)

      toast.success(`Account ban gaya! Welcome, ${user.full_name}! 🎉`)
      onLogin(user, [store], store.id)
    } catch(e) {
      toast.error(e.response?.data?.detail || 'Register fail ho gaya')
    } finally { setLoading(false) }
  }

  const inp = {
    width:'100%', padding:'12px 14px',
    background:'rgba(255,255,255,0.05)',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:12, color:'white', fontSize:14,
    outline:'none', boxSizing:'border-box',
  }

  const fields = [
    { key:'full_name',  label:'Aapka Naam',   placeholder:'Ali Hassan',           type:'text'     },
    { key:'email',      label:'Email',         placeholder:'aap@example.com',      type:'email'    },
    { key:'store_name', label:'Store Ka Naam', placeholder:'My Fashion Store',     type:'text'     },
    { key:'password',   label:'Password',      placeholder:'Min 6 characters',     type:'password' },
  ]

  return (
    <div style={{
      minHeight:'100vh', background:'#080C14',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:16,
    }}>
      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{
            width:64, height:64, borderRadius:20,
            background:'linear-gradient(135deg, #00C566, #00A855)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px',
          }}>
            <ShoppingBag size={32} color="white"/>
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, color:'white' }}>PakDelivery Pro</h1>
          <p style={{ fontSize:14, color:'#8D9DB8', marginTop:6 }}>Naya account banayein</p>
        </div>

        {/* Card */}
        <div style={{
          background:'#111827', borderRadius:24,
          border:'1px solid rgba(255,255,255,0.08)',
          padding:32,
        }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:24 }}>Register Karein</h2>

          {fields.map(({ key, label, placeholder, type }) => (
            <div key={key} style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:'#8D9DB8', fontWeight:600, display:'block', marginBottom:6 }}>{label}</label>
              <div style={{ position:'relative' }}>
                <input
                  type={key === 'password' ? (showPass ? 'text' : 'password') : type}
                  placeholder={placeholder}
                  value={form[key]} onChange={e => set(key, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  style={{ ...inp, paddingRight: key === 'password' ? 44 : 14 }}
                />
                {key === 'password' && (
                  <button onClick={() => setShowPass(p => !p)} style={{
                    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#8D9DB8', padding:4,
                  }}>
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button onClick={handleRegister} disabled={loading} style={{
            width:'100%', padding:'13px', marginTop:8,
            background: loading ? '#3D5068' : '#00C566',
            border:'none', borderRadius:12,
            color:'white', fontWeight:700, fontSize:15,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? '⏳ Creating...' : '🚀 Account Banayein'}
          </button>

          <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#8D9DB8' }}>
            Already account hai?{' '}
            <button onClick={onGoLogin} style={{
              background:'none', border:'none', color:'#00C566',
              fontWeight:700, cursor:'pointer', fontSize:13,
            }}>Login karein</button>
          </p>
        </div>
      </div>
    </div>
  )
}