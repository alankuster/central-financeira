import React, { useState, useEffect } from 'react'
import { supabase, formatBRL } from '../lib/supabase'
import { EmptyState, Spinner } from '../components/UI'

function getMeses() {
  const meses = []
  const hoje = new Date()
  for (let i = -6; i <= 3; i++) {
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

export default function FluxoCaixa() {
  const [mes, setMes] = useState(mesAtualStr())
  const [receitas, setReceitas] = useState([])
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos') // todos, entradas, saidas

  useEffect(() => { carregar() }, [mes])

  async function carregar() {
    setLoading(true)
    const inicio = `${mes}-01`
    const fim = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().split('T')[0]

    const [{ data: rec }, { data: desp }] = await Promise.all([
      supabase.from('receitas').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }),
      supabase.from('despesas').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }),
    ])

    setReceitas(rec || [])
    setDespesas(desp || [])
    setLoading(false)
  }

  const hoje = new Date().toISOString().split('T')[0]
  const mesLabel = getMeses().find(m => m.val === mes)?.label || mes

  // Totais
  const totalEntradas = receitas.filter(r => r.status === 'recebida').reduce((s, r) => s + Number(r.valor), 0)
  const totalEntradasPrevistas = receitas.reduce((s, r) => s + Number(r.valor), 0)
  const totalPago = despesas.filter(d => d.status === 'paga').reduce((s, d) => s + Number(d.valor), 0)
  const totalPendente = despesas.filter(d => d.status !== 'paga').reduce((s, d) => s + Number(d.valor), 0)
  const totalSaidas = totalPago + totalPendente
  const saldo = totalEntradas - totalPago
  const saldoProjetado = totalEntradasPrevistas - totalSaidas

  // Montar linha do tempo unificada
  const todos = [
    ...receitas.map(r => ({ ...r, _tipo: 'receita' })),
    ...despesas.map(d => ({ ...d, _tipo: 'despesa' })),
  ].sort((a, b) => new Date(b.data) - new Date(a.data))

  const filtrados = filtro === 'entradas' ? todos.filter(i => i._tipo === 'receita')
    : filtro === 'saidas' ? todos.filter(i => i._tipo === 'despesa')
    : todos

  function statusIcon(item) {
    if (item._tipo === 'receita') {
      if (item.status === 'recebida') return { icon: '✅', cor: 'var(--green)', label: 'Recebida' }
      if (item.status === 'confirmada') return { icon: '◐', cor: 'var(--amber)', label: 'Confirmada' }
      return { icon: '◯', cor: 'var(--text3)', label: 'Prevista' }
    } else {
      const atrasada = item.status !== 'paga' && item.data < hoje
      if (item.status === 'paga') return { icon: '✅', cor: 'var(--green)', label: 'Pago' }
      if (atrasada) return { icon: '⚠️', cor: 'var(--red)', label: 'Atrasado' }
      return { icon: '⏳', cor: 'var(--amber)', label: 'Pendente' }
    }
  }

  // Agrupar por data
  const porData = filtrados.reduce((acc, item) => {
    if (!acc[item.data]) acc[item.data] = []
    acc[item.data].push(item)
    return acc
  }, {})

  const datasOrdenadas = Object.keys(porData).sort((a, b) => new Date(a) - new Date(b)).reverse()
  // Futuros primeiro, depois passado — mas dentro do mês, mais próximo primeiro

  function formatData(data) {
    return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fluxo de Caixa</div>
          <div className="page-sub">Tudo que entrou e saiu — linha por linha</div>
        </div>
        <select className="form-input" value={mes} onChange={e => setMes(e.target.value)} style={{ width: 'auto' }}>
          {getMeses().map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
        </select>
      </div>

      {/* Totais */}
      <div className="cards-grid" style={{ marginBottom: 20 }}>
        <div className="card green">
          <div className="card-label">Entrou (recebido)</div>
          <div className="card-value">{formatBRL(totalEntradas)}</div>
          <div className="card-change" style={{ color: 'var(--text3)' }}>
            {receitas.filter(r => r.status === 'recebida').length} lançamento(s)
          </div>
        </div>
        <div className="card red">
          <div className="card-label">Saiu (pago)</div>
          <div className="card-value">{formatBRL(totalPago)}</div>
          <div className="card-change" style={{ color: 'var(--text3)' }}>
            {despesas.filter(d => d.status === 'paga').length} lançamento(s)
          </div>
        </div>
        <div className={`card ${saldo >= 0 ? 'green' : 'red'}`}>
          <div className="card-label">Saldo real</div>
          <div className="card-value">{formatBRL(saldo)}</div>
          <div className="card-change" style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {saldo >= 0 ? '↑ Positivo' : '↓ Negativo'}
          </div>
        </div>
        <div className="card amber">
          <div className="card-label">Ainda pendente</div>
          <div className="card-value">{formatBRL(totalPendente)}</div>
          <div className="card-change" style={{ color: 'var(--text3)' }}>
            {despesas.filter(d => d.status !== 'paga').length} conta(s)
          </div>
        </div>
      </div>

      {/* Filtro */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${filtro === 'todos' ? 'active' : ''}`} onClick={() => setFiltro('todos')}>
          Tudo ({todos.length})
        </button>
        <button className={`tab ${filtro === 'entradas' ? 'active' : ''}`} onClick={() => setFiltro('entradas')}>
          ↓ Entradas ({receitas.length})
        </button>
        <button className={`tab ${filtro === 'saidas' ? 'active' : ''}`} onClick={() => setFiltro('saidas')}>
          ↑ Saídas ({despesas.length})
        </button>
      </div>

      {/* Linha do tempo */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : filtrados.length === 0 ? (
        <div className="panel">
          <EmptyState icon="calendar" text={`Nenhum lançamento em ${mesLabel}.`} />
        </div>
      ) : (
        <div className="panel">
          {datasOrdenadas.map(data => {
            const itens = porData[data]
            const saldoDia = itens.reduce((s, i) => {
              if (i._tipo === 'receita' && i.status === 'recebida') return s + Number(i.valor)
              if (i._tipo === 'despesa' && i.status === 'paga') return s - Number(i.valor)
              return s
            }, 0)

            return (
              <div key={data} style={{ marginBottom: 20 }}>
                {/* Cabeçalho do dia */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'capitalize' }}>
                    📅 {formatData(data)}
                  </span>
                  {saldoDia !== 0 && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: saldoDia >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {saldoDia >= 0 ? '+' : ''}{formatBRL(saldoDia)}
                    </span>
                  )}
                </div>

                {/* Itens do dia */}
                {itens.map(item => {
                  const st = statusIcon(item)
                  const isEntrada = item._tipo === 'receita'
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 'var(--radius-sm)', marginBottom: 6, background: 'var(--bg3)' }}>
                      {/* Ícone tipo */}
                      <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, background: isEntrada ? 'var(--green-bg)' : 'var(--red-bg)', color: isEntrada ? 'var(--green)' : 'var(--red)' }}>
                        <i className={`ti ti-arrow-${isEntrada ? 'down' : 'up'}`} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.descricao}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{item.categoria}</span>
                          <span>·</span>
                          <span>{item.responsavel === 'alan' ? 'Alan' : item.responsavel === 'vanessa' ? 'Vanessa' : 'Família'}</span>
                          <span>·</span>
                          <span style={{ color: st.cor }}>{st.icon} {st.label}</span>
                        </div>
                      </div>

                      {/* Valor */}
                      <div style={{ fontSize: 14, fontWeight: 700, color: isEntrada ? 'var(--green)' : item.status !== 'paga' && item.data < hoje ? 'var(--red)' : item.status !== 'paga' ? 'var(--amber)' : 'var(--text)', whiteSpace: 'nowrap' }}>
                        {isEntrada ? '+' : '-'}{formatBRL(item.valor)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Resumo do mês no final */}
          <div style={{ marginTop: 8, padding: '14px', background: 'var(--bg4)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Resumo — {mesLabel}</span>
            <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
              <span style={{ color: 'var(--green)' }}>↓ {formatBRL(totalEntradas)}</span>
              <span style={{ color: 'var(--red)' }}>↑ {formatBRL(totalPago)}</span>
              <span style={{ fontWeight: 700, color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>= {formatBRL(saldo)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
