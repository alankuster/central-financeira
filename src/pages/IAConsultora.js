import React, { useState, useRef, useEffect } from 'react'
import { useFinanceiro } from '../context/FinanceiroContext'
import { supabase, formatBRL, insertDespesa, insertReceita, insertDivida } from '../lib/supabase'
import { AIBadge, Spinner } from '../components/UI'

const SUGESTOES = [
  'Qual nossa situação financeira agora?',
  'Qual dívida devo pagar primeiro?',
  'Cadastra uma despesa de R$ 150 de internet todo dia 10 por 4 meses',
  'Tenho uma conta de luz de R$ 220 vencendo dia 15, cadastra como pendente',
  'Vale aceitar um acordo do Serasa com 40% de desconto?',
  'Como posso economizar mais este mês?',
  'Quanto tempo até ter o nome limpo?',
]

const SYSTEM_PROMPT = (contexto) => {
  const c = contexto || {}
  const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const dividasInfo = (c.dividas || []).map(d =>
    `- ${d.credor}: ${fmt(d.valor_atual)} (${d.status})${d.taxa_juros ? `, juros ${d.taxa_juros}%/mês` : ''}${d.valor_parcela ? `, parcela ${fmt(d.valor_parcela)}` : ''}`
  ).join('\n')

  const objetivosInfo = (c.objetivos || []).map(o => {
    const pct = o.valor_alvo > 0 ? ((o.valor_atual / o.valor_alvo) * 100).toFixed(0) : 0
    return `- ${o.emoji} ${o.nome}: ${fmt(o.valor_atual)} de ${fmt(o.valor_alvo)} (${pct}%)`
  }).join('\n')

  const topDespesas = (c.despesas || [])
    .sort((a, b) => b.valor - a.valor).slice(0, 5)
    .map(d => `- ${d.descricao}: ${fmt(d.valor)} (${d.categoria}, ${d.status || 'paga'})`).join('\n')

  return `Você é a consultora financeira familiar de Alan e Vanessa. Você tem acesso completo aos dados financeiros E pode executar ações no sistema.

SITUAÇÃO FINANCEIRA ATUAL:
• Saldo: ${fmt(c.saldo)}
• Entradas do mês: ${fmt(c.totalRecebido)}
• Saídas do mês: ${fmt(c.totalDespesas)}
• Gasto seguro este mês: ${fmt(c.gastoSeguroMes)}
• Semáforo: ${(c.semaforo || 'verde').toUpperCase()}

DÍVIDAS:
${dividasInfo || 'Nenhuma cadastrada.'}
Total: ${fmt(c.totalDividas)}

DESPESAS DO MÊS:
${topDespesas || 'Nenhuma cadastrada.'}

OBJETIVOS:
${objetivosInfo || 'Nenhum cadastrado.'}

AÇÕES DISPONÍVEIS:
Quando o usuário pedir para cadastrar algo, você DEVE retornar um JSON de ação no formato:
{"acao": "cadastrar_despesa", "dados": {"descricao": "...", "valor": 0, "categoria": "...", "responsavel": "familia", "data": "YYYY-MM-DD", "status": "pendente"}}
{"acao": "cadastrar_despesa_recorrente", "dados": {"descricao": "...", "valor": 0, "categoria": "...", "responsavel": "familia", "dia_vencimento": 10, "total_repeticoes": 4}}
{"acao": "cadastrar_receita", "dados": {"descricao": "...", "valor": 0, "categoria": "...", "responsavel": "alan", "data": "YYYY-MM-DD", "status": "recebida"}}
{"acao": "cadastrar_divida", "dados": {"credor": "...", "valor_original": 0, "valor_atual": 0, "status": "negativado"}}

REGRAS PARA AÇÕES:
- Quando identificar uma ação, retorne APENAS o JSON da ação, sem texto extra
- Para despesas recorrentes, use "cadastrar_despesa_recorrente"
- Para despesa única pendente, use status "pendente" com a data de vencimento
- A data deve ser no formato YYYY-MM-DD
- Se o usuário não especificar o responsável, use "familia"
- Para perguntas que não são ações, responda normalmente em português

INSTRUÇÕES GERAIS:
- Tom humano, motivador e direto
- Use **negrito** para valores importantes
- Máximo 150 palavras para respostas sem ação
- Alan é MEI; Vanessa tem renda variável diária`
}

