import React, { useState, useEffect } from 'react'
import { useFinanceiro } from '../context/FinanceiroContext'
import { formatBRL, supabase } from '../lib/supabase'
import { MetricCard, StatusBadge, EmptyState, showToast, Spinner, Modal } from '../components/UI'
import LancamentoRapido from '../components/LancamentoRapido'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const CORES = ['#4ADE80','#60A5FA','#F87171','#FCD34D','#A78BFA','#34D399','#F97316','#E879F9']

function getMeses() {
  const meses = []
  const hoje = new Date()
  for (let i = 5; i >= -1; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
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

// ─── MODAL DE EDIÇÃO RECEITA/DESPESA ────────────────────────
function ModalEditar({ item, tipo, onClose, onSalvo, categorias }) {
  const [form, setForm] = useState({...item})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  async function salvar() {
    setSaving(true)
    try {
      const tabela = tipo === 'receita' ? 'receitas' : 'despesas'
      await supabase.from(tabela).update({
        descricao: form.descricao,
        valor: Number(form.valor),
        categoria: form.categoria,
        data: form.data,
        responsavel: form.responsavel,
        status: form.status,
      }).eq('id', item.id)
      showToast('✓ Atualizado!')
      onSalvo(); onClose()
    } catch(e) { showToast('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  async function excluir() {
    if (!window.confirm('Excluir este lançamento?')) return
    await supabase.from(tipo === 'receita' ? 'receitas' : 'despesas').delete().eq('id', item.id)
    showToast('Excluído!'); onSalvo(); onClose()
  }

  const statusOpcoes = tipo === 'despesa'
    ? [{value:'paga',label:'✓ Paga'},{value:'pendente',label:'◯ Pendente'}]
    : [{value:'recebida',label:'✓ Recebida'},{value:'confirmada',label:'◐ Confirmada'},{value:'prevista',label:'◯ Prevista'}]

  const responsaveis = tipo === 'despesa'
    ? [{value:'alan',label:'Alan'},{value:'vanessa',label:'Vanessa'},{value:'familia',label:'Família'}]
    : [{value:'alan',label:'Alan'},{value:'vanessa',label:'Vanessa'}]

  return (
    <Modal open={!!item} onClose={onClose} title={`Editar ${tipo === 'receita' ? 'receita' : 'despesa'}`}>
      <div className="form-group">
        <label className="form-label">Status</label>
        <div className="tags">{statusOpcoes.map(s => <button key={s.value} className={`tag ${form.status===s.value?'sel':''}`} onClick={() => set('status',s.value)}>{s.label}</button>)}</div>
      </div>
      <div className="form-group">
        <label className="form-label">Descrição</label>
        <input className="form-input" value={form.descricao} onChange={e => set('descricao',e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Valor (R$)</label>
        <input className="form-input form-valor" type="number" value={form.valor} onChange={e => set('valor',e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Categoria</label>
        <div className="tags">{categorias.map(cat => <button key={cat.id||cat} className={`tag ${form.categoria===(cat.nome||cat)?'sel':''}`} onClick={() => set('categoria',cat.nome||cat)}>{cat.icone||''} {cat.nome||cat}</button>)}</div>
      </div>
      <div className="form-group">
        <label className="form-label">Responsável</label>
        <div className="tags">{responsaveis.map(r => <button key={r.value} className={`tag ${form.responsavel===r.value?'sel':''}`} onClick={() => set('responsavel',r.value)}>{r.label}</button>)}</div>
      </div>
      <div className="form-group">
        <label className="form-label">{tipo==='despesa'&&form.status==='pendente'?'Data de vencimento':'Data'}</label>
        <input className="form-input" type="date" value={form.data} onChange={e => set('data',e.target.value)} />
      </div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn btn-primary" style={{flex:1,justifyContent:'center',padding:12}} onClick={salvar} disabled={saving}>
          {saving ? <Spinner /> : <><i className="ti ti-check"/>Salvar</>}
        </button>
        <button className="btn btn-danger" style={{justifyContent:'center',padding:'12px 16px'}} onClick={excluir}>
          <i className="ti ti-trash"/>
        </button>
      </div>
    </Modal>
  )
}

// ─── RECEITAS ──────────────────────────────────────────────────
export function Receitas() {
  const [mes, setMes] = useState(mesAtualStr())
  const [receitas, setReceitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [categorias, setCategorias] = useState([])

  useEffect(() => { carregar() }, [mes])

  async function carregar() {
    setLoading(true)
    const inicio = `${mes}-01`
    const fim = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().split('T')[0]
    const [{ data: rec }, { data: cats }] = await Promise.all([
      supabase.from('receitas').select('*').gte('data',inicio).lte('data',fim).order('data',{ascending:false}),
      supabase.from('categorias_custom').select('*').eq('tipo','receita').order('nome')
    ])
    setReceitas(rec || []); setCategorias(cats || []); setLoading(false)
  }

  const totalRecebido = receitas.filter(r=>r.status==='recebida').reduce((s,r)=>s+Number(r.valor),0)
  const totalConfirmado = receitas.filter(r=>['confirmada','recebida'].includes(r.status)).reduce((s,r)=>s+Number(r.valor),0)
  const totalPrevisto = receitas.reduce((s,r)=>s+Number(r.valor),0)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Receitas</div><div className="page-sub">Clique para editar</div></div>
        <div style={{display:'flex',gap:8}}>
          <select className="form-input" value={mes} onChange={e=>setMes(e.target.value)} style={{width:'auto'}}>
            {getMeses().map(m=><option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>setModalOpen(true)}><i className="ti ti-plus"/>Nova</button>
        </div>
      </div>
      <div className="cards-grid-3">
        <MetricCard label="Previsto" value={formatBRL(totalPrevisto)} />
        <MetricCard label="Confirmado" value={formatBRL(totalConfirmado)} color="amber" />
        <MetricCard label="Recebido" value={formatBRL(totalRecebido)} color="green" />
      </div>
      <div className="panel">
        <div className="panel-header"><div className="panel-title">Lançamentos — clique para editar</div></div>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:24}}><Spinner/></div>
        : receitas.length===0 ? <EmptyState icon="arrow-down-circle" text="Nenhuma receita neste mês." />
        : receitas.map(r=>(
          <div key={r.id} className="tx-item" style={{cursor:'pointer',marginBottom:8}} onClick={()=>setEditando(r)}>
            <div className={`avatar ${r.responsavel}`}>{r.responsavel==='alan'?'A':r.responsavel==='vanessa'?'V':'F'}</div>
            <div className="tx-info">
              <div className="tx-desc">{r.descricao}</div>
              <div className="tx-meta">{r.data} · {r.categoria}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="tx-val in">+{formatBRL(r.valor)}</div>
              <StatusBadge status={r.status} />
            </div>
          </div>
        ))}
      </div>
      {editando && <ModalEditar item={editando} tipo="receita" categorias={categorias} onClose={()=>setEditando(null)} onSalvo={carregar} />}
      <LancamentoRapido open={modalOpen} onClose={()=>{setModalOpen(false);carregar()}} />
    </div>
  )
}

// ─── DESPESAS ──────────────────────────────────────────────────
export function Despesas() {
  const [mes, setMes] = useState(mesAtualStr())
  const [despesas, setDespesas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [categorias, setCategorias] = useState([])
  const hoje = new Date().toISOString().split('T')[0]

  useEffect(() => { carregar() }, [mes])

  async function carregar() {
    setLoading(true)
    const inicio = `${mes}-01`
    const fim = new Date(mes.split('-')[0], mes.split('-')[1], 0).toISOString().split('T')[0]
    const [{ data: desp }, { data: cats }] = await Promise.all([
      supabase.from('despesas').select('*').gte('data',inicio).lte('data',fim).order('data',{ascending:false}),
      supabase.from('categorias_custom').select('*').eq('tipo','despesa').order('nome')
    ])
    setDespesas(desp || []); setCategorias(cats || []); setLoading(false)
  }

  const pagas = despesas.filter(d=>d.status==='paga')
  const pendentes = despesas.filter(d=>d.status!=='paga')
  const atrasadas = pendentes.filter(d=>d.data<hoje)
  const total = pagas.reduce((s,d)=>s+Number(d.valor),0)
  const totalPendente = pendentes.reduce((s,d)=>s+Number(d.valor),0)

  const porCategoria = pagas.reduce((acc,d)=>{ acc[d.categoria]=(acc[d.categoria]||0)+Number(d.valor); return acc },{})
  const pieData = Object.entries(porCategoria).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Despesas</div><div className="page-sub">Clique em qualquer lançamento para editar</div></div>
        <div style={{display:'flex',gap:8}}>
          <select className="form-input" value={mes} onChange={e=>setMes(e.target.value)} style={{width:'auto'}}>
            {getMeses().map(m=><option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>setModalOpen(true)}><i className="ti ti-plus"/>Lançar</button>
        </div>
      </div>

      <div className="cards-grid-3">
        <MetricCard label="Pagas" value={formatBRL(total)} color="green" sub={`${pagas.length} lançamentos`} subColor="var(--text3)" />
        <MetricCard label="Pendentes" value={formatBRL(totalPendente)} color="amber" sub={`${pendentes.length} conta(s)`} subColor="var(--text3)" />
        <MetricCard label="Atrasadas" value={atrasadas.length} color={atrasadas.length>0?'red':''} sub={atrasadas.length>0?formatBRL(atrasadas.reduce((s,d)=>s+Number(d.valor),0)):'Nenhuma'} subColor={atrasadas.length>0?'var(--red)':'var(--green)'} />
      </div>

      {atrasadas.length>0 && (
        <div className="panel" style={{marginBottom:16,border:'1px solid var(--red-dim)'}}>
          <div className="panel-header">
            <div className="panel-title" style={{color:'var(--red)'}}><i className="ti ti-alert-circle"/>Atrasadas — clique para editar ou marcar como paga</div>
          </div>
          {atrasadas.map(d=>{
            const dias = Math.floor((new Date(hoje)-new Date(d.data))/(1000*60*60*24))
            return (
              <div key={d.id} className="tx-item" style={{cursor:'pointer',marginBottom:8,background:'var(--red-bg)'}} onClick={()=>setEditando(d)}>
                <div className="tx-icon out"><i className="ti ti-alert-circle"/></div>
                <div className="tx-info">
                  <div className="tx-desc">{d.descricao}</div>
                  <div className="tx-meta" style={{color:'var(--red)'}}>Venceu em {d.data} · {dias} dia(s) atrasada</div>
                </div>
                <div className="tx-val out">-{formatBRL(d.valor)}</div>
              </div>
            )
          })}
        </div>
      )}

      {pieData.length>0 && (
        <div className="row-2" style={{marginBottom:16}}>
          <div className="panel">
            <div className="panel-header"><div className="panel-title">Por categoria (pagas)</div></div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                  {pieData.map((_,i)=><Cell key={i} fill={CORES[i%CORES.length]}/>)}
                </Pie>
                <Tooltip formatter={v=>formatBRL(v)}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="panel">
            <div className="panel-header"><div className="panel-title">Maiores gastos</div></div>
            {pieData.slice(0,5).map((d,i)=>(
              <div key={d.name} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<4?'1px solid var(--border)':'none'}}>
                <div style={{width:8,height:8,borderRadius:2,background:CORES[i],flexShrink:0}}/>
                <div style={{flex:1,fontSize:13}}>{d.name}</div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--red)'}}>{formatBRL(d.value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Todos os lançamentos</div></div>
        {loading ? <div style={{display:'flex',justifyContent:'center',padding:24}}><Spinner/></div>
        : despesas.length===0 ? <EmptyState icon="arrow-up-circle" text="Nenhuma despesa neste mês." />
        : despesas.map(d=>{
          const atrasada = d.status!=='paga' && d.data<hoje
          return (
            <div key={d.id} className="tx-item" style={{cursor:'pointer',marginBottom:8,background:atrasada?'var(--red-bg)':d.status!=='paga'?'var(--amber-bg)':'var(--bg3)'}} onClick={()=>setEditando(d)}>
              <div className="tx-icon out"><i className="ti ti-arrow-up"/></div>
              <div className="tx-info">
                <div className="tx-desc">{d.descricao}</div>
                <div className="tx-meta">{d.data} · {d.categoria} · {d.responsavel==='alan'?'Alan':d.responsavel==='vanessa'?'Vanessa':'Família'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="tx-val out">-{formatBRL(d.valor)}</div>
                <span className={`debt-tag ${atrasada?'neg':d.status==='paga'?'ok':'prog'}`}>{atrasada?'Atrasada':d.status==='paga'?'Paga':'Pendente'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {editando && <ModalEditar item={editando} tipo="despesa" categorias={categorias} onClose={()=>setEditando(null)} onSalvo={carregar} />}
      <LancamentoRapido open={modalOpen} onClose={()=>{setModalOpen(false);carregar()}} />
    </div>
  )
}

// ─── DÍVIDAS ──────────────────────────────────────────────────
export function Dividas() {
  const { dados, recarregar } = useFinanceiro()
  const [modalOpen, setModalOpen] = useState(false)
  const [estrategia, setEstrategia] = useState('inteligente')
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)
  const dividas = dados?.dividas || []

  const totalDividas = dividas.reduce((s,d)=>s+Number(d.valor_atual),0)
  const negativadas = dividas.filter(d=>d.status==='negativado').length

  const dividasOrdenadas = [...dividas].sort((a,b)=>{
    if (estrategia==='bola') return Number(a.valor_atual)-Number(b.valor_atual)
    if (estrategia==='avalanche') return (Number(b.taxa_juros)||0)-(Number(a.taxa_juros)||0)
    return Number(b.valor_atual)-Number(a.valor_atual)
  })

  async function salvarEdicao() {
    setSaving(true)
    try {
      await supabase.from('dividas').update({
        credor: editando.credor,
        valor_original: Number(editando.valor_original),
        valor_atual: Number(editando.valor_atual),
        status: editando.status,
        taxa_juros: editando.taxa_juros ? Number(editando.taxa_juros) : null,
        valor_parcela: editando.valor_parcela ? Number(editando.valor_parcela) : null,
        observacoes: editando.observacoes || null,
      }).eq('id', editando.id)
      showToast('✓ Dívida atualizada!')
      setEditando(null); recarregar()
    } catch(e) { showToast('Erro: ' + e.message) }
    finally { setSaving(false) }
  }

  async function excluirDivida() {
    if (!window.confirm(`Excluir a dívida "${editando.credor}"?`)) return
    await supabase.from('dividas').delete().eq('id', editando.id)
    showToast('Dívida excluída'); setEditando(null); recarregar()
  }

  const statusOpcoes = [
    {value:'negativado',label:'Negativado'},
    {value:'em_dia',label:'Em dia'},
    {value:'negociando',label:'Negociando'},
    {value:'parcelado',label:'Parcelado'},
    {value:'quitado',label:'Quitado'},
  ]

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Central de Dívidas</div><div className="page-sub">Clique em qualquer dívida para editar ou excluir</div></div>
        <button className="btn btn-primary" onClick={()=>setModalOpen(true)}><i className="ti ti-plus"/>Nova dívida</button>
      </div>

      <div className="cards-grid-3">
        <MetricCard label="Total em dívidas" value={formatBRL(totalDividas)} color="red" />
        <MetricCard label="Negativadas" value={negativadas} color="amber" sub={`${dividas.filter(d=>d.status==='em_dia').length} em dia`} subColor="var(--green)" />
        <MetricCard label="Dívidas ativas" value={dividas.length} />
      </div>

      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-header"><div className="panel-title"><i className="ti ti-trophy"/>Estratégia de Pagamento</div></div>
        <div className="tabs">
          {[['bola','Bola de Neve'],['avalanche','Avalanche'],['inteligente','✦ Inteligente']].map(([v,l])=>(
            <button key={v} className={`tab ${estrategia===v?'active':''}`} onClick={()=>setEstrategia(v)}>{l}</button>
          ))}
        </div>
        <div className="ai-diagnostico">
          {estrategia==='bola'?'Pague as menores dívidas primeiro para ganhar motivação e momentum.'
          :estrategia==='avalanche'?'Pague as dívidas com maiores juros primeiro. Você pagará menos no total.'
          :'Combine as duas: quita a menor negativada para melhorar o score, depois ataca as com maiores juros.'}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div className="panel-title">Suas dívidas — clique para editar</div></div>
        {dividas.length===0
          ? <EmptyState icon="alert-triangle" text="Nenhuma dívida cadastrada. Clique em Nova dívida para começar com as suas reais." />
          : dividasOrdenadas.map((d,i)=>(
            <div key={d.id} className="debt-item" style={{cursor:'pointer'}} onClick={()=>setEditando({...d})}>
              <div className="debt-icon"><span style={{fontSize:13,fontWeight:700,color:i===0?'var(--red)':'var(--text3)'}}>#{i+1}</span></div>
              <div className="debt-info">
                <div className="debt-name">{d.credor}</div>
                <div className="debt-orig">Original: {formatBRL(d.valor_original)}{d.taxa_juros?` · ${d.taxa_juros}%/mês`:''}{d.valor_parcela?` · Parcela: ${formatBRL(d.valor_parcela)}`:''}</div>
              </div>
              <div className="debt-right">
                <div className="debt-val">{formatBRL(d.valor_atual)}</div>
                <StatusBadge status={d.status}/>
              </div>
            </div>
          ))
        }
      </div>

      {editando && (
        <Modal open={!!editando} onClose={()=>setEditando(null)} title="Editar dívida">
          <div className="form-group">
            <label className="form-label">Credor</label>
            <input className="form-input" value={editando.credor} onChange={e=>setEditando({...editando,credor:e.target.value})} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Valor original (R$)</label>
            <input className="form-input" type="number" value={editando.valor_original} onChange={e=>setEditando({...editando,valor_original:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Valor atual / negociado (R$)</label>
            <input className="form-input" type="number" value={editando.valor_atual} onChange={e=>setEditando({...editando,valor_atual:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="tags">{statusOpcoes.map(s=><button key={s.value} className={`tag ${editando.status===s.value?'sel':''}`} onClick={()=>setEditando({...editando,status:s.value})}>{s.label}</button>)}</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="form-group">
              <label className="form-label">Juros (%/mês)</label>
              <input className="form-input" type="number" placeholder="0,00" value={editando.taxa_juros||''} onChange={e=>setEditando({...editando,taxa_juros:e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Parcela (R$)</label>
              <input className="form-input" type="number" placeholder="0,00" value={editando.valor_parcela||''} onChange={e=>setEditando({...editando,valor_parcela:e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <input className="form-input" placeholder="Ex: Acordo aceito, vence dia 10..." value={editando.observacoes||''} onChange={e=>setEditando({...editando,observacoes:e.target.value})} />
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center',padding:12}} onClick={salvarEdicao} disabled={saving}>
              {saving?<Spinner/>:<><i className="ti ti-check"/>Salvar</>}
            </button>
            <button className="btn btn-danger" style={{justifyContent:'center',padding:'12px 16px'}} onClick={excluirDivida}>
              <i className="ti ti-trash"/>
            </button>
          </div>
        </Modal>
      )}

      <LancamentoRapido open={modalOpen} onClose={()=>{setModalOpen(false);recarregar()}} />
    </div>
  )
}

// ─── ACORDOS ──────────────────────────────────────────────────
export function Acordos() {
  const { recarregar } = useFinanceiro()
  const [modalOpen, setModalOpen] = useState(false)
  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Acordos & Serasa</div><div className="page-sub">Negociações e análise da IA</div></div>
        <button className="btn btn-primary" onClick={()=>setModalOpen(true)}><i className="ti ti-plus"/>Registrar</button>
      </div>
      <div className="panel">
        <EmptyState icon="handshake" text="Registre ofertas do Serasa Limpa Nome para análise automática da IA." />
        <div className="ai-diagnostico" style={{marginTop:16}}>
          <strong>Como usar:</strong> Quando receber uma oferta do Serasa, registre aqui e a IA analisa se vale a pena aceitar com base no seu orçamento real.
        </div>
      </div>
      <LancamentoRapido open={modalOpen} onClose={()=>{setModalOpen(false);recarregar()}} />
    </div>
  )
}
