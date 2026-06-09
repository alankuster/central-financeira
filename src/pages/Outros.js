import React, { useState, useEffect } from 'react'
import { useFinanceiro } from '../context/FinanceiroContext'
import { formatBRL, getScoreHistorico, insertObjetivo, updateObjetivo } from '../lib/supabase'
import { AIBadge, EmptyState, Modal, showToast, ProgressBar, Spinner } from '../components/UI'
import { analisarRadarVazamentos } from '../lib/ia'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// ─── RADAR DE VAZAMENTOS ──────────────────────────────────────
export function Radar() {
  const { dados } = useFinanceiro()
  const [analise, setAnalise] = useState('')
  const [loading, setLoading] = useState(false)
  const despesas = dados?.despesas || []

  // Calcular alertas locais
  const porCategoria = despesas.reduce((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + Number(d.valor)
    return acc
  }, {})

  const top3 = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0)
  const mediaGasto = totalDespesas / (despesas.length || 1)

  async function analisarComIA() {
    setLoading(true)
    try {
      const resultado = await analisarRadarVazamentos(dados)
      setAnalise(resultado)
    } catch {
      setAnalise('Configure a API para análise automática de vazamentos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Radar de Vazamentos</div>
          <div className="page-sub">A IA identifica padrões de gasto que merecem atenção</div>
        </div>
        <button className="btn btn-primary" onClick={analisarComIA} disabled={loading}>
          {loading ? <Spinner /> : <><i className="ti ti-sparkles" />Analisar com IA</>}
        </button>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div className="panel-title"><i className="ti ti-chart-bar" />Top gastos por categoria</div>
        </div>
        {top3.length === 0 ? (
          <EmptyState icon="radar" text="Cadastre despesas para ativar o radar de vazamentos." />
        ) : top3.map(([cat, val], i) => {
          const pct = totalDespesas > 0 ? ((val / totalDespesas) * 100).toFixed(0) : 0
          const cor = i === 0 ? 'danger' : i === 1 ? 'warn' : 'info'
          const cores = { danger: 'var(--red)', warn: 'var(--amber)', info: 'var(--blue)' }
          return (
            <div key={cat} className={`radar-item ${cor}`}>
              <div className="radar-icon" style={{ background: 'var(--bg3)', color: cores[cor] }}>
                <i className="ti ti-trending-up" />
              </div>
              <div className="radar-text">
                <strong style={{ color: 'var(--text)' }}>{cat}</strong><br />
                {formatBRL(val)} — {pct}% do total de despesas
              </div>
              <div className="radar-pct" style={{ color: cores[cor] }}>{pct}%</div>
            </div>
          )
        })}
      </div>

      {analise && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><i className="ti ti-sparkles" />Análise da IA</div>
            <AIBadge text="Baseada nos seus dados" />
          </div>
          <div className="ai-diagnostico" dangerouslySetInnerHTML={{ __html: analise.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
        </div>
      )}

      {!analise && (
        <div className="panel">
          <div className="ai-diagnostico">
            Clique em <strong>"Analisar com IA"</strong> para receber uma análise detalhada dos seus padrões de gasto, identificar assinaturas esquecidas, gastos crescentes e recomendações de corte baseadas nos dados reais do mês.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PLANO DE SONHOS ──────────────────────────────────────────
export function Sonhos() {
  const { dados, recarregar } = useFinanceiro()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nome, setNome] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [alvo, setAlvo] = useState('')
  const [atual, setAtual] = useState('')
  const [dataAlvo, setDataAlvo] = useState('')
  const [saving, setSaving] = useState(false)

  const objetivos = dados?.objetivos || []

  function abrirNovo() {
    setEditando(null); setNome(''); setEmoji('🎯'); setAlvo(''); setAtual(''); setDataAlvo('')
    setModalOpen(true)
  }

  function abrirEditar(obj) {
    setEditando(obj.id); setNome(obj.nome); setEmoji(obj.emoji || '🎯')
    setAlvo(obj.valor_alvo); setAtual(obj.valor_atual); setDataAlvo(obj.data_alvo || '')
    setModalOpen(true)
  }

  async function salvar() {
    if (!nome || !alvo) return showToast('Preencha nome e valor alvo')
    setSaving(true)
    try {
      const dados_ = { nome, emoji, valor_alvo: Number(alvo), valor_atual: Number(atual || 0), data_alvo: dataAlvo || null }
      if (editando) {
        await updateObjetivo(editando, dados_)
        showToast('✓ Objetivo atualizado!')
      } else {
        await insertObjetivo(dados_)
        showToast('✓ Objetivo criado!')
      }
      setModalOpen(false)
      recarregar()
    } catch (e) {
      showToast('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Plano de Sonhos</div>
          <div className="page-sub">Os objetivos que fazem tudo valer a pena</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <i className="ti ti-plus" />Novo objetivo
        </button>
      </div>

      <div className="panel">
        {objetivos.length === 0 ? (
          <EmptyState icon="stars" text="Crie seus primeiros objetivos. O que vocês querem construir?" />
        ) : objetivos.map(obj => {
          const pct = obj.valor_alvo > 0 ? Math.min(100, (Number(obj.valor_atual) / Number(obj.valor_alvo)) * 100) : 0
          const cor = pct >= 70 ? 'green' : pct >= 30 ? '' : 'amber'
          return (
            <div key={obj.id} className="goal-item" style={{ cursor: 'pointer' }} onClick={() => abrirEditar(obj)}>
              <div className="goal-header">
                <div>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{obj.emoji}</div>
                  <div className="goal-name">{obj.nome}</div>
                </div>
                <div className="goal-pct">{pct.toFixed(0)}%</div>
              </div>
              <ProgressBar pct={pct} color={cor} />
              <div className="goal-values">
                <span>{formatBRL(obj.valor_atual)} guardado</span>
                <span>Meta: {formatBRL(obj.valor_alvo)}</span>
                {obj.data_alvo && <span>{obj.data_alvo.slice(0, 7)}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar objetivo' : 'Novo objetivo'}>
        <div className="form-group">
          <label className="form-label">Emoji</label>
          <input className="form-input" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ width: 60, textAlign: 'center', fontSize: 20 }} maxLength={2} />
        </div>
        <div className="form-group">
          <label className="form-label">Nome do objetivo</label>
          <input className="form-input" placeholder="Ex: Nome Limpo, Reserva..." value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Valor alvo (R$)</label>
          <input className="form-input" type="number" placeholder="0,00" value={alvo} onChange={e => setAlvo(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Valor já acumulado (R$)</label>
          <input className="form-input" type="number" placeholder="0,00" value={atual} onChange={e => setAtual(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Data alvo (opcional)</label>
          <input className="form-input" type="date" value={dataAlvo} onChange={e => setDataAlvo(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} onClick={salvar} disabled={saving}>
          {saving ? <Spinner /> : <><i className="ti ti-check" />{editando ? 'Salvar alterações' : 'Criar objetivo'}</>}
        </button>
      </Modal>
    </div>
  )
}

// ─── SCORE ────────────────────────────────────────────────────
export function Score() {
  const { dados } = useFinanceiro()
  const [historico, setHistorico] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [novoScore, setNovoScore] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getScoreHistorico().then(setHistorico).catch(() => {})
  }, [])

  const scoreAtual = historico.length > 0 ? historico[historico.length - 1].score : 0
  const scoreLabel = scoreAtual >= 700 ? 'Bom' : scoreAtual >= 500 ? 'Regular' : 'Ruim'
  const scoreCor = scoreAtual >= 700 ? 'var(--green)' : scoreAtual >= 500 ? 'var(--amber)' : 'var(--red)'

  const chartData = historico.map(h => ({ data: h.data.slice(0, 7), score: h.score }))

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Score & Crédito</div>
          <div className="page-sub">Acompanhe evolução e projeções</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <i className="ti ti-plus" />Atualizar score
        </button>
      </div>

      <div className="row-2">
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>Score atual · Serasa</div>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="64" fill="none" stroke="var(--bg4)" strokeWidth="12" />
            <circle cx="80" cy="80" r="64" fill="none" stroke={scoreCor} strokeWidth="12"
              strokeDasharray={`${(scoreAtual / 1000) * 402} 402`}
              strokeLinecap="round" transform="rotate(-90 80 80)" />
            <text x="80" y="74" textAnchor="middle" fontSize="32" fontWeight="600" fill={scoreCor} fontFamily="inherit">{scoreAtual}</text>
            <text x="80" y="94" textAnchor="middle" fontSize="12" fill="var(--text3)" fontFamily="inherit">{scoreLabel}</text>
          </svg>
          <div className="ai-diagnostico" style={{ width: '100%', textAlign: 'center', fontSize: 12 }}>
            {dados?.dividas?.filter(d => d.status === 'negativado').length > 0
              ? `${dados.dividas.filter(d => d.status === 'negativado').length} dívida(s) negativada(s) impactando o score`
              : 'Nenhuma dívida negativada detectada'}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div className="panel-title">Evolução histórica</div></div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="data" tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                <YAxis domain={[300, 900]} tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                <Line type="monotone" dataKey="score" stroke={scoreCor} strokeWidth={2} dot={{ fill: scoreCor }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="chart-line" text="Adicione scores para ver a evolução" />}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title"><i className="ti ti-bulb" />Como aumentar seu score</div></div>
        {[
          { icon: 'check', cor: 'var(--green)', titulo: 'Aceitar acordos do Serasa Limpa Nome', impacto: '+80 a +120 pontos' },
          { icon: 'calendar', cor: 'var(--blue)', titulo: 'Manter contas em dia por 3 meses', impacto: '+15 a +30 pontos/trimestre' },
          { icon: 'building-bank', cor: 'var(--purple)', titulo: 'Quitar dívidas negativadas', impacto: '+40 a +60 pontos por quitação' },
          { icon: 'user-check', cor: 'var(--amber)', titulo: 'Atualizar cadastro no Serasa', impacto: '+15 a +25 pontos' },
        ].map(item => (
          <div key={item.titulo} className="radar-item info">
            <div className="radar-icon" style={{ background: 'var(--bg3)', color: item.cor }}><i className={`ti ti-${item.icon}`} /></div>
            <div className="radar-text"><strong style={{ color: 'var(--text)' }}>{item.titulo}</strong><br />{item.impacto}</div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Atualizar score">
        <div className="form-group">
          <label className="form-label">Novo score (0-1000)</label>
          <input className="form-input form-valor" type="number" min="0" max="1000" placeholder="Ex: 450" value={novoScore} onChange={e => setNovoScore(e.target.value)} autoFocus />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} disabled={saving}
          onClick={async () => {
            if (!novoScore) return
            setSaving(true)
            try {
              const { insertScore } = await import('../lib/supabase')
              await insertScore({ score: Number(novoScore), data: new Date().toISOString().split('T')[0] })
              const h = await getScoreHistorico()
              setHistorico(h)
              showToast('✓ Score atualizado!')
              setModalOpen(false)
            } catch (e) { showToast('Erro: ' + e.message) } finally { setSaving(false) }
          }}>
          {saving ? <Spinner /> : <><i className="ti ti-check" />Salvar score</>}
        </button>
      </Modal>
    </div>
  )
}

// ─── REUNIÃO DO CASAL ──────────────────────────────────────────
export function Reuniao() {
  const { dados } = useFinanceiro()

  const receitas = dados?.receitas || []
  const despesas = dados?.despesas || []
  const dividas = dados?.dividas || []
  const objetivos = dados?.objetivos || []

  const totalReceitas = receitas.filter(r => r.status === 'recebida').reduce((s, r) => s + Number(r.valor), 0)
  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0)
  const saldo = totalReceitas - totalDespesas
  const totalDividas = dividas.reduce((s, d) => s + Number(d.valor_atual), 0)

  const receitasAlan = receitas.filter(r => r.responsavel === 'alan').reduce((s, r) => s + Number(r.valor), 0)
  const receitasVanessa = receitas.filter(r => r.responsavel === 'vanessa').reduce((s, r) => s + Number(r.valor), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reunião do Casal</div>
          <div className="page-sub">Resumo para decidir juntos</div>
        </div>
      </div>

      <div className="reunion-block">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 15 }} />Este mês em números
        </div>
        <div className="reunion-stat"><span style={{ color: 'var(--text2)' }}>Total recebido</span><span style={{ color: 'var(--green)', fontWeight: 600 }}>+{formatBRL(totalReceitas)}</span></div>
        <div className="reunion-stat"><span style={{ color: 'var(--text2)' }}>Total gasto</span><span style={{ color: 'var(--red)', fontWeight: 600 }}>-{formatBRL(totalDespesas)}</span></div>
        <div className="reunion-stat"><span style={{ color: 'var(--text2)' }}>Resultado</span><span style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{saldo >= 0 ? '+' : ''}{formatBRL(saldo)}</span></div>
        <div className="reunion-stat"><span style={{ color: 'var(--text2)' }}>Total em dívidas</span><span style={{ color: 'var(--amber)', fontWeight: 600 }}>{formatBRL(totalDividas)}</span></div>
      </div>

      <div className="reunion-block">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-users" style={{ fontSize: 15 }} />Contribuição de cada um
        </div>
        <div className="member-row">
          <div className="avatar alan">A</div>
          <div className="member-info"><div className="member-name">Alan</div><div className="member-role">MEI · {receitas.filter(r => r.responsavel === 'alan').length} lançamento(s)</div></div>
          <div className="member-val">{formatBRL(receitasAlan)}</div>
        </div>
        <div className="member-row">
          <div className="avatar vanessa">V</div>
          <div className="member-info"><div className="member-name">Vanessa</div><div className="member-role">Variável · {receitas.filter(r => r.responsavel === 'vanessa').length} lançamento(s)</div></div>
          <div className="member-val">{formatBRL(receitasVanessa)}</div>
        </div>
      </div>

      <div className="reunion-block">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-stars" style={{ fontSize: 15 }} />Progresso dos sonhos
        </div>
        {objetivos.slice(0, 3).map(obj => {
          const pct = obj.valor_alvo > 0 ? Math.min(100, (Number(obj.valor_atual) / Number(obj.valor_alvo)) * 100) : 0
          return (
            <div key={obj.id} className="reunion-stat">
              <span>{obj.emoji} {obj.nome}</span>
              <span style={{ color: 'var(--green)' }}>{pct.toFixed(0)}%</span>
            </div>
          )
        })}
        {objetivos.length === 0 && <div style={{ fontSize: 13, color: 'var(--text3)' }}>Cadastre objetivos no Plano de Sonhos</div>}
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title"><i className="ti ti-sparkles" />Para a próxima semana — sugestões</div></div>
        <div className="ai-diagnostico">
          {dividas.filter(d => d.status === 'negativado').length > 0
            ? `Vocês têm ${dividas.filter(d => d.status === 'negativado').length} dívida(s) negativada(s). Priorize quitar a menor delas para ganhar motivação e melhorar o score. Use a aba IA Consultora para perguntar "Qual dívida pagar primeiro?" e receber um plano personalizado.`
            : `Ótimo trabalho! Sem dívidas negativadas. Considere aumentar o valor aportado nos objetivos e criar uma reserva de emergência se ainda não tiver.`}
        </div>
      </div>
    </div>
  )
}
