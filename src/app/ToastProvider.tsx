import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Toast from '../components/ui/Toast'
import type { ToastItem } from '../components/ui/Toast'
import { createAppError } from '../shared/errors'
import { createEntityId } from '../shared/utils/id'

type AddToastInput = Omit<ToastItem, 'id'>

type ToastContextValue = {
  addToast: (input: AddToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const addToast = (input: AddToastInput) => {
    const id = createEntityId('toast')
    const item: ToastItem = { id, ...input }
    setItems((current) => [item, ...current].slice(0, 4))
    window.setTimeout(() => {
      setItems((current) => current.filter((toast) => toast.id !== id))
    }, 3500)
  }

  const close = (id: string) => {
    setItems((current) => current.filter((toast) => toast.id !== id))
  }

  const value = useMemo(() => ({ addToast }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast items={items} onClose={close} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw createAppError({
      code: 'INVALID_STATE',
      message: 'useToast must be used within ToastProvider',
    })
  }
  return context
}
