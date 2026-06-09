import React, { useState, useEffect } from 'react'
import { supabase, formatBRL } from '../lib/supabase'
import { showToast, EmptyState, Spinner } from '../components/UI'
import LancamentoRapido from '../components/LancamentoRapido'

function getMeses() {
  const meses = []
  const hoje = new Date()
  for (let i = -3; i <= 6; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    meses.push({ val, label })
  }
  return meses
}

function mesAtualStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

export default function ContasAPagar() {
  const [mes, setMes] = useState(mesAtualStr())
  const [atrasadas, setAtrasadas] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { carregar() }, [mes])

  async function carregar() {
    setLoading(true)
    const hoje = new Date().toISOString().split('T')[0]
    const inicio = `${mes}-01`
    const fim = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().split('T')[0]

    // Atrasadas: TODAS independente do mês
    const { data: atras } = await supabase
      .from('despesas')
      .select('*')
      .neq('status', 'paga')
      .lt('data', hoje)
      .order('data', { ascending: true })

    // Pendentes: só do mês selecionado
    const { data: pend } = await supabase
      .from('despesas')
      .select('*')
      .neq('status', 'paga')
      .gte('data', hoje)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: true })

    setAtrasadas(atras || [])
    setPendentes(pend || [])
    setLoading(false)
  }

  async function marcarPaga(id) {
    await supabase.from('despesas').update({ status: 'paga' }).eq('id', id)
    showToast('✓ Conta marcada como paga!')
    carregar()
  }

  const hoje = new Date().toISOString().split('T')[0]
  const totalAtrasado = atrasadas.reduce((s, c) => s + Number(c.valor), 0)
  const totalPendente = pendentes.reduce((s, c) => s + Number(c.valor), 0)
  const mesLabel = getMeses().find(m => m.val === mes)?.label || mes

  function diasAtraso(data) {
    return Math.floor((new Date(hoje) - new Date(data)) / (1000*60*60*24))
  }
  function diasRestantes(data) {
    return Math.floor((new Date(data) - new Date(hoje)) / (1000*60*60*24))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Contas a Pagar</div>
          <div className="page-sub">Atrasadas: todas · A vencer: filtrado por mês</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-input" value={mes} onChange={e => setMes(e.target.value)} style={{ width: 'auto' }}>
            {getMeses().map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <i className="ti ti-plus" />Nova conta
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="cards-grid-3" style={{ marginBottom: 20 }}>
        <div className="card red">
          <div className="card-label">⚠️ Total atrasado</div>
          <div className="card-value">{formatBRL(totalAtrasado)}</div>
          <div className="card-change" style={{ color: 'var(--red)' }}>{atrasadas.length} conta(s) — todos os meses</div>
        </div>
        <div className="card amber">
          <div className="card-label">A vencer — {mesLabel}</div>
          <div className="card-value">{formatBRL(totalPendente)}</div>
          <div className="card-change" style={{ color: 'var(--amber)' }}>{pendentes.length} conta(s)</div>
        </div>
        <div className="card">
          <div className="card-label">Total em aberto</div>
          <div className="card-value" style={{ color: 'var(--text)' }}>{formatBRL(totalAtrasado + totalPendente)}</div>
          <div className="card-change" style={{ color: 'var(--text3)' }}>{atrasadas.length + pendentes.length} conta(s)</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <>
          {/* ATRASADAS — todas */}
          {atrasadas.length > 0 && (
            <div className="panel" style={{ marginBottom: 16, border: '1px solid var(--red-dim)' }}>
              <div className="panel-header">
                <div className="panel-title" style={{ color: 'var(--red)' }}>
                  <i className="ti ti-alert-circle" />Atrasadas — todos os meses
                </div>
                <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>{formatBRL(totalAtrasado)}</span>
              </div>
              {atrasadas.map(conta => (
                <div key={conta.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--red-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{conta.descricao}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {conta.categoria} · Venceu {conta.data} ·{' '}
                      <span style={{ color: 'var(--red)' }}>{diasAtraso(conta.data)} dia(s) atrasada</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>{formatBRL(conta.valor)}</div>
                    <button className="btn btn-sm" style={{ marginTop: 4, background: 'var(--green-dim)', color: 'var(--green)', border: 'none' }}
                      onClick={() => marcarPaga(conta.id)}>
                      <i className="ti ti-check" />Pagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* A VENCER — mês selecionado */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-clock" />A vencer — {mesLabel}</div>
              {pendentes.length > 0 && <span style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 700 }}>{formatBRL(totalPendente)}</span>}
            </div>
            {pendentes.length === 0 ? (
              <EmptyState icon="check" text={`Nenhuma conta pendente em ${mesLabel} 🎉`} />
            ) : (
              pendentes.map(conta => {
                const dias = diasRestantes(conta.data)
                const urgente = dias <= 3
                return (
                  <div key={conta.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: urgente ? 'var(--amber-bg)' : 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: 8, border: urgente ? '1px solid var(--amber-dim)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{conta.descricao}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {conta.categoria} · Vence {conta.data} ·{' '}
                        <span style={{ color: urgente ? 'var(--amber)' : 'var(--text3)' }}>
                          {dias === 0 ? 'Hoje!' : dias === 1 ? 'Amanhã!' : `em ${dias} dias`}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: urgente ? 'var(--amber)' : 'var(--text)' }}>{formatBRL(conta.valor)}</div>
                      <button className="btn btn-sm" style={{ marginTop: 4, background: 'var(--green-dim)', color: 'var(--green)', border: 'none' }}
                        onClick={() => marcarPaga(conta.id)}>
                        <i className="ti ti-check" />Pagar
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {atrasadas.length === 0 && pendentes.length === 0 && (
            <div className="panel">
              <EmptyState icon="check" text="Tudo em dia! Nenhuma conta pendente ou atrasada 🎉" />
            </div>
          )}
        </>
      )}

      <LancamentoRapido open={modalOpen} onClose={() => { setModalOpen(false); carregar() }} defaultStatus="pendente" />
    </div>
  )
}
