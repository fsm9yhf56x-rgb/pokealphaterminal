/**
 * Resend client wrapper — singleton lazy-init.
 *
 * Same pattern as auth/server.ts : lazy initialization,
 * build-safe when env vars are missing.
 *
 * v0.9 Infrastructure Solide · Lot C
 */

import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (_resend) return _resend
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }
  _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Kodo Cards <noreply@kodocards.com>'
export const REPLY_TO = process.env.RESEND_REPLY_TO ?? 'contact@kodocards.com'

export type SendEmailParams = {
  to: string | string[]
  subject: string
  html?: string
  react?: React.ReactElement
  replyTo?: string
}

export async function sendEmail(params: SendEmailParams) {
  const resend = getResend()
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    replyTo: params.replyTo ?? REPLY_TO,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    react: params.react,
  } as any)

  if (result.error) {
    console.error('[Resend] sendEmail failed', { to: params.to, subject: params.subject, error: result.error })
    throw new Error(`Email send failed: ${result.error.message}`)
  }

  return result.data
}
