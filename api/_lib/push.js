import crypto from 'node:crypto'
import webpush from 'web-push'
import { Redis } from '@upstash/redis'

let redisClient = null
let vapidConfigured = false

function getRequiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getRedis() {
  if (!redisClient) {
    redisClient = new Redis({
      url: getRequiredEnv('UPSTASH_REDIS_REST_URL'),
      token: getRequiredEnv('UPSTASH_REDIS_REST_TOKEN')
    })
  }
  return redisClient
}

export function getEndpointHash(endpoint) {
  return crypto.createHash('sha256').update(endpoint).digest('hex')
}

export function getActiveTimerKey(endpoint) {
  return `timer:active:${getEndpointHash(endpoint)}`
}

export function configureWebPush() {
  if (vapidConfigured) return

  const subject = getRequiredEnv('VAPID_SUBJECT')
  const publicKey = getRequiredEnv('VAPID_PUBLIC_KEY')
  const privateKey = getRequiredEnv('VAPID_PRIVATE_KEY')

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

export async function sendWebPush(subscription, payload) {
  configureWebPush()
  return webpush.sendNotification(subscription, JSON.stringify(payload))
}

export function getAppBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return null
}

export function normalizeNotificationPayload(notification) {
  return {
    title: notification?.title || 'Rest Time Complete! ⏱️',
    body: notification?.body || '2 minutes have passed',
    tag: notification?.tag || 'rest-timer',
    url: notification?.url || '/'
  }
}
