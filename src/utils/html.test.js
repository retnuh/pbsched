import { describe, test, expect } from 'vitest'
import { escapeHTML } from './html.js'

describe('escapeHTML', () => {
  test('escapes & to &amp;', () => {
    expect(escapeHTML('a & b')).toBe('a &amp; b')
  })

  test('escapes < to &lt; and > to &gt;', () => {
    expect(escapeHTML('<tag>')).toBe('&lt;tag&gt;')
  })

  test('escapes " to &quot;', () => {
    expect(escapeHTML('"value"')).toBe('&quot;value&quot;')
  })

  test('coerces non-string values to string before escaping', () => {
    expect(escapeHTML(42)).toBe('42')
  })

  test('returns empty string unchanged', () => {
    expect(escapeHTML('')).toBe('')
  })

  test('escapes multiple special characters in one string', () => {
    expect(escapeHTML('<b class="x">a & b</b>')).toBe('&lt;b class=&quot;x&quot;&gt;a &amp; b&lt;/b&gt;')
  })

  test('returns empty string for null', () => {
    expect(escapeHTML(null)).toBe('')
  })

  test('returns empty string for undefined', () => {
    expect(escapeHTML(undefined)).toBe('')
  })

  test("escapes ' to &#x27;", () => {
    expect(escapeHTML("it's")).toBe("it&#x27;s")
  })
})
