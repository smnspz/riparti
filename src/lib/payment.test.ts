import { describe, expect, it } from 'vitest'
import {
  buildPayPalMeUrl,
  isValidPayPalHandle,
  normalizePayPalHandle,
} from './payment'

describe('normalizePayPalHandle', () => {
  it('accepts a bare handle with surrounding spaces', () => {
    expect(normalizePayPalHandle('  Alice  ')).toBe('Alice')
  })

  it('strips a pasted PayPal.Me link and its amount', () => {
    expect(normalizePayPalHandle('https://www.paypal.me/Alice/25EUR')).toBe(
      'Alice',
    )
    expect(normalizePayPalHandle('paypal.me/Alice')).toBe('Alice')
  })

  it('strips a leading at sign', () => {
    expect(normalizePayPalHandle('@Alice')).toBe('Alice')
  })
})

describe('isValidPayPalHandle', () => {
  it('accepts letters and numbers up to 20 characters', () => {
    expect(isValidPayPalHandle('alice')).toBe(true)
    expect(isValidPayPalHandle('Alice2026')).toBe(true)
    expect(isValidPayPalHandle('a'.repeat(20))).toBe(true)
  })

  it('rejects empty, long, or punctuated handles', () => {
    expect(isValidPayPalHandle('')).toBe(false)
    expect(isValidPayPalHandle('a'.repeat(21))).toBe(false)
    expect(isValidPayPalHandle('alice-2026')).toBe(false)
    expect(isValidPayPalHandle('alice 2026')).toBe(false)
  })
})

describe('buildPayPalMeUrl', () => {
  it('formats a share with two decimals and the euro code', () => {
    expect(buildPayPalMeUrl('alice', 1659)).toBe(
      'https://paypal.me/alice/16.59EUR',
    )
  })

  it('drops zero cents and pads small cents', () => {
    expect(buildPayPalMeUrl('alice', 2500)).toBe(
      'https://paypal.me/alice/25EUR',
    )
    expect(buildPayPalMeUrl('alice', 5)).toBe('https://paypal.me/alice/0.05EUR')
  })

  it('returns null for an invalid handle or a zero share', () => {
    expect(buildPayPalMeUrl('alice-2026', 1659)).toBeNull()
    expect(buildPayPalMeUrl('alice', 0)).toBeNull()
  })
})
