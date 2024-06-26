import * as jose from 'jose'
import { NextRequest } from 'next/server'
import { COOKIE_NAME, JWT_COOKIE_NAME } from './constants'

// Extend jose JWTPayload with our expected payload properties
export type JWTPayload = jose.JWTPayload & {
  roles?: string[]
}

export function getSessionCookieValue(req: NextRequest): string {
  const { value } = req.cookies.getWithOptions(COOKIE_NAME)
  return value
}

export function getJWTCookieValue(req: NextRequest) {
  const { value } = req.cookies.getWithOptions(JWT_COOKIE_NAME)
  return value
}

/**
 * Load the public key from env-variables and parse to work with `jose`
 */
async function loadPublicKey() {
  const rawPublicKey = process.env.JWT_PUBLIC_KEY
    ? atob(process.env.JWT_PUBLIC_KEY)
    : null
  const publicKey = await jose.importSPKI(rawPublicKey, 'ES256')
  if (!publicKey) {
    throw new Error('JWT_PUBLIC_KEY is not defined')
  }
  return publicKey
}

/**
 * Verify the JWT token and validate the payloads shape
 * @param token
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  const publicKey = await loadPublicKey()
  const { payload } = await jose.jwtVerify(token, publicKey, {
    issuer: process.env.JWT_ISSUER,
  })

  return payload
}
