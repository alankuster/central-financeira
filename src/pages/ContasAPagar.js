import React, { useState, useEffect } from 'react'
import { supabase, formatBRL } from '../lib/supabase'
import { showToast, EmptyState, Spinner, Modal } from '../components/UI'
import LancamentoRapido from '../components/LancamentoRapido'

export default function ContasAPagar() {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const hoje = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .neq('status', 'paga')
      .order('data', { ascending: true })
    
    // Atualizar status para atrasada automaticamente
    const atualizadas = (data || []).map(c => ({
      ...c,
      status_real: c.data < hoje ? 'atrasada' : 'pendente'
    }))
    setContas(atualizadas)
    setLoading(false)
  }

  async function marcarPaga(id) {
    await supabase.from('despesas').update({ status: 'paga' }).eq('id', id)
    showToast('✓ Conta marcada como paga!')
    carregar()
  }

  const atrasadas = contas.filter(c => c.status_real === 'atrasada')
  const pendentes = contas.filter(c => c.status_real === 'pendente')
  const totalAtrasado = atrasadas.reduce((s, c) => s + Number(c.valor), 0)
  const totalPendente = pendentes.reduce((s, c) => s + Number(c.valor), 0)

  const hoje = new Date().toISOString().split('T')[0]

  function diasAtraso(data) {
    const diff = Math.floor((new Date(hoje) - new Date(data)) / (1000 * 60 * 60 * 24))
    return diff
  }

  function diasRestantes(data) {
    const diff = Math.floor((new Date(data) - new Date(hoje)) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Contas a Pagar</div>
          <div className="page-sub">Pendentes e atrasadas em destaque</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="ti ti-plus" />Nova conta
        </button>
      </div>

      {/* Resumo */}
      <div className="cards-grid-3" style={{ marginBottom: 20 }}>
        <div className="card red">
          <div className="card-label">Atrasadas</div>
          <div className="card-value">{formatBRL(totalAtrasado)}</div>
          <div className="card-change" style={{ color: 'var(--red)' }}>{atrasadas.length} conta(s)</div>
        </div>
        <div className="card amber">
          <div className="card-label">A vencer</div>
          <div className="card-value">{formatBRL(totalPendente)}</div>
          <div className="card-change" style={{ color: 'var(--amber)' }}>{pendentes.length} conta(s)</div>
        </div>
        <div className="card">
          <div className="card-label">Total em aberto</div>
          <div className="card-value" style={{ color: 'var(--text)' }}>{formatBRL(totalAtrasado + totalPendente)}</div>
          <div className="card-change" style={{ color: 'var(--text3)' }}>{contas.length} conta(s)</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <>
          {/* Atrasadas */}
          {atrasadas.length > 0 && (
            <div className="panel" style={{ marginBottom: 16, border: '1px solid var(--red-dim)' }}>
              <div className="panel-header">
                <div className="panel-title" style={{ color: 'var(--red)' }}>
                  <i className="ti ti-alert-circle" />Atrasadas — Pague agora!
                </div>
              </div>
              {atrasadas.map(conta => (
                <div key={conta.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--red-bg)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{conta.descricao}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {conta.categoria} · Venceu em {conta.data} · <span style={{ color: 'var(--red)' }}>{diasAtraso(conta.data)} dia(s) atrasada</span>
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

          {/* Pendentes */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-clock" />A vencer</div>
            </div>
            {pendentes.length === 0 && atrasadas.length === 0 ? (
              <EmptyState icon="check" text="Nenhuma conta pendente. Tudo em dia!" />
            ) : pendentes.length === 0 ? (
              <EmptyState icon="check" text="Nenhuma conta a vencer." />
            ) : (
              pendentes.map(conta => {
                const dias = diasRestantes(conta.data)
                const urgente = dias <= 3
                return (
                  <div key={conta.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: urgente ? 'var(--amber-bg)' : 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: 8, border: urgente ? '1px solid var(--amber-dim)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{conta.descricao}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        {conta.categoria} · Vence em {conta.data} · 
                        <span style={{ color: urgente ? 'var(--amber)' : 'var(--text3)' }}>
                          {' '}{dias === 0 ? 'Hoje!' : dias === 1 ? 'Amanhã!' : `${dias} dias`}
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
        </>
      )}

      <LancamentoRapido open={modalOpen} onClose={() => { setModalOpen(false); carregar() }} defaultStatus="pendente" />
    </div>
  )
}
