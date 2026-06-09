import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getResumoFinanceiro } from '../lib/supabase'

const FinanceiroContext = createContext(null)

export function FinanceiroProvider({ children }) {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const recarregar = useCallback(async () => {
    try {
      setLoading(true)
      setErro(null)
      const resumo = await getResumoFinanceiro()
      setDados(resumo)
    } catch (e) {
      console.error('Erro ao carregar dados:', e)
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return (
    <FinanceiroContext.Provider value={{ dados, loading, erro, recarregar }}>
      {children}
    </FinanceiroContext.Provider>
  )
}

export function useFinanceiro() {
  const ctx = useContext(FinanceiroContext)
  if (!ctx) throw new Error('useFinanceiro precisa estar dentro de FinanceiroProvider')
  return ctx
}
