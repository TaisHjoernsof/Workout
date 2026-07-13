import { getActiveTimerKey, getRedis } from '../_lib/push.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sessionId = req.body?.sessionId
    const endpoint = req.body?.endpoint

    if (!sessionId || !endpoint) {
      return res.status(400).json({ error: 'Missing sessionId or endpoint' })
    }

    const redis = getRedis()
    const key = getActiveTimerKey(endpoint)
    const activeSessionId = await redis.get(key)

    if (activeSessionId === sessionId) {
      await redis.del(key)
      return res.status(200).json({ ok: true, canceled: true })
    }

    return res.status(200).json({ ok: true, canceled: false })
  } catch (error) {
    console.error('Failed to stop timer push job:', error)
    return res.status(500).json({ error: 'Failed to cancel push notification' })
  }
}
