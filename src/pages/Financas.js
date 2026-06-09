import React, { useState, useEffect } from 'react'
import { useFinanceiro } from '../context/FinanceiroContext'
import { formatBRL, getReceitas, getDespesas, updateReceita, deleteReceita, updateDespesa, deleteDespesa } from '../lib/supabase'
import { MetricCard, StatusBadge, EmptyState, showToast, Spinner } from '../components/UI'
import LancamentoRapido from '../components/LancamentoRapido'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// ─── RECEITAS ──────────────────────────────────────────────────
export function Receitas() {
  const { dados, recarregar } = useFinanceiro()
  const [modalOpen, setModalOpen] = useState(false)
  const receitas = dados?.receitas || []

  const totalRecebido = receitas.filter(r => r.status === 'recebida').reduce((s, r) => s + Number(r.valor), 0)
  const totalConfirmado = receitas.filter(r => r.status === 'confirmada').reduce((s, r) => s + Number(r.valor), 0)
  const totalPrevisto = receitas.reduce((s, r) => s + Number(r.valor), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Receitas</div>
          <div className="page-sub">Previstas, confirmadas e recebidas</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="ti ti-plus" />Nova receita
        </button>
      </div>

      <div className="cards-grid-3">
        <MetricCard label="Previsto" value={formatBRL(totalPrevisto)} color="" />
        <MetricCard label="Confirmado" value={formatBRL(totalConfirmado + totalRecebido)} color="amber" />
        <MetricCard label="Recebido" value={formatBRL(totalRecebido)} color="green" />
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Todas as receitas do mês</div>
        </div>
        {receitas.length === 0 ? (
          <EmptyState icon="arrow-down-circle" text="Nenhuma receita cadastrada este mês." />
        ) : (
          <div className="tx-list">
            {receitas.map(r => (
              <div key={r.id} className="tx-item">
                <div className={`avatar ${r.responsavel}`}>{r.responsavel === 'alan' ? 'A' : r.responsavel === 'vanessa' ? 'V' : 'F'}</div>
                <div className="tx-info">
                  <div className="tx-desc">{r.descricao}</div>
                  <div className="tx-meta">{r.data} · {r.categoria} · {r.responsavel === 'alan' ? 'Alan' : r.responsavel === 'vanessa' ? 'Vanessa' : 'Família'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tx-val in">+{formatBRL(r.valor)}</div>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LancamentoRapido open={modalOpen} onClose={() => { setModalOpen(false); recarregar() }} />
    </div>
  )
}

// ─── DESPESAS ──────────────────────────────────────────────────
const CORES = ['#4ADE80', '#60A5FA', '#F87171', '#FCD34D', '#A78BFA', '#34D399', '#F97316', '#E879F9']

export function Despesas() {
  const { dados, recarregar } = useFinanceiro()
  const [modalOpen, setModalOpen] = useState(false)
  const despesas = dados?.despesas || []

  const total = despesas.reduce((s, d) => s + Number(d.valor), 0)

  // Agrupar por categoria
  const porCategoria = despesas.reduce((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + Number(d.valor)
    return acc
  }, {})
  const pieData = Object.entries(porCategoria).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Despesas</div>
          <div className="page-sub">Lançamento rápido — menos de 5 segundos</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="ti ti-plus" />Lançar gasto
        </button>
      </div>

      <div className="cards-grid-3">
        <MetricCard label="Total do mês" value={formatBRL(total)} color="amber" />
        <MetricCard label="Lançamentos" value={despesas.length} color="" />
        <MetricCard label="Média diária" value={formatBRL(total / 30)} color="" />
      </div>

      <div className="row-2">
        <div className="panel">
          <div className="panel-header"><div className="panel-title">Por categoria</div></div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: CORES[i % CORES.length] }} />
                    {d.name} · {formatBRL(d.value)}
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState icon="chart-pie" text="Sem dados para exibir" />}
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">Maiores gastos</div></div>
          {pieData.slice(0, 5).map((d, i) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: CORES[i] }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13 }}>{d.name}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>{formatBRL(d.value)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Todos os lançamentos</div></div>
        {despesas.length === 0 ? (
          <EmptyState icon="arrow-up-circle" text="Nenhuma despesa este mês." />
        ) : (
          <div className="tx-list">
            {despesas.map(d => (
              <div key={d.id} className="tx-item">
                <div className="tx-icon out"><i className="ti ti-arrow-up" /></div>
                <div className="tx-info">
                  <div className="tx-desc">{d.descricao}</div>
                  <div className="tx-meta">{d.data} · {d.categoria} · {d.responsavel === 'alan' ? 'Alan' : d.responsavel === 'vanessa' ? 'Vanessa' : 'Família'}</div>
                </div>
                <div className="tx-val out">-{formatBRL(d.valor)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <LancamentoRapido open={modalOpen} onClose={() => { setModalOpen(false); recarregar() }} />
    </div>
  )
}

// ─── DÍVIDAS ──────────────────────────────────────────────────
export function Dividas() {
  const { dados, recarregar } = useFinanceiro()
  const [modalOpen, setModalOpen] = useState(false)
  const [estrategia, setEstrategia] = useState('inteligente')
  const dividas = dados?.dividas || []

  const totalDividas = dividas.reduce((s, d) => s + Number(d.valor_atual), 0)
  const negativadas = dividas.filter(d => d.status === 'negativado').length
  const emDia = dividas.filter(d => d.status === 'em_dia').length

  const dividasOrdenadas = [...dividas].sort((a, b) => {
    if (estrategia === 'bola') return Number(a.valor_atual) - Number(b.valor_atual)
    if (estrategia === 'avalanche') return (Number(b.taxa_juros) || 0) - (Number(a.taxa_juros) || 0)
    return Number(b.valor_atual) - Number(a.valor_atual)
  })

  const textos = {
    bola: 'Pague as menores dívidas primeiro para ganhar motivação e momentum. Cada dívida quitada libera recursos para atacar a próxima.',
    avalanche: 'Pague as dívidas com maiores juros primeiro. Você pagará menos no total, mesmo que demore mais para ter a primeira vitória.',
    inteligente: 'A IA combina as duas estratégias: quita a menor dívida negativada para melhorar o score rapidamente, depois ataca as com maiores juros. Melhor custo-benefício.'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Central de Dívidas</div>
          <div className="page-sub">Plano de Liberdade Financeira</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="ti ti-plus" />Nova dívida
        </button>
      </div>

      <div className="cards-grid-3">
        <MetricCard label="Total em dívidas" value={formatBRL(totalDividas)} color="red" />
        <MetricCard label="Negativadas" value={negativadas} color="amber" sub={`${emDia} em dia`} subColor="var(--green)" />
        <MetricCard label="Quitação estimada" value="Dez/2027" color="" />
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div className="panel-title"><i className="ti ti-trophy" />Estratégia de Pagamento</div>
        </div>
        <div className="tabs">
          {[['bola', 'Bola de Neve'], ['avalanche', 'Avalanche'], ['inteligente', '✦ Inteligente']].map(([v, l]) => (
            <button key={v} className={`tab ${estrategia === v ? 'active' : ''}`} onClick={() => setEstrategia(v)}>{l}</button>
          ))}
        </div>
        <div className="ai-diagnostico">{textos[estrategia]}</div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">
            Suas dívidas
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>
              ordenadas pela estratégia ativa
            </span>
          </div>
        </div>
        {dividas.length === 0 ? (
          <EmptyState icon="alert-triangle" text="Nenhuma dívida cadastrada. Use o botão acima para começar." />
        ) : (
          dividasOrdenadas.map((d, i) => (
            <div key={d.id} className="debt-item">
              <div className="debt-icon">
                <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? 'var(--red)' : 'var(--text3)' }}>#{i + 1}</span>
              </div>
              <div className="debt-info">
                <div className="debt-name">{d.credor}</div>
                <div className="debt-orig">
                  Original: {formatBRL(d.valor_original)}
                  {d.taxa_juros && ` · ${d.taxa_juros}%/mês`}
                  {d.valor_parcela && ` · Parcela: ${formatBRL(d.valor_parcela)}`}
                </div>
              </div>
              <div className="debt-right">
                <div className="debt-val">{formatBRL(d.valor_atual)}</div>
                <StatusBadge status={d.status} />
              </div>
            </div>
          ))
        )}
      </div>

      <LancamentoRapido open={modalOpen} onClose={() => { setModalOpen(false); recarregar() }} />
    </div>
  )
}

// ─── ACORDOS ──────────────────────────────────────────────────
export function Acordos() {
  const { dados, recarregar } = useFinanceiro()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Acordos & Serasa</div>
          <div className="page-sub">Negociações, ofertas e análise da IA</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="ti ti-plus" />Registrar acordo
        </button>
      </div>

      <div className="panel">
        <EmptyState icon="handshake" text="Registre ofertas do Serasa Limpa Nome e negociações para análise automática da IA." />
        <div style={{ marginTop: 16 }}>
          <div className="ai-diagnostico">
            <strong>Como usar:</strong> Quando receber uma oferta do Serasa ou de um credor, clique em "Registrar acordo", preencha os valores e a IA analisará automaticamente se vale a pena aceitar, qual o impacto no orçamento e no score.
          </div>
        </div>
      </div>

      <LancamentoRapido open={modalOpen} onClose={() => { setModalOpen(false); recarregar() }} />
    </div>
  )
}
