import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { setTurnCredentials } from '../../../coturn'

const turnHost = process.env.TURN_HOST || '127.0.0.1'
const stunServer = process.env.STUN_SERVER || 'stun:stun.l.google.com:19302'
const DEFAULT_PEER_SERVER = 'https://0.peerjs.com/'

type PeerServerConfig = {
  host: string
  path: string
  port: number
  secure: boolean
  servers: string[]
}

// Precedence: PEERJS_SERVERS > PEERJS_HOST/PEERJS_PATH > default public broker
function resolvePeerServers(): string {
  if (process.env.PEERJS_SERVERS) {
    return process.env.PEERJS_SERVERS
  }
  if (process.env.PEERJS_HOST) {
    const host = process.env.PEERJS_HOST
    const path = process.env.PEERJS_PATH || '/'
    return `https://${host}${path.startsWith('/') ? path : `/${path}`}`
  }
  return DEFAULT_PEER_SERVER
}

function parsePeerServers(raw: string): PeerServerConfig {
  const urls = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (urls.length === 0) {
    throw new Error('No PeerJS server configured')
  }
  const url = new URL(urls[0])
  const secure = url.protocol === 'https:'
  return {
    host: url.hostname,
    path: url.pathname,
    port: url.port ? parseInt(url.port) : secure ? 443 : 80,
    secure,
    servers: urls,
  }
}

export async function POST(): Promise<NextResponse> {
  const peerConfig = parsePeerServers(resolvePeerServers())

  if (!process.env.COTURN_ENABLED) {
    return NextResponse.json({
      ...peerConfig,
      iceServers: [{ urls: stunServer }],
    })
  }

  // Generate ephemeral credentials
  const username = crypto.randomBytes(8).toString('hex')
  const password = crypto.randomBytes(8).toString('hex')
  const ttl = 86400 // 24 hours

  // Store credentials in Redis
  await setTurnCredentials(username, password, ttl)

  return NextResponse.json({
    ...peerConfig,
    iceServers: [
      { urls: stunServer },
      {
        urls: [`turn:${turnHost}:3478`, `turns:${turnHost}:5349`],
        username,
        credential: password,
      },
    ],
  })
}

export const GET = POST

