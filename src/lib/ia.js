const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

async function chamarIA(pergunta, contexto) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ia-consultora`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ pergunta, contexto })
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Erro ${response.status}`)
  }
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data.resposta
}

export async function consultarIA(pergunta, contexto) { return chamarIA(pergunta, contexto) }
export async function gerarDiagnosticoAutomatico(contexto) {
  return chamarIA('Gere um diagnóstico financeiro em 2-3 frases para o dashboard. Destaque o ponto mais importante e a principal recomendação de ação para hoje.', contexto)
}
export async function analisarRadarVazamentos(contexto) {
  return chamarIA('Analise os gastos do mês e identifique os 3 principais vazamentos financeiros. Seja específico com os valores reais.', contexto)
}
