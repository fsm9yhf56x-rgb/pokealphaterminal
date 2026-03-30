import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?:   string
  error?:   string
  hint?:    string
  prefix?:  React.ReactNode
  suffix?:  React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="font-display font-medium text-ink text-xs tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 text-ink-muted text-sm">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-surface border rounded-lg font-sans text-sm text-ink',
              'placeholder:text-ink-faint',
              'transition-colors duration-150',
              'focus:outline-none focus:border-border-focus',
              error
                ? 'border-red focus:border-red'
                : 'border-border hover:border-border-strong',
              prefix ? 'pl-9' : 'pl-3',
              suffix ? 'pr-9' : 'pr-3',
              'py-2 h-9',
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 text-ink-muted text-sm">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className="text-red text-xs font-sans">{error}</p>
        )}
        {hint && !error && (
          <p className="text-ink-muted text-xs font-sans">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'