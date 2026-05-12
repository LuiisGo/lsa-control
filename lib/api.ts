const API_URL = process.env.NEXT_PUBLIC_API_URL!

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function buildApiRequestBody(
  action: string,
  data?: Record<string, unknown>,
  token?: string,
  isBrowser = typeof window !== 'undefined'
): Record<string, unknown> {
  const body: Record<string, unknown> = { action, ...data }
  if (token && !isBrowser) body.token = token
  return body
}

/**
 * Central API call function.
 *
 * - En el BROWSER → llama a /api/proxy (Next.js server-side proxy) para evitar CORS.
 * - En el SERVIDOR (SSR / API routes) → llama directo al Apps Script.
 *
 * Esto significa que TODOS los componentes 'use client' funcionan sin CORS
 * sin necesidad de cambiar nada en las páginas.
 */
export async function apiCall<T = unknown>(
  action: string,
  data?: Record<string, unknown>,
  token?: string
): Promise<ApiResponse<T>> {
  try {
    // Browser → proxy | Server → Apps Script directo
    const isBrowser = typeof window !== 'undefined'
    const url = isBrowser ? '/api/proxy' : API_URL
    const body = buildApiRequestBody(action, data, token, isBrowser)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const json = await res.json()
    return json
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de red'
    console.error(`[apiCall] ${action}:`, message)
    return { success: false, error: message }
  }
}
