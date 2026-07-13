import { Client as QStashClient } from '@upstash/qstash'
import { getActiveTimerKey, getAppBaseUrl, getRedis, normalizeNotificationPayload } from '../_lib/push.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionId = req.body?.sessionId
    const delaySeconds = Number(req.body?.delaySeconds)
    const subscription = req.body?.subscription
    const endpoint = subscription?.endpoint

    if (!sessionId || !endpoint) {
      return res.status(400).json({ error: 'Missing sessionId or subscription endpoint' })
    }

    if (!Number.isFinite(delaySeconds) || delaySeconds <= 0 || delaySeconds > 3600) {
      return res.status(400).json({ error: 'Invalid delaySeconds' })
    }

    const appBaseUrl = getAppBaseUrl()
    if (!appBaseUrl) {
      return res.status(500).json({ error: 'Missing APP_URL/VERCEL_URL for callback target' })
    }

    const qstashToken = process.env.QSTASH_TOKEN
    const internalApiSecret = process.env.INTERNAL_API_SECRET

    if (!qstashToken || !internalApiSecret) {
      return res.status(500).json({ error: 'Missing QSTASH_TOKEN or INTERNAL_API_SECRET' })
    }

    const redis = getRedis()
    const activeTimerKey = getActiveTimerKey(endpoint)
    await redis.set(activeTimerKey, sessionId, { ex: 60 * 60 * 3 })

    const client = new QStashClient({ token: qstashToken })

    await client.publishJSON({
      url: `${appBaseUrl}/api/push/send`,
      delay: `${Math.floor(delaySeconds)}s`,
      headers: {
        Authorization: `Bearer ${internalApiSecret}`
      },
      body: {
        sessionId,
        subscription,
        notification: normalizeNotificationPayload(req.body?.notification)
      }
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Failed to start timer push job:', error)
    return res.status(500).json({ error: 'Failed to schedule push notification' })
  }
}
