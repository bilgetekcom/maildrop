import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onChange, label, id, ...props }, ref) => (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 select-none', className)} htmlFor={id}>
      <span className="relative inline-block h-5 w-9">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          {...props}
        />
        <span className="absolute inset-0 rounded-full bg-input peer-checked:bg-primary transition-colors" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
)
Switch.displayName = 'Switch'
