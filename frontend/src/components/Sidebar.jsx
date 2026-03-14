import { LayoutDashboard, Bell, Calculator, Shield, ShoppingBag } from 'lucide-react'

const NAV = [
  { key: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { key: 'reminders',  icon: Bell,            label: 'Reminders' },
  { key: 'calculator', icon: Calculator,      label: 'P&L Calculator' },
  { key: 'risk',       icon: Shield,         label: 'AI Risk Intel' },
  { key: 'shopify',    icon: ShoppingBag,    label: 'Shopify Sync' },
]

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <div style={{
      width: 220, background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--glass2)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 12px 12px' }}>
        <div style={{
          background: '#00C566', borderRadius: 14,
          padding: '12px 16px', display: 'flex',
          alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🇵🇰</span>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
            PakDelivery Pro
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--glass2)', margin: '0 16px 12px' }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 8px' }}>
        {NAV.map(({ key, icon: Icon, label }) => {
          const active = activeTab === key
          return (
            <button key={key} onClick={() => onTabChange(key)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 12, padding: '12px 14px', borderRadius: 12,
                border: active ? '1px solid #00C566' : '1px solid transparent',
                background: active ? 'var(--glass)' : 'transparent',
                color: active ? 'var(--text-white)' : 'var(--text-mid)',
                fontWeight: active ? 700 : 500, fontSize: 13,
                cursor: 'pointer', marginBottom: 4,
                transition: 'all 0.15s ease',
              }}>
              <Icon size={18} color={active ? '#00C566' : 'var(--text-mid)'} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* WhatsApp status */}
      <div style={{ padding: '0 12px 16px' }}>
        <div style={{
          background: 'var(--glass)', border: '1px solid #1A3D28',
          borderRadius: 12, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: '#00C566', fontSize: 10 }}>●</span>
          <span style={{ color: '#00C566', fontSize: 11, fontWeight: 700 }}>
            WhatsApp Connected
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 'auto' }}>
            UltraMsg
          </span>
        </div>
      </div>
    </div>
  )
}