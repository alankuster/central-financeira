import React, { useState, useRef, useEffect } from 'react'
import { useFinanceiro } from '../context/FinanceiroContext'
import { consultarIA } from '../lib/ia'
import { AIBadge, Spinner } from '../components/UI'

const SUGESTOES = [
  'Posso comprar algo parcelado agora?',
  'Qual dívida devo pagar primeiro?',
  'Posso começar a investir algum valor?',
  'Vale a pena aceitar um acordo do Serasa?',
  'Quanto tempo até ter o nome limpo?',
  'O que fazer com o dinheiro que sobrou?',
  'Qual é minha situação financeira resumida?',
  'Como posso economizar mais este mês?',
]

export default function IAConsultora() {
  const { dados } = useFinanceiro()
  const [mensagens, setMensagens] = useState([
    {
      role: 'ai',
      text: 'Olá, Alan e Vanessa! Sou sua consultora financeira familiar. Tenho acesso à situação financeira completa de vocês — receitas, despesas, dívidas e objetivos — e respondo com análise baseada nos dados reais, não em opiniões genéricas. O que desejam saber?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [mensagens])

  async function enviar(pergunta) {
    const texto = (pergunta || input).trim()
    if (!texto || loading) return

    setInput('')
    setMensagens(prev => [...prev, { role: 'user', text: texto }])
    setLoading(true)

    try {
      const resposta = await consultarIA(texto, dados || {})
      setMensagens(prev => [...prev, { role: 'ai', text: resposta }])
    } catch (e) {
      setMensagens(prev => [...prev, {
        role: 'ai',
        text: 'Não consegui conectar à IA. Verifique se a chave da API está configurada corretamente no arquivo .env.'
      }])
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
          <div className="page-sub">Análise baseada nos seus dados financeiros reais</div>
        </div>
        <AIBadge text="Dados reais conectados" />
      </div>

      <div className="ai-chat" style={{ marginBottom: 16 }}>
        <div className="ai-chat-header">
          <div className="ai-avatar">✦</div>
          <div>
            <div className="ai-name">Consultora Financeira Familiar</div>
            <div className="ai-status">
              {loading ? '● Analisando...' : '● Online · Dados atualizados'}
            </div>
          </div>
        </div>

        <div className="ai-messages" ref={messagesRef}>
          {mensagens.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              <span dangerouslySetInnerHTML={{ __html: renderTexto(msg.text) }} />
            </div>
          ))}
          {loading && (
            <div className="msg ai typing" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Spinner />
              <span>Analisando sua situação financeira...</span>
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
            placeholder="Pergunte qualquer coisa sobre as finanças da família..."
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

      {/* Contexto usado */}
      {dados && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title"><i className="ti ti-database" />Dados disponíveis para a IA</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { icon: 'arrow-down-circle', label: 'Receitas', val: dados.receitas?.length || 0, cor: 'var(--green)' },
              { icon: 'arrow-up-circle', label: 'Despesas', val: dados.despesas?.length || 0, cor: 'var(--red)' },
              { icon: 'alert-triangle', label: 'Dívidas', val: dados.dividas?.length || 0, cor: 'var(--amber)' },
              { icon: 'stars', label: 'Objetivos', val: dados.objetivos?.length || 0, cor: 'var(--purple)' },
              { icon: 'cash', label: 'Saldo', val: `R$ ${Number(dados.saldo || 0).toFixed(0)}`, cor: 'var(--blue)' },
              { icon: 'radar', label: 'Semáforo', val: dados.semaforo || 'verde', cor: 'var(--text2)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className={`ti ti-${item.icon}`} style={{ color: item.cor, fontSize: 18 }} />
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