function parseAcao(texto) {
  try {
    const match = texto.match(/\{[\s\S]*"acao"[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
  } catch {}
  return null
}

async function executarAcao(acao, dados, recarregar) {
  const hoje = new Date().toISOString().split('T')[0]

  if (acao === 'cadastrar_despesa') {
    await insertDespesa({ ...dados, data: dados.data || hoje })
    return `✅ Despesa cadastrada: **${dados.descricao}** de **R$ ${dados.valor}**${dados.status === 'pendente' ? ` com vencimento em ${dados.data}` : ''}`
  }

  if (acao === 'cadastrar_despesa_recorrente') {
    // Criar a recorrência e já gerar os lançamentos
    const { data: rec } = await supabase.from('despesas_recorrentes').insert([{
      ...dados,
      data_inicio: hoje,
    }]).select()

    // Gerar os lançamentos dos próximos X meses
    const totalMeses = dados.total_repeticoes || 1
    const despesasCriadas = []
    for (let i = 0; i < totalMeses; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() + i)
      const ano = d.getFullYear()
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      const dia = String(dados.dia_vencimento).padStart(2, '0')
      const dataVenc = `${ano}-${mes}-${dia}`
      despesasCriadas.push({
        descricao: dados.descricao,
        valor: dados.valor,
        categoria: dados.categoria,
        responsavel: dados.responsavel || 'familia',
        data: dataVenc,
        status: 'pendente',
        recorrente: true,
      })
    }
    await supabase.from('despesas').insert(despesasCriadas)
    recarregar()
    return `✅ Despesa recorrente cadastrada! **${dados.descricao}** de **R$ ${dados.valor}** — criados **${totalMeses} lançamentos** com vencimento todo dia ${dados.dia_vencimento}.`
  }

  if (acao === 'cadastrar_receita') {
    await insertReceita({ ...dados, data: dados.data || hoje })
    return `✅ Receita cadastrada: **${dados.descricao}** de **R$ ${dados.valor}**`
  }

  if (acao === 'cadastrar_divida') {
    await insertDivida({ ...dados })
    recarregar()
    return `✅ Dívida cadastrada: **${dados.credor}** — **R$ ${dados.valor_atual || dados.valor_original}**`
  }

  return null
}

export default function IAConsultora() {
  const { dados, recarregar } = useFinanceiro()
  const [mensagens, setMensagens] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [carregandoHistorico, setCarregandoHistorico] = useState(true)
  const messagesRef = useRef(null)

  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || ''
  const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

  useEffect(() => { carregarHistorico() }, [])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [mensagens])

  async function carregarHistorico() {
    setCarregandoHistorico(true)
    const { data } = await supabase
      .from('ia_historico')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)

    if (data && data.length > 0) {
      setMensagens(data.map(m => ({ role: m.role, text: m.content, id: m.id })))
    } else {
      setMensagens([{
        role: 'assistant',
        text: 'Olá, Alan e Vanessa! Sou sua consultora financeira. Posso responder perguntas sobre as finanças de vocês **e também cadastrar despesas, receitas e dívidas diretamente pelo chat**. O que desejam?'
      }])
    }
    setCarregandoHistorico(false)
  }

  async function salvarMensagem(role, content) {
    await supabase.from('ia_historico').insert([{ role, content }])
  }

  async function limparHistorico() {
    if (!window.confirm('Limpar todo o histórico de conversas?')) return
    await supabase.from('ia_historico').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setMensagens([{
      role: 'assistant',
      text: 'Histórico limpo! Como posso ajudar vocês?'
    }])
  }

  async function enviar(pergunta) {
    const texto = (pergunta || input).trim()
    if (!texto || loading) return
    setInput('')

    const novaMsgUser = { role: 'user', text: texto }
    setMensagens(prev => [...prev, novaMsgUser])
    await salvarMensagem('user', texto)
    setLoading(true)

    try {
      // Montar histórico para enviar à IA (últimas 20 msgs)
      const historico = [...mensagens, novaMsgUser]
        .slice(-20)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }))

      const response = await fetch(`${SUPABASE_URL}/functions/v1/ia-consultora`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          pergunta: texto,
          contexto: dados || {},
          historico,
          system: SYSTEM_PROMPT(dados)
        })
      })

      const data = await response.json()
      const resposta = data.resposta || 'Não consegui processar.'

      // Verificar se a IA quer executar uma ação
      const acao = parseAcao(resposta)
      let textoFinal = resposta

      if (acao) {
        const resultado = await executarAcao(acao.acao, acao.dados, recarregar)
        textoFinal = resultado || resposta
      }

      setMensagens(prev => [...prev, { role: 'assistant', text: textoFinal }])
      await salvarMensagem('assistant', textoFinal)

    } catch (e) {
      const erro = 'Não consegui conectar à IA. Verifique a conexão.'
      setMensagens(prev => [...prev, { role: 'assistant', text: erro }])
    } finally {
      setLoading(false)
    }
  }

  function renderTexto(texto) {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">IA Consultora</div>
          <div className="page-sub">Análise + ações diretas pelo chat</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <AIBadge text="Histórico salvo" />
          <button className="btn btn-ghost btn-sm" onClick={limparHistorico}>
            <i className="ti ti-trash" />Limpar
          </button>
        </div>
      </div>

      <div className="ai-chat" style={{ marginBottom: 16 }}>
        <div className="ai-chat-header">
          <div className="ai-avatar">✦</div>
          <div>
            <div className="ai-name">Consultora Financeira Familiar</div>
            <div className="ai-status">
              {loading ? '● Processando...' : '● Online · Pode cadastrar pelo chat'}
            </div>
          </div>
        </div>

        <div className="ai-messages" ref={messagesRef}>
          {carregandoHistorico ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: 13 }}>
              <Spinner /><span>Carregando histórico...</span>
            </div>
          ) : (
            mensagens.map((msg, i) => (
              <div key={i} className={`msg ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <span dangerouslySetInnerHTML={{ __html: renderTexto(msg.text) }} />
              </div>
            ))
          )}
          {loading && (
            <div className="msg ai" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spinner /><span style={{ color: 'var(--text3)', fontSize: 13 }}>Analisando...</span>
            </div>
          )}
        </div>

        <div className="suggestions">
          {SUGESTOES.map(s => (
            <button key={s} className="sug" onClick={() => enviar(s)}>{s}</button>
          ))}
        </div>

        <div className="ai-input-row">
          <input
            className="ai-input"
            placeholder="Pergunte ou peça para cadastrar algo... Ex: Cadastra conta de luz R$ 180 vencendo dia 15"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={() => enviar()} disabled={loading || !input.trim()}>
            {loading ? <Spinner /> : <i className="ti ti-send" />}
          </button>
        </div>
      </div>

      {/* Exemplos de ações */}
      <div className="panel">
        <div className="panel-header"><div className="panel-title"><i className="ti ti-sparkles" />O que a IA pode fazer pelo chat</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: 'arrow-up-circle', cor: 'var(--red)', titulo: 'Cadastrar despesa', ex: '"Cadastra conta de luz R$ 180 vencendo dia 15"' },
            { icon: 'repeat', cor: 'var(--amber)', titulo: 'Despesa recorrente', ex: '"Internet R$ 150 todo dia 10 por 4 meses"' },
            { icon: 'arrow-down-circle', cor: 'var(--green)', titulo: 'Cadastrar receita', ex: '"Registra receita de R$ 2.400 do Alan hoje"' },
            { icon: 'alert-triangle', cor: 'var(--blue)', titulo: 'Cadastrar dívida', ex: '"Cadastra dívida Nubank R$ 1.200 negativada"' },
          ].map(item => (
            <div key={item.titulo} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <i className={`ti ti-${item.icon}`} style={{ color: item.cor, fontSize: 15 }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{item.titulo}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>{item.ex}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
