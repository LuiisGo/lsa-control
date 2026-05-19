import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isAllowedApiAction, isPublicApiAction } from '@/lib/apiActions'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

function noStoreJson(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res
}

function isExpiredTokenError(data: unknown) {
  if (!data || typeof data !== 'object') return false
  const error = String((data as { error?: unknown }).error || '').toLowerCase()
  return error.includes('token inválido') || error.includes('token invalido') || error.includes('sesión expirada') || error.includes('sesion expirada')
}

/**
 * Proxy server-side para todas las llamadas al Apps Script.
 * Los clientes (browser) llaman a /api/proxy en vez de llamar
 * al Apps Script directamente, evitando el error de CORS.
 */
export async function POST(req: NextRequest) {
  try {
    if (!API_URL) {
      return noStoreJson(
        { success: false, error: 'API_URL no configurada' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const action = String(body.action || '')

    if (!isAllowedApiAction(action)) {
      return noStoreJson(
        { success: false, error: 'Acción no permitida' },
        { status: 400 }
      )
    }

    if (!isPublicApiAction(action)) {
      const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      const apiToken = typeof sessionToken?.apiToken === 'string' ? sessionToken.apiToken : ''
      if (!apiToken) {
        return noStoreJson(
          { success: false, error: 'Sesión requerida' },
          { status: 401 }
        )
      }
      body.token = apiToken
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return noStoreJson(
        { success: false, error: `Apps Script HTTP ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    if (!isPublicApiAction(action) && isExpiredTokenError(data)) {
      return noStoreJson(data, { status: 401 })
    }
    return noStoreJson(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en proxy'
    console.error('[proxy]', message)
    return noStoreJson(
      { success: false, error: process.env.NODE_ENV === 'production' ? 'Error procesando la solicitud' : message },
      { status: 500 }
    )
  }
}
