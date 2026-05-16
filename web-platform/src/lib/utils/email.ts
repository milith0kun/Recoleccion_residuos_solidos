// Mock email transport for environments without SMTP (academic MVP).
// In production, replace with SendGrid/SES/SMTP — same signatures.

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  console.log('[email:mock] verification', { to: email, code, ttl: '24h' });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const base = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
  const link = `${base}/reset-password?token=${token}`;
  console.log('[email:mock] password-reset', { to: email, token, link, ttl: '1h' });
}
