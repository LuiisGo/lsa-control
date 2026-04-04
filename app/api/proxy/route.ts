import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

/**
 * Proxy server-side para todas las llamadas al Apps Script.
 * Los clientes (browser) llaman a /api/proxy en vez de llamar
 * al Apps Script directamente, evitando el error de CORS.
 */
export async function POST(req: NextRequest) {
  try {
    if (!API_URL) {
      return NextResponse.json(
        { success: false, error: 'API_URL no configurada' },
        { status: 500 }
      )
    }

    const body = await req.json()

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Apps Script HTTP ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en proxy'
    console.error('[proxy]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
