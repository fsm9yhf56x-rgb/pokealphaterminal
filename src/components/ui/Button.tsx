import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'tier-s'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  fullWidth?: boolean
}

const baseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-space, system-ui)',
  fontWeight: 500,
  border: '1px solid',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  userSelect: 'none' as const,
  outline: 'none',
}

const variants: Record<Variant, object> = {
  primary:   { background: '#111', color: '#fff', borderColor: '#111' },
  secondary: { background: '#fff', color: '#111', borderColor: '#EBEBEB' },
  ghost:     { background: 'transparent', color: '#888', borderColor: 'transparent' },
  danger:    { background: '#E03020', color: '#fff', borderColor: '#E03020' },
  'tier-s':  { background: '#FFD700', color: '#111', borderColor: '#FFD700' },
}

const sizes: Record<Size, object> = {
  sm: { fontSize: '12px', padding: '6px 12px', gap: '6px' },
  md: { fontSize: '13px', padding: '8px 16px', gap: '8px' },
  lg: { fontSize: '14px', padding: '10px 20px', gap: '8px' },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading = false, fullWidth = false, style, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{
        ...baseStyle,
        ...variants[variant],
        ...sizes[size],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled || loading ? 0.4 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...props}
    >
      {loading && (
        <span style={{
          width: '12px', height: '12px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.7s linear infinite',
        }} />
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
