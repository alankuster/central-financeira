import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Modal, showToast, EmptyState, Spinner } from '../components/UI'

const ICONES = ['🛒','⛽','🍕','🏠','💊','🎮','👕','📱','📚','🚌','💰','🐾','✈️','🎓','💼','🌿','🔧','🎁','💇','🏋️','🍺','☕','🎵','📺','🐕','🌊','🏖️','🎯']

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState('🛒')
  const [tipo, setTipo] = useState('despesa')
  const [saving, setSaving] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('categorias_custom').select('*').order('tipo').order('nome')
    setCategorias(data || [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null); setNome(''); setIcone('🛒'); setTipo('despesa')
    setModalOpen(true)
  }

  function abrirEditar(cat) {
    setEditando(cat.id); setNome(cat.nome); setIcone(cat.icone); setTipo(cat.tipo)
    setModalOpen(true)
  }

  async function salvar() {
    if (!nome.trim()) return showToast('Informe o nome da categoria')
    setSaving(true)
    try {
      if (editando) {
        await supabase.from('categorias_custom').update({ nome, icone, tipo }).eq('id', editando)
        showToast('✓ Categoria atualizada!')
      } else {
        await supabase.from('categorias_custom').insert([{ nome, icone, tipo }])
        showToast('✓ Categoria criada!')
      }
      setModalOpen(false)
      carregar()
    } catch (e) {
      showToast('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta categoria?')) return
    await supabase.from('categorias_custom').delete().eq('id', id)
    showToast('Categoria excluída')
    carregar()
  }

  const despesas = categorias.filter(c => c.tipo === 'despesa')
  const receitas = categorias.filter(c => c.tipo === 'receita')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Categorias</div>
          <div className="page-sub">Personalize as categorias de gastos e receitas</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <i className="ti ti-plus" />Nova categoria
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-arrow-up-circle" />Categorias de Despesa</div>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{despesas.length} categorias</span>
            </div>
            {despesas.length === 0 ? (
              <EmptyState icon="tag" text="Nenhuma categoria de despesa criada ainda." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {despesas.map(cat => (
                  <div key={cat.id} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    onClick={() => abrirEditar(cat)}>
                    <span style={{ fontSize: 20 }}>{cat.icone}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.nome}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); excluir(cat.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: 0 }}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"><i className="ti ti-arrow-down-circle" />Categorias de Receita</div>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{receitas.length} categorias</span>
            </div>
            {receitas.length === 0 ? (
              <EmptyState icon="tag" text="Nenhuma categoria de receita criada ainda." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {receitas.map(cat => (
                  <div key={cat.id} style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                    onClick={() => abrirEditar(cat)}>
                    <span style={{ fontSize: 20 }}>{cat.icone}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.nome}</div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); excluir(cat.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: 0 }}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar categoria' : 'Nova categoria'}>
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <div className="tags">
            <button className={`tag ${tipo === 'despesa' ? 'sel' : ''}`} onClick={() => setTipo('despesa')}>💸 Despesa</button>
            <button className={`tag ${tipo === 'receita' ? 'sel' : ''}`} onClick={() => setTipo('receita')}>💰 Receita</button>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Nome</label>
          <input className="form-input" placeholder="Ex: Academia, Freelance..." value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Ícone</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {ICONES.map(ic => (
              <button key={ic} onClick={() => setIcone(ic)}
                style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${icone === ic ? 'var(--green)' : 'var(--border2)'}`, background: icone === ic ? 'var(--green-dim)' : 'var(--bg3)', fontSize: 18, cursor: 'pointer' }}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{icone}</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{nome || 'Nome da categoria'}</span>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, marginTop: 14 }} onClick={salvar} disabled={saving}>
          {saving ? <Spinner /> : <><i className="ti ti-check" />{editando ? 'Salvar' : 'Criar categoria'}</>}
        </button>
      </Modal>
    </div>
  )
}
