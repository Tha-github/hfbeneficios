import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AudienceId, ServiceId } from '../../content/schema-ids'
import { EMPTY_LEAD, type LeadFormValues } from './lead'

/*
 * Estado do formulário de cotação compartilhado com os CTAs da página:
 * um botão "Cotar plano de saúde" pré-seleciona a especialidade antes de levar ao formulário.
 */

type QuotePreset = { specialty?: ServiceId; clientType?: AudienceId }

interface QuoteContextValue {
  values: LeadFormValues
  setValues: (update: (current: LeadFormValues) => LeadFormValues) => void
  requestQuote: (preset: QuotePreset) => void
}

const QuoteContext = createContext<QuoteContextValue | null>(null)

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<LeadFormValues>(EMPTY_LEAD)

  const requestQuote = useCallback((preset: QuotePreset) => {
    setValues((current) => ({ ...current, ...preset }))
  }, [])

  const value = useMemo(() => ({ values, setValues, requestQuote }), [values, requestQuote])
  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>
}

export function useQuote(): QuoteContextValue {
  const ctx = useContext(QuoteContext)
  if (!ctx) throw new Error('useQuote precisa estar dentro de QuoteProvider')
  return ctx
}
