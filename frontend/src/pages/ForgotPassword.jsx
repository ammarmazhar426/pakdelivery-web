import { useState } from 'react'
import { ShoppingBag, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ForgotPassword({ onGoLogin }) {
  const [step,        setStep]       = useState(1)  // 1=email, 2=otp+newpass
  const [email,       setEmail]      = useState('')
  const [otp,         setOtp]        = useState('')
  const [newPassword, setNewPassword]= useState('')
  const [loading,     setLoading]    = useState(false)

  const inp = {
    width:'100%', padding:'12px 14px',
    background:'rgba(255,255,255,0.05)',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:12, color:'white', fontSize:14,
    outline:'none', boxSizing:'border-box',
  }

  const handleSendOTP = async () => {
    if (!email) return toast.error('Email daalo')
    setLoading(true)
    try {
      await axios.post(`${API}/auth/forgot-password`, { email })
      toast.success('OTP bhej diya — email check karein! 📧')
      setStep(2)
    } catch(e) {
      toast.error(e.response?.data?.detail || 'Email nahi mila')
    } finally { setLoading(false) }
  }

  const handleResetPassword = async () => {
    if (!otp || !newPassword) return toast.error('OTP aur naya password daalo')
    if (newPassword.length < 6) return toast.error('Password 6 characters se zyada hona chahiye')
    setLoading(true)
    try {
      await axios.post(`${API}/auth/reset-password`, { email, otp, new_password: newPassword })
      toast.success('Password reset ho gaya! Ab login karein ✅')
      onGoLogin()
    } catch(e) {
      toast.error(e.response?.data?.detail || 'OTP galat ya expire ho gaya')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'#080C14',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16,
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
        </div>

        <div style={{
          background:'#111827', borderRadius:24,
          border:'1px solid rgba(255,255,255,0.08)', padding:32,
        }}>
          <button onClick={onGoLogin} style={{
            background:'none', border:'none', cursor:'pointer',
            color:'#8D9DB8', display:'flex', alignItems:'center', gap:6,
            fontSize:13, marginBottom:20, padding:0,
          }}>
            <ArrowLeft size={14}/> Login pe wapis jao
          </button>

          <h2 style={{ fontSize:20, fontWeight:700, color:'white', marginBottom:8 }}>
            {step === 1 ? '🔐 Password Bhool Gaye?' : '✉️ OTP Daalo'}
          </h2>
          <p style={{ fontSize:13, color:'#8D9DB8', marginBottom:24 }}>
            {step === 1
              ? 'Apni email daalo — hum OTP bhejenge'
              : `OTP ${email} pe bheja gaya hai — 10 minute mein expire hoga`
            }
          </p>

          {step === 1 ? (
            <>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:'#8D9DB8', fontWeight:600, display:'block', marginBottom:6 }}>Email</label>
                <input
                  type="email" placeholder="aap@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleSendOTP()}
                  style={inp}
                />
              </div>
              <button onClick={handleSendOTP} disabled={loading} style={{
                width:'100%', padding:'13px',
                background: loading ? '#3D5068' : '#00C566',
                border:'none', borderRadius:12, color:'white',
                fontWeight:700, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? '⏳ Bhej raha hai...' : '📧 OTP Bhejo'}
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:12, color:'#8D9DB8', fontWeight:600, display:'block', marginBottom:6 }}>OTP Code</label>
                <input
                  type="text" placeholder="6-digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value)}
                  maxLength={6}
                  style={{ ...inp, letterSpacing:8, fontSize:20, textAlign:'center' }}
                />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color:'#8D9DB8', fontWeight:600, display:'block', marginBottom:6 }}>Naya Password</label>
                <input
                  type="password" placeholder="Min 6 characters"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleResetPassword()}
                  style={inp}
                />
              </div>
              <button onClick={handleResetPassword} disabled={loading} style={{
                width:'100%', padding:'13px',
                background: loading ? '#3D5068' : '#00C566',
                border:'none', borderRadius:12, color:'white',
                fontWeight:700, fontSize:15, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? '⏳ Reset ho raha hai...' : '🔑 Password Reset Karein'}
              </button>
              <button onClick={() => setStep(1)} style={{
                width:'100%', padding:'10px', marginTop:10,
                background:'none', border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:12, color:'#8D9DB8',
                fontWeight:600, fontSize:13, cursor:'pointer',
              }}>
                Dobara OTP bhejo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}