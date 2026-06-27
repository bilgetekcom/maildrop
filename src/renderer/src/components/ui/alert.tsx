import { type HTMLAttributes, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'info' | 'warning'
  title?: string
  children: ReactNode
}

const variantStyles = {
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600'
  },
  error: {
    box: 'border-red-200 bg-red-50 text-red-900',
    icon: AlertCircle,
    iconColor: 'text-red-600'
  },
  info: {
    box: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: Info,
    iconColor: 'text-blue-600'
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: AlertTriangle,
    iconColor: 'text-amber-600'
  }
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps): JSX.Element {
  const v = variantStyles[variant]
  const Icon = v.icon
  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-lg border p-3 text-sm', v.box, className)}
      {...props}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', v.iconColor)} />
      <div className="flex-1">
        {title && <div className="font-semibold">{title}</div>}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  )
}
