import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
  duration: number
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, message, variant, duration }])
    },
    []
  )

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastBubble key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastBubble({ item, onClose }: { item: ToastItem; onClose: () => void }): JSX.Element {
  useEffect(() => {
    const t = setTimeout(onClose, item.duration)
    return () => clearTimeout(t)
  }, [item.duration, onClose])

  const Icon = item.variant === 'success' ? CheckCircle2 : item.variant === 'error' ? AlertCircle : Info
  const tone =
    item.variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : item.variant === 'error'
        ? 'border-red-200 bg-red-50 text-red-900'
        : 'border-blue-200 bg-blue-50 text-blue-900'
  const iconColor =
    item.variant === 'success'
      ? 'text-emerald-600'
      : item.variant === 'error'
        ? 'text-red-600'
        : 'text-blue-600'

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg',
        tone
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor)} />
      <div className="flex-1">{item.message}</div>
      <button onClick={onClose} className="rounded p-0.5 opacity-60 hover:opacity-100">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback so existing call-sites do not crash if ToastProvider is missing
    return {
      push: (msg) => {
        console.log('[toast]', msg)
      }
    }
  }
  return ctx
}
