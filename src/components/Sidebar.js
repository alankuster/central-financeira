import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useFinanceiro } from '../context/FinanceiroContext'
import { supabase } from '../lib/supabase'

const navItems = [
  {
    label: 'Visão Geral',
    items: [
      { path: '/', icon: 'layout-dashboard', label: 'Dashboard' },
      { path: '/ia', icon: 'sparkles', label: 'IA Consultora' },
    ]
  },
  {
    label: 'Finanças',
    items: [
      { path: '/receitas', icon: 'arrow-down-circle', label: 'Receitas' },
      { path: '/despesas', icon: 'arrow-up-circle', label: 'Despesas' },
      { path: '/contas-a-pagar', icon: 'calendar-due', label: 'Contas a Pagar', badgeContas: true },
      { path: '/fluxo-caixa', icon: 'arrows-exchange', label: 'Fluxo de Caixa' },
      { path: '/radar', icon: 'radar', label: 'Radar de Vazamentos' },
      { path: '/categorias', icon: 'tag', label: 'Categorias' },
    ]
  },
  {
    label: 'Dívidas',
    items: [
      { path: '/dividas', icon: 'alert-triangle', label: 'Central de Dívidas', badge: true },
      { path: '/acordos', icon: 'handshake', label: 'Acordos & Serasa' },
    ]
  },
  {
    label: 'Planejamento',
    items: [
      { path: '/sonhos', icon: 'stars', label: 'Plano de Sonhos' },
      { path: '/score', icon: 'chart-line', label: 'Score & Crédito' },
      { path: '/reuniao', icon: 'users', label: 'Reunião do Casal' },
    ]
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dados } = useFinanceiro()
  const [contasAtrasadas, setContasAtrasadas] = useState(0)

  useEffect(() => {
    async function carregarContas() {
      const hoje = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('despesas').select('id').neq('status', 'paga').lt('data', hoje)
      setContasAtrasadas(data?.length || 0)
    }
    carregarContas()
  }, [])

  const dividasNeg = dados?.dividas?.filter(d => d.status === 'negativado').length || 0

  const semaforoInfo = {
    verde: { color: 'var(--green)', label: 'Pode gastar', shadow: '0 0 6px var(--green)' },
    amarelo: { color: 'var(--amber)', label: 'Atenção', shadow: '0 0 6px var(--amber)' },
    vermelho: { color: 'var(--red)', label: 'Não recomendado', shadow: '0 0 6px var(--red)' },
  }
  const sem = semaforoInfo[dados?.semaforo || 'verde']

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-title">Central Financeira<br />Familiar</div>
        <div className="logo-sub">Alan & Vanessa</div>
      </div>
      <nav className="nav">
        {navItems.map(section => (
          <div key={section.label} className="nav-section">
            <span className="nav-label">{section.label}</span>
            {section.items.map(item => (
              <button key={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`} onClick={() => navigate(item.path)}>
                <i className={`ti ti-${item.icon}`} />
                {item.label}
                {item.badge && dividasNeg > 0 && <span className="nav-badge">{dividasNeg}</span>}
                {item.badgeContas && contasAtrasadas > 0 && <span className="nav-badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>{contasAtrasadas}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="semaforo-mini">
        <div className="dot" style={{ background: sem.color, boxShadow: sem.shadow }} />
        <div>
          <div class="semaforo-text">Situação atual</div>
          <div className="semaforo-valor" style={{ color: sem.color }}>{sem.label}</div>
        </div>
      </div>
    </aside>
  )
}
