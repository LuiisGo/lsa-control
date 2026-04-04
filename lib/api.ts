const API_URL = process.env.NEXT_PUBLIC_API_URL!

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export async function apiCall<T = unknown>(
  action: string,
  data?: Record<string, unknown>,
  token?: string
): Promise<ApiResponse<T>> {
  try {
    const body: Record<string, unknown> = { action, ...data }
    if (token) body.token = token

    const res = await fetch(API_URL, {
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
