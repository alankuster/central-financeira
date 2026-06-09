import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useFinanceiro } from '../context/FinanceiroContext'
import { formatBRL, supabase } from '../lib/supabase'
import { gerarDiagnosticoAutomatico } from '../lib/ia'
import { AIBadge, Spinner } from '../components/UI'
import LancamentoRapido from '../components/LancamentoRapido'

export default function Dashboard() {
  const { dados, loading, recarregar } = useFinanceiro()
  const [diagnostico, setDiagnostico] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [contasAtrasadas, setContasAtrasadas] = useState([])
  const [contasPendentes, setContasPendentes] = useState([])
  const [receitasPendentes, setReceitasPendentes] = useState([])
  const [loadingExtra, setLoadingExtra] = useState(true)

  useEffect(() => {
    if (dados) carregarExtra()
  }, [dados])

  async function carregarExtra() {
    setLoadingExtra(true)
    const hoje = new Date().toISOString().split('T')[0]
    const mesInicio = hoje.slice(0, 7) + '-01'
    const mesFim = new Date(hoje.slice(0, 4), Number(hoje.slice(5, 7)), 0).toISOString().split('T')[0]

    const [{ data: atras }, { data: pend }, { data: recPend }] = await Promise.all([
      supabase.from('despesas').select('*').neq('status', 'paga').lt('data', hoje).order('data'),
      supabase.from('despesas').select('*').neq('status', 'paga').gte('data', hoje).lte('data', mesFim).order('data'),
      supabase.from('receitas').select('*').neq('status', 'recebida').gte('data', mesInicio).lte('data', mesFim).order('data'),
    ])

    setContasAtrasadas(atras || [])
    setContasPendentes(pend || [])
    setReceitasPendentes(recPend || [])
    setLoadingExtra(false)
  }

  async function carregarDiagnostico() {
    if (!dados) return
    setLoadingIA(true)
    try {
      const texto = await gerarDiagnosticoAutomatico(dados)
      setDiagnostico(texto)
    } catch {
      setDiagnostico('Configure a IA para diagnósticos automáticos.')
    } finally {
      setLoadingIA(false)
    }
  }

  async function marcarRecebida(e, id) {
    e.stopPropagation()
    await supabase.from('receitas').update({ status: 'recebida' }).eq('id', id)
    recarregar(); carregarExtra()
  }

  async function marcarPaga(e, id) {
    e.stopPropagation()
    await supabase.from('despesas').update({ status: 'paga' }).eq('id', id)
    recarregar(); carregarExtra()
  }

  if (loading || !dados) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><Spinner /></div>
  }

  const { totalRecebido, totalDespesas, saldo, semaforo } = dados

  const totalAtrasado = contasAtrasadas.reduce((s, c) => s + Number(c.valor), 0)
  const totalPendenteMes = contasPendentes.reduce((s, c) => s + Number(c.valor), 0)
  const totalVaiEntrar = receitasPendentes.reduce((s, r) => s + Number(r.valor), 0)

  const hoje = new Date()
  const nomeHoje = format(hoje, "EEEE, d 'de' MMMM", { locale: ptBR })
  const saudacao = hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  const semaforoCor = { verde: 'var(--green)', amarelo: 'var(--amber)', vermelho: 'var(--red)' }
  const semaforoLabel = { verde: '● Pode gastar', amarelo: '● Atenção', vermelho: '● Cuidado' }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{saudacao}, Alan & Vanessa ☀️</div>
          <div className="page-sub" style={{ textTransform: 'capitalize' }}>{nomeHoje}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="ti ti-plus" />Lançar
        </button>
      </div>

      {/* 5 cards principais — diretos ao ponto */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>

        {/* Tenho agora */}
        <div style={{ background: 'var(--bg2)', border: `2px solid ${saldo >= 0 ? 'var(--green-dim)' : 'var(--red-dim)'}`, borderRadius: 'var(--radius-lg)', padding: '20px', gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>💰 Tenho agora</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: saldo >= 0 ? 'var(--green)' : 'var(--red)', letterSpacing: '-1px' }}>{formatBRL(saldo)}</div>
          <div style={{ fontSize: 12, color: semaforoCor[semaforo], marginTop: 6, fontWeight: 500 }}>{semaforoLabel[semaforo]}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Recebido este mês: {formatBRL(totalRecebido)} · Pago: {formatBRL(totalDespesas)}
          </div>
        </div>

        {/* Vai entrar */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>📥 Vai entrar</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--blue)' }}>{formatBRL(totalVaiEntrar)}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{receitasPendentes.length} receita(s) prevista(s)</div>
        </div>

        {/* Tenho que pagar este mês */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>📤 Tenho que pagar</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--amber)' }}>{formatBRL(totalPendenteMes)}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{contasPendentes.length} conta(s) este mês</div>
        </div>

      </div>

      {/* Atrasado — destaque se tiver */}
      {contasAtrasadas.length > 0 && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-dim)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-alert-circle" style={{ color: 'var(--red)', fontSize: 18 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>⚠️ Atrasado — pague agora</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{formatBRL(totalAtrasado)}</span>
          </div>
          {contasAtrasadas.slice(0, 3).map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.descricao}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Venceu {c.data}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>{formatBRL(c.valor)}</div>
              <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', border: 'none' }} onClick={e => marcarPaga(e, c.id)}>
                <i className="ti ti-check" />Pagar
              </button>
            </div>
          ))}
          {contasAtrasadas.length > 3 && (
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>
              + {contasAtrasadas.length - 3} conta(s) atrasada(s) — veja em Contas a Pagar
            </div>
          )}
        </div>
      )}

      <div className="row-2">
        {/* Vai entrar — lista */}
        {receitasPendentes.length > 0 && (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-arrow-down-circle" style={{ color: 'var(--blue)' }} />Vai entrar este mês</div>
            </div>
            {receitasPendentes.slice(0, 4).map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                <div className={`avatar ${r.responsavel}`} style={{ width: 28, height: 28, fontSize: 11 }}>
                  {r.responsavel === 'alan' ? 'A' : r.responsavel === 'vanessa' ? 'V' : 'F'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.descricao}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.data} · {r.status === 'confirmada' ? 'Confirmada' : 'Prevista'}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)' }}>{formatBRL(r.valor)}</div>
                <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', border: 'none' }} onClick={e => marcarRecebida(e, r.id)}>
                  <i className="ti ti-check" />Recebi
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Vai sair — lista */}
        {contasPendentes.length > 0 && (
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-arrow-up-circle" style={{ color: 'var(--amber)' }} />Vai sair este mês</div>
            </div>
            {contasPendentes.slice(0, 4).map(c => {
              const dias = Math.floor((new Date(c.data) - new Date()) / (1000*60*60*24))
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.descricao}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {c.data} · {dias === 0 ? 'Hoje!' : dias === 1 ? 'Amanhã!' : `${dias} dias`}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--amber)' }}>{formatBRL(c.valor)}</div>
                  <button className="btn btn-sm" style={{ background: 'var(--green-dim)', color: 'var(--green)', border: 'none' }} onClick={e => marcarPaga(e, c.id)}>
                    <i className="ti ti-check" />Pagar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* IA Diagnóstico — sob demanda */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div className="panel-title"><i className="ti ti-sparkles" />Diagnóstico da IA</div>
          <button onClick={carregarDiagnostico} disabled={loadingIA} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <AIBadge text={loadingIA ? 'Analisando...' : '▶ Gerar agora'} />
          </button>
        </div>
        <div className="ai-diagnostico">
          {loadingIA
            ? <><Spinner /><span style={{ marginLeft: 8, color: 'var(--text3)', fontSize: 13 }}>Analisando sua situação...</span></>
            : diagnostico || 'Clique em "▶ Gerar agora" para receber uma análise personalizada da sua situação financeira.'}
        </div>
      </div>

      <button className="mobile-fab" onClick={() => setModalOpen(true)}>
        <i className="ti ti-plus" />
      </button>

      <LancamentoRapido open={modalOpen} onClose={() => { setModalOpen(false); recarregar(); carregarExtra() }} />
    </div>
  )
}
