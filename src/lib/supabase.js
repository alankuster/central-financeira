import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getReceitas(mes) {
  const now = new Date()
  const inicio = mes ? `${mes}-01` : `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const fimDate = mes ? new Date(mes.split('-')[0], mes.split('-')[1], 0) : new Date(now.getFullYear(), now.getMonth()+1, 0)
  const fim = fimDate.toISOString().split('T')[0]
  const { data, error } = await supabase.from('receitas').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false })
  if (error) throw error
  return data
}

export async function insertReceita(r) {
  const { data, error } = await supabase.from('receitas').insert([r]).select()
  if (error) throw error
  return data[0]
}

export async function deleteReceita(id) {
  const { error } = await supabase.from('receitas').delete().eq('id', id)
  if (error) throw error
}

export async function getDespesas(mes) {
  const now = new Date()
  const inicio = mes ? `${mes}-01` : `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const fimDate = mes ? new Date(mes.split('-')[0], mes.split('-')[1], 0) : new Date(now.getFullYear(), now.getMonth()+1, 0)
  const fim = fimDate.toISOString().split('T')[0]
  const { data, error } = await supabase.from('despesas').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false })
  if (error) throw error
  return data
}

export async function insertDespesa(d) {
  const { data, error } = await supabase.from('despesas').insert([d]).select()
  if (error) throw error
  return data[0]
}

export async function deleteDespesa(id) {
  const { error } = await supabase.from('despesas').delete().eq('id', id)
  if (error) throw error
}

export async function getDividas() {
  const { data, error } = await supabase.from('dividas').select('*').neq('status', 'quitado').order('valor_atual', { ascending: false })
  if (error) throw error
  return data
}

export async function insertDivida(d) {
  const { data, error } = await supabase.from('dividas').insert([d]).select()
  if (error) throw error
  return data[0]
}

export async function updateDivida(id, updates) {
  const { error } = await supabase.from('dividas').update(updates).eq('id', id)
  if (error) throw error
}

export async function getAcordos() {
  const { data, error } = await supabase.from('acordos').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function insertAcordo(a) {
  const { data, error } = await supabase.from('acordos').insert([a]).select()
  if (error) throw error
  return data[0]
}

export async function updateAcordo(id, updates) {
  const { error } = await supabase.from('acordos').update(updates).eq('id', id)
  if (error) throw error
}

export async function getObjetivos() {
  const { data, error } = await supabase.from('objetivos').select('*').eq('ativo', true).order('prioridade')
  if (error) throw error
  return data
}

export async function insertObjetivo(o) {
  const { data, error } = await supabase.from('objetivos').insert([o]).select()
  if (error) throw error
  return data[0]
}

export async function updateObjetivo(id, updates) {
  const { error } = await supabase.from('objetivos').update(updates).eq('id', id)
  if (error) throw error
}

export async function getScoreHistorico() {
  const { data, error } = await supabase.from('score_historico').select('*').order('data', { ascending: true })
  if (error) throw error
  return data
}

export async function insertScore(s) {
  const { data, error } = await supabase.from('score_historico').insert([s]).select()
  if (error) throw error
  return data[0]
}

export async function getCategoriaAprendida(termo) {
  const { data } = await supabase.from('categorias_aprendidas').select('categoria').ilike('termo', `%${termo.toLowerCase()}%`).limit(1).maybeSingle()
  return data?.categoria || null
}

export async function salvarCategoriaAprendida(termo, categoria) {
  await supabase.from('categorias_aprendidas').upsert([{ termo: termo.toLowerCase(), categoria }], { onConflict: 'termo' })
}

export function formatBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)
}

export function mesAtual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

export async function getResumoFinanceiro() {
  const mes = mesAtual()
  const [receitas, despesas, dividas, objetivos] = await Promise.all([
    getReceitas(mes), getDespesas(mes), getDividas(), getObjetivos()
  ])
  const totalRecebido = receitas.filter(r => r.status === 'recebida').reduce((s, r) => s + Number(r.valor), 0)
  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0)
  const saldo = totalRecebido - totalDespesas
  const totalDividas = dividas.reduce((s, d) => s + Number(d.valor_atual), 0)
  const comprometido = dividas.filter(d => d.valor_parcela).reduce((s, d) => s + Number(d.valor_parcela), 0)
  const gastoSeguroMes = Math.max(0, saldo - comprometido)
  const gastoSeguroSemana = gastoSeguroMes / 4.3
  const gastoSeguroHoje = gastoSeguroMes / 30
  let semaforo = 'verde'
  if (saldo < 0 || saldo < comprometido * 0.5) semaforo = 'vermelho'
  else if (saldo < comprometido) semaforo = 'amarelo'
  return { receitas, despesas, dividas, objetivos, totalRecebido, totalDespesas, saldo, totalDividas, comprometido, gastoSeguroHoje, gastoSeguroSemana, gastoSeguroMes, semaforo }
}
