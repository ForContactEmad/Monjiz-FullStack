/**
 * Sends the admin a short "something new arrived" email through Resend.
 *
 * Deliberately contains NO client personal data (no name, email, phone or
 * request text): email is a weaker channel than the database, and the
 * admin reads the details in the auth-protected dashboard anyway.
 *
 * Optional: if RESEND_API_KEY / NOTIFY_EMAIL / NOTIFY_FROM aren't set it
 * does nothing. It never throws — a failed notification must not fail
 * the client's submission, which is already safely stored by then.
 */
export async function notifyAdmin(subject: string, text: string): Promise<void> {
  const config = useRuntimeConfig()
  if (!config.resendApiKey || !config.notifyEmail || !config.notifyFrom) return

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.notifyFrom, to: config.notifyEmail, subject, text }),
    })
    if (!res.ok) console.error('[notify] Resend responded', res.status)
  } catch (err) {
    console.error('[notify] send failed', err)
  }
}
