import { describe, expect, it } from 'vitest'
import { isAllowedApiAction, isPublicApiAction } from './apiActions'

describe('api action allowlist', () => {
  it('allows known public actions without session token injection', () => {
    expect(isPublicApiAction('login')).toBe(true)
    expect(isPublicApiAction('portalLogin')).toBe(true)
    expect(isPublicApiAction('portalData')).toBe(true)
  })

  it('allows known private ERP actions', () => {
    expect(isAllowedApiAction('saveCarga')).toBe(true)
    expect(isAllowedApiAction('getDashboardFinanciero')).toBe(true)
    expect(isAllowedApiAction('deleteGasto')).toBe(true)
  })

  it('rejects unknown actions before they reach Apps Script', () => {
    expect(isAllowedApiAction('eval')).toBe(false)
    expect(isAllowedApiAction('importExcelAbril2026')).toBe(false)
    expect(isAllowedApiAction('')).toBe(false)
  })
})
