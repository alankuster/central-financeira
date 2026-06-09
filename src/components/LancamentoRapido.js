import React, { useState, useEffect } from 'react'
import { Modal, showToast, Spinner } from './UI'
import { insertDespesa, insertReceita, insertDivida, getCategoriaAprendida, salvarCategoriaAprendida, supabase } from '../lib/supabase'

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

const STATUS_DESPESA = [
  { value: 'paga', label: '✓ Paga' },
  { value: 'pendente', label: '◯ Pendente' },
]

export default function LancamentoRapido({ open, onClose, defaultStatus = 'paga' }) {
  const [aba, setAba] = useState('despesa')
  const [loading, setSaving] = useState(false)
  const [categoriasDespesa, setCategoriasDespesa] = useState([])
  const [categoriasReceita, setCategoriasReceita] = useState([])

  // Despesa
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [responsavel, setResponsavel] = useState('familia')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [statusDespesa, setStatusDespesa] = useState(defaultStatus)
  const [tipoDespesa, setTipoDespesa] = useState('unica') // unica, parcelada, recorrente
  const [parcelas, setParcelas] = useState(2)
  const [diaVencimento, setDiaVencimento] = useState(new Date().getDate())
  const [totalMeses, setTotalMeses] = useState(3)

  // Receita
  const [rValor, setRValor] = useState('')
  const [rDesc, setRDesc] = useState('')
  const [rCategoria, setRCategoria] = useState('')
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

  useEffect(() => {
    if (open) { carregarCategorias(); setStatusDespesa(defaultStatus) }
  }, [open, defaultStatus])

  async function carregarCategorias() {
    const { data } = await supabase.from('categorias_custom').select('*').order('nome')
    const desp = data?.filter(c => c.tipo === 'despesa') || []
    const rec = data?.filter(c => c.tipo === 'receita') || []
    setCategoriasDespesa(desp)
    setCategoriasReceita(rec)
    if (!categoria && desp.length > 0) setCategoria(desp[0].nome)
    if (!rCategoria && rec.length > 0) setRCategoria(rec[0].nome)
  }

  async function handleDescricaoBlur() {
    if (!descricao) return
    const catAprendida = await getCategoriaAprendida(descricao)
    if (catAprendida) setCategoria(catAprendida)
  }

  async function salvarDespesa() {
    if (!valor || isNaN(Number(valor))) return showToast('Informe um valor válido')
    setSaving(true)
    try {
      if (tipoDespesa === 'unica') {
        // Despesa simples
        await insertDespesa({
          descricao: descricao || categoria,
          valor: Number(valor),
          categoria,
          responsavel,
          data,
          status: statusDespesa,
          estabelecimento: descricao || null,
        })
        if (descricao) await salvarCategoriaAprendida(descricao, categoria)
        showToast(statusDespesa === 'paga' ? '✓ Despesa lançada!' : '✓ Conta agendada!')

      } else if (tipoDespesa === 'parcelada') {
        // Criar uma parcela por mês
        const valorParcela = Number(valor) / parcelas
        const dataBase = new Date(data)
        const inseridos = []
        for (let i = 0; i < parcelas; i++) {
          const d = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dataBase.getDate())
          inseridos.push({
            descricao: `${descricao || categoria} (${i + 1}/${parcelas})`,
            valor: Number(valorParcela.toFixed(2)),
            categoria,
            responsavel,
            data: d.toISOString().split('T')[0],
            status: i === 0 && statusDespesa === 'paga' ? 'paga' : 'pendente',
            recorrente: false,
          })
        }
        await supabase.from('despesas').insert(inseridos)
        showToast(`✓ ${parcelas} parcelas de ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(valorParcela)} criadas!`)

      } else if (tipoDespesa === 'recorrente') {
        // Criar lançamento para cada mês
        const inseridos = []
        for (let i = 0; i < totalMeses; i++) {
          const d = new Date()
          d.setMonth(d.getMonth() + i)
          const ano = d.getFullYear()
          const mes = String(d.getMonth() + 1).padStart(2, '0')
          const dia = String(diaVencimento).padStart(2, '0')
          inseridos.push({
            descricao: descricao || categoria,
            valor: Number(valor),
            categoria,
            responsavel,
            data: `${ano}-${mes}-${dia}`,
            status: 'pendente',
            recorrente: true,
          })
        }
        await supabase.from('despesas').insert(inseridos)
        showToast(`✓ ${totalMeses} lançamentos recorrentes criados!`)
      }

      resetDespesa()
      onClose()
    } catch (e) {
      showToast('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function salvarReceita() {
    if (!rValor || isNaN(Number(rValor))) return showToast('Informe um valor válido')
    setSaving(true)
    try {
      await insertReceita({
        descricao: rDesc || rCategoria,
        valor: Number(rValor),
        categoria: rCategoria,
        responsavel: rResponsavel,
        status: rStatus,
        data: rData,
      })
      showToast('✓ Receita registrada!')
      resetReceita()
      onClose()
    } catch (e) {
      showToast('Erro: ' + e.message)
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
      showToast('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function resetDespesa() {
    setValor(''); setDescricao(''); setResponsavel('familia')
    setData(new Date().toISOString().split('T')[0])
    setStatusDespesa(defaultStatus); setTipoDespesa('unica')
    setParcelas(2); setTotalMeses(3)
  }
  function resetReceita() { setRValor(''); setRDesc(''); setRResponsavel('alan'); setRStatus('recebida'); setRData(new Date().toISOString().split('T')[0]) }
  function resetDivida() { setDCredor(''); setDValorOrig(''); setDValorAtual(''); setDStatus('negativado'); setDJuros(''); setDParcela('') }

  const valorParcela = valor && parcelas ? (Number(valor) / parcelas).toFixed(2) : 0

  return (
    <Modal open={open} onClose={onClose} title="Lançamento Rápido">
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[['despesa','Despesa'],['receita','Receita'],['divida','Dívida']].map(([v, l]) => (
          <button key={v} className={`tab ${aba === v ? 'active' : ''}`} onClick={() => setAba(v)}>{l}</button>
        ))}
      </div>

      {aba === 'despesa' && (
        <>
          {/* Tipo de despesa */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div className="tags">
              <button className={`tag ${tipoDespesa==='unica'?'sel':''}`} onClick={()=>setTipoDespesa('unica')}>💰 Única</button>
              <button className={`tag ${tipoDespesa==='parcelada'?'sel':''}`} onClick={()=>setTipoDespesa('parcelada')}>📋 Parcelada</button>
              <button className={`tag ${tipoDespesa==='recorrente'?'sel':''}`} onClick={()=>setTipoDespesa('recorrente')}>🔄 Recorrente</button>
            </div>
          </div>

          {tipoDespesa === 'unica' && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <div className="tags">
                {STATUS_DESPESA.map(s => (
                  <button key={s.value} className={`tag ${statusDespesa===s.value?'sel':''}`} onClick={()=>setStatusDespesa(s.value)}>{s.label}</button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Valor total (R$)</label>
            <input className="form-input form-valor" type="number" placeholder="0,00" value={valor} onChange={e=>setValor(e.target.value)} autoFocus />
          </div>

          {tipoDespesa === 'parcelada' && valor && (
            <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-dim)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 12, fontSize: 13, color: 'var(--green)' }}>
              {parcelas}x de R$ {Number(valorParcela).toLocaleString('pt-BR', {minimumFractionDigits:2})}
            </div>
          )}

          {tipoDespesa === 'parcelada' && (
            <div className="form-group">
              <label className="form-label">Número de parcelas</label>
              <div className="tags">
                {[2,3,4,5,6,8,10,12].map(n => (
                  <button key={n} className={`tag ${parcelas===n?'sel':''}`} onClick={()=>setParcelas(n)}>{n}x</button>
                ))}
              </div>
            </div>
          )}

          {tipoDespesa === 'recorrente' && (
            <>
              <div className="form-group">
                <label className="form-label">Dia do vencimento</label>
                <input className="form-input" type="number" min="1" max="31" value={diaVencimento} onChange={e=>setDiaVencimento(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Repetir por quantos meses?</label>
                <div className="tags">
                  {[2,3,4,5,6,12].map(n => (
                    <button key={n} className={`tag ${totalMeses===n?'sel':''}`} onClick={()=>setTotalMeses(n)}>{n} meses</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" placeholder="Ex: Conta de Luz, Mercado..." value={descricao} onChange={e=>setDescricao(e.target.value)} onBlur={handleDescricaoBlur} />
          </div>

          <div className="form-group">
            <label className="form-label">Categoria</label>
            {categoriasDespesa.length === 0
              ? <div style={{fontSize:12,color:'var(--text3)',padding:'8px 0'}}>Crie categorias em <strong>Categorias</strong></div>
              : <div className="tags">{categoriasDespesa.map(cat=>(
                <button key={cat.id} className={`tag ${categoria===cat.nome?'sel':''}`} onClick={()=>setCategoria(cat.nome)}>{cat.icone} {cat.nome}</button>
              ))}</div>
            }
          </div>

          <div className="form-group">
            <label className="form-label">Responsável</label>
            <div className="tags">
              {RESPONSAVEIS.map(r=>(
                <button key={r.value} className={`tag ${responsavel===r.value?'sel':''}`} onClick={()=>setResponsavel(r.value)}>{r.label}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              {tipoDespesa==='recorrente' ? 'Começa em' : tipoDespesa==='parcelada' ? 'Data da 1ª parcela' : statusDespesa==='pendente' ? 'Data de vencimento' : 'Data do pagamento'}
            </label>
            <input className="form-input" type="date" value={data} onChange={e=>setData(e.target.value)} />
          </div>

          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:12}} onClick={salvarDespesa} disabled={loading}>
            {loading ? <Spinner /> : <>
              <i className="ti ti-check"/>
              {tipoDespesa==='parcelada' ? `Criar ${parcelas} parcelas` : tipoDespesa==='recorrente' ? `Criar ${totalMeses} lançamentos` : statusDespesa==='pendente' ? 'Agendar conta' : 'Lançar gasto'}
            </>}
          </button>
        </>
      )}

      {aba === 'receita' && (
        <>
          <div className="form-group">
            <label className="form-label">Valor</label>
            <input className="form-input form-valor" type="number" placeholder="0,00" value={rValor} onChange={e=>setRValor(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="tags">{STATUS_RECEITA.map(s=><button key={s.value} className={`tag ${rStatus===s.value?'sel':''}`} onClick={()=>setRStatus(s.value)}>{s.label}</button>)}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            {categoriasReceita.length===0
              ? <div style={{fontSize:12,color:'var(--text3)',padding:'8px 0'}}>Crie categorias em <strong>Categorias</strong></div>
              : <div className="tags">{categoriasReceita.map(cat=><button key={cat.id} className={`tag ${rCategoria===cat.nome?'sel':''}`} onClick={()=>setRCategoria(cat.nome)}>{cat.icone} {cat.nome}</button>)}</div>
            }
          </div>
          <div className="form-group">
            <label className="form-label">Responsável</label>
            <div className="tags">
              {[{value:'alan',label:'Alan'},{value:'vanessa',label:'Vanessa'}].map(r=><button key={r.value} className={`tag ${rResponsavel===r.value?'sel':''}`} onClick={()=>setRResponsavel(r.value)}>{r.label}</button>)}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição (opcional)</label>
            <input className="form-input" placeholder="Ex: NF Serviço, Atendimentos..." value={rDesc} onChange={e=>setRDesc(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input className="form-input" type="date" value={rData} onChange={e=>setRData(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:12}} onClick={salvarReceita} disabled={loading}>
            {loading ? <Spinner /> : <><i className="ti ti-check"/>Registrar receita</>}
          </button>
        </>
      )}

      {aba === 'divida' && (
        <>
          <div className="form-group">
            <label className="form-label">Credor</label>
            <input className="form-input" placeholder="Nubank, Caixa, Serasa..." value={dCredor} onChange={e=>setDCredor(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Valor original</label>
            <input className="form-input" type="number" placeholder="0,00" value={dValorOrig} onChange={e=>setDValorOrig(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor atual / negociado (opcional)</label>
            <input className="form-input" type="number" placeholder="deixe vazio = mesmo que original" value={dValorAtual} onChange={e=>setDValorAtual(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="tags">
              {[{value:'negativado',label:'Negativado'},{value:'em_dia',label:'Em dia'},{value:'negociando',label:'Negociando'},{value:'parcelado',label:'Parcelado'}].map(s=>(
                <button key={s.value} className={`tag ${dStatus===s.value?'sel':''}`} onClick={()=>setDStatus(s.value)}>{s.label}</button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label className="form-label">Juros (%/mês)</label>
              <input className="form-input" type="number" placeholder="0,00" value={dJuros} onChange={e=>setDJuros(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Parcela (R$)</label>
              <input className="form-input" type="number" placeholder="0,00" value={dParcela} onChange={e=>setDParcela(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:12}} onClick={salvarDivida} disabled={loading}>
            {loading ? <Spinner /> : <><i className="ti ti-check"/>Cadastrar dívida</>}
          </button>
        </>
      )}
    </Modal>
  )
}
