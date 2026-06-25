import { describe, it, expect } from 'vitest'
import { ok, err, type Result, type CompileError, type ShareError } from './result'

describe('ok()', () => {
  it('creates a successful result', () => {
    const r: Result<number> = ok(42)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(42)
  })

  it('works with object values', () => {
    const r = ok({ name: 'Alice' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.name).toBe('Alice')
  })
})

describe('err()', () => {
  it('creates a failed result', () => {
    const r: Result<never, string> = err('something went wrong')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('something went wrong')
  })

  it('works with CompileError', () => {
    const e: CompileError = { kind: 'compile_error', detail: 'missing package' }
    const r = err(e)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.kind).toBe('compile_error')
      expect(r.error.detail).toBe('missing package')
    }
  })

  it('works with ShareError', () => {
    const e: ShareError = { kind: 'revoked', message: 'link was revoked' }
    const r = err(e)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.kind).toBe('revoked')
      expect(r.error.message).toBe('link was revoked')
    }
  })
})

describe('Result discriminant', () => {
  it('ok and err are mutually exclusive', () => {
    const results: Result<number, string>[] = [ok(1), err('fail')]
    const successes = results.filter((r) => r.ok)
    const failures = results.filter((r) => !r.ok)
    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
  })
})
