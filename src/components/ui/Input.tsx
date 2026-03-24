'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?:  string
  error?:  string
  hint?:   string
  prefix?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, style, ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#111', fontFamily: 'var(--font-space, system-ui)', letterSpacing: '0.02em' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: '10px', color: '#888', fontSize: '13px', pointerEvents: 'none' }}>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          style={{
            width: '100%',
            height: '36px',
            padding: `0 ${suffix ? '32px' : '12px'} 0 ${prefix ? '28px' : '12px'}`,
            background: '#fff',
            border: `1px solid ${error ? '#E03020' : '#EBEBEB'}`,
            borderRadius: '8px',
            fontSize: '13px',
            color: '#111',
            fontFamily: 'var(--font-sans, system-ui)',
            outline: 'none',
            transition: 'border-color 0.15s',
            ...style,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = error ? '#E03020' : '#111' }}
          onBlur={e  => { e.currentTarget.style.borderColor = error ? '#E03020' : '#EBEBEB' }}
          {...props}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: '10px', color: '#888', fontSize: '13px', pointerEvents: 'none' }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <p style={{ fontSize: '11px', color: '#E03020', margin: 0 }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{hint}</p>}
    </div>
  )
)
Input.displayName = 'Input'
