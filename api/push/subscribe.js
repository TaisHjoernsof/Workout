import { getRedis, getEndpointHash } from '../_lib/push.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const subscription = req.body?.subscription
    const endpoint = subscription?.endpoint

    if (!endpoint) {
      return res.status(400).json({ error: 'Missing subscription endpoint' })
    }

    const redis = getRedis()
    const key = `push:subscription:${getEndpointHash(endpoint)}`

    await redis.set(
      key,
      {
        endpoint,
        updatedAt: new Date().toISOString()
      },
      { ex: 60 * 60 * 24 * 30 }
    )

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('Failed to register subscription:', error)
    return res.status(500).json({ error: 'Failed to register subscription' })
  }
}
