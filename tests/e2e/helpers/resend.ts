// Resend API verification — used by digest.spec to confirm sends actually
// landed at Resend (not just the Edge Function thinking it succeeded).
// Read-only: every call is GET https://api.resend.com/emails/{id}.

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''

export type ResendMessage = {
  id: string
  from: string
  to: string[]
  subject: string
  last_event: string  // 'sent' | 'delivered' | 'bounced' | 'complained' | ...
  created_at: string
}

export const resend = {
  /** True if a Resend API key is configured. Specs skip Resend assertions otherwise. */
  available: () => RESEND_API_KEY.length > 0,

  /** Fetch a single message by id. Returns null on 404. */
  async getMessage(id: string): Promise<ResendMessage | null> {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set')
    const resp = await fetch('https://api.resend.com/emails/' + id, {
      headers: { Authorization: 'Bearer ' + RESEND_API_KEY },
    })
    if (resp.status === 404) return null
    if (!resp.ok) throw new Error('Resend API ' + resp.status + ': ' + await resp.text())
    return await resp.json() as ResendMessage
  },
}
