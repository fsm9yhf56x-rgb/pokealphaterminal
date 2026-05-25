/**
 * Reset Password Email Template — Snow+ branded.
 *
 * Rendered via React Email → cross-client HTML (Gmail, Outlook, Apple Mail, mobile).
 *
 * v0.9 Infrastructure Solide · Lot C
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface ResetPasswordEmailProps {
  userName?: string
  resetUrl: string
}

export default function ResetPasswordEmail({
  userName,
  resetUrl,
}: ResetPasswordEmailProps) {
  const greeting = userName ? `Bonjour ${userName},` : 'Bonjour,'

  return (
    <Html>
      <Head />
      <Preview>Réinitialise ton mot de passe Kodo Cards</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>
              <span style={{ color: '#1D1D1F' }}>Kodo</span>
              <span style={{ color: '#E03020' }}> Cards</span>
            </Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>Réinitialise ton mot de passe</Heading>
            <Text style={text}>{greeting}</Text>
            <Text style={text}>
              Tu as demandé à réinitialiser le mot de passe de ton compte Kodo Cards.
              Clique sur le bouton ci-dessous pour choisir un nouveau mot de passe.
            </Text>

            <Section style={buttonSection}>
              <Button href={resetUrl} style={button}>
                Réinitialiser mon mot de passe
              </Button>
            </Section>

            <Text style={smallText}>
              Ce lien expire dans 1 heure pour des raisons de sécurité.
              <br />
              Si tu n&apos;as pas demandé cette réinitialisation, ignore cet email — ton mot de passe restera inchangé.
            </Text>

            <Hr style={hr} />

            <Text style={smallText}>
              Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :
            </Text>
            <Text style={linkText}>
              <Link href={resetUrl} style={link}>
                {resetUrl}
              </Link>
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Kodo Cards · Le tracker Pokemon TCG
              <br />
              <Link href="https://kodocards.com" style={footerLink}>
                kodocards.com
              </Link>
              {' · '}
              <Link href="mailto:contact@kodocards.com" style={footerLink}>
                contact@kodocards.com
              </Link>
            </Text>
            <Text style={footerSmall}>
              Tu reçois cet email parce qu&apos;une demande de réinitialisation a été faite pour ton compte.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Snow+ design tokens (inline pour cross-client compatibility)
const body = {
  backgroundColor: '#FAFBFC',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: '40px 20px',
}

const container = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  border: '1px solid #E5E5EA',
  maxWidth: '560px',
  margin: '0 auto',
  overflow: 'hidden',
}

const logoSection = {
  padding: '32px 32px 0',
  textAlign: 'center' as const,
}

const logoText = {
  fontSize: '22px',
  fontWeight: 700,
  letterSpacing: '-0.3px',
  margin: 0,
  fontFamily: '"Sora", -apple-system, BlinkMacSystemFont, sans-serif',
}

const contentSection = {
  padding: '24px 32px 32px',
}

const h1 = {
  color: '#1D1D1F',
  fontSize: '22px',
  fontWeight: 700,
  letterSpacing: '-0.3px',
  margin: '12px 0 20px',
  lineHeight: 1.3,
}

const text = {
  color: '#1D1D1F',
  fontSize: '15px',
  lineHeight: 1.6,
  margin: '0 0 16px',
}

const smallText = {
  color: '#6E6E73',
  fontSize: '13px',
  lineHeight: 1.6,
  margin: '0 0 12px',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

const button = {
  backgroundColor: '#1D1D1F',
  borderRadius: '10px',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  letterSpacing: '-0.2px',
}

const hr = {
  borderColor: '#E5E5EA',
  margin: '24px 0',
}

const linkText = {
  color: '#6E6E73',
  fontSize: '12px',
  lineHeight: 1.5,
  margin: '0 0 8px',
  wordBreak: 'break-all' as const,
}

const link = {
  color: '#1D1D1F',
  textDecoration: 'underline',
}

const footer = {
  padding: '24px 32px 32px',
  borderTop: '1px solid #E5E5EA',
  backgroundColor: '#FAFBFC',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#6E6E73',
  fontSize: '12px',
  lineHeight: 1.6,
  margin: '0 0 8px',
}

const footerLink = {
  color: '#6E6E73',
  textDecoration: 'underline',
}

const footerSmall = {
  color: '#AEAEB2',
  fontSize: '11px',
  lineHeight: 1.5,
  margin: 0,
}
