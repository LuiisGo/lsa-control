import { describe, expect, it } from 'vitest'
import { buildApiRequestBody } from './api'

describe('buildApiRequestBody', () => {
  it('does not include client-provided tokens for browser requests', () => {
    const body = buildApiRequestBody('saveCarga', { proveedor: 'Ana' }, 'secret-token', true)

    expect(body).toEqual({ action: 'saveCarga', proveedor: 'Ana' })
  })

  it('keeps server-provided tokens for server requests', () => {
    const body = buildApiRequestBody('saveCarga', { proveedor: 'Ana' }, 'secret-token', false)

    expect(body).toEqual({ action: 'saveCarga', proveedor: 'Ana', token: 'secret-token' })
  })
})
