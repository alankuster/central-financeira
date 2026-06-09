import React, { useState } from 'react'
import { Modal, TagSelector, showToast, Spinner } from './UI'
import { insertDespesa, insertReceita, insertDivida, getCategoriaAprendida, salvarCategoriaAprendida } from '../lib/supabase'

const CATEGORIAS_DESPESA = [
  '🛒 Mercado', '⛽ Combustível', '🍕 Alimentação', '🏠 Moradia',
  '💊 Saúde', '🎮 Lazer', '👕 Vestuário', '📱 Tecnologia',
  '📚 Educação', '🚌 Transporte', '💰 Dívida', '➕ Outro'
]

const CATEGORIAS_RECEITA = [
  '💼 MEI / NF', '📅 Salário', '💵 Variável', '🎁 Extra', '🏠 Aluguel', '➕ Outro'
]

const RESPONSAVEIS = [
  { value: 'alan', label: 'Alan' },
  { value: 'vanessa', label: 'Vanessa' },
  { value: 'familia', label: 'Família' },
]

const STATUS_RECEITA = [
  { value: 'recebida', label: '✓ Recebida' },
  { value: 'confirmada', label: '◐ Confirmada' },
  { value: 'prevista', label: '◯ Prevista' },
]

export default function LancamentoRapido({ open, onClose }) {
  const [aba, setAba] = useState('despesa')
  const [loading, setSaving] = useState(false)

  // Despesa
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('🛒 Mercado')
  const [responsavel, setResponsavel] = useState('familia')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])

  // Receita
  const [rValor, setRValor] = useState('')
  const [rDesc, setRDesc] = useState('')
  const [rCategoria, setRCategoria] = useState('💼 MEI / NF')
  const [rResponsavel, setRResponsavel] = useState('alan')
  const [rStatus, setRStatus] = useState('recebida')
  const [rData, setRData] = useState(new Date().toISOString().split('T')[0])

  // Dívida
  const [dCredor, setDCredor] = useState('')
  const [dValorOrig, setDValorOrig] = useState('')
  const [dValorAtual, setDValorAtual] = useState('')
  const [dStatus, setDStatus] = useState('negativado')
  const [dJuros, setDJuros] = useState('')
  const [dParcela, setDParcela] = useState('')

  async function handleDescricaoBlur() {
    if (!descricao) return
    const catAprendida = await getCategoriaAprendida(descricao)
    if (catAprendida) setCategoria(catAprendida)
  }

  async function salvarDespesa() {
    if (!valor || isNaN(Number(valor))) return showToast('Informe um valor válido')
    setSaving(true)
    try {
      const catLimpa = categoria.replace(/^[^\w]+\s/, '')
      await insertDespesa({
        descricao: descricao || catLimpa,
        valor: Number(valor),
        categoria: catLimpa,
        responsavel,
        data,
        estabelecimento: descricao || null,
      })
      if (descricao) await salvarCategoriaAprendida(descricao, catLimpa)
      showToast('✓ Despesa lançada!')
      resetDespesa()
      onClose()
    } catch (e) {
      showToast('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function salvarReceita() {
    if (!rValor || isNaN(Number(rValor))) return showToast('Informe um valor válido')
    setSaving(true)
    try {
      await insertReceita({
        descricao: rDesc || rCategoria.replace(/^[^\w]+\s/, ''),
        valor: Number(rValor),
        categoria: rCategoria.replace(/^[^\w]+\s/, ''),
        responsavel: rResponsavel,
        status: rStatus,
        data: rData,
      })
      showToast('✓ Receita registrada!')
      resetReceita()
      onClose()
    } catch (e) {
      showToast('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function salvarDivida() {
    if (!dCredor || !dValorOrig) return showToast('Preencha credor e valor original')
    setSaving(true)
    try {
      await insertDivida({
        credor: dCredor,
        valor_original: Number(dValorOrig),
        valor_atual: Number(dValorAtual || dValorOrig),
        status: dStatus,
        taxa_juros: dJuros ? Number(dJuros) : null,
        valor_parcela: dParcela ? Number(dParcela) : null,
      })
      showToast('✓ Dívida cadastrada!')
      resetDivida()
      onClose()
    } catch (e) {
      showToast('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function resetDespesa() { setValor(''); setDescricao(''); setCategoria('🛒 Mercado'); setResponsavel('familia'); setData(new Date().toISOString().split('T')[0]) }
  function resetReceita() { setRValor(''); setRDesc(''); setRCategoria('💼 MEI / NF'); setRResponsavel('alan'); setRStatus('recebida'); setRData(new Date().toISOString().split('T')[0]) }
  function resetDivida() { setDCredor(''); setDValorOrig(''); setDValorAtual(''); setDStatus('negativado'); setDJuros(''); setDParcela('') }

  return (
    <Modal open={open} onClose={onClose} title="Lançamento Rápido">
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[['despesa','Despesa'],['receita','Receita'],['divida','Dívida']].map(([v, l]) => (
          <button key={v} className={`tab ${aba === v ? 'active' : ''}`} onClick={() => setAba(v)}>{l}</button>
        ))}
      </div>

      {aba === 'despesa' && (
        <>
          <div className="form-group">
            <label className="form-label">Valor</label>
            <input
              className="form-input form-valor"
              type="number"
              placeholder="0,00"
              value={valor}
              onChange={e => setValor(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição (IA aprende automaticamente)</label>
            <input
              className="form-input"
              placeholder="Ex: Mercado Koch, Posto Ipiranga..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              onBlur={handleDescricaoBlur}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <TagSelector options={CATEGORIAS_DESPESA} value={categoria} onChange={setCategoria} />
          </div>
          <div className="form-group">
            <label className="form-label">Responsável</label>
            <TagSelector options={RESPONSAVEIS} value={responsavel} onChange={setResponsavel} />
          </div>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input className="form-input" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} onClick={salvarDespesa} disabled={loading}>
            {loading ? <Spinner /> : <><i className="ti ti-check" />Lançar em menos de 5s</>}
          </button>
        </>
      )}

      {aba === 'receita' && (
        <>
          <div className="form-group">
            <label className="form-label">Valor</label>
            <input className="form-input form-valor" type="number" placeholder="0,00" value={rValor} onChange={e => setRValor(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <TagSelector options={STATUS_RECEITA} value={rStatus} onChange={setRStatus} />
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <TagSelector options={CATEGORIAS_RECEITA} value={rCategoria} onChange={setRCategoria} />
          </div>
          <div className="form-group">
            <label className="form-label">Responsável</label>
            <TagSelector options={[{ value: 'alan', label: 'Alan' }, { value: 'vanessa', label: 'Vanessa' }]} value={rResponsavel} onChange={setRResponsavel} />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição (opcional)</label>
            <input className="form-input" placeholder="Ex: NF Serviço, Atendimentos..." value={rDesc} onChange={e => setRDesc(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input className="form-input" type="date" value={rData} onChange={e => setRData(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} onClick={salvarReceita} disabled={loading}>
            {loading ? <Spinner /> : <><i className="ti ti-check" />Registrar receita</>}
          </button>
        </>
      )}

      {aba === 'divida' && (
        <>
          <div className="form-group">
            <label className="form-label">Credor</label>
            <input className="form-input" placeholder="Nubank, Caixa, Serasa..." value={dCredor} onChange={e => setDCredor(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Valor original</label>
            <input className="form-input" type="number" placeholder="0,00" value={dValorOrig} onChange={e => setDValorOrig(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor atual / negociado (opcional)</label>
            <input className="form-input" type="number" placeholder="0,00 (deixe vazio = mesmo que original)" value={dValorAtual} onChange={e => setDValorAtual(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <TagSelector
              options={[
                { value: 'negativado', label: 'Negativado' },
                { value: 'em_dia', label: 'Em dia' },
                { value: 'negociando', label: 'Negociando' },
                { value: 'parcelado', label: 'Parcelado' },
              ]}
              value={dStatus}
              onChange={setDStatus}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Juros (%/mês)</label>
              <input className="form-input" type="number" placeholder="0,00" value={dJuros} onChange={e => setDJuros(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Parcela (R$)</label>
              <input className="form-input" type="number" placeholder="0,00" value={dParcela} onChange={e => setDParcela(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12 }} onClick={salvarDivida} disabled={loading}>
            {loading ? <Spinner /> : <><i className="ti ti-check" />Cadastrar dívida</>}
          </button>
        </>
      )}
    </Modal>
  )
}
