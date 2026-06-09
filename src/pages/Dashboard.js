import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useFinanceiro } from '../context/FinanceiroContext'
import { formatBRL } from '../lib/supabase'
import { gerarDiagnosticoAutomatico } from '../lib/ia'
import { MetricCard, AIBadge, ProgressBar, Spinner } from '../components/UI'
import LancamentoRapido from '../components/LancamentoRapido'

export default function Dashboard() {
  const { dados, loading, recarregar } = useFinanceiro()
  const [diagnostico, setDiagnostico] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  // Diagnóstico só é gerado quando o usuário clicar — não automático

  async function carregarDiagnostico() {
    if (!dados) return
    setLoadingIA(true)
    try {
      const texto = await gerarDiagnosticoAutomatico(dados)
      setDiagnostico(texto)
    } catch {
      setDiagnostico('Conecte a IA Consultora para diagnósticos automáticos.')
    } finally {
      setLoadingIA(false)
    }
  }

  if (loading || !dados) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Spinner />
      </div>
    )
  }

  const { totalRecebido, totalDespesas, saldo, gastoSeguroHoje, gastoSeguroSemana, gastoSeguroMes, semaforo, dividas, receitas, despesas, objetivos } = dados

  const semaforoConfig = {
    verde: { dots: [true, false, false], texto: 'Pode gastar com tranquilidade', cor: 'var(--green)' },
    amarelo: { dots: [false, true, false], texto: 'Atenção — monitore os gastos', cor: 'var(--amber)' },
    vermelho: { dots: [false, false, true], texto: 'Não recomendado gastar agora', cor: 'var(--red)' },
  }
  const sem = semaforoConfig[semaforo]

  const totalDividas = dividas.reduce((s, d) => s + Number(d.valor_atual), 0)
  const dividasQuitadas = dividas.filter(d => d.status === 'quitado').reduce((s, d) => s + Number(d.valor_original), 0)
  const totalOriginalDividas = dividas.reduce((s, d) => s + Number(d.valor_original), 0) + dividasQuitadas
  const pctDividas = totalOriginalDividas > 0 ? ((dividasQuitadas / totalOriginalDividas) * 100) : 0

  const ultimosLancamentos = [
    ...receitas.slice(0, 3).map(r => ({ ...r, tipo: 'receita' })),
    ...despesas.slice(0, 3).map(d => ({ ...d, tipo: 'despesa' }))
  ].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 6)

  const receitasAlan = receitas.filter(r => r.responsavel === 'alan').reduce((s, r) => s + Number(r.valor), 0)
  const receitasVanessa = receitas.filter(r => r.responsavel === 'vanessa').reduce((s, r) => s + Number(r.valor), 0)

  const hoje = new Date()
  const nomeHoje = format(hoje, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const saudacao = hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

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

      {/* Métricas principais */}
      <div className="cards-grid">
        <MetricCard
          label="Saldo disponível"
          value={formatBRL(saldo)}
          color={saldo >= 0 ? 'green' : 'red'}
          sub={saldo >= 0 ? '↑ No positivo' : '↓ No negativo'}
          subColor={saldo >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <MetricCard
          label="Entradas do mês"
          value={formatBRL(totalRecebido)}
          color="blue"
          sub="Alan + Vanessa"
          subColor="var(--text3)"
        />
        <MetricCard
          label="Saídas do mês"
          value={formatBRL(totalDespesas)}
          color="amber"
          sub={`${despesas.length} lançamentos`}
          subColor="var(--text3)"
        />
        <MetricCard
          label="Resultado do mês"
          value={formatBRL(saldo)}
          color={saldo >= 0 ? 'green' : 'red'}
          sub={saldo >= 0 ? '✓ Positivo' : '✗ Negativo'}
          subColor={saldo >= 0 ? 'var(--green)' : 'var(--red)'}
        />
      </div>

      {/* Semáforo + IA */}
      <div className="semaforo-widget">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Semáforo Financeiro</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {['verde','amarelo','vermelho'].map((s, i) => {
              const ativo = semaforo === s
              const cores = { verde: 'var(--green)', amarelo: 'var(--amber)', vermelho: 'var(--red)' }
              const bgs = { verde: 'var(--green-dim)', amarelo: 'var(--amber-bg)', vermelho: 'var(--red-bg)' }
              return (
                <div key={s} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: ativo ? bgs[s] : 'transparent',
                  border: `3px solid ${ativo ? cores[s] : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: ativo ? cores[s] : 'var(--text3)',
                  opacity: ativo ? 1 : 0.25
                }}>●</div>
              )
            })}
          </div>
        </div>
        <div style={{ fontSize: 13, color: sem.cor, marginBottom: 12, fontWeight: 500 }}>
          {sem.texto}
        </div>
        <button
          onClick={carregarDiagnostico}
          disabled={loadingIA}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <AIBadge text={loadingIA ? "Analisando..." : "▶ Gerar diagnóstico"} />
        </button>
        <div className="ai-diagnostico">
          {loadingIA
            ? <><Spinner /> <span style={{ marginLeft: 8, color: 'var(--text3)', fontSize: 13 }}>Analisando sua situação financeira...</span></>
            : diagnostico || 'Configure a chave da API para receber diagnósticos automáticos.'}
        </div>
        <div className="safe-spend" style={{ marginTop: 12 }}>
          <div className="safe-item">
            <div className="safe-label">Hoje</div>
            <div className="safe-val">{formatBRL(gastoSeguroHoje)}</div>
          </div>
          <div className="safe-item">
            <div className="safe-label">Esta semana</div>
            <div className="safe-val">{formatBRL(gastoSeguroSemana)}</div>
          </div>
          <div className="safe-item">
            <div className="safe-label">Este mês</div>
            <div className="safe-val">{formatBRL(gastoSeguroMes)}</div>
          </div>
        </div>
      </div>

      <div className="row-3">
        {/* Lançamentos recentes */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><i className="ti ti-clock" />Lançamentos recentes</div>
          </div>
          <div className="tx-list">
            {ultimosLancamentos.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 24, fontSize: 13 }}>
                Nenhum lançamento ainda.<br />Use o botão Lançar para começar.
              </div>
            )}
            {ultimosLancamentos.map(item => (
              <div key={item.id} className="tx-item">
                <div className={`tx-icon ${item.tipo === 'receita' ? 'in' : 'out'}`}>
                  <i className={`ti ti-arrow-${item.tipo === 'receita' ? 'down' : 'up'}`} />
                </div>
                <div className="tx-info">
                  <div className="tx-desc">{item.descricao}</div>
                  <div className="tx-meta">
                    {item.data} · {item.categoria}
                    {item.responsavel && ` · ${item.responsavel === 'alan' ? 'Alan' : item.responsavel === 'vanessa' ? 'Vanessa' : 'Família'}`}
                  </div>
                </div>
                <div className={`tx-val ${item.tipo === 'receita' ? 'in' : 'out'}`}>
                  {item.tipo === 'receita' ? '+' : '-'}{formatBRL(item.valor)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="col-stack">
          {/* Progresso dívidas */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-target" />Dívidas</div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text2)' }}>Total: {formatBRL(totalDividas)}</span>
                <span style={{ color: 'var(--green)' }}>{pctDividas.toFixed(0)}% quitado</span>
              </div>
              <ProgressBar pct={pctDividas} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>
              {dividas[0] ? `Próxima: ${dividas[0].credor}` : 'Sem dívidas ativas'}
            </div>
            {dividas[0]?.valor_parcela && (
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--amber)' }}>
                {formatBRL(dividas[0].valor_parcela)}
                {dividas[0].data_vencimento ? ` · ${dividas[0].data_vencimento}` : ''}
              </div>
            )}
          </div>

          {/* Receitas por membro */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-users" />Receitas por membro</div>
            </div>
            <div className="member-row">
              <div className="avatar alan">A</div>
              <div className="member-info">
                <div className="member-name">Alan</div>
                <div className="member-role">MEI · Nota fiscal</div>
              </div>
              <div className="member-val">{formatBRL(receitasAlan)}</div>
            </div>
            <div className="member-row">
              <div className="avatar vanessa">V</div>
              <div className="member-info">
                <div className="member-name">Vanessa</div>
                <div className="member-role">Renda variável</div>
              </div>
              <div className="member-val">{formatBRL(receitasVanessa)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* FAB mobile */}
      <button className="mobile-fab" onClick={() => setModalOpen(true)}>
        <i className="ti ti-plus" />
      </button>

      <LancamentoRapido open={modalOpen} onClose={() => { setModalOpen(false); recarregar() }} />
    </div>
  )
}
