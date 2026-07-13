import { getActiveTimerKey, getRedis, normalizeNotificationPayload, sendWebPush } from '../_lib/push.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const expectedSecret = process.env.INTERNAL_API_SECRET
  const authHeader = req.headers.authorization || ''

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const sessionId = req.body?.sessionId
    const subscription = req.body?.subscription
    const endpoint = subscription?.endpoint

    if (!sessionId || !endpoint) {
      return res.status(400).json({ error: 'Missing sessionId or subscription endpoint' })
    }

    const redis = getRedis()
    const key = getActiveTimerKey(endpoint)
    const activeSessionId = await redis.get(key)

    if (activeSessionId !== sessionId) {
      return res.status(200).json({ ok: true, skipped: 'Session no longer active' })
    }

    const notification = normalizeNotificationPayload(req.body?.notification)

    await sendWebPush(subscription, {
      title: notification.title,
      body: notification.body,
      tag: notification.tag,
      url: notification.url,
      badgeCount: 1
    })

    await redis.del(key)

    return res.status(200).json({ ok: true })
  } catch (error) {
    const statusCode = error?.statusCode || error?.status || 500

    if (statusCode === 404 || statusCode === 410) {
      try {
        const endpoint = req.body?.subscription?.endpoint
        if (endpoint) {
          const redis = getRedis()
          await redis.del(getActiveTimerKey(endpoint))
        }
      } catch (cleanupError) {
        console.error('Failed cleanup after stale subscription:', cleanupError)
      }

      return res.status(200).json({ ok: true, staleSubscription: true })
    }

    console.error('Failed to send push notification:', error)
    return res.status(500).json({ error: 'Failed to send push notification' })
  }
}
